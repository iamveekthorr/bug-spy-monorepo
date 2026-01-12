# 🐳 Docker Setup Guide

## Quick Start

### Development
```bash
# Start development container with hot reload
docker-compose up app-dev

# Access the application
curl "http://localhost:3000/api/v1/capture-metrics/single?url=https://example.com&deviceType=desktop&testType=performance"
```

### Production
```bash
# Start production container (requires Doppler token)
DOPPLER_TOKEN="your-service-token" docker-compose up app-prod

# Access on port 3001
curl "http://localhost:3001/api/v1/capture-metrics/single?url=https://example.com&deviceType=desktop&testType=performance"
```

## Architecture

### Multi-stage Dockerfile
- **Base stage**: Node.js 20 with Chromium and system dependencies
- **Development stage**: Full dev environment with hot reload
- **Production stage**: Optimized build with Doppler CLI

### Key Features
- ✅ **ARM64/Apple Silicon compatible** - Uses native Chromium for ARM64
- ✅ **Security hardened** - Runs as non-root user (`nodeuser`)
- ✅ **Optimized caching** - Smart layer caching for faster builds
- ✅ **Health checks** - Built-in endpoint monitoring
- ✅ **Hot reload** - Volume mounting for development

## Environment Variables

```bash
# Puppeteer Configuration
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Node Environment
NODE_ENV=development|production

# Doppler Configuration (Production only)
DOPPLER_TOKEN=your-service-token
DOPPLER_CONFIG_DIR=/app/.doppler
```

## Container Services

### Development Container (`app-dev`)
- **Port**: 3000
- **Features**: Hot reload, volume mounting, dev dependencies
- **Command**: `npm run start:dev`

### Production Container (`app-prod`)  
- **Port**: 3001
- **Features**: Optimized build, Doppler secrets, security hardening
- **Command**: `doppler run -- node dist/main.js`

## Manual Docker Commands

### Development
```bash
# Build development image
docker build --target development -t bug-spy:dev .

# Run development container
docker run -p 3000:3000 -v $(pwd):/app -v /app/node_modules bug-spy:dev
```

### Production
```bash
# Build production image
docker build --target production -t bug-spy:prod .

# Run production container
docker run -p 3000:3000 -e DOPPLER_TOKEN="your-token" bug-spy:prod
```

## Troubleshooting

### Container Won't Start
```bash
# Check container logs
docker-compose logs app-dev

# Rebuild without cache
docker-compose build --no-cache app-dev
```

### Puppeteer Issues
- Container uses native Chromium instead of bundled Chrome
- Runs as non-root user for security
- Uses `--no-sandbox` flags automatically

### Health Check
The container includes a health check endpoint:
```
GET /api/v1/capture-metrics/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "capture-metrics"
}
```

## Performance Notes

- Build time: ~2-3 minutes (cached)
- Image size: ~1.4GB (development), ~1.2GB (production)
- Memory usage: ~512MB base + application requirements
- Supports ARM64 (Apple Silicon) and AMD64 architectures