/**
 * IndieHackers 数据源
 */

import Parser from 'rss-parser';
import { TrendingItem } from './types';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('IndieHackers');
const rssParser = new Parser();
const INDIE_HACKERS_RSS_URL = 'https://www.indiehackers.com/feed';

/**
 * 从 IndieHackers RSS 获取真实数据
 */
async function fetchIndieHackersRSS(): Promise<TrendingItem[]> {
  try {
    const feed = await rssParser.parseURL(INDIE_HACKERS_RSS_URL);

    const items = (feed.items || [])
      .slice(0, 40)
      .map(item => ({
        title: item.title || '未知项目',
        description: item.contentSnippet || item.content || '',
        url: item.link || '',
        tags: item.categories || [],
        platform: 'IndieHackers',
        publishedAt: new Date(item.isoDate || item.pubDate || Date.now()),
        relevanceScore: 0
      }))
      .filter(item => item.url);

    logger.info(`✓ IndieHackers RSS: ${items.length} 条`);
    return items;
  } catch (error: any) {
    logger.warn(`IndieHackers RSS 失败: ${error.message}`);
    return [];
  }
}

/**
 * 获取 IndieHackers 数据
 */
export async function fetchIndieHackersData(
  _timeRange: string = '7d'
): Promise<TrendingItem[]> {
  return fetchIndieHackersRSS();
}
