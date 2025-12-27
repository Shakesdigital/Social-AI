# Self-Hosted SERP Scraper Deployment Guide

This guide explains how to deploy unlimited, free Google SERP scraping for your SocialAI application.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      SocialAI Frontend                          │
│                    (Netlify/Vercel)                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Your VPS/Server                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │   Novexity      │  │    SearxNG      │  │    Redis       │  │
│  │  (Port 8000)    │  │  (Port 8080)    │  │  (Port 6379)   │  │
│  │   Primary       │  │   Fallback      │  │   Cache        │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

- A VPS/Server (DigitalOcean, Hetzner, Linode, etc.) - $4-10/month
- Docker and Docker Compose installed
- Domain name (optional, for HTTPS)

## 🚀 Quick Start

### 1. Clone/Copy the Docker Files

Copy the `docker/` folder to your server:

```bash
scp -r docker/ user@your-server:/opt/socialai-serp/
```

### 2. Deploy with Docker Compose

SSH into your server and run:

```bash
cd /opt/socialai-serp
docker-compose -f docker-compose.serp.yml up -d
```

### 3. Verify Deployment

```bash
# Check Novexity
curl http://localhost:8000/health

# Check SearxNG
curl http://localhost:8080/search?q=test&format=json

# Check all services
docker-compose -f docker-compose.serp.yml ps
```

### 4. Configure Environment Variables

In your Netlify/Vercel dashboard, add these environment variables:

```env
# Self-hosted SERP Scraper
VITE_NOVEXITY_URL=http://your-server-ip:8000
VITE_NOVEXITY_API_KEY=optional-api-key

# Fallback SearxNG
VITE_SEARXNG_URL=http://your-server-ip:8080

# Keep Serper as last fallback (optional)
VITE_SERPER_API_KEY=your-key-if-you-have-one
```

## 🔒 Production Security

### Enable HTTPS with Nginx

Create `/etc/nginx/sites-available/serp`:

```nginx
server {
    listen 443 ssl http2;
    server_name serp.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/serp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/serp.yourdomain.com/privkey.pem;

    # Novexity
    location /novexity/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,Content-Type,Accept,X-API-Key';
    }

    # SearxNG
    location /searxng/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
    }
}
```

Then update your env vars:
```env
VITE_NOVEXITY_URL=https://serp.yourdomain.com/novexity
VITE_SEARXNG_URL=https://serp.yourdomain.com/searxng
```

### Add IP Whitelist (Optional)

Limit access to only your Netlify app:

```nginx
# In your nginx location blocks
allow 104.16.0.0/12;   # Cloudflare
allow 172.xx.xx.xx;     # Your Netlify IP
deny all;
```

## 🛡️ Anti-Blocking Measures

### 1. Add Rotating Proxies

Edit `docker-compose.serp.yml`:

```yaml
novexity:
  environment:
    - PROXY_URL=http://proxy-provider:port
    - PROXY_ROTATE=true
```

Popular free/cheap proxy providers:
- **Webshare** (10 free proxies)
- **ProxyScrape** (free list, requires parsing)
- **BrightData** (pay-per-use, very reliable)

### 2. Configure Request Delays

The scraper already has 1-second minimum delays. Increase if needed:

```env
VITE_SERP_MIN_DELAY_MS=2000
```

### 3. User-Agent Rotation

Already implemented in `simple-serp-server.js`. Add more user agents:

```javascript
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...',
    // Add more
];
```

## 📊 Monitoring

### View Logs

```bash
docker-compose -f docker-compose.serp.yml logs -f
```

### Check Cache Stats

```bash
docker exec -it serp-cache redis-cli INFO stats
```

### Health Check Script

```bash
#!/bin/bash
# save as /opt/socialai-serp/healthcheck.sh

NOVEXITY=$(curl -s http://localhost:8000/health | jq -r '.status')
SEARXNG=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/search?q=test&format=json")

if [ "$NOVEXITY" == "healthy" ] && [ "$SEARXNG" == "200" ]; then
    echo "✅ All SERP services healthy"
else
    echo "❌ SERP service issue detected"
    echo "Novexity: $NOVEXITY"
    echo "SearxNG: $SEARXNG"
    # Add alerting here (Slack, email, etc.)
fi
```

## 🔄 Fallback Priority

The `serpScraperService.ts` tries providers in this order:

1. **Cache** - Returns cached results if fresh (1-hour TTL)
2. **Novexity** - Self-hosted, SerpAPI-compatible
3. **SearxNG** - Self-hosted metasearch
4. **Serper.dev** - Paid API fallback
5. **Mock** - Placeholder results (never blocks the app)

## 💰 Cost Comparison

| Solution | Monthly Cost | Queries/Month |
|----------|--------------|---------------|
| **Self-hosted (this)** | $4-10 (VPS) | **Unlimited** |
| Serper.dev Free | $0 | 2,500 |
| Serper.dev Paid | $50+ | 50,000 |
| SerpAPI | $50+ | 5,000 |
| Google Custom Search | $5+ | 10,000 |

## 🐛 Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:
1. Ensure the CORS headers are set in nginx
2. Or deploy a Netlify/Vercel function as a proxy

### Rate Limiting

If Google blocks requests:
1. Increase delays between requests
2. Add rotating proxies
3. Use SearxNG as it aggregates multiple engines

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.serp.yml logs novexity

# Rebuild
docker-compose -f docker-compose.serp.yml build --no-cache
docker-compose -f docker-compose.serp.yml up -d
```

## 🚀 Scaling

For high-traffic applications:

1. **Add more instances**: Scale horizontally
   ```bash
   docker-compose -f docker-compose.serp.yml up -d --scale novexity=3
   ```

2. **Add load balancer**: Use nginx upstream

3. **Use managed Redis**: Replace local Redis with Redis Cloud

---

## Support

For issues, check:
- [Novexity GitHub](https://github.com/NorkzYT/Novexity)
- [SearxNG Documentation](https://docs.searxng.org/)
