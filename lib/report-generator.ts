/**
 * 报告生成器
 * 生成 Top 10 Markdown 报告
 */

import * as fs from 'fs';
import * as path from 'path';
import { createChildLogger } from './utils/logger';
import { formatDate } from './utils/error-handler';
import { CandidateProject } from './project-extractor';
import { ComprehensiveScore, UserProfile } from './scorer/types';

const logger = createChildLogger('ReportGenerator');

/**
 * 项目评分结果
 */
export interface ScoredProject {
  project: CandidateProject;
  scores: ComprehensiveScore;
  rank?: number;
}

/**
 * 报告生成结果
 */
export interface ReportGenerationResult {
  markdown: string;
  filename: string;
  filepath: string;
}

/**
 * 生成报告
 */
export async function generateReport(
  scoredProjects: ScoredProject[],
  userProfile: UserProfile,
  warnings: string[],
  outputDir: string = 'outputs'
): Promise<ReportGenerationResult> {
  logger.info('开始生成报告...');

  // 1. 按综合分排序
  const sorted = scoredProjects.sort(
    (a, b) => b.scores.comprehensiveScore - a.scores.comprehensiveScore
  );

  // 2. 取 Top 10
  const top10 = sorted.slice(0, 10);
  top10.forEach((item, index) => {
    item.rank = index + 1;
  });

  // 3. 生成 Markdown
  const markdown = generateMarkdownReport(
    top10,
    sorted,
    userProfile,
    warnings
  );

  // 4. 生成文件名
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = `report-${timestamp}-${time}.md`;

  // 5. 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 6. 保存文件
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, markdown, 'utf-8');

  logger.success(`报告已生成：${filepath}`);

  return { markdown, filename, filepath };
}

/**
 * 生成 Markdown 报告
 */
