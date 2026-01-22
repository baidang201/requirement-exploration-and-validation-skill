/**
 * 项目提取器
 * 从热搜数据中提取潜在项目机会
 */

import { TrendingItem } from './sources/types';
import { createChildLogger } from './utils/logger';
import { truncateText } from './utils/error-handler';

const logger = createChildLogger('ProjectExtractor');

/**
 * 候选项目接口
 */
export interface CandidateProject {
  id: string;
  name: string;
  description: string;
  painPoints: string[];
  targetUsers: string[];
  sourcePlatform: string;
  sourceUrl: string;
  trendScore: number;
  projectType: string;
  extractedAt: Date;
}

/**
 * 从热搜数据提取候选项目
 */
export async function extractCandidateProjects(
  trendingData: TrendingItem[],
  projectTypes: string[]
): Promise<CandidateProject[]> {
  const candidates: CandidateProject[] = [];

  logger.info(`开始提取候选项目...（输入：${trendingData.length} 条）`);

  for (const item of trendingData) {
    try {
      // 提取核心需求/痛点
      const painPoints = extractPainPoints(item.title, item.description);

      // 推断目标用户
      const targetUsers = inferTargetAudience(item.title, item.description);

      // 匹配项目类型
      const projectType = matchProjectType(item, projectTypes);

      // 生成项目名称
      const projectName = generateProjectName(item.title);

      candidates.push({
        id: generateId(),
        name: projectName,
        description: generateDescription(item),
        painPoints,
        targetUsers,
        sourcePlatform: item.platform,
        sourceUrl: item.url,
        trendScore: item.relevanceScore,
        projectType,
        extractedAt: new Date()
      });
    } catch (error: any) {
      logger.warn(`项目提取失败: ${item.title}, 错误: ${error.message}`);
    }
  }

  logger.info(`✓ 提取到 ${candidates.length} 个候选项目`);

  return candidates;
}

/**
 * 提取痛点
 */
function extractPainPoints(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const painPointPatterns = [
    /problem|pain|difficult|hard|struggle|challenge/gi,
    /need|want|wish|hope|require/gi,
    /issue|bug|error|fail|crash/gi,
    /slow|expensive|complex|complicated|confusing/gi,
    /time-consuming|tedious|repetitive|boring/gi
  ];

  const painPoints: string[] = [];

  painPointPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      painPoints.push(...matches);
    }
  });

  // 去重
  return [...new Set(painPoints)].slice(0, 5);
}

/**
 * 推断目标用户
 */
function inferTargetAudience(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();

  const audienceMap: Record<string, string[]> = {
    'developer': ['开发者', '程序员', '技术团队', '软件工程师'],
    'entrepreneur': ['创业者', '独立开发者', '初创团队'],
    'business': ['企业', '商家', 'B2B 客户', '公司'],
    'consumer': ['普通用户', '个人用户', '消费者'],
    'student': ['学生', '学习者', '研究者'],
    'writer': ['作者', '写作者', '内容创作者', '博主'],
    'marketer': ['营销人员', '市场团队', '广告主']
  };

  const audiences: string[] = [];

  Object.entries(audienceMap).forEach(([key, values]) => {
    if (text.includes(key)) {
      audiences.push(...values);
    }
  });

  return audiences.length > 0 ? [...new Set(audiences)] : ['普通用户'];
}

/**
 * 匹配项目类型
 */
function matchProjectType(item: TrendingItem, projectTypes: string[]): string {
  const text = `${item.title} ${item.description} ${item.tags.join(' ')}`.toLowerCase();

  for (const type of projectTypes) {
    const typeLower = type.toLowerCase();
    if (
      text.includes(typeLower) ||
      typeLower.includes('ai') && text.includes('ai') ||
      typeLower.includes('saas') && text.includes('saas') ||
      typeLower.includes('chrome') && text.includes('chrome')
    ) {
      return type;
    }
  }

  return projectTypes[0] || '通用项目';
}

/**
 * 生成项目名称
 */
function generateProjectName(title: string): string {
  // 简化标题
  return truncateText(title, 60, '');
}

/**
 * 生成项目描述
 */
function generateDescription(item: TrendingItem): string {
  const baseDesc = item.description || item.title;

  return truncateText(baseDesc, 200, '...');
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
