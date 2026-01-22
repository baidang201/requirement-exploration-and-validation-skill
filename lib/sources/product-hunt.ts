/**
 * Product Hunt 数据源
 */

import Parser from 'rss-parser';
import { TrendingItem } from './types';
import { fetchWithRetry } from '../utils/error-handler';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('ProductHunt');
const rssParser = new Parser();
const PRODUCT_HUNT_RSS_URL = 'https://www.producthunt.com/feed';
const PRODUCT_HUNT_GRAPHQL_URL = 'https://api.producthunt.com/v2/api/graphql';

/**
 * 从 Product Hunt RSS 获取数据
 */
async function fetchProductHuntRSS(): Promise<TrendingItem[]> {
  try {
    const feed = await rssParser.parseURL(PRODUCT_HUNT_RSS_URL);
    const items = (feed.items || [])
      .slice(0, 30)
      .map((item: Parser.Item) => ({
        title: item.title || '未知项目',
        description: item.contentSnippet || item.content || '',
        url: item.link || '',
        tags: item.categories || [],
        platform: 'Product Hunt',
        publishedAt: new Date(item.isoDate || item.pubDate || Date.now()),
        relevanceScore: 0
      }))
      .filter((item: TrendingItem) => Boolean(item.url));

    logger.info(`✓ Product Hunt RSS: ${items.length} 条`);
    return items;
  } catch (error: any) {
    logger.warn(`Product Hunt RSS 失败: ${error.message}`);
    return [];
  }
}

/**
 * 获取 Product Hunt 数据
 */
export async function fetchProductHuntData(
  _timeRange: string = '7d'
): Promise<TrendingItem[]> {
  const apiKey = process.env.PRODUCT_HUNT_API_KEY;

  if (!apiKey) {
    logger.info('API Key 未配置，改用 RSS 数据源');
    return fetchProductHuntRSS();
  }

  try {
    const apiResults = await fetchProductHuntAPI(apiKey);

    if (apiResults.length > 0) {
      logger.info(`✓ Product Hunt API: ${apiResults.length} 条`);
      return apiResults;
    }

    logger.warn('Product Hunt API 返回空数据，改用 RSS 数据源');
    return fetchProductHuntRSS();
  } catch (error: any) {
    logger.warn(`Product Hunt API 失败: ${error.message}`);
    logger.info('改用 RSS 数据源');
    return fetchProductHuntRSS();
  }
}

/**
 * 使用 GraphQL API 获取 Product Hunt 数据
 */
async function fetchProductHuntAPI(apiKey: string): Promise<TrendingItem[]> {
  const query = `
    query LatestPosts($first: Int!) {
      posts(order: RANKING, first: $first) {
        edges {
          node {
            name
            tagline
            description
            slug
            url
            createdAt
            topics(first: 5) {
              edges {
                node {
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetchWithRetry(
    PRODUCT_HUNT_GRAPHQL_URL,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables: { first: 30 }
      })
    },
    {
      maxRetries: 2,
      initialDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const edges = data?.data?.posts?.edges || [];

  return edges
    .map((edge: any) => edge?.node)
    .filter((node: any) => Boolean(node))
    .map((node: any) => ({
      title: node.name,
      description: node.tagline || node.description || '',
      url: node.url || `https://www.producthunt.com/posts/${node.slug}`,
      tags: node.topics?.edges?.map((edge: any) => edge.node?.name).filter(Boolean) || [],
      platform: 'Product Hunt',
      publishedAt: new Date(node.createdAt),
      relevanceScore: 0
    }))
    .filter((item: TrendingItem) => Boolean(item.url));
}
