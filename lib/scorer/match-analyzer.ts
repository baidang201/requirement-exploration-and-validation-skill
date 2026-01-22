/**
 * 执行人匹配度分析
 * Match Score = (技能匹配度 × 资源匹配度 × 经验匹配度) / 10000
 */

import { MatchScore, UserProfile } from './types';
import { extractKeywords } from '../utils/error-handler';

/**
 * 计算匹配度
 */
export async function calculateMatchScore(
  projectName: string,
  description: string,
  userProfile: UserProfile
): Promise<MatchScore> {
  // 1. 技能匹配度
  const skillMatch = analyzeSkillMatch(projectName, description, userProfile);

  // 2. 资源匹配度
  const resourceMatch = analyzeResourceMatch(projectName, description, userProfile);

  // 3. 经验匹配度
  const experienceMatch = analyzeExperienceMatch(description, userProfile);

  // 计算匹配度
  const matchScore =
    (skillMatch.score * resourceMatch.score * experienceMatch.score) / 10000;

  return {
    skillMatch: skillMatch.score,
    resourceMatch: resourceMatch.score,
    experienceMatch: experienceMatch.score,
    matchScore,
    details: {
      requiredSkills: skillMatch.required,
      availableSkills: skillMatch.available,
      missingSkills: skillMatch.missing,
      requiredResources: resourceMatch.required,
      availableResources: resourceMatch.available,
      missingResources: resourceMatch.missing
    }
  };
}

/**
 * 技能匹配度分析
 */
function analyzeSkillMatch(
  projectName: string,
  description: string,
  userProfile: UserProfile
): { score: number; required: string[]; available: string[]; missing: string[] } {
  // 推断项目所需技能
  const requiredSkills = inferRequiredSkills(projectName, description);

  // 用户现有技能
  const availableSkills = userProfile.profile.background.skills.map(s =>
    s.name.toLowerCase()
  );

  // 找出缺失技能
  const missingSkills = requiredSkills.filter(
    s => !availableSkills.some(a => a.includes(s.toLowerCase()))
  );

  // 计算技能覆盖率
  const coverageRate =
    requiredSkills.length > 0
      ? (requiredSkills.length - missingSkills.length) / requiredSkills.length
      : 1;

  // 考虑技能熟练度
  let skillLevelBonus = 0;
  requiredSkills.forEach(skill => {
    const userSkill = userProfile.profile.background.skills.find(
      s => s.name.toLowerCase() === skill.toLowerCase()
    );
    if (userSkill) {
      const levelBonus: Record<string, number> = {
        expert: 15,
        advanced: 10,
        intermediate: 5,
        beginner: 2
      };
      skillLevelBonus += levelBonus[userSkill.level] || 5;

      // 经验年限加分
      skillLevelBonus += Math.min(userSkill.years * 2, 10);
    }
  });

  const score = Math.min(Math.max(coverageRate * 100 + skillLevelBonus, 30), 100);

  return {
    score,
    required: requiredSkills,
    available: userProfile.profile.background.skills.map(s => s.name),
    missing: missingSkills
  };
}

/**
 * 推断项目所需技能
 */
function inferRequiredSkills(projectName: string, description: string): string[] {
  const desc = `${projectName} ${description}`.toLowerCase();

  const skillMap: Record<string, string[]> = {
    react: ['React', 'Frontend', 'JavaScript'],
    vue: ['Vue', 'Frontend', 'JavaScript'],
    angular: ['Angular', 'Frontend', 'JavaScript'],
    node: ['Node.js', 'Backend', 'JavaScript'],
    python: ['Python', 'Backend'],
    typescript: ['TypeScript', 'JavaScript'],
    chrome: ['JavaScript', 'Chrome Extension', 'Frontend'],
    extension: ['JavaScript', 'API'],
    api: ['API', 'Backend'],
    database: ['SQL', 'Database', 'Backend'],
    ml: ['Python', 'Machine Learning'],
    ai: ['Python', 'API', 'AI'],
    saas: ['Frontend', 'Backend', 'Database'],
    'full-stack': ['Frontend', 'Backend']
  };

  const requiredSkills = new Set<string>();

  // 默认技能
  requiredSkills.add('JavaScript');
  requiredSkills.add('Frontend');

  Object.entries(skillMap).forEach(([keyword, skills]) => {
    if (desc.includes(keyword)) {
      skills.forEach(skill => requiredSkills.add(skill));
    }
  });

  return Array.from(requiredSkills);
}

/**
 * 资源匹配度分析
 */
function analyzeResourceMatch(
  _projectName: string,
  description: string,
  userProfile: UserProfile
): { score: number; required: string[]; available: string[]; missing: string[] } {
  // 推断项目所需资源
  const requiredResources = inferRequiredResources(description);

  // 用户现有资源
  const availableResources = [
    ...userProfile.profile.resources.technical,
    ...userProfile.profile.resources.distribution,
    ...userProfile.profile.resources.other
  ].map(r => r.toLowerCase());

  // 找出缺失资源
  const missingResources = requiredResources.filter(r =>
    !availableResources.some(a => a.includes(r.toLowerCase()))
  );

  // 计算资源覆盖率
  const coverageRate =
    requiredResources.length > 0
      ? (requiredResources.length - missingResources.length) / requiredResources.length
      : 1;

  const score = Math.min(Math.max(coverageRate * 100, 40), 100);

  return {
    score,
    required: requiredResources,
    available: [
      ...userProfile.profile.resources.technical,
      ...userProfile.profile.resources.distribution
    ],
    missing: missingResources
  };
}

/**
 * 推断项目所需资源
 */
function inferRequiredResources(description: string): string[] {
  const desc = description.toLowerCase();
  const resources: string[] = [];

  // 基础资源
  resources.push('Hosting');
  resources.push('Domain');

  // 根据描述添加资源
  if (desc.includes('ai') || desc.includes('ml')) {
    resources.push('OpenAI API');
  }
  if (desc.includes('saas') || desc.includes('database')) {
    resources.push('Database');
  }
  if (desc.includes('payment') || desc.includes('subscription')) {
    resources.push('Stripe');
  }
  if (desc.includes('email')) {
    resources.push('Email Service');
  }

  return [...new Set(resources)];
}

/**
 * 经验匹配度分析
 */
function analyzeExperienceMatch(
  description: string,
  userProfile: UserProfile
): { score: number } {
  const desc = description.toLowerCase();
  const experience = userProfile.profile.background.experience.join(' ').toLowerCase();

  // 计算关键词重叠度
  const experienceKeywords = extractKeywords(experience);
  const projectKeywords = extractKeywords(desc);

  const overlap = projectKeywords.filter(k => experienceKeywords.includes(k));
  const matchRate = projectKeywords.length > 0 ? overlap.length / projectKeywords.length : 0.5;

  // 用户角色加分
  let roleBonus = 0;
  const role = userProfile.profile.background.role;

  if (role.includes('全栈') || role.toLowerCase().includes('fullstack')) {
    roleBonus += 10;
  } else if (role.includes('高级') || role.toLowerCase().includes('senior')) {
    roleBonus += 5;
  }

  const score = Math.min(Math.max(matchRate * 100 + roleBonus, 40), 100);

  return { score };
}
