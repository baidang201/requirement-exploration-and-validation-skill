/**
 * 报告生成器
 * 生成 Top 10 HTML 报告
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
  html: string;
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

  // 3. 生成 HTML
  const html = generateHTMLReport(
    top10,
    sorted,
    userProfile,
    warnings
  );

  // 4. 生成文件名
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = `report-${timestamp}-${time}.html`;

  // 5. 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 6. 保存文件
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, html, 'utf-8');

  logger.success(`报告已生成：${filepath}`);

  return { html, filename, filepath };
}

/**
 * 生成 HTML 报告
 */
function generateHTMLReport(
  top10: ScoredProject[],
  allProjects: ScoredProject[],
  userProfile: UserProfile,
  warnings: string[]
): string {
  const parts: string[] = [];

  // HTML 头部
  parts.push('<!DOCTYPE html>');
  parts.push('<html lang="zh-CN">');
  parts.push('<head>');
  parts.push('  <meta charset="UTF-8">');
  parts.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
  parts.push('  <title>需求挖掘与验证报告</title>');
  parts.push('  <style>');
  parts.push('    * { margin: 0; padding: 0; box-sizing: border-box; }');
  parts.push('    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px; }');
  parts.push('    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }');
  parts.push('    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; margin-bottom: 20px; }');
  parts.push('    h2 { color: #34495e; margin-top: 40px; margin-bottom: 20px; padding-left: 10px; border-left: 4px solid #3498db; }');
  parts.push('    h3 { color: #7f8c8d; margin-top: 25px; margin-bottom: 15px; }');
  parts.push('    h4 { color: #95a5a6; margin-top: 20px; margin-bottom: 10px; font-size: 1.1em; }');
  parts.push('    p { margin-bottom: 15px; }');
  parts.push('    .meta-info { color: #7f8c8d; font-size: 0.95em; margin-bottom: 20px; }');
  parts.push('    hr { border: none; border-top: 1px solid #ecf0f1; margin: 30px 0; }');
  parts.push('    table { width: 100%; border-collapse: collapse; margin: 20px 0; }');
  parts.push('    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ecf0f1; }');
  parts.push('    th { background: #f8f9fa; font-weight: 600; color: #2c3e50; }');
  parts.push('    tr:hover { background: #f8f9fa; }');
  parts.push('    .project-card { border: 1px solid #ecf0f1; border-radius: 8px; padding: 25px; margin: 30px 0; background: #fafafa; }');
  parts.push('    .project-title { font-size: 1.8em; color: #2c3e50; margin-bottom: 10px; }');
  parts.push('    .rank-badge { display: inline-block; background: #3498db; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9em; margin-right: 10px; }');
  parts.push('    .score-badge { display: inline-block; background: #f39c12; color: white; padding: 5px 15px; border-radius: 20px; font-size: 0.9em; }');
  parts.push('    .section-title { font-weight: 600; color: #34495e; margin-top: 15px; margin-bottom: 10px; }');
  parts.push('    ul, ol { margin-left: 25px; margin-bottom: 15px; }');
  parts.push('    li { margin-bottom: 8px; }');
  parts.push('    .warning-section { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }');
  parts.push('    .warning-section pre { background: #fff; padding: 10px; border-radius: 4px; overflow-x: auto; }');
  parts.push('    .risk-high { background: #ffebee; }');
  parts.push('    .risk-medium { background: #fff3e0; }');
  parts.push('    .risk-low { background: #e8f5e9; }');
  parts.push('    .footer { color: #95a5a6; font-size: 0.9em; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ecf0f1; }');
  parts.push('  </style>');
  parts.push('</head>');
  parts.push('<body>');
  parts.push('  <div class="container">');

  // 标题
  parts.push('    <h1>需求挖掘与验证报告</h1>');
  parts.push('    <div class="meta-info">');
  parts.push(`      <p><strong>生成时间</strong>：${formatDate(new Date())}</p>`);
  parts.push(`      <p><strong>执行人</strong>：${userProfile.profile.background.name}（${userProfile.profile.background.role}）</p>`);
  parts.push('    </div>');
  parts.push('    <hr>');

  // 执行摘要
  parts.push('    <h2>执行摘要</h2>');
  parts.push('    <h3>数据采集情况</h3>');
  parts.push('    <ul>');
  parts.push('      <li>数据源：Product Hunt, Reddit, Hacker News, GitHub, IndieHackers, Ben\'s Bites, TLDR AI</li>');
  parts.push(`      <li><strong>候选项目数量</strong>：${allProjects.length} 个</li>`);
  parts.push(`      <li><strong>最终推荐</strong>：Top ${top10.length}</li>`);
  parts.push('    </ul>');
  parts.push('    <hr>');

  // Top 10 项目
  parts.push('    <h2>Top 10 推荐项目</h2>');

  top10.forEach((item) => {
    const { project, scores, rank } = item;

    parts.push('    <div class="project-card">');
    parts.push(`      <h3 class="project-title"><span class="rank-badge">#${rank}</span>${project.name}</h3>`);
    parts.push(`      <p><span class="score-badge">综合评分：⭐ ${scores.comprehensiveScore.toFixed(1)}/100</span></p>`);
    parts.push('      <p class="section-title">项目描述</p>');
    parts.push(`      <p>${project.description}</p>`);
    parts.push('      <hr>');

    // 四维度评分
    parts.push('      <h4>📊 四维度评分</h4>');
    parts.push('      <table>');
    parts.push('        <tr><th>维度</th><th>得分</th><th>详情</th></tr>');
    parts.push(
      `        <tr><td><strong>蓝海分</strong></td><td>${scores.blueOceanScore.toFixed(1)}/100</td><td>流量(${scores.breakdown.blueOcean.score.trafficStability.toFixed(0)}) × 竞品差距(${scores.breakdown.blueOcean.score.qualityGap.toFixed(0)}) × 变现(${scores.breakdown.blueOcean.score.monetizationFeasibility.toFixed(0)}) ÷ 10000</td></tr>`
    );
    parts.push(
      `        <tr><td><strong>执行人匹配度</strong></td><td>${scores.matchScore.toFixed(1)}/100</td><td>技能(${scores.breakdown.match.score.skillMatch.toFixed(0)}) × 资源(${scores.breakdown.match.score.resourceMatch.toFixed(0)}) × 经验(${scores.breakdown.match.score.experienceMatch.toFixed(0)}) ÷ 10000</td></tr>`
    );
    parts.push(
      `        <tr><td><strong>市场热度</strong></td><td>${scores.marketHeatScore.toFixed(1)}/100</td><td>社交媒体(${scores.breakdown.heat.score.socialMediaBuzz.toFixed(0)}) × GitHub(${scores.breakdown.heat.score.githubTrend.toFixed(0)}) × PH(${scores.breakdown.heat.score.productHuntHeat.toFixed(0)}) ÷ 10000</td></tr>`
    );
    parts.push(
      `        <tr><td><strong>技术可行性</strong></td><td>${scores.feasibilityScore.toFixed(1)}/100</td><td>技术栈(${scores.breakdown.feasibility.score.techFamiliarity.toFixed(0)}) × 时间(${scores.breakdown.feasibility.score.devTimeEstimate.toFixed(0)}) × 资源(${scores.breakdown.feasibility.score.resourceAvailability.toFixed(0)}) ÷ 10000</td></tr>`
    );
    parts.push('      </table>');
    parts.push(
      `      <p><strong>综合分计算</strong>：${scores.blueOceanScore.toFixed(1)}×${scores.breakdown.blueOcean.weight} + ${scores.matchScore.toFixed(1)}×${scores.breakdown.match.weight} + ${scores.marketHeatScore.toFixed(1)}×${scores.breakdown.heat.weight} + ${scores.feasibilityScore.toFixed(1)}×${scores.breakdown.feasibility.weight} = ${scores.comprehensiveScore.toFixed(1)}</p>`
    );
    parts.push('      <hr>');

    // 推荐理由
    parts.push('      <h4>🎯 为什么推荐给你？</h4>');

    parts.push(`      <p><strong>1. 技能匹配度</strong>（${scores.breakdown.match.score.skillMatch.toFixed(0)}/100）</p>`);
    if (scores.breakdown.match.details.availableSkills.length > 0) {
      parts.push(
        `      <p>✅ <strong>现有技能</strong>：${scores.breakdown.match.details.availableSkills.slice(0, 5).join('、')}</p>`
      );
    }
    if (scores.breakdown.match.details.missingSkills.length > 0) {
      parts.push(
        `      <p>⚠️ <strong>需补充技能</strong>：${scores.breakdown.match.details.missingSkills.join('、')}</p>`
      );
    }

    parts.push(`      <p><strong>2. 资源匹配度</strong>（${scores.breakdown.match.score.resourceMatch.toFixed(0)}/100）</p>`);
    if (scores.breakdown.match.details.availableResources.length > 0) {
      parts.push(
        `      <p>✅ <strong>现有资源</strong>：${scores.breakdown.match.details.availableResources.slice(0, 3).join('、')}</p>`
      );
    }
    if (scores.breakdown.match.details.missingResources.length > 0) {
      parts.push(
        `      <p>⚠️ <strong>需补充资源</strong>：${scores.breakdown.match.details.missingResources.join('、')}</p>`
      );
    }

    parts.push(`      <p><strong>3. 蓝海机会</strong>（${scores.blueOceanScore.toFixed(0)}/100）</p>`);
    parts.push('      <ul>');
    parts.push(
      `        <li>🔵 <strong>流量稳定性</strong>：${scores.breakdown.blueOcean.score.trafficStability.toFixed(0)}/100</li>`
    );
    parts.push(
      `        <li>🔵 <strong>竞品差距</strong>：${scores.breakdown.blueOcean.score.qualityGap.toFixed(0)}/100</li>`
    );
    parts.push(
      `        <li>🔵 <strong>变现可行性</strong>：${scores.breakdown.blueOcean.score.monetizationFeasibility.toFixed(0)}/100</li>`
    );
    parts.push('      </ul>');

    parts.push(`      <p><strong>4. 市场热度</strong>（${scores.marketHeatScore.toFixed(0)}/100）</p>`);
    parts.push('      <ul>');
    parts.push(
      `        <li>🔥 <strong>社交媒体讨论</strong>：${scores.breakdown.heat.score.socialMediaBuzz.toFixed(0)}/100</li>`
    );
    parts.push(
      `        <li>🔥 <strong>GitHub 趋势</strong>：${scores.breakdown.heat.score.githubTrend.toFixed(0)}/100</li>`
    );
    parts.push(
      `        <li>🔥 <strong>Product Hunt 热度</strong>：${scores.breakdown.heat.score.productHuntHeat.toFixed(0)}/100</li>`
    );
    parts.push('      </ul>');
    parts.push('      <hr>');

    // 风险提示
    parts.push('      <h4>⚠️ 风险提示</h4>');
    parts.push('      <table>');
    parts.push('        <tr><th>风险</th><th>等级</th><th>缓解措施</th></tr>');

    const risks = generateRiskAssessment(project, scores);
    risks.forEach((risk) => {
      const riskClass = risk.level === '高' ? 'risk-high' : risk.level === '中' ? 'risk-medium' : 'risk-low';
      parts.push(`        <tr class="${riskClass}"><td>${risk.name}</td><td>${risk.level}</td><td>${risk.mitigation}</td></tr>`);
    });
    parts.push('      </table>');
    parts.push('      <hr>');

    // 快速启动建议
    parts.push('      <h4>🚀 快速启动建议</h4>');
    parts.push(
      `      <p><strong>预计开发周期</strong>：${scores.breakdown.feasibility.score.estimatedWeeks.toFixed(0)} 周</p>`
    );
    parts.push('      <p><strong>技术栈</strong>：</p>');
    parts.push('      <ul>');
    parts.push('        <li>前端：React / TypeScript</li>');
    parts.push('        <li>后端：Node.js / Next.js</li>');
    parts.push('        <li>部署：Vercel</li>');
    parts.push('      </ul>');
    parts.push('      <p><strong>冷启动策略</strong>：</p>');
    parts.push('      <ol>');
    parts.push(
      `        <li>利用现有影响力（${userProfile.profile.resources.distribution[0] || '社交媒体'}）发布演示</li>`
    );
    parts.push('        <li>Product Hunt 发布</li>');
    parts.push('        <li>Reddit/HN 相关社区分享</li>');
    parts.push('      </ol>');

    parts.push('    </div>');
  });

  // 未进入 Top 10 的项目（简要列表）
  if (allProjects.length > 10) {
    parts.push('    <h2>未进入 Top 10 的项目（简要列表）</h2>');
    parts.push('    <table>');
    parts.push('      <tr><th>排名</th><th>项目名称</th><th>综合分</th><th>主要扣分项</th></tr>');

    allProjects.slice(10).forEach((item, index) => {
      const { project, scores } = item;
      const mainWeakness = identifyMainWeakness(scores);
      parts.push(
        `      <tr><td>${index + 11}</td><td>${project.name}</td><td>${scores.comprehensiveScore.toFixed(1)}</td><td>${mainWeakness}</td></tr>`
      );
    });
    parts.push('    </table>');
  }

  // 警告与错误日志
  if (warnings.length > 0) {
    parts.push('    <h2>警告与错误日志</h2>');
    parts.push('    <div class="warning-section">');
    parts.push('      <pre>');
    warnings.forEach((log) => parts.push(`        ${escapeHtml(log)}`));
    parts.push('      </pre>');
    parts.push('    </div>');
  }

  // 页脚
  parts.push('    <div class="footer">');
  parts.push('      <hr>');
  parts.push(`      <p><strong>报告生成耗时</strong>：约 3-5 分钟</p>`);
  parts.push(`      <p><strong>下次执行时间</strong>：${nextRunTime()}</p>`);
  parts.push('    </div>');

  parts.push('  </div>');
  parts.push('</body>');
  parts.push('</html>');

  return parts.join('\n');
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
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
