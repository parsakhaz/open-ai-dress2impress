/**
 * Enhanced Error Handling for Dress To Impress
 * Provides comprehensive error tracking, user-friendly messages, and debugging utilities
 */

import { logger } from './logger';

export enum ErrorCategory {
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  USER_ERROR = 'USER_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
}

export interface DTIError extends Error {
  category: ErrorCategory;
  code?: string;
  statusCode?: number;
  userMessage: string;
  technicalDetails: string;
  context?: Record<string, any>;
  retryable: boolean;
  timestamp: number;
}

export class ErrorHandler {
  private static errorCount: Map<string, number> = new Map();
  private static maxRetries = 3;

  static createError(
    category: ErrorCategory,
    message: string,
    userMessage: string,
    options: {
      code?: string;
      statusCode?: number;
      context?: Record<string, any>;
      cause?: Error;
      retryable?: boolean;
    } = {}
  ): DTIError {
    const error = new Error(message) as DTIError;
    error.category = category;
    error.code = options.code;
    error.statusCode = options.statusCode;
    error.userMessage = userMessage;
    error.technicalDetails = message;
    error.context = options.context;
    error.retryable = options.retryable ?? false;
    error.timestamp = Date.now();
    error.cause = options.cause;

    return error;
  }

  static handleAPIError(
    apiName: string,
    endpoint: string,
    response: Response | null,
    originalError?: Error
  ): DTIError {
    logger.error('API_ERROR', `${apiName} API failed: ${endpoint}`, {
      status: response?.status,
      statusText: response?.statusText,
      originalError: originalError?.message,
    });

    let userMessage = `Having trouble with ${apiName}. Please try again.`;
    let code = 'UNKNOWN_API_ERROR';
    let retryable = true;

    if (response) {
      switch (response.status) {
        case 401:
          userMessage = `${apiName} authentication failed. Please check API keys.`;
          code = 'AUTH_ERROR';
          retryable = false;
          break;
        case 403:
          userMessage = `Access denied to ${apiName}. Please check permissions.`;
          code = 'PERMISSION_ERROR';
          retryable = false;
          break;
        case 404:
          userMessage = `${apiName} endpoint not found.`;
          code = 'NOT_FOUND';
          retryable = false;
          break;
        case 429:
          userMessage = `${apiName} rate limit exceeded. Please wait and try again.`;
          code = 'RATE_LIMIT';
          retryable = true;
          break;
        case 500:
          userMessage = `${apiName} server error. Please try again later.`;
          code = 'SERVER_ERROR';
          retryable = true;
          break;
        default:
          userMessage = `${apiName} request failed (${response.status}). Please try again.`;
      }
    }

    return this.createError(
      ErrorCategory.API_ERROR,
      `${apiName} API error: ${response?.status} ${response?.statusText || 'Unknown error'}`,
      userMessage,
      {
        code,
        statusCode: response?.status,
        retryable,
        context: {
          apiName,
          endpoint,
          originalError: originalError?.message,
        },
        cause: originalError,
      }
    );
  }

  static handleNetworkError(context: string, originalError: Error): DTIError {
    logger.error('NETWORK_ERROR', `Network error in ${context}`, originalError);

    return this.createError(
      ErrorCategory.NETWORK_ERROR,
      `Network error in ${context}: ${originalError.message}`,
      'Network connection failed. Please check your internet connection and try again.',
      {
        code: 'NETWORK_ERROR',
        retryable: true,
        context: { location: context },
        cause: originalError,
      }
    );
  }

  static handleValidationError(field: string, value: any, requirement: string): DTIError {
    logger.warn('VALIDATION_ERROR', `Validation failed for ${field}`, { value, requirement });

    return this.createError(
      ErrorCategory.VALIDATION_ERROR,
      `Validation error: ${field} ${requirement}`,
      `Please check your ${field}. ${requirement}`,
      {
        code: 'VALIDATION_ERROR',
        retryable: false,
        context: { field, value, requirement },
      }
    );
  }

  static handleUserError(action: string, reason: string): DTIError {
    logger.info('USER_ERROR', `User error: ${action} - ${reason}`);

    return this.createError(
      ErrorCategory.USER_ERROR,
      `User error: ${action} - ${reason}`,
      reason,
      {
        code: 'USER_ERROR',
        retryable: true,
        context: { action },
      }
    );
  }

