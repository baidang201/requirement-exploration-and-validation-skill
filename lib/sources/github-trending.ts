/**
 * GitHub Trending 数据源
 */

import { TrendingItem } from './types';
import { fetchWithRetry } from '../utils/error-handler';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('GitHub');

/**
 * 获取 GitHub Trending 数据
 */
export async function fetchGitHubTrendingData(
  _timeRange: string = '7d'
): Promise<TrendingItem[]> {
  try {
    // 使用 GitHub Search API 搜索 AI 相关仓库
    const query = 'language:typescript OR language:python ai OR ml OR saas';
    const response = await fetchWithRetry(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`
          })
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
    const repos = data.items || [];

    const results = repos.map((repo: any) => ({
      title: repo.full_name,
      description: repo.description || '',
      url: repo.html_url,
      tags: repo.topics || [],
      platform: 'GitHub Trending',
      publishedAt: new Date(repo.created_at),
      relevanceScore: 0
    }));

    logger.info(`✓ GitHub Trending: ${results.length} 条`);
    return results;
  } catch (error: any) {
    logger.warn(`GitHub Trending 失败: ${error.message}`);
    return [];
  }
}
