/**
 * 需求挖掘与验证系统 - 主入口
 */

import 'dotenv/config';
import { loadConfig } from './utils/yaml-parser';
import { logger, LogLevel } from './utils/logger';
import { collectTrendingData, generateSeedProjects } from './data-collector';
import { extractCandidateProjects } from './project-extractor';
import { calculateComprehensiveScore } from './scorer/comprehensive';
import { generateReport, ScoredProject } from './report-generator';

/**
 * 配置接口
 */
export interface ExplorationConfig {
  configPath?: string;
  outputDir?: string;
  timeRange?: string;
  logLevel?: LogLevel;
}

/**
 * 主执行函数
 */
export async function runExploration(config: ExplorationConfig = {}): Promise<void> {
  const startTime = Date.now();

  try {
    // 设置日志级别
    if (config.logLevel) {
      logger.setLevel(config.logLevel);
    }

    logger.separator('=');
    logger.info('需求挖掘与验证系统');
    logger.separator('=');
    logger.info('');

    // Phase 1: 初始化
    logger.info('Phase 1: 初始化（读取配置）');
    logger.separator('-');

    const userProfile = loadConfig(config.configPath);
    const warnings: string[] = [];

    logger.separator('-');
    logger.info('');

    // Phase 2: 数据采集
    logger.info('Phase 2: 数据采集（多源并行抓取）');
    logger.separator('=');

    const dataSourceConfig = {
      timeRange: config.timeRange || '7d',
      projectTypes: userProfile.profile.project_types
    };

    let collectionResult = await collectTrendingData(dataSourceConfig);

    // 如果所有数据源失败，使用种子词
    if (collectionResult.items.length === 0) {
      logger.warn('所有数据源失败，使用预设种子词');
      collectionResult = await generateSeedProjects(userProfile.profile.project_types);
    }

    warnings.push(...collectionResult.warnings);

    logger.info('');
    logger.separator('=');
    logger.info('');

    // Phase 3: 候选项目提取
    logger.info('Phase 3: 候选项目提取');
    logger.separator('-');

    const candidates = await extractCandidateProjects(
      collectionResult.items,
      userProfile.profile.project_types
    );

    logger.info(`✓ 提取到 ${candidates.length} 个候选项目`);
    logger.separator('-');
    logger.info('');

    // Phase 4: 四维度评分
    logger.info('Phase 4: 四维度评分');
    logger.separator('=');
    logger.info(`开始评分...（${candidates.length} 个项目）`);

    const scoredProjects: ScoredProject[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const project = candidates[i];
      logger.info(`  [${i + 1}/${candidates.length}] 评分：${project.name}`);

      try {
        const scores = await calculateComprehensiveScore(
          project.name,
          project.description,
          project.trendScore,
          userProfile
        );

        scoredProjects.push({
          project,
          scores
        });
      } catch (error: any) {
        logger.warn(`  ✗ 评分失败：${error.message}`);
        warnings.push(`[WARNING] 项目 "${project.name}" 评分失败: ${error.message}`);
      }
    }

    logger.info(`✓ 评分完成：${scoredProjects.length} 个项目`);
    logger.separator('=');
    logger.info('');

    // Phase 5: 需求验证（简化版，已在评分中包含）
    logger.info('Phase 5: 需求验证');
    logger.separator('-');
    logger.info('✓ 需求验证已在四维度评分中包含');
    logger.separator('-');
    logger.info('');

    // Phase 6: 排序与输出
    logger.info('Phase 6: 排序与输出');
    logger.separator('=');

    const reportResult = await generateReport(
      scoredProjects,
      userProfile,
      warnings,
      config.outputDir || 'outputs'
    );

    logger.separator('=');
    logger.info('');
    logger.separator('=');
    logger.success('执行完成！');
    logger.separator('=');
    logger.info('');
    logger.info(`📄 报告已保存到：${reportResult.filepath}`);
    logger.info(`📊 总耗时：${((Date.now() - startTime) / 1000).toFixed(1)} 秒`);
    logger.info(`📅 下次执行时间：${nextRunTime()}`);
    logger.info('');
  } catch (error: any) {
    logger.error(`执行失败：${error.message}`);
    logger.error(error.stack || '');
    process.exit(1);
  }
}

/**
 * CLI 入口
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const config: ExplorationConfig = {
    configPath: args.find(a => a.startsWith('--config='))?.split('=')[1],
    outputDir: args.find(a => a.startsWith('--output='))?.split('=')[1] || 'outputs',
    timeRange: args.find(a => a.startsWith('--time-range='))?.split('=')[1] || '7d'
  };

  await runExploration(config);
}

/**
 * 下次运行时间
 */
function nextRunTime(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.toLocaleString('zh-CN');
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
