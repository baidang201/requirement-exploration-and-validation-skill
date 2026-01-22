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

/**
 * 从 Product Hunt RSS 获取数据
 */
async function fetchProductHuntRSS(): Promise<TrendingItem[]> {
  try {
    const feed = await rssParser.parseURL(PRODUCT_HUNT_RSS_URL);
    const items = (feed.items || [])
      .slice(0, 30)
      .map(item => ({
        title: item.title || '未知项目',
        description: item.contentSnippet || item.content || '',
        url: item.link || '',
        tags: item.categories || [],
        platform: 'Product Hunt',
        publishedAt: new Date(item.isoDate || item.pubDate || Date.now()),
        relevanceScore: 0
      }))
      .filter(item => item.url);

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
    const response = await fetchWithRetry(
      'https://api.producthunt.com/v2/posts',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
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
    const posts = data.posts || [];

    const results = posts.map((post: any) => ({
      title: post.name,
      description: post.tagline || post.description || '',
      url: post.url || `https://www.producthunt.com/posts/${post.slug}`,
      tags: post.topics?.map((t: any) => t.name) || [],
      platform: 'Product Hunt',
      publishedAt: new Date(post.created_at),
      relevanceScore: 0
    }));

    if (results.length > 0) {
      logger.info(`✓ Product Hunt API: ${results.length} 条`);
      return results;
    }

    logger.warn('Product Hunt API 返回空数据，改用 RSS 数据源');
    return fetchProductHuntRSS();
  } catch (error: any) {
    logger.warn(`Product Hunt API 失败: ${error.message}`);
    logger.info('改用 RSS 数据源');
    return fetchProductHuntRSS();
  }
}