function generateMarkdownReport(
  top10: ScoredProject[],
  allProjects: ScoredProject[],
  userProfile: UserProfile,
  warnings: string[]
): string {
  const lines: string[] = [];

  // 标题
  lines.push('# 需求挖掘与验证报告');
  lines.push('');
  lines.push(`**生成时间**：${formatDate(new Date())}`);
  lines.push(
    `**执行人**：${userProfile.profile.background.name}（${userProfile.profile.background.role}）`
  );
  lines.push('');
  lines.push('---');
  lines.push('');

  // 执行摘要
  lines.push('## 执行摘要');
  lines.push('');
  lines.push('### 数据采集情况');
  lines.push('- 数据源：Product Hunt, Reddit, Hacker News, GitHub, IndieHackers, Ben\'s Bites, TLDR AI');
  lines.push(`- **候选项目数量**：${allProjects.length} 个`);
  lines.push(`- **最终推荐**：Top ${top10.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Top 10 项目
  lines.push('## Top 10 推荐项目');
  lines.push('');

  top10.forEach((item) => {
    const { project, scores, rank } = item;
    lines.push(`### #${rank} ${project.name}`);
    lines.push('');
    lines.push(`**综合评分**：⭐ ${scores.comprehensiveScore.toFixed(1)}/100`);
    lines.push('');
    lines.push('**项目描述**');
    lines.push(project.description);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('#### 📊 四维度评分');
    lines.push('');
    lines.push('| 维度 | 得分 | 详情 |');
    lines.push('|------|------|------|');
    lines.push(
      `| **蓝海分** | ${scores.blueOceanScore.toFixed(1)}/100 | 流量(${scores.breakdown.blueOcean.score.trafficStability.toFixed(0)}) × 竞品差距(${scores.breakdown.blueOcean.score.qualityGap.toFixed(0)}) × 变现(${scores.breakdown.blueOcean.score.monetizationFeasibility.toFixed(0)}) ÷ 10000 |`
    );
    lines.push(
      `| **执行人匹配度** | ${scores.matchScore.toFixed(1)}/100 | 技能(${scores.breakdown.match.score.skillMatch.toFixed(0)}) × 资源(${scores.breakdown.match.score.resourceMatch.toFixed(0)}) × 经验(${scores.breakdown.match.score.experienceMatch.toFixed(0)}) ÷ 10000 |`
    );
    lines.push(
      `| **市场热度** | ${scores.marketHeatScore.toFixed(1)}/100 | 社交媒体(${scores.breakdown.heat.score.socialMediaBuzz.toFixed(0)}) × GitHub(${scores.breakdown.heat.score.githubTrend.toFixed(0)}) × PH(${scores.breakdown.heat.score.productHuntHeat.toFixed(0)}) ÷ 10000 |`
    );
    lines.push(
      `| **技术可行性** | ${scores.feasibilityScore.toFixed(1)}/100 | 技术栈(${scores.breakdown.feasibility.score.techFamiliarity.toFixed(0)}) × 时间(${scores.breakdown.feasibility.score.devTimeEstimate.toFixed(0)}) × 资源(${scores.breakdown.feasibility.score.resourceAvailability.toFixed(0)}) ÷ 10000 |`
    );
    lines.push('');
    lines.push(
      `**综合分计算**：${scores.blueOceanScore.toFixed(1)}×${scores.breakdown.blueOcean.weight} + ${scores.matchScore.toFixed(1)}×${scores.breakdown.match.weight} + ${scores.marketHeatScore.toFixed(1)}×${scores.breakdown.heat.weight} + ${scores.feasibilityScore.toFixed(1)}×${scores.breakdown.feasibility.weight} = ${scores.comprehensiveScore.toFixed(1)}`
    );
    lines.push('');
    lines.push('---');
    lines.push('');

    // 推荐理由
    lines.push('#### 🎯 为什么推荐给你？');
    lines.push('');
    lines.push(
      `**1. 技能匹配度**（${scores.breakdown.match.score.skillMatch.toFixed(0)}/100）`
    );
    if (scores.breakdown.match.details.availableSkills.length > 0) {
      lines.push(
        `- ✅ **现有技能**：${scores.breakdown.match.details.availableSkills
          .slice(0, 5)
          .join('、')}`
      );
    }
    if (scores.breakdown.match.details.missingSkills.length > 0) {
      lines.push(
        `- ⚠️ **需补充技能**：${scores.breakdown.match.details.missingSkills.join('、')}`
      );
    }
    lines.push('');

    lines.push(
      `**2. 资源匹配度**（${scores.breakdown.match.score.resourceMatch.toFixed(0)}/100）`
    );
    if (scores.breakdown.match.details.availableResources.length > 0) {
      lines.push(
        `- ✅ **现有资源**：${scores.breakdown.match.details.availableResources
          .slice(0, 3)
          .join('、')}`
      );
    }
    if (scores.breakdown.match.details.missingResources.length > 0) {
      lines.push(
        `- ⚠️ **需补充资源**：${scores.breakdown.match.details.missingResources.join('、')}`
      );
    }
    lines.push('');

    lines.push(`**3. 蓝海机会**（${scores.blueOceanScore.toFixed(0)}/100）`);
    lines.push(
      `- 🔵 **流量稳定性**：${scores.breakdown.blueOcean.score.trafficStability.toFixed(0)}/100`
    );
    lines.push(
      `- 🔵 **竞品差距**：${scores.breakdown.blueOcean.score.qualityGap.toFixed(0)}/100`
    );
    lines.push(
      `- 🔵 **变现可行性**：${scores.breakdown.blueOcean.score.monetizationFeasibility.toFixed(0)}/100`
    );
    lines.push('');

    lines.push(`**4. 市场热度**（${scores.marketHeatScore.toFixed(0)}/100）`);
    lines.push(
      `- 🔥 **社交媒体讨论**：${scores.breakdown.heat.score.socialMediaBuzz.toFixed(0)}/100`
    );
    lines.push(
      `- 🔥 **GitHub 趋势**：${scores.breakdown.heat.score.githubTrend.toFixed(0)}/100`
    );
    lines.push(
      `- 🔥 **Product Hunt 热度**：${scores.breakdown.heat.score.productHuntHeat.toFixed(0)}/100`
    );
    lines.push('');
    lines.push('---');
    lines.push('');

    // 风险提示
    lines.push('#### ⚠️ 风险提示');
    lines.push('');
    lines.push('| 风险 | 等级 | 缓解措施 |');
    lines.push('|------|------|----------|');

    const risks = generateRiskAssessment(project, scores);
    risks.forEach((risk) => {
      lines.push(`| ${risk.name} | ${risk.level} | ${risk.mitigation} |`);
    });
    lines.push('');
    lines.push('---');
    lines.push('');

    // 快速启动建议
    lines.push('#### 🚀 快速启动建议');
    lines.push('');
    lines.push(
      `**预计开发周期**：${scores.breakdown.feasibility.score.estimatedWeeks.toFixed(0)} 周`
    );
    lines.push('');
    lines.push('**技术栈**：');
    lines.push('- 前端：React / TypeScript');
    lines.push('- 后端：Node.js / Next.js');
    lines.push('- 部署：Vercel');
    lines.push('');
    lines.push('**冷启动策略**：');
    lines.push(
      `1. 利用现有影响力（${userProfile.profile.resources.distribution[0] || '社交媒体'}）发布演示`
    );
    lines.push('2. Product Hunt 发布');
    lines.push('3. Reddit/HN 相关社区分享');
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  // 未进入 Top 10 的项目（简要列表）
  if (allProjects.length > 10) {
    lines.push('## 未进入 Top 10 的项目（简要列表）');
    lines.push('');
    lines.push('| 排名 | 项目名称 | 综合分 | 主要扣分项 |');
    lines.push('|------|----------|--------|------------|');

    allProjects.slice(10).forEach((item, index) => {
      const { project, scores } = item;
      const mainWeakness = identifyMainWeakness(scores);
      lines.push(
        `| ${index + 11} | ${project.name} | ${scores.comprehensiveScore.toFixed(1)} | ${mainWeakness} |`
      );
    });
    lines.push('');
  }

  // 警告与错误日志
  if (warnings.length > 0) {
    lines.push('## 警告与错误日志');
    lines.push('');
    lines.push('```');
    warnings.forEach((log) => lines.push(log));
    lines.push('```');
    lines.push('');
  }

  // 页脚
  lines.push('---');
  lines.push('');
  lines.push(`**报告生成耗时**：约 3-5 分钟`);
  lines.push(`**下次执行时间**：${nextRunTime()}`);

  return lines.join('\n');
}

/**
 * 生成风险评估
 */
function generateRiskAssessment(
  _project: CandidateProject,
  scores: ComprehensiveScore
): Array<{ name: string; level: string; mitigation: string }> {
  const risks = [];

  // 技术风险
  if (scores.breakdown.feasibility.score.techFamiliarity < 60) {
    risks.push({
      name: '技术不熟悉',
      level: '高',
      mitigation: '预留额外学习时间，或考虑寻找技术合伙人'
    });
  }

  // 资源风险
  if (scores.breakdown.match.details.missingResources.length > 2) {
    risks.push({
      name: '依赖资源缺失',
      level: '中',
      mitigation: '优先寻找免费替代方案，或调整 MVP 范围'
    });
  }

  // 市场风险
  if (scores.breakdown.blueOcean.score.qualityGap < 50) {
    risks.push({
      name: '竞品激烈',
      level: '中',
      mitigation: '聚焦细分场景，提供差异化价值'
    });
  }

  // 时间风险
  if (scores.breakdown.feasibility.score.estimatedWeeks > 12) {
    risks.push({
      name: '开发周期长',
      level: '中',
      mitigation: '分阶段发布，先推出 MVP 验证需求'
    });
  }

  // 默认风险
  if (risks.length === 0) {
    risks.push({
      name: '无明显风险',
      level: '低',
      mitigation: '保持敏捷开发，持续验证假设'
    });
  }

  return risks;
}

/**
 * 识别主要弱点
 */
function identifyMainWeakness(scores: ComprehensiveScore): string {
  const breakdown = scores.breakdown;
  const minScore = Math.min(
    breakdown.blueOcean.score.blueOceanScore,
    breakdown.match.score.matchScore,
    breakdown.heat.score.marketHeatScore,
    breakdown.feasibility.score.feasibilityScore
  );

  if (minScore === breakdown.blueOcean.score.blueOceanScore) {
    return '蓝海分不足';
  } else if (minScore === breakdown.match.score.matchScore) {
    return '匹配度低';
  } else if (minScore === breakdown.heat.score.marketHeatScore) {
    return '市场热度低';
  } else {
    return '可行性低';
  }
}

/**
 * 下次运行时间
 */
function nextRunTime(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return formatDate(tomorrow);
}
