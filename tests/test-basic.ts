/**
 * 测试脚本 - 验证核心功能
 */

import { runExploration } from '../lib/index';
import { logger } from '../lib/utils/logger';

async function test() {
  logger.info('开始测试...');

  await runExploration({
    outputDir: 'outputs/test',
    timeRange: '7d'
  });

  logger.info('测试完成！');
}

test().catch(error => {
  console.error('测试失败：', error);
  process.exit(1);
});