  static handleSystemError(component: string, originalError: Error): DTIError {
    logger.error('SYSTEM_ERROR', `System error in ${component}`, originalError);

    return this.createError(
      ErrorCategory.SYSTEM_ERROR,
      `System error in ${component}: ${originalError.message}`,
      'Something went wrong. Please refresh the page and try again.',
      {
        code: 'SYSTEM_ERROR',
        retryable: true,
        context: { component },
        cause: originalError,
      }
    );
  }

  static async handleWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error = new Error(`Operation failed: ${operationName}`);
    let attempt = 0;

    for (attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug('RETRY', `Attempt ${attempt}/${maxRetries} for ${operationName}`);
        const result = await operation();
        
        if (attempt > 1) {
          logger.success('RETRY', `${operationName} succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        logger.warn('RETRY', `${operationName} failed on attempt ${attempt}`, error);
        
        const isDTIError = error && typeof error === 'object' && 'retryable' in error;
        if (isDTIError && !(error as DTIError).retryable) {
          logger.info('RETRY', `${operationName} not retryable, giving up`);
          break;
        }
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
          logger.debug('RETRY', `Waiting ${delay}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('RETRY', `${operationName} failed after ${attempt - 1} attempts`, lastError);
    throw lastError;
  }

  static trackError(error: DTIError): void {
    const key = `${error.category}_${error.code || 'UNKNOWN'}`;
    const count = this.errorCount.get(key) || 0;
    this.errorCount.set(key, count + 1);

    logger.info('ERROR_TRACKING', `Error tracked: ${key} (count: ${count + 1})`);
  }

  static getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCount);
  }

  static clearErrorStats(): void {
    this.errorCount.clear();
    logger.info('ERROR_TRACKING', 'Error statistics cleared');
  }

  // Environment-specific error handling
  static validateEnvironmentVariable(name: string, value: string | undefined): DTIError | null {
    if (!value) {
      return this.createError(
        ErrorCategory.SYSTEM_ERROR,
        `Environment variable ${name} is not set`,
        `Configuration error: ${name} is missing. Please check your environment setup.`,
        {
          code: 'ENV_MISSING',
          retryable: false,
          context: { variableName: name },
        }
      );
    }

    // Basic validation for API keys
    if (name.includes('API_KEY')) {
      if (value.length < 10) {
        return this.createError(
          ErrorCategory.SYSTEM_ERROR,
          `Environment variable ${name} appears to be invalid (too short)`,
          `Configuration error: ${name} appears to be invalid. Please check your API key.`,
          {
            code: 'ENV_INVALID',
            retryable: false,
            context: { variableName: name, length: value.length },
          }
        );
      }
    }

    return null;
  }

  static checkAllEnvironmentVariables(): DTIError[] {
    const required = [
      'OPENAI_API_KEY',
      'FASHN_AI_API_KEY',
      'RAPIDAPI_KEY',
      'RAPIDAPI_HOST',
    ];

    const errors: DTIError[] = [];

    for (const envVar of required) {
      const error = this.validateEnvironmentVariable(envVar, process.env[envVar]);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }
}

// Utility functions for common error scenarios
export function createAPIError(apiName: string, endpoint: string, response: Response | null, originalError?: Error) {
  return ErrorHandler.handleAPIError(apiName, endpoint, response, originalError);
}

export function createNetworkError(context: string, originalError: Error) {
  return ErrorHandler.handleNetworkError(context, originalError);
}

export function createValidationError(field: string, value: any, requirement: string) {
  return ErrorHandler.handleValidationError(field, value, requirement);
}

export function createUserError(action: string, reason: string) {
  return ErrorHandler.handleUserError(action, reason);
}

export function createSystemError(component: string, originalError: Error) {
  return ErrorHandler.handleSystemError(component, originalError);
}

export function withRetry<T>(operation: () => Promise<T>, operationName: string, maxRetries?: number): Promise<T> {
  return ErrorHandler.handleWithRetry(operation, operationName, maxRetries);
}

export function trackError(error: DTIError): void {
  return ErrorHandler.trackError(error);
}