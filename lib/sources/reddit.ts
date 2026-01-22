/**
 * Reddit 数据源
 */

import { TrendingItem } from './types';
import { fetchWithRetry } from '../utils/error-handler';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('Reddit');

/**
 * Reddit 子版块列表
 */
const SUBREDDITS = [
  'artificial',
  'MachineLearning',
  'SaaS',
  'Entrepreneur',
  'SideProject',
  'Entrepreneur',
  'startups'
];

/**
 * 获取 Reddit 数据
 */
export async function fetchRedditData(
  _timeRange: string = '7d'
): Promise<TrendingItem[]> {
  const results: TrendingItem[] = [];

  for (const subreddit of SUBREDDITS) {
    try {
      const response = await fetchWithRetry(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=20`,
        {},
        {
          maxRetries: 2,
          initialDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 2
        }
      );

      const data = await response.json() as any;

      if (!data.data || !data.data.children) {
        logger.warn(`r/${subreddit}: 数据格式错误`);
        continue;
      }

      data.data.children.forEach((post: any) => {
        const title = post.data.title;
        const description = post.data.selftext || post.data.url || '';

        results.push({
          title,
          description,
          url: `https://www.reddit.com${post.data.permalink}`,
          tags: [],
          platform: `Reddit (r/${subreddit})`,
          publishedAt: new Date(post.data.created_utc * 1000),
          relevanceScore: 0
        });
      });

      logger.info(`  ✓ r/${subreddit}: ${data.data.children.length} 条`);
    } catch (error: any) {
      logger.warn(`  ✗ r/${subreddit}: ${error.message}`);
    }
  }

  logger.info(`✓ Reddit 总计: ${results.length} 条`);
  return results;
}
