/**
 * 数据采集器
 * 聚合所有数据源，执行并行采集和过滤
 */

import { TrendingItem, DataCollectionResult, DataSourceConfig } from './sources/types';
import { fetchProductHuntData } from './sources/product-hunt';
import { fetchRedditData } from './sources/reddit';
import { fetchHackerNewsData } from './sources/hacker-news';
import { fetchGitHubTrendingData } from './sources/github-trending';
import { fetchIndieHackersData } from './sources/indiehackers';
import { fetchBensBitesRSS, fetchTLDRAIRSS } from './sources/rss';
import { createChildLogger } from './utils/logger';
import { extractKeywords } from './utils/error-handler';

const logger = createChildLogger('DataCollector');

/**
 * 根据项目类型过滤数据
 */
function filterByProjectTypes(
  items: TrendingItem[],
  projectTypes: string[]
): TrendingItem[] {
  // 提取项目类型关键词
  const keywords = extractKeywords(projectTypes.join(' '));

  return items.filter(item => {
    const text = `${item.title} ${item.description} ${item.tags.join(' ')}`.toLowerCase();

    // 计算相关性
    let relevance = 0;
    keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        relevance += 20;
      }
    });

    item.relevanceScore = Math.min(relevance, 100);

    // 相关性阈值
    return item.relevanceScore > 30 || keywords.length === 0;
  });
}

/**
 * 聚合去重
 */
function aggregateAndDeduplicate(items: TrendingItem[]): TrendingItem[] {
  const seen = new Set<string>();
  const deduplicated: TrendingItem[] = [];

  for (const item of items) {
    // 使用 URL 作为唯一标识
    const key = item.url;

    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(item);
    }
  }

  return deduplicated;
}

/**
 * 主数据采集函数
 */
export async function collectTrendingData(
  config: DataSourceConfig
): Promise<DataCollectionResult> {
  const warnings: string[] = [];
  const sourceStats = new Map<string, number>();
  const allItems: TrendingItem[] = [];

  logger.info('开始数据采集...');
  logger.separator();

  // Phase 1: API 数据源
  logger.info('Phase 1: API 数据源');

  const apiSources = [
    { name: 'Product Hunt', fetch: fetchProductHuntData(config.timeRange) },
    { name: 'Reddit', fetch: fetchRedditData(config.timeRange) },
    { name: 'Hacker News', fetch: fetchHackerNewsData(config.timeRange) },
    { name: 'GitHub Trending', fetch: fetchGitHubTrendingData(config.timeRange) },
    { name: 'IndieHackers', fetch: fetchIndieHackersData(config.timeRange) }
  ];

  for (const source of apiSources) {
    try {
      const items = await source.fetch;

      if (items.length > 0) {
        sourceStats.set(source.name, items.length);
        allItems.push(...items);
      } else {
        warnings.push(`[WARNING] ${source.name} 返回空数据`);
      }
    } catch (error: any) {
      warnings.push(`[WARNING] ${source.name} 失败: ${error.message}`);
    }
  }

  logger.separator();

  // Phase 2: RSS 数据源
  logger.info('Phase 2: RSS 订阅数据源');

  const rssSources = [
    { name: "Ben's Bites", fetch: fetchBensBitesRSS(config.timeRange) },
    { name: 'TLDR AI', fetch: fetchTLDRAIRSS(config.timeRange) }
  ];

  for (const source of rssSources) {
    try {
      const items = await source.fetch;

      if (items.length > 0) {
        sourceStats.set(source.name, items.length);
        allItems.push(...items);
      } else {
        warnings.push(`[WARNING] ${source.name} 返回空数据`);
      }
    } catch (error: any) {
      warnings.push(`[WARNING] ${source.name} 失败: ${error.message}`);
    }
  }

  logger.separator();

  // Phase 3: 需要登录的平台（跳过）
  logger.info('Phase 3: 跳过需要登录的平台');
  warnings.push('[INFO] 跳过微博热搜（需要登录，后期接入）');
  warnings.push('[INFO] 跳过小红书热搜（需要登录，后期接入）');
  warnings.push('[INFO] 跳过推特（需要登录，后期接入）');

  logger.separator();

  // Phase 4: 根据项目类型过滤
  logger.info('Phase 4: 根据项目类型过滤');
  const filtered = filterByProjectTypes(allItems, config.projectTypes);
  logger.info(`✓ 过滤后: ${filtered.length} 条`);

  // Phase 5: 聚合去重
  logger.info('Phase 5: 聚合去重');
  const deduplicated = aggregateAndDeduplicate(filtered);
  logger.info(`✓ 去重后: ${deduplicated.length} 条`);

  logger.separator();
  logger.success('数据采集完成！');
  logger.separator();

  // 输出统计
  logger.info('数据源统计：');
  sourceStats.forEach((count, source) => {
    logger.info(`  - ${source}: ${count} 条`);
  });

  return {
    items: deduplicated,
    warnings,
    sourceStats
  };
}

/**
 * 使用预设种子词生成候选项目（所有数据源失败时）
 */
export async function generateSeedProjects(
  projectTypes: string[]
): Promise<DataCollectionResult> {
  logger.warn('所有数据源失败，使用预设种子词生成候选项目');

  const seedTopics = [
    'AI 写作助手',
    'AI 代码生成器',
    'Chrome 生产力插件',
    'Notion 模板工具',
    'GitHub 增强',
    'AI 图像生成',
    'Markdown 编辑器',
    'API 调试工具',
    '数据库管理工具',
    'CI/CD 可视化'
  ];

  const items: TrendingItem[] = seedTopics.map(topic => ({
    title: topic,
    description: `基于${topic}的自动化工具，提升工作效率`,
    url: `https://example.com/${encodeURIComponent(topic)}`,
    tags: projectTypes,
    platform: '种子词生成',
    publishedAt: new Date(),
    relevanceScore: 50
  }));

  return {
    items,
    warnings: ['[INFO] 使用预设种子词生成候选项目'],
    sourceStats: new Map([['种子词', items.length]])
  };
}
