/**
 * YAML 配置文件解析器
 * 处理用户配置文件的读取、验证和默认值填充
 */

import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

/**
 * 用户配置接口
 */
export interface UserProfile {
  profile: {
    project_types: string[];
    background: {
      name: string;
      role: string;
      skills: Array<{
        name: string;
        level: 'expert' | 'advanced' | 'intermediate' | 'beginner';
        years: number;
      }>;
      experience: string[];
      constraints: {
        time_budget: string;
        monetary_budget: number;
      };
    };
    resources: {
      technical: string[];
      distribution: string[];
      other: string[];
    };
    scoring_weights?: {
      blue_ocean: number;
      match_score: number;
      market_heat: number;
      feasibility: number;
    };
  };
}

/**
 * 默认配置
 */
export const DEFAULT_PROFILE: UserProfile = {
  profile: {
    project_types: ['AI SaaS 工具', 'Chrome 插件'],
    background: {
      name: '默认用户',
      role: '全栈开发者',
      skills: [
        { name: 'JavaScript', level: 'intermediate', years: 2 },
        { name: 'React', level: 'intermediate', years: 1 }
      ],
      experience: ['2 年 Web 开发经验'],
      constraints: {
        time_budget: '每周 15 小时',
        monetary_budget: 2000
      }
    },
    resources: {
      technical: ['Vercel 免费账号', 'OpenAI API Key', 'GitHub 账号'],
      distribution: ['Twitter 账号（500 粉丝）', '个人博客'],
      other: []
    },
    scoring_weights: {
      blue_ocean: 0.4,
      match_score: 0.3,
      market_heat: 0.2,
      feasibility: 0.1
    }
  }
};

/**
 * 配置文件路径优先级
 */
export function resolveConfigPath(customPath?: string): string {
  // 1. 命令行参数
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  // 2. 环境变量
  const envPath = process.env.USER_PROFILE_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  // 3. 默认路径
  const defaultPath = path.join(process.cwd(), 'config', 'user-profile.yaml');
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }

  return customPath || defaultPath;
}

/**
 * 读取 YAML 文件
 */
export function readYamlFile(filePath: string): any {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return yaml.parse(fileContent);
  } catch (error: any) {
    throw new Error(`YAML 解析失败: ${error.message}`);
  }
}

/**
 * 验证配置完整性
 */
export interface ValidationResult {
  config: any;
  warnings: string[];
}

export function validateConfig(config: any): ValidationResult {
  const warnings: string[] = [];

  // 验证 project_types
  if (!config.profile || !config.profile.project_types || config.profile.project_types.length === 0) {
    warnings.push('[WARNING] project_types 缺失或为空，将使用默认值');
  }

  // 验证 background
  if (!config.profile || !config.profile.background) {
    warnings.push('[WARNING] background 缺失，将使用默认值');
  } else {
    // 验证 skills
    if (!config.profile.background.skills || config.profile.background.skills.length === 0) {
      warnings.push('[WARNING] skills 缺失或为空，将使用默认值');
    }

    // 验证 constraints
    if (!config.profile.background.constraints) {
      warnings.push('[WARNING] constraints 缺失，将使用默认值');
    } else {
      if (!config.profile.background.constraints.time_budget) {
        warnings.push('[WARNING] time_budget 缺失，将使用默认值');
      }
      if (!config.profile.background.constraints.monetary_budget) {
        warnings.push('[WARNING] monetary_budget 缺失，将使用默认值');
      }
    }
  }

  // 验证 resources
  if (!config.profile || !config.profile.resources) {
    warnings.push('[WARNING] resources 缺失，将使用默认值');
  }

  return {
    config,
    warnings
  };
}

/**
 * 填充默认值
 */
export function applyDefaults(config: any): UserProfile {
  const merged = {
    profile: {
      ...DEFAULT_PROFILE.profile,
      ...config.profile,
      background: {
        ...DEFAULT_PROFILE.profile.background,
        ...config.profile?.background,
        skills: config.profile?.background?.skills || DEFAULT_PROFILE.profile.background.skills,
        experience: config.profile?.background?.experience || DEFAULT_PROFILE.profile.background.experience,
        constraints: {
          ...DEFAULT_PROFILE.profile.background.constraints,
          ...config.profile?.background?.constraints
        }
      },
      resources: {
        ...DEFAULT_PROFILE.profile.resources,
        ...config.profile?.resources,
        technical: config.profile?.resources?.technical || DEFAULT_PROFILE.profile.resources.technical,
        distribution: config.profile?.resources?.distribution || DEFAULT_PROFILE.profile.resources.distribution,
        other: config.profile?.resources?.other || DEFAULT_PROFILE.profile.resources.other
      },
      scoring_weights: {
        ...DEFAULT_PROFILE.profile.scoring_weights,
        ...config.profile?.scoring_weights
      }
    }
  } as UserProfile;

  // 验证评分权重总和
  const weights = merged.profile.scoring_weights!;
  const sum = weights.blue_ocean + weights.match_score + weights.market_heat + weights.feasibility;

  if (Math.abs(sum - 1.0) > 0.01) {
    logger.warn(`评分权重总和为 ${sum.toFixed(2)}，自动归一化`);

    // 归一化
    weights.blue_ocean /= sum;
    weights.match_score /= sum;
    weights.market_heat /= sum;
    weights.feasibility /= sum;

    logger.info(
      `归一化后权重：蓝海(${(weights.blue_ocean * 100).toFixed(0)}%), ` +
      `匹配度(${(weights.match_score * 100).toFixed(0)}%), ` +
      `热度(${(weights.market_heat * 100).toFixed(0)}%), ` +
      `可行性(${(weights.feasibility * 100).toFixed(0)}%)`
    );
  }

  return merged;
}

/**
 * 加载配置文件
 */
export function loadConfig(configPath?: string): UserProfile {
  const resolvedPath = resolveConfigPath(configPath);

  logger.info(`尝试读取配置文件：${resolvedPath}`);

  // 检查文件是否存在
  if (!fs.existsSync(resolvedPath)) {
    logger.warn(`配置文件未找到：${resolvedPath}`);
    logger.info('使用默认配置');
    return DEFAULT_PROFILE;
  }

  try {
    // 读取配置文件
    const rawConfig = readYamlFile(resolvedPath);

    // 验证配置
    const { warnings } = validateConfig(rawConfig);

    // 输出警告
    warnings.forEach(warning => logger.warn(warning.replace('[WARNING]', '')));

    // 填充默认值
    const withDefaults = applyDefaults(rawConfig);

    logger.success('配置文件加载成功');
    logger.info(
      `用户：${withDefaults.profile.background.name}（${withDefaults.profile.background.role}）`
    );
    logger.info(
      `项目类型：${withDefaults.profile.project_types.join('、')}`
    );

    return withDefaults;
  } catch (error: any) {
    logger.error(`配置文件读取失败：${error.message}`);
    logger.info('使用默认配置');
    return DEFAULT_PROFILE;
  }
}
