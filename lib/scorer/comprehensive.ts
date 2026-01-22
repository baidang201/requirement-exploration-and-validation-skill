/**
 * 综合评分计算器
 * 综合分 = 蓝海分×权重1 + 匹配度×权重2 + 热度×权重3 + 可行性×权重4
 */

import { ComprehensiveScore, UserProfile } from './types';
import { calculateBlueOceanScore } from './blue-ocean';
import { calculateMatchScore } from './match-analyzer';
import { calculateMarketHeatScore } from './market-heat-analyzer';
import { calculateFeasibilityScore } from './feasibility-analyzer';

/**
 * 计算综合分
 */
export async function calculateComprehensiveScore(
  projectName: string,
  description: string,
  trendScore: number,
  userProfile: UserProfile
): Promise<ComprehensiveScore> {
  // 获取用户自定义权重
  const weights = userProfile.profile.scoring_weights || {
    blue_ocean: 0.4,
    match_score: 0.3,
    market_heat: 0.2,
    feasibility: 0.1
  };

  // 1. 蓝海分
  const blueOceanResult = await calculateBlueOceanScore(projectName, description, trendScore);

  // 2. 匹配度
  const matchResult = await calculateMatchScore(projectName, description, userProfile);

  // 3. 市场热度
  const heatResult = await calculateMarketHeatScore(projectName, description, trendScore);

  // 4. 可行性
  const feasibilityResult = await calculateFeasibilityScore(projectName, description, userProfile);

  // 计算综合分
  const comprehensiveScore =
    blueOceanResult.blueOceanScore * weights.blue_ocean +
    matchResult.matchScore * weights.match_score +
    heatResult.marketHeatScore * weights.market_heat +
    feasibilityResult.feasibilityScore * weights.feasibility;

  return {
    blueOceanScore: blueOceanResult.blueOceanScore,
    matchScore: matchResult.matchScore,
    marketHeatScore: heatResult.marketHeatScore,
    feasibilityScore: feasibilityResult.feasibilityScore,
    comprehensiveScore,
    breakdown: {
      blueOcean: {
        score: blueOceanResult,
        weight: weights.blue_ocean,
        details: blueOceanResult
      },
      match: {
        score: matchResult,
        weight: weights.match_score,
        details: matchResult.details
      },
      heat: {
        score: heatResult,
        weight: weights.market_heat,
        details: heatResult
      },
      feasibility: {
        score: feasibilityResult,
        weight: weights.feasibility,
        details: feasibilityResult
      }
    }
  };
}
