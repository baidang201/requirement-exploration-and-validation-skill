/**
 * GitHub Trending 数据源
 * 通过抓取 GitHub Trending 页面获取数据
 */

import { TrendingItem } from './types';
import { fetchWithRetry } from '../utils/error-handler';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('GitHub');

/**
 * 从 HTML 解析 GitHub Trending 数据
 */
async function fetchGitHubTrendingHTML(_timeRange: string = '7d'): Promise<TrendingItem[]> {
  try {
    // GitHub Trending 页面
    const url = `https://github.com/trending`;

    const response = await fetchWithRetry(
      url,
      {
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
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

    const html = await response.text();

    // 简单的 HTML 解析（使用正则表达式）
    const repoRegex = /<article[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<a[^>]*href="\/([^\/"]+)\/([^\/"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/article>/g;
    const repos: TrendingItem[] = [];
    let match;
    let count = 0;

    while ((match = repoRegex.exec(html)) !== null && count < 30) {
      const owner = match[1];
      const name = match[2];
      const description = match[4]
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();

      if (owner && name) {
        repos.push({
          title: `${owner}/${name}`,
          description,
          url: `https://github.com/${owner}/${name}`,
          tags: [],
          platform: 'GitHub Trending',
          publishedAt: new Date(),
          relevanceScore: 0
        });
        count++;
      }
    }

    logger.info(`✓ GitHub Trending HTML: ${repos.length} 条`);
    return repos;
  } catch (error: any) {
    logger.warn(`GitHub Trending HTML 失败: ${error.message}`);
    return [];
  }
}

/**
 * 使用 GitHub Search API 搜索仓库（fallback）
 */
async function fetchGitHubSearchAPI(): Promise<TrendingItem[]> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    logger.info('GitHub Token 未配置');
    return [];
  }

  try {
    // Fine-grained token 使用 Bearer 格式
    const authHeader = token.startsWith('github_pat_')
      ? `Bearer ${token}`
      : `token ${token}`;

    const query = 'language:typescript OR language:python ai OR ml OR saas';
    const response = await fetchWithRetry(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': authHeader
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
      platform: 'GitHub Search',
      publishedAt: new Date(repo.created_at),
      relevanceScore: 0
    }));

    logger.info(`✓ GitHub Search API: ${results.length} 条`);
    return results;
  } catch (error: any) {
    logger.warn(`GitHub Search API 失败: ${error.message}`);
    return [];
  }
}

/**
 * 获取 GitHub Trending 数据
 */
export async function fetchGitHubTrendingData(
  timeRange: string = '7d'
): Promise<TrendingItem[]> {
  // 优先使用 HTML scraping（不需要 token）
  const htmlResults = await fetchGitHubTrendingHTML(timeRange);

  if (htmlResults.length > 0) {
    return htmlResults;
  }

  // Fallback 到 Search API（需要 token）
  logger.info('HTML 抓取失败，尝试使用 Search API');
  return await fetchGitHubSearchAPI();
}
