/**
 * TAD Logger - Centralized Logging System
 * Replaces default root logger with proper module-based logging
 * Levels: DEBUG < INFO < WARN < ERROR
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, any>;
  stackTrace?: string;
  performanceMs?: number;
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs = 500;
  private writeIndex = 0;
  private isFull = false;
  private persistToLocalStorage = false;

  constructor(defaultLevel?: LogLevel) {
    this.logLevel = defaultLevel || (
      process.env.NODE_ENV === 'production'
        ? (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel || LogLevel.WARN)
        : (process.env.NEXT_PUBLIC_LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO)
    );

    this.persistToLocalStorage =
      typeof window !== 'undefined' &&
      process.env.NEXT_PUBLIC_LOG_PERSISTENCE === 'true';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, module, message, performanceMs } = entry;
    const perf = performanceMs ? ` (${performanceMs}ms)` : '';
    return `[${timestamp}] ${level} [${module}]${perf}: ${message}`;
  }

  private storeLog(entry: LogEntry): void {
    if (this.logs.length < this.maxLogs && !this.isFull) {
      this.logs.push(entry);
    } else {
      this.isFull = true;
      this.logs[this.writeIndex] = entry;
      this.writeIndex = (this.writeIndex + 1) % this.maxLogs;
    }

    if (this.persistToLocalStorage) {
      try {
        localStorage.setItem('tad_logs', JSON.stringify(this.getChronologicalLogs()));
      } catch (e) {
        // Quota exceeded, not critical
      }
    }
  }

  private getChronologicalLogs(): LogEntry[] {
    if (!this.isFull) {
      return this.logs;
    }
    return [
      ...this.logs.slice(this.writeIndex),
      ...this.logs.slice(0, this.writeIndex),
    ];
  }

  private log(
    level: LogLevel,
    module: string,
    message: string,
    data?: Record<string, any>,
    performanceMs?: number
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
      performanceMs,
    };

    this.storeLog(entry);

    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: 'color: #999',
      [LogLevel.INFO]: 'color: #0066cc',
      [LogLevel.WARN]: 'color: #ff9900',
      [LogLevel.ERROR]: 'color: #ff0000',
    };

    const formatted = this.formatLog(entry);

    if (typeof window !== 'undefined') {
      // Browser: colored console output
      console.log(`%c${formatted}`, colors[level]);
      if (data) console.log('  Data:', data);
    } else {
      // Server: standard console methods (no %c CSS styling)
      const consoleMethod = {
        [LogLevel.DEBUG]: console.debug,
        [LogLevel.INFO]: console.info,
        [LogLevel.WARN]: console.warn,
        [LogLevel.ERROR]: console.error,
      }[level] || console.log;
      consoleMethod(formatted);
      if (data) consoleMethod('  Data:', data);
    }
  }

  debug(module: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, module, message, data);
  }

  info(module: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, module, message, data);
  }

  warn(module: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, module, message, data);
  }

  error(module: string, message: string, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, module, message, data);
  }

  perf(module: string, fn: () => void, label?: string): void {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    this.log(
      LogLevel.DEBUG,
      module,
      `Performance: ${label || 'operation'}`,
      { durationMs: duration },
      duration
    );
  }

  async perfAsync<T>(
    module: string,
    fn: () => Promise<T>,
    label?: string
  ): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    this.log(
      LogLevel.DEBUG,
      module,
      `Performance: ${label || 'async operation'}`,
      { durationMs: duration },
      duration
    );
    return result;
  }

  exportLogs(): string {
    return JSON.stringify(this.getChronologicalLogs(), null, 2);
  }

  clearLogs(): void {
    this.logs = [];
    this.writeIndex = 0;
    this.isFull = false;
    if (this.persistToLocalStorage) {
      localStorage.removeItem('tad_logs');
    }
  }

  getLogs(module?: string, level?: LogLevel): LogEntry[] {
    return this.getChronologicalLogs().filter(
      (log) =>
        (!module || log.module === module) && (!level || log.level === level)
    );
  }

  getAllLogs(): LogEntry[] {
    return this.getChronologicalLogs();
  }
}

export const logger = new Logger();
export default Logger;
