import { ErrorHandler } from './errorHandling';

export interface ServerEnv {
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL: string;
  FASHN_AI_API_KEY: string;
  RAPIDAPI_KEY: string;
  RAPIDAPI_HOST: string;
  KLING_ACCESS_KEY?: string;
  KLING_SECRET_KEY?: string;
}

function requireEnvVar(name: string, value: string | undefined): string {
  const err = ErrorHandler.validateEnvironmentVariable(name, value);
  if (err) {
    throw err;
  }
  return value as string;
}

export function getServerEnv(): ServerEnv {
  const OPENAI_API_KEY = requireEnvVar('OPENAI_API_KEY', process.env.OPENAI_API_KEY);
  const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
  const FASHN_AI_API_KEY = requireEnvVar('FASHN_AI_API_KEY', process.env.FASHN_AI_API_KEY);
  const RAPIDAPI_KEY = requireEnvVar('RAPIDAPI_KEY', process.env.RAPIDAPI_KEY);
  const RAPIDAPI_HOST = requireEnvVar('RAPIDAPI_HOST', process.env.RAPIDAPI_HOST);
  const KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY;
  const KLING_SECRET_KEY = process.env.KLING_SECRET_KEY;

  return {
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    FASHN_AI_API_KEY,
    RAPIDAPI_KEY,
    RAPIDAPI_HOST,
    KLING_ACCESS_KEY,
    KLING_SECRET_KEY,
  };
}

// Minimal OpenAI-only env (avoids requiring other keys)
export function getOpenAIEnvOnly(): { OPENAI_API_KEY: string; OPENAI_BASE_URL: string } {
  const OPENAI_API_KEY = requireEnvVar('OPENAI_API_KEY', process.env.OPENAI_API_KEY);
  const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
  return { OPENAI_API_KEY, OPENAI_BASE_URL };
}

export function assertEnv(names: string[]): void {
  for (const n of names) {
    const err = ErrorHandler.validateEnvironmentVariable(n, process.env[n]);
    if (err) throw err;
  }
}

/**
 * Validates production environment configuration
 * Should be called during application startup in production
 */
export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') {
    return; // Skip validation in non-production environments
  }

  const issues: string[] = [];

  // Required environment variables for production
  const requiredVars = [
    'OPENAI_API_KEY',
    'FASHN_AI_API_KEY',
    'RAPIDAPI_KEY',
    'RAPIDAPI_HOST',
  ];

  // Check required variables
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.includes('your_') || value.includes('_here')) {
      issues.push(`${varName} is missing or contains placeholder values`);
    }
  }

  // Validate specific formats
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
    issues.push('OPENAI_API_KEY does not appear to be a valid OpenAI API key');
  }

  if (process.env.FASHN_AI_API_KEY && !process.env.FASHN_AI_API_KEY.startsWith('fa-')) {
    issues.push('FASHN_AI_API_KEY does not appear to be a valid FASHN AI API key');
  }

  if (process.env.RAPIDAPI_HOST && process.env.RAPIDAPI_HOST !== 'real-time-amazon-data.p.rapidapi.com') {
    issues.push('RAPIDAPI_HOST should be set to "real-time-amazon-data.p.rapidapi.com"');
  }

  // Optional but recommended for production
  const recommendedVars = [
    'NEXT_PUBLIC_APP_URL',
  ];

  for (const varName of recommendedVars) {
    if (!process.env[varName]) {
      console.warn(`⚠️  Production warning: ${varName} is not set but recommended for production deployments`);
    }
  }

  // Security checks
  if (process.env.NODE_ENV === 'production') {
    // Ensure we're not accidentally exposing debug endpoints
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      issues.push('NEXT_PUBLIC_DEBUG should not be enabled in production');
    }
  }

  if (issues.length > 0) {
    console.error('❌ Production environment validation failed:');
    issues.forEach(issue => console.error(`   • ${issue}`));
    throw new Error(`Production environment validation failed with ${issues.length} issues. Please fix these before deploying.`);
  }

  console.log('✅ Production environment validation passed');
}

/**
 * Get production readiness status
 */
export function getProductionReadiness(): {
  ready: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  const requiredVars = ['OPENAI_API_KEY', 'FASHN_AI_API_KEY', 'RAPIDAPI_KEY', 'RAPIDAPI_HOST'];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      issues.push(`${varName} is not configured`);
    } else if (value.includes('your_') || value.includes('_here')) {
      issues.push(`${varName} contains placeholder values`);
    }
  }

  const optionalVars = ['KLING_ACCESS_KEY', 'KLING_SECRET_KEY'];
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (!value) {
      warnings.push(`${varName} is not configured (optional - video generation will be disabled)`);
    }
  }

  if (!process.env.NEXT_PUBLIC_APP_URL && process.env.NODE_ENV === 'production') {
    warnings.push('NEXT_PUBLIC_APP_URL not set (recommended for production CORS configuration)');
  }

  return {
    ready: issues.length === 0,
    issues,
    warnings,
  };
}


