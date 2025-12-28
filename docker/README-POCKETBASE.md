# PocketBase Deployment Guide

## Quick Deploy Options

### Option 1: PocketHost.io (Easiest - 2 minutes)

1. Go to [pockethost.io](https://pockethost.io)
2. Sign up with GitHub
3. Click "Create Instance"
4. Choose a name (e.g., `market-mi-auth`)
5. Copy your URL: `https://market-mi-auth.pockethost.io`
6. Done! Update `VITE_POCKETBASE_URL` in your `.env.local`

### Option 2: Railway (3 minutes)

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo" → Fork [pocketbase/pocketbase](https://github.com/pocketbase/pocketbase)
4. Or use template: Search "PocketBase"
5. Deploy and get your URL

### Option 3: Oracle Cloud (Free Forever - 30 min setup)

#### Step 1: Create Oracle Cloud Account
```
1. Go to cloud.oracle.com
2. Sign up for "Always Free" tier
3. Verify email and complete registration
```

#### Step 2: Create Compute Instance
```
1. Go to Compute → Instances → Create Instance
2. Name: market-mi-pocketbase
3. Image: Ubuntu 22.04
4. Shape: VM.Standard.A1.Flex (Ampere - Free)
5. Add SSH key or generate one
6. Create instance and note Public IP
```

#### Step 3: Connect and Install Docker
```bash
ssh ubuntu@<your-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Log out and back in
exit
ssh ubuntu@<your-ip>
```

#### Step 4: Deploy PocketBase
```bash
# Create directory
mkdir pocketbase && cd pocketbase

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM alpine:latest
ARG PB_VERSION=0.23.4
RUN apk add --no-cache unzip ca-certificates
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && rm /tmp/pb.zip
EXPOSE 8090
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  pocketbase:
    build: .
    ports:
      - "8090:8090"
    volumes:
      - pb_data:/pb/pb_data
    restart: unless-stopped
volumes:
  pb_data:
EOF

# Start PocketBase
docker compose up -d --build
```

#### Step 5: Open Firewall
```bash
# Oracle Cloud Console → Networking → Virtual Cloud Networks
# Click your VCN → Security Lists → Default Security List
# Add Ingress Rule:
#   Source CIDR: 0.0.0.0/0
#   Protocol: TCP
#   Destination Port: 8090

# Also open on Ubuntu:
sudo iptables -I INPUT -p tcp --dport 8090 -j ACCEPT
sudo netfilter-persistent save
```

#### Step 6: Access Admin
```
1. Go to http://<your-ip>:8090/_/
2. Create admin account
3. Configure collections (see below)
```

---

## Configure PocketBase

### 1. Create Admin Account
Visit `https://your-url/_/` and create the first admin.

### 2. Extend Users Collection
In PocketBase Admin → Collections → users → Edit:

Add these fields:
- `fullName` (text)
- `role` (select: user, admin) - default: user
- `subscriptionTier` (select: free, pro) - default: free

### 3. Create Profiles Collection
```
Collection: profiles
Fields:
- user (relation → users, required)
- companyName (text)
- industry (text)
- description (text)
- targetAudience (text)
- brandVoice (text)
- goals (text)
```

### 4. Enable OAuth (Optional)

**Google:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Set redirect URI: `https://your-pb-url/api/oauth2-redirect`
4. Add to PocketBase: Settings → Auth Providers → Google

**GitHub:**
1. Go to GitHub → Settings → Developer Settings → OAuth Apps
2. Create new app
3. Set callback: `https://your-pb-url/api/oauth2-redirect`
4. Add to PocketBase: Settings → Auth Providers → GitHub

### 5. Configure CORS
In PocketBase Admin → Settings → Application:
- Add your Netlify domain to allowed origins

---

## Update Frontend

Add to your `.env.local`:
```
VITE_POCKETBASE_URL=https://your-pocketbase-url.com
```

Redeploy to Netlify and authentication is ready!
