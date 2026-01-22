/**
 * 市场热度分析
 * Market Heat Score = (社交媒体讨论 × GitHub趋势 × ProductHunt热度) / 10000
 */

import { MarketHeatScore } from './types';

/**
 * 计算市场热度
 */
export async function calculateMarketHeatScore(
  projectName: string,
  description: string,
  trendScore: number
): Promise<MarketHeatScore> {
  // 1. 社交媒体讨论热度（简化版）
  const socialMediaBuzz = analyzeSocialMediaBuzz(projectName, trendScore);

  // 2. GitHub 趋势（简化版）
  const githubTrend = await analyzeGithubTrend(projectName, description);

  // 3. Product Hunt 热度（简化版）
  const productHuntHeat = analyzeProductHuntHeat(projectName, description);

  // 计算市场热度
  const marketHeatScore =
    (socialMediaBuzz * githubTrend * productHuntHeat) / 10000;

  return {
    socialMediaBuzz,
    githubTrend,
    productHuntHeat,
    marketHeatScore
  };
}

/**
 * 社交媒体讨论热度分析（0-100）
 * 简化版：基于项目名称和趋势分数
 */
function analyzeSocialMediaBuzz(_projectName: string, trendScore: number): number {
  // 基于趋势分数和项目类型
  let score = trendScore * 0.8 + 20; // 基础分

  return Math.min(Math.max(score, 30), 95);
}

/**
 * GitHub 趋势分析（0-100）
 * 简化版：基于项目描述
 */
async function analyzeGithubTrend(_projectName: string, description: string): Promise<number> {
  const desc = `${_projectName} ${description}`.toLowerCase();

  // 技术相关关键词
  const techKeywords = [
    'github', 'open source', 'repository', 'code',
    'api', 'sdk', 'library', 'framework'
  ];

  let score = 50; // 基础分

  techKeywords.forEach(keyword => {
    if (desc.includes(keyword)) {
      score += 10;
    }
  });

  return Math.min(Math.max(score, 40), 90);
}

/**
 * Product Hunt 热度分析（0-100）
 * 简化版：基于项目描述
 */
function analyzeProductHuntHeat(_projectName: string, description: string): number {
  const desc = `${_projectName} ${description}`.toLowerCase();

  // SaaS/工具相关关键词
  const toolKeywords = [
    'tool', 'app', 'platform', 'service',
    'saas', 'product', 'software', 'extension'
  ];

  let score = 50; // 基础分

  toolKeywords.forEach(keyword => {
    if (desc.includes(keyword)) {
      score += 10;
    }
  });

  return Math.min(Math.max(score, 40), 90);
}
