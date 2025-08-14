import type { NextRequest } from 'next/server';
import { createHandler } from '@/lib/util/apiRoute';

export const runtime = 'nodejs';

interface HealthStatus {
  ok: boolean;
  timestamp: string;
  version: string;
  environment: string;
  services: {
    openai: 'ok' | 'error' | 'not_configured';
    fashn: 'ok' | 'error' | 'not_configured';
    rapidapi: 'ok' | 'error' | 'not_configured';
    kling: 'ok' | 'error' | 'not_configured' | 'optional';
  };
  uptime: number;
}

async function checkServiceHealth(service: string, endpoint: string, headers: Record<string, string>): Promise<'ok' | 'error'> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok ? 'ok' : 'error';
  } catch (error) {
    return 'error';
  }
}

export const GET = createHandler<void, HealthStatus>({
  parse: async () => undefined,
  rateLimit: 'health', // More permissive rate limiting for health checks
  handle: async () => {
    const startTime = process.hrtime();
    const timestamp = new Date().toISOString();
    
    // Check environment variables
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
    const hasFashn = Boolean(process.env.FASHN_AI_API_KEY);
    const hasRapidAPI = Boolean(process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_HOST);
    const hasKling = Boolean(process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY);
    
    // Perform lightweight health checks for configured services
    const services = {
      openai: hasOpenAI ? 
        await checkServiceHealth('openai', 'https://api.openai.com/v1/models', {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        }) : 'not_configured' as const,
      
      fashn: hasFashn ? 
        await checkServiceHealth('fashn', 'https://api.fashn.ai/v1', {
          'Authorization': `Bearer ${process.env.FASHN_AI_API_KEY}`,
        }) : 'not_configured' as const,
      
      rapidapi: hasRapidAPI ? 
        await checkServiceHealth('rapidapi', `https://${process.env.RAPIDAPI_HOST}/`, {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
          'X-RapidAPI-Host': process.env.RAPIDAPI_HOST!,
        }) : 'not_configured' as const,
      
      kling: hasKling ? 
        await checkServiceHealth('kling', 'https://api.kuaishou.com/', {
          'Authorization': `Bearer ${process.env.KLING_ACCESS_KEY}`,
        }) : 'optional' as const, // Kling is optional
    };
    
    // Calculate uptime
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const uptime = seconds + nanoseconds / 1e9;
    
    // Overall health status
    const criticalServices = [services.openai, services.fashn, services.rapidapi];
    const ok = criticalServices.every(status => status === 'ok' || status === 'not_configured');
    
    return {
      ok,
      timestamp,
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      uptime,
    };
  },
});


