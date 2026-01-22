/**
 * 技术可行性分析
 * Feasibility Score = (技术栈熟悉度 × 开发时间估算 × 依赖资源可用性) / 10000
 */

import { FeasibilityScore, UserProfile } from './types';

/**
 * 计算可行性
 */
export async function calculateFeasibilityScore(
  projectName: string,
  description: string,
  userProfile: UserProfile
): Promise<FeasibilityScore> {
  // 1. 技术栈熟悉度
  const techFamiliarity = analyzeTechFamiliarity(projectName, description, userProfile);

  // 2. 开发时间估算
  const devTimeEstimate = estimateDevTime(projectName, description, userProfile);

  // 3. 依赖资源可用性
  const resourceAvailability = checkResourceAvailability(description, userProfile);

  // 计算可行性
  const feasibilityScore =
    (techFamiliarity * devTimeEstimate * resourceAvailability) / 10000;

  // 估算开发周数
  const estimatedWeeks = estimateDevWeeks(description, userProfile);

  return {
    techFamiliarity,
    devTimeEstimate,
    resourceAvailability,
    feasibilityScore,
    estimatedWeeks
  };
}

/**
 * 技术栈熟悉度分析（0-100）
 */
function analyzeTechFamiliarity(
  projectName: string,
  description: string,
  userProfile: UserProfile
): number {
  const requiredTech = inferRequiredTech(projectName, description);

  let totalFamiliarity = 0;
  let techCount = 0;

  requiredTech.forEach(tech => {
    const userSkill = userProfile.profile.background.skills.find(
      s => s.name.toLowerCase() === tech.toLowerCase()
    );

    if (userSkill) {
      // 基于熟练度和经验年限计算熟悉度
      const levelScore: Record<string, number> = {
        expert: 95,
        advanced: 80,
        intermediate: 60,
        beginner: 30
      };

      const baseScore = levelScore[userSkill.level] || 50;
      const yearsBonus = Math.min(userSkill.years * 5, 20);

      totalFamiliarity += Math.min(baseScore + yearsBonus, 100);
      techCount++;
    } else {
      // 无相关技能，给予学习潜力的基础分
      totalFamiliarity += 20;
      techCount++;
    }
  });

  return techCount > 0 ? totalFamiliarity / techCount : 50;
}

/**
 * 推断项目所需技术栈
 */
function inferRequiredTech(projectName: string, description: string): string[] {
  const desc = `${projectName} ${description}`.toLowerCase();

  const techMap: Record<string, string> = {
    react: 'React',
    vue: 'Vue',
    angular: 'Angular',
    node: 'Node.js',
    python: 'Python',
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    chrome: 'JavaScript',
    extension: 'JavaScript',
    api: 'API',
    database: 'SQL',
    ml: 'Python',
    ai: 'Python'
  };

  const requiredTech = new Set<string>();

  Object.entries(techMap).forEach(([keyword, tech]) => {
    if (desc.includes(keyword)) {
      requiredTech.add(tech);
    }
  });

  return Array.from(requiredTech);
}

/**
 * 开发时间估算（0-100，分数越高越可行）
 */
function estimateDevTime(
  projectName: string,
  description: string,
  userProfile: UserProfile
): number {
  // 推断项目复杂度
  const complexity = inferProjectComplexity(projectName, description);

  // 用户时间预算（小时/周）
  const timeBudget = parseTimeBudget(userProfile.profile.background.constraints.time_budget);

  // 估算开发周数
  const estimatedHours = complexity * 40; // 假设 1 复杂度 = 40 小时
  const estimatedWeeks = estimatedHours / timeBudget;

  // 可行性评分
  let score = 100;
  if (estimatedWeeks > 4) {
    score -= (estimatedWeeks - 4) * 5;
  }
  if (estimatedWeeks > 12) {
    score -= (estimatedWeeks - 12) * 3;
  }

  return Math.min(Math.max(score, 40), 100);
}

/**
 * 推断项目复杂度（1-10）
 */
function inferProjectComplexity(projectName: string, description: string): number {
  const desc = `${projectName} ${description}`.toLowerCase();

  let complexity = 3; // 基础复杂度

  // 复杂度加分项
  if (desc.includes('ai') || desc.includes('ml')) complexity += 2;
  if (desc.includes('database') || desc.includes('backend')) complexity += 2;
  if (desc.includes('real-time') || desc.includes('websocket')) complexity += 1;
  if (desc.includes('authentication') || desc.includes('payment')) complexity += 1;
  if (desc.includes('chrome extension')) complexity += 1;

  // 复杂度减分项
  if (desc.includes('simple') || desc.includes('basic') || desc.includes('minimal')) {
    complexity -= 1;
  }

  return Math.min(Math.max(complexity, 1), 10);
}

/**
 * 解析时间预算字符串
 */
function parseTimeBudget(timeBudget: string): number {
  const match = timeBudget.match(/(\d+)\s*(小时|hour|h)/i);
  if (match) {
    return parseInt(match[1], 10);
  }

  // 默认：15 小时/周
  return 15;
}

/**
 * 估算开发周数
 */
function estimateDevWeeks(description: string, userProfile: UserProfile): number {
  const complexity = inferProjectComplexity('', description);
  const timeBudget = parseTimeBudget(userProfile.profile.background.constraints.time_budget);

  const estimatedHours = complexity * 40;
  return Math.ceil(estimatedHours / timeBudget);
}

/**
 * 依赖资源可用性检查（0-100）
 */
function checkResourceAvailability(
  description: string,
  userProfile: UserProfile
): number {
  const requiredResources = inferRequiredResourcesFeasibility(description);

  const availableResources = [
    ...userProfile.profile.resources.technical,
    ...userProfile.profile.resources.distribution,
    ...userProfile.profile.resources.other
  ].map(r => r.toLowerCase());

  let availableCount = 0;

  requiredResources.forEach(resource => {
    if (availableResources.some(a => a.includes(resource.toLowerCase()))) {
      availableCount++;
    }
  });

  const availabilityRate =
    requiredResources.length > 0 ? availableCount / requiredResources.length : 1;

  return availabilityRate * 100;
}

/**
 * 推断项目所需资源（可行性分析专用）
 */
function inferRequiredResourcesFeasibility(description: string): string[] {
  const desc = description.toLowerCase();
  const resources: string[] = [];

  // 基础资源
  resources.push('Hosting');

  // 根据描述添加资源
  if (desc.includes('ai') || desc.includes('ml')) {
    resources.push('OpenAI API');
  }
  if (desc.includes('database')) {
    resources.push('Database');
  }
  if (desc.includes('payment')) {
    resources.push('Stripe');
  }

  return [...new Set(resources)];
}
