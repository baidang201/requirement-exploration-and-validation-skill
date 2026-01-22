/**
 * RSS 订阅数据源（Ben's Bites, TLDR AI）
 */

import Parser from 'rss-parser';
import { TrendingItem } from './types';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('RSS');
const rssParser = new Parser();
const BENS_BITES_RSS_URL = 'https://www.bensbites.com/feed';
const TLDR_AI_RSS_URL = 'https://tldrai.com/rss';

function mapRSSItems(
  items: Parser.Item[],
  platform: string
): TrendingItem[] {
  return items
    .map(item => ({
      title: item.title || '未知内容',
      description: item.contentSnippet || item.content || '',
      url: item.link || '',
      tags: item.categories || [],
      platform,
      publishedAt: new Date(item.isoDate || item.pubDate || Date.now()),
      relevanceScore: 0
    }))
    .filter(item => item.url);
}

async function fetchRSSFeed(
  url: string,
  sourceName: string
): Promise<TrendingItem[]> {
  try {
    const feed = await rssParser.parseURL(url);
    const items = mapRSSItems(feed.items || [], sourceName);
    logger.info(`✓ ${sourceName}: ${items.length} 条`);
    return items;
  } catch (error: any) {
    logger.warn(`${sourceName} RSS 失败: ${error.message}`);
    return [];
  }
}

/**
 * 获取 Ben's Bites RSS
 */
export async function fetchBensBitesRSS(
  _timeRange: string = '7d'
): Promise<TrendingItem[]> {
  return fetchRSSFeed(BENS_BITES_RSS_URL, "Ben's Bites");
}

/**
 * 获取 TLDR AI RSS
 */
export async function fetchTLDRAIRSS(
  _timeRange: string = '7d'
): Promise<TrendingItem[]> {
  return fetchRSSFeed(TLDR_AI_RSS_URL, 'TLDR AI');
}
