import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Create response object
  const response = NextResponse.next();
  
  // Security headers for all requests
  const securityHeaders = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy (restrict sensitive APIs)
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    
    // Strict Transport Security (HTTPS only) - only in production
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),
  };
  
  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Allow specific origins in production, localhost in development
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [process.env.NEXT_PUBLIC_APP_URL].filter(Boolean)
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];
    
    const origin = request.headers.get('origin');
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }
  }
  
  // Content Security Policy for HTML pages (not API routes)
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline needed for Next.js
      "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind
      "img-src 'self' data: blob: https:", // Allow external images for try-on results
      "media-src 'self' data: blob:",
      "connect-src 'self' https://api.openai.com https://api.fashn.ai https://api.llama.com https://real-time-amazon-data.p.rapidapi.com",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', csp);
  }
  
  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    // Match all request paths except static files
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};