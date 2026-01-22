/**
 * 日志系统
 * 提供结构化日志输出，支持不同日志级别
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LoggerOptions {
  level?: LogLevel
  prefix?: string
  colorize?: boolean
}

export class Logger {
  private level: LogLevel
  private prefix: string
  private colorize: boolean

  // ANSI 颜色代码
  private static readonly colors = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    green: '\x1b[32m'
  }

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO
    this.prefix = options.prefix ?? ''
    this.colorize = options.colorize ?? true
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * 格式化日志消息
   */
  private format(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const prefix = this.prefix ? `[${this.prefix}] ` : ''
    const argsStr = args.length > 0 ? ` ${args.map(a => JSON.stringify(a)).join(' ')}` : ''

    return `${timestamp} ${prefix}${level}${message}${argsStr}`
  }

  /**
   * 彩色化日志
   */
  private colorizeLog(level: string, message: string): string {
    if (!this.colorize) return message

    const colorMap: Record<string, string> = {
      'DEBUG': Logger.colors.dim,
      'INFO': Logger.colors.blue,
      'WARN': Logger.colors.yellow,
      'ERROR': Logger.colors.red
    }

    const color = colorMap[level] || ''
    return `${color}${message}${Logger.colors.reset}`
  }

  /**
   * 调试日志
   */
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      const log = this.format('[DEBUG]', message, ...args)
      console.log(this.colorizeLog('DEBUG', log))
    }
  }

  /**
   * 信息日志
   */
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      const log = this.format('[INFO]', message, ...args)
      console.log(this.colorizeLog('INFO', log))
    }
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      const log = this.format('[WARNING]', message, ...args)
      console.warn(this.colorizeLog('WARN', log))
    }
  }

  /**
   * 错误日志
   */
  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      const log = this.format('[ERROR]', message, ...args)
      console.error(this.colorizeLog('ERROR', log))
    }
  }

  /**
   * 成功日志（绿色）
   */
  success(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      const log = this.format('[SUCCESS]', message, ...args)
      console.log(this.colorizeLog('INFO', log.replace('[SUCCESS]', '✅ [SUCCESS]')))
    }
  }

  /**
   * 分隔线
   */
  separator(char: string = '-', length: number = 50): void {
    console.log(char.repeat(length))
  }
}

/**
 * 创建默认 logger 实例
 */
export const logger = new Logger({
  level: LogLevel.INFO,
  prefix: 'RequirementExploration'
})

/**
 * 创建子 logger（带特定前缀）
 */
export function createChildLogger(prefix: string): Logger {
  return new Logger({
    level: LogLevel.INFO,
    prefix: `RequirementExploration/${prefix}`
  })
}
