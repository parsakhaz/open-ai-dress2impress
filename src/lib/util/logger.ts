/**
 * Advanced Logging System for Dress To Impress
 * Provides comprehensive logging with styling, performance tracking, and debugging utilities
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  duration?: number;
  userId?: string;
  sessionId: string;
}

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  category: string;
  operation: string;
  success: boolean;
  error?: string;
}

class AdvancedLogger {
  private static instance: AdvancedLogger;
  private logs: LogEntry[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private sessionId: string;
  private currentLogLevel: LogLevel = LogLevel.DEBUG;
  private maxLogs = 1000; // Keep last 1000 logs

  // Styled console colors
  private readonly styles = {
    DEBUG: 'color: #6B7280; font-weight: normal;',
    INFO: 'color: #3B82F6; font-weight: bold;',
    WARN: 'color: #F59E0B; font-weight: bold;',
    ERROR: 'color: #EF4444; font-weight: bold;',
    SUCCESS: 'color: #10B981; font-weight: bold;',
    PHASE: 'color: #8B5CF6; font-weight: bold; font-size: 14px;',
    API: 'color: #06B6D4; font-weight: bold;',
    TIMER: 'color: #F97316; font-weight: bold;',
  };

  private constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.info('Logger', 'Advanced Logger initialized', { sessionId: this.sessionId });
  }

  static getInstance(): AdvancedLogger {
    if (!AdvancedLogger.instance) {
      AdvancedLogger.instance = new AdvancedLogger();
    }
    return AdvancedLogger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
    this.info('Logger', `Log level set to ${LogLevel[level]}`);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLogLevel;
  }

  private addLog(level: LogLevel, category: string, message: string, data?: any, duration?: number): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      duration,
      sessionId: this.sessionId,
    };

    this.logs.push(entry);

    // Keep only the last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private formatMessage(category: string, message: string): string {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    return `[${timestamp}] ${category}: ${message}`;
  }

  debug(category: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    this.addLog(LogLevel.DEBUG, category, message, data);
    console.log(`%c${this.formatMessage(category, message)}`, this.styles.DEBUG, data);
  }

  info(category: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    this.addLog(LogLevel.INFO, category, message, data);
    console.log(`%c${this.formatMessage(category, message)}`, this.styles.INFO, data);
  }

  warn(category: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    this.addLog(LogLevel.WARN, category, message, data);
    console.warn(`%c${this.formatMessage(category, message)}`, this.styles.WARN, data);
  }

  error(category: string, message: string, error?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    this.addLog(LogLevel.ERROR, category, message, error);
    console.error(`%c${this.formatMessage(category, message)}`, this.styles.ERROR, error);
  }

  success(category: string, message: string, data?: any): void {
    this.addLog(LogLevel.INFO, category, message, data);
    console.log(`%c✅ ${this.formatMessage(category, message)}`, this.styles.SUCCESS, data);
  }

  phase(phaseName: string, message: string, data?: any): void {
    this.addLog(LogLevel.INFO, 'PHASE', message, data);
    console.log(`%c🎯 PHASE ${phaseName}: ${message}`, this.styles.PHASE, data);
  }

  api(method: string, url: string, status: 'START' | 'SUCCESS' | 'ERROR', data?: any): void {
    const message = `${method} ${url} - ${status}`;
    if (status === 'ERROR') {
      this.addLog(LogLevel.ERROR, 'API', message, data);
      console.error(`%c🌐 ${this.formatMessage('API', message)}`, this.styles.API, data);
    } else {
      this.addLog(LogLevel.INFO, 'API', message, data);
      console.log(`%c🌐 ${this.formatMessage('API', message)}`, this.styles.API, data);
    }
  }

  timer(category: string, operation: string, startTime?: number): number | void {
    if (startTime === undefined) {
      // Starting timer
      const start = performance.now();
      this.debug('TIMER', `Started: ${category} - ${operation}`);
      return start;
    } else {
      // Ending timer
      const end = performance.now();
      const duration = end - startTime;
      const message = `Completed: ${category} - ${operation} (${duration.toFixed(2)}ms)`;
      
      this.addLog(LogLevel.INFO, 'TIMER', message, { duration, category, operation });
      console.log(`%c⏱️ ${this.formatMessage('TIMER', message)}`, this.styles.TIMER);
      
      this.performanceMetrics.push({
        startTime,
        endTime: end,
        duration,
        category,
        operation,
        success: true,
      });
    }
  }

  userAction(action: string, phase: string, data?: any): void {
    const message = `User ${action} in ${phase} phase`;
    this.addLog(LogLevel.INFO, 'USER_ACTION', message, data);
    console.log(`%c👤 ${this.formatMessage('USER_ACTION', message)}`, this.styles.INFO, data);
  }

  stateChange(from: any, to: any, trigger: string): void {
    const message = `State changed: ${from} → ${to} (triggered by: ${trigger})`;
    this.addLog(LogLevel.INFO, 'STATE', message, { from, to, trigger });
    console.log(`%c🔄 ${this.formatMessage('STATE', message)}`, this.styles.INFO);
  }

  // Group related logs
  group(title: string, style?: string): void {
    console.group(`%c${title}`, style || this.styles.INFO);
  }

  groupEnd(): void {
    console.groupEnd();
  }

  // Advanced debugging
  table(data: any[], label?: string): void {
    if (label) {
      console.log(`%c📊 ${label}`, this.styles.INFO);
    }
    console.table(data);
  }

  // Get logs for debugging
  getLogs(category?: string, level?: LogLevel): LogEntry[] {
    let filtered = this.logs;
    
    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }
    
    if (level !== undefined) {
      filtered = filtered.filter(log => log.level >= level);
    }
    
    return filtered;
  }

  getPerformanceMetrics(category?: string): PerformanceMetrics[] {
    if (category) {
      return this.performanceMetrics.filter(metric => metric.category === category);
    }
    return this.performanceMetrics;
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      logs: this.logs,
      performanceMetrics: this.performanceMetrics,
    }, null, 2);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
    this.performanceMetrics = [];
    this.info('Logger', 'Logs cleared');
  }

  // Environment validation
  validateEnvironment(): { valid: boolean; missing: string[]; warnings: string[] } {
    const required = [
      'OPENAI_API_KEY',
      'FASHN_AI_API_KEY', 
      'RAPIDAPI_KEY',
      'RAPIDAPI_HOST'
    ];
    
    const optional = [
      'KLING_ACCESS_KEY',
      'KLING_SECRET_KEY',
    ];

    const missing: string[] = [];
    const warnings: string[] = [];

    required.forEach(key => {
      if (!process.env[key]) {
        missing.push(key);
      }
    });

    optional.forEach(key => {
      if (!process.env[key]) {
        warnings.push(`Optional: ${key} not set`);
      }
    });

    const valid = missing.length === 0;
    
    if (valid) {
      this.success('ENV', 'Environment validation passed');
    } else {
      this.error('ENV', 'Environment validation failed', { missing, warnings });
    }

    return { valid, missing, warnings };
  }
}

// Export singleton instance
export const logger = AdvancedLogger.getInstance();

// Convenience functions
export const logDebug = (category: string, message: string, data?: any) => logger.debug(category, message, data);
export const logInfo = (category: string, message: string, data?: any) => logger.info(category, message, data);
export const logWarn = (category: string, message: string, data?: any) => logger.warn(category, message, data);
export const logError = (category: string, message: string, error?: any) => logger.error(category, message, error);
export const logSuccess = (category: string, message: string, data?: any) => logger.success(category, message, data);
export const logPhase = (phaseName: string, message: string, data?: any) => logger.phase(phaseName, message, data);
export const logAPI = (method: string, url: string, status: 'START' | 'SUCCESS' | 'ERROR', data?: any) => 
  logger.api(method, url, status, data);
export const logTimer = (category: string, operation: string, startTime?: number) => 
  logger.timer(category, operation, startTime);
export const logUserAction = (action: string, phase: string, data?: any) => 
  logger.userAction(action, phase, data);
export const logStateChange = (from: any, to: any, trigger: string) => 
  logger.stateChange(from, to, trigger);

// Development helper - expose logger globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).dtiLogger = logger;
}