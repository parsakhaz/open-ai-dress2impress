import type { NextRequest } from 'next/server';
import { ErrorHandler, ErrorCategory } from './errorHandling';

// Simple in-memory rate limiting implementation
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Rate limiting configurations for different API endpoints
const rateLimitConfigs = {
  // Standard API endpoints - 30 requests per minute per IP
  standard: { rate: 30, interval: 60_000 },
  
  // Heavy AI operations (avatar, try-on, video) - 10 requests per 5 minutes per IP
  aiOperations: { rate: 10, interval: 5 * 60_000 },
  
  // Health check - more permissive
  health: { rate: 100, interval: 60_000 },
  
  // Debug endpoints - very restrictive (dev only anyway)
  debug: { rate: 5, interval: 60_000 },
} as const;

// Store rate limit data per IP and type
const rateLimitStore = new Map<string, RateLimitEntry>();

function getRateLimitKey(clientIP: string, type: RateLimitType): string {
  return `${clientIP}:${type}`;
}

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup expired entries every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60_000);

export type RateLimitType = keyof typeof rateLimitConfigs;

/**
 * Extract client IP address from request, considering proxy headers
 */
function getClientIP(req: NextRequest): string {
  // Check common proxy headers first
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to localhost if no proxy headers found
  return '127.0.0.1';
}

/**
 * Apply rate limiting to an API request
 * @param req - Next.js request object
 * @param type - Type of rate limiting to apply
 * @returns Promise that resolves if rate limit is OK, throws error if exceeded
 */
export async function checkRateLimit(req: NextRequest, type: RateLimitType = 'standard'): Promise<void> {
  const clientIP = getClientIP(req);
  const config = rateLimitConfigs[type];
  const key = getRateLimitKey(clientIP, type);
  const now = Date.now();
  
  // Get existing entry or create new one
  const entry = rateLimitStore.get(key) || { count: 0, resetTime: now + config.interval };
  
  // Reset counter if interval has passed
  if (now >= entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + config.interval;
  }
  
  // Check rate limit
  if (entry.count >= config.rate) {
    throw ErrorHandler.createError(
      ErrorCategory.USER_ERROR,
      `Rate limit exceeded for IP: ${clientIP}`,
      'Too many requests. Please wait a moment before trying again.',
      {
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        context: { 
          ip: clientIP, 
          limitType: type, 
          resetTime: entry.resetTime,
          remainingTime: Math.ceil((entry.resetTime - now) / 1000),
        },
        retryable: true,
      }
    );
  }
  
  // Increment counter and store
  entry.count++;
  rateLimitStore.set(key, entry);
}

/**
 * Middleware wrapper that adds rate limiting to API route handlers
 */
export function withRateLimit(type: RateLimitType = 'standard') {
  return function<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
    return (async (req: NextRequest, ...args: any[]) => {
      await checkRateLimit(req, type);
      return handler(req, ...args);
    }) as T;
  };
}