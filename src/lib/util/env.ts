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


