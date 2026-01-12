# 🚀 Render Deployment Guide

## Prerequisites

1. **Docker**: Your application is already containerized
2. **GitHub**: Push your code to a GitHub repository  
3. **Render Account**: Sign up at [render.com](https://render.com)

## Deployment Steps

### 1. Prepare Your Repository

```bash
# Add Render configuration files (already created)
git add render.yaml render-build.sh
git commit -m "Add Render deployment configuration"
git push origin main
```

### 2. Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render will auto-detect the `render.yaml` configuration

### 3. Configure Environment Variables

In Render Dashboard → Your Service → Environment:

**Required Variables:**
```bash
NODE_ENV=production
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

**Application Variables:**
Add your specific environment variables like:
- Database connection strings (e.g., `DATABASE_URL`)
- Redis connection strings (e.g., `REDIS_URL`) 
- API keys
- Other service URLs

### 4. Deploy

Render will automatically:
1. Build your Docker image using `Dockerfile`
2. Deploy to the production stage
3. Run health checks on `/api/v1/capture-metrics/health`
4. Provide you with a live URL

## Render Configuration Details

### Service Configuration (`render.yaml`)

- **Runtime**: Docker with multi-stage build
- **Plan**: Standard (recommended for Puppeteer)
- **Region**: Oregon (default, change as needed)
- **Scaling**: 1-3 instances based on CPU/Memory
- **Disk**: 1GB for screenshots storage
- **Health Check**: Custom endpoint at `/api/v1/capture-metrics/health`
- **Secrets**: Managed via Render's environment variables

### Resource Requirements

**Recommended Plan**: Standard or higher
- **CPU**: 1+ vCPU (Puppeteer is CPU intensive)
- **Memory**: 2+ GB RAM (Chrome requires significant memory)
- **Disk**: 1+ GB for temporary files and screenshots

## Environment Variables Setup

### Option 1: Render Dashboard
1. Go to your service → Environment
2. Add variables individually
3. Mark sensitive variables as "secret"

### Option 2: Environment File
1. Create `.env.production` locally (don't commit to git)
2. Copy variables to Render dashboard individually
3. Use Render's built-in secret management

## Troubleshooting

### Common Issues

**1. Chrome/Chromium Not Found**
- Ensure `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`
- Verify Dockerfile installs Chromium correctly

**2. Memory Issues**
- Upgrade to Standard plan or higher
- Add `--max-old-space-size=2048` to Node.js options

**3. Build Timeouts**
- Docker builds can take 5-10 minutes
- Ensure efficient layer caching in Dockerfile

**4. Health Check Failures**
- Verify `/api/v1/capture-metrics/health` endpoint works
- Check application starts properly in container

### Debug Commands

```bash
# Check service logs
render logs --service bug-spy

# Monitor service status  
render status --service bug-spy

# Restart service
render restart --service bug-spy
```

## Performance Optimization

### Docker Optimization
- Multi-stage builds reduce image size
- Layer caching speeds up rebuilds
- Minimal base image (Node 20 bullseye-slim)

### Application Optimization
- Set appropriate Puppeteer launch args
- Implement connection pooling
- Use page caching where appropriate

### Render Optimization  
- Enable auto-scaling
- Use appropriate instance size
- Monitor resource usage

## Cost Considerations

**Standard Plan**: ~$25/month
- 4 GB RAM, 2 vCPU
- Suitable for moderate traffic
- Auto-scaling available

**Pro Plan**: ~$85/month  
- 8 GB RAM, 4 vCPU
- Better for high traffic
- Advanced scaling options

## Monitoring

### Built-in Monitoring
- CPU, Memory, Network usage
- Request metrics  
- Error rates
- Health check status

### Custom Monitoring
- Application logs via Render dashboard
- Custom metrics via your health endpoint
- External monitoring (DataDog, New Relic, etc.)

## Scaling

### Horizontal Scaling
- Configure in `render.yaml`
- Auto-scales based on CPU/Memory thresholds
- Load balancer included

### Vertical Scaling
- Upgrade service plan
- More resources per instance
- Better for memory-intensive Puppeteer operations

## Security

### Environment Variables
- Use Render's secret management
- Integrate with Doppler for advanced secret management
- Never commit secrets to repository

### Network Security
- HTTPS enabled by default
- Custom domains supported
- DDoS protection included

## Next Steps

1. **Push to GitHub**: Commit all changes
2. **Create Render Service**: Follow deployment steps
3. **Configure Environment**: Set required variables  
4. **Monitor Deployment**: Watch build logs
5. **Test Application**: Verify endpoints work
6. **Set up Custom Domain**: Optional, for production use

Your application will be live at: `https://your-service-name.onrender.com`