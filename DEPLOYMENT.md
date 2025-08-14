# 🚀 Production Deployment Guide

This guide covers deploying Dress to Impress to production using Docker and Coolify on Digital Ocean.

## 🔧 Prerequisites

- Digital Ocean VPS or similar Linux server
- Domain name pointed to your server
- Coolify installed on your server
- Required API keys (see Environment Variables below)

## 📋 Environment Variables

Create these environment variables in your deployment platform:

### Required Variables
```bash
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
FASHN_AI_API_KEY=fa-your_fashn_api_key_here
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=real-time-amazon-data.p.rapidapi.com
```

### Optional Variables
```bash
KLING_ACCESS_KEY=your_kling_access_key_here      # For video generation
KLING_SECRET_KEY=your_kling_secret_key_here
NEXT_PUBLIC_APP_URL=https://your-domain.com      # For CORS configuration
```

## 🐳 Local Docker Testing

### Method 1: Development Mode (Recommended)
```bash
# 1. Clone the repository
git clone <your-repo-url>
cd open-ai-dress2impress

# 2. Copy environment template
cp .env.example .env.local

# 3. Edit .env.local with your real API keys
nano .env.local

# 4. Install dependencies and run
npm install
npm run dev

# 5. Test health endpoint
curl -s http://localhost:3000/api/health
```

### Method 2: Production Build
```bash
# 1. Build for production
npm run build
npm start

# 2. Test health endpoint
curl -s http://localhost:3000/api/health
```

### Method 3: Docker Build (May Have Issues)
```bash
# 1. Build Docker image
docker build -t dress2impress:latest .

# 2. Run with environment variables
docker run --rm -p 3000:3000 \
  -e OPENAI_API_KEY=your_actual_key \
  -e FASHN_AI_API_KEY=your_actual_key \
  -e RAPIDAPI_KEY=your_actual_key \
  -e RAPIDAPI_HOST=real-time-amazon-data.p.rapidapi.com \
  dress2impress:latest

# 3. Test
curl -s http://localhost:3000/api/health
```

**Note:** Docker builds may fail due to Next.js 15 static generation issues. Use development/production build methods if needed.

## 🌐 Coolify Deployment

### Step 1: Create New Application
1. Open Coolify dashboard
2. Click "New Application"  
3. Choose "Git Repository"
4. Connect your repository
5. Select "Dockerfile" build method

### Step 2: Configure Environment
Add these environment variables in Coolify:
- `OPENAI_API_KEY`
- `FASHN_AI_API_KEY` 
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST=real-time-amazon-data.p.rapidapi.com`
- `NEXT_PUBLIC_APP_URL=https://your-domain.com`

### Step 3: Configure Build (If Needed)
If Docker build fails, override the build command:
```bash
npm install && npm run build -- --no-lint
```

### Step 4: Configure Networking
- Expose port `3000`
- Set your custom domain
- Enable SSL/TLS

### Step 5: Deploy
Click "Deploy" and monitor the logs for any issues.

## 🏥 Health Monitoring

### Health Endpoint
The application provides a comprehensive health check at `/api/health`:

```bash
curl -s https://your-domain.com/api/health
```

Expected response:
```json
{
  "ok": true,
  "timestamp": "2025-08-13T20:45:27.192Z",
  "version": "0.1.0",
  "environment": "production",
  "services": {
    "openai": "ok",
    "fashn": "ok", 
    "rapidapi": "ok",
    "kling": "optional"
  },
  "uptime": 123.456
}
```

### Service Status Meanings
- `"ok"`: Service is configured and accessible
- `"error"`: Service is configured but not accessible  
- `"not_configured"`: API key not provided
- `"optional"`: Service is optional (like Kling AI)

## 🔒 Security Features

The application includes several production-ready security features:

### Rate Limiting
- **Standard endpoints**: 30 requests per minute per IP
- **AI operations** (avatar, try-on): 10 requests per 5 minutes per IP
- **Health checks**: 100 requests per minute per IP
- **Debug endpoints**: 5 requests per minute per IP (dev only)

### Security Headers
- CORS protection
- XSS protection
- Content Security Policy
- Frame protection
- MIME type sniffing prevention

### Environment Validation
- Automatic validation of required API keys
- Format validation for API keys
- Production readiness checks

## 🔧 Reverse Proxy Configuration

If using Nginx in front of your application:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Allow larger uploads for images
    client_max_body_size 20m;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

## 📊 Monitoring & Scaling

### Basic Monitoring
- Monitor `/api/health` endpoint
- Check service status in health response
- Monitor application logs for errors

### Resource Requirements
- **Minimum**: 1 vCPU, 1GB RAM
- **Recommended**: 2 vCPU, 2GB RAM
- **Storage**: 5GB minimum

### Scaling Considerations
- Rate limiting protects against abuse
- AI operations are the most resource-intensive
- Monitor API usage and costs
- Consider implementing queue for AI operations at high scale

## 🚨 Troubleshooting

### Common Issues

**1. Docker build fails with static generation error**
- Solution: Use development mode or production build instead
- Alternative: Override Coolify build command

**2. Health endpoint shows services as "error"**
- Check API keys are correctly set
- Verify API key formats (OpenAI starts with `sk-`, FASHN with `fa-`)
- Test API keys manually

**3. Rate limiting too restrictive**
- Modify rate limits in `src/lib/util/rateLimit.ts`
- Consider implementing user-based rate limiting

**4. CORS errors**
- Set `NEXT_PUBLIC_APP_URL` to your domain
- Check middleware configuration

### Debug Commands
```bash
# Check container logs
docker logs -f <container-name>

# Test health endpoint
curl -v https://your-domain.com/api/health

# Test with rate limiting
for i in {1..35}; do curl -s https://your-domain.com/api/health; done
```

## 🎯 Post-Deployment Checklist

- [ ] Health endpoint returns `"ok": true`
- [ ] All required services show as `"ok"`
- [ ] Website loads correctly in browser
- [ ] Game timers work (Shopping: 1:45, Styling: 1:30)
- [ ] Rate limiting is functional
- [ ] SSL/TLS certificate is valid
- [ ] Domain points to correct server
- [ ] Monitoring is set up

Your application is now ready for production use! 🚀