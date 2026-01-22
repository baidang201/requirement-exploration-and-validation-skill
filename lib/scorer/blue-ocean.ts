/**
 * 蓝海分计算
 * Blue Ocean Score = (流量稳定性 × 竞品质量差距 × 变现可行性) / 10000
 */

import { BlueOceanScore } from './types';

/**
 * 计算蓝海分
 */
export async function calculateBlueOceanScore(
  projectName: string,
  description: string,
  trendScore: number
): Promise<BlueOceanScore> {
  // 1. 流量稳定性评估
  const trafficStability = evaluateTrafficStability(trendScore);

  // 2. 竞品质量差距评估（简化版，实际需要竞品分析）
  const qualityGap = await evaluateCompetitorQualityGap(projectName, description);

  // 3. 变现可行性评估
  const monetizationFeasibility = evaluateMonetizationFeasibility(description);

  // 计算蓝海分
  const blueOceanScore =
    (trafficStability * qualityGap * monetizationFeasibility) / 10000;

  return {
    trafficStability,
    qualityGap,
    monetizationFeasibility,
    blueOceanScore
  };
}

/**
 * 流量稳定性评估（0-100）
 */
function evaluateTrafficStability(trendScore: number): number {
  // 基于热搜分数
  let score = trendScore;

  // 确保在合理范围
  score = Math.min(Math.max(score, 30), 95);

  return score;
}

/**
 * 竞品质量差距评估（0-100）
 * 简化版：基于项目名称和描述推断
 */
async function evaluateCompetitorQualityGap(
  projectName: string,
  description: string
): Promise<number> {
  const desc = `${projectName} ${description}`.toLowerCase();

  // 蓝海关键词
  const blueOceanKeywords = [
    'new', 'innovative', 'first', 'unique', 'breakthrough',
    'novel', 'revolutionary', 'disruptive', 'cutting-edge'
  ];

  // 红海关键词（竞争激烈）
  const redOceanKeywords = [
    'another', 'yet another', 'me too', 'clone', 'copy'
  ];

  let score = 60; // 基础分

  // 蓝海关键词加分
  blueOceanKeywords.forEach(keyword => {
    if (desc.includes(keyword)) {
      score += 10;
    }
  });

  // 红海关键词减分
  redOceanKeywords.forEach(keyword => {
    if (desc.includes(keyword)) {
      score -= 20;
    }
  });

  return Math.min(Math.max(score, 20), 95);
}

/**
 * 变现可行性评估（0-100）
 */
function evaluateMonetizationFeasibility(description: string): number {
  const desc = description.toLowerCase();

  // 高商业意图关键词
  const highCommercialIntent = [
    'saas', 'tool', 'platform', 'service', 'business',
    'automation', 'productivity', 'analytics', 'management',
    'subscription', 'payment', 'pricing', 'enterprise'
  ];

  // 低商业意图关键词
  const lowCommercialIntent = [
    'free', 'open source', 'community', 'blog', 'tutorial',
    'educational', 'non-profit', 'hobby'
  ];

  let score = 60; // 基础分

  highCommercialIntent.forEach(keyword => {
    if (desc.includes(keyword)) {
      score += 8;
    }
  });

  lowCommercialIntent.forEach(keyword => {
    if (desc.includes(keyword)) {
      score -= 15;
    }
  });

  return Math.min(Math.max(score, 30), 95);
}
