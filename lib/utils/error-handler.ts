/**
 * 错误处理工具
 * 提供重试机制、安全 JSON 解析等
 */

import { logger } from './logger';

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  initialDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 2
};

/**
 * 带重试的 fetch 封装
 */
export async function fetchWithRetry(
  urlOrPromise: string | Promise<Response>,
  options: RequestInit = {},
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;
  let delay = retryConfig.initialDelay;

  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = typeof urlOrPromise === 'string'
        ? await fetch(urlOrPromise, {
            ...options,
            signal: AbortSignal.timeout(30000) // 30 秒超时
          })
        : await urlOrPromise;

      if (response.ok) {
        return response;
      }

      // HTTP 错误
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error: any) {
      lastError = error;

      // 如果是最后一次尝试，直接抛出错误
      if (attempt === retryConfig.maxRetries) {
        throw error;
      }

      // 等待后重试
      const retryMsg = typeof urlOrPromise === 'string'
        ? `"${urlOrPromise}"`
        : '请求';

      logger.warn(
        `[RETRY] 第 ${attempt} 次失败 (${retryMsg})，${delay}ms 后重试...`
      );

      await sleep(delay);

      // 指数退避
      delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
    }
  }

  throw lastError;
}

/**
 * 安全的 JSON 解析
 */
export function safeJSONParse<T = any>(text: string, fallback: T): T {
  try {
    return JSON.parse(text);
  } catch (error) {
    logger.warn(`JSON 解析失败: ${error}`);
    return fallback;
  }
}

/**
 * 安全的 fetch 包装器（全局错误处理）
 */
export async function safeFetch(
  _sourceName: string,
  url: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetchWithRetry(url, options, {
      maxRetries: 2,
      initialDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2
    });

    const text = await response.text();

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    // 尝试解析 JSON
    const data = safeJSONParse(text, null);
    return {
      success: true,
      data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * 延迟函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 解析数字（支持 K/M 后缀）
 */
export function parseNumber(text: string): number {
  if (!text) return 0;

  const cleaned = text
    .replace(/,/g, '')
    .replace(/K/gi, '000')
    .replace(/M/gi, '000000')
    .replace(/B/gi, '000000000')
    .trim();

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * 批量处理（带并发控制）
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then(result => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex(p => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * 提取关键词
 */
export function extractKeywords(text: string): string[] {
  // 移除停用词（中英文）
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    '的', '了', '是', '在', '和', '与', '或', '但是', '然而', '因此', '所以'
  ]);

  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return [...new Set(words)];
}

/**
 * 计算字符串相似度（Levenshtein 距离）
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 替换
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j] + 1      // 删除
        );
      }
    }
  }

  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - matrix[len1][len2] / maxLen;
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number = 200, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + suffix;
}

/**
 * 格式化日期
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}
