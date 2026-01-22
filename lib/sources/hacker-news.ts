/**
 * Hacker News 数据源
 */

import { TrendingItem } from './types';
import { fetchWithRetry } from '../utils/error-handler';
import { createChildLogger } from '../utils/logger';

const logger = createChildLogger('HackerNews');

/**
 * 计算 AI 相关性
 */
function calculateAIRelevance(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  const aiKeywords = [
    'ai', 'gpt', 'chatgpt', 'openai', 'claude', 'gemini',
    'llm', 'machine learning', 'deep learning', 'neural',
    'automation', 'copilot', 'agent'
  ];

  let score = 0;
  aiKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      score += 20;
    }
  });

  return Math.min(score, 100);
}

/**
 * 获取 Hacker News 数据
 */
export async function fetchHackerNewsData(
  _timeRange: string = '7d'
): Promise<TrendingItem[]> {
  try {
    // 获取热门故事 ID 列表
    const response = await fetchWithRetry(
      'https://hacker-news.firebaseio.com/v0/topstories.json',
      {},
      {
        maxRetries: 2,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      }
    );

    const storyIds = await response.json() as number[];
    const results: TrendingItem[] = [];
    const top50 = storyIds.slice(0, 50);

    for (const id of top50) {
      try {
        const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        const story = await storyResponse.json() as any;

        if (!story) continue;

        const aiRelevance = calculateAIRelevance(story.title, story.text || '');

        // 只保留相关性 > 30 的内容
        if (aiRelevance > 30) {
          results.push({
            title: story.title,
            description: story.text || '',
            url: story.url || `https://news.ycombinator.com/item?id=${id}`,
            tags: [],
            platform: 'Hacker News',
            publishedAt: new Date(story.time * 1000),
            relevanceScore: aiRelevance
          });
        }
      } catch (error) {
        // 继续处理下一个故事
      }
    }

    logger.info(`✓ Hacker News: ${results.length} 条（过滤后）`);
    return results;
  } catch (error: any) {
    logger.warn(`Hacker News API 失败: ${error.message}`);
    return [];
  }
}
