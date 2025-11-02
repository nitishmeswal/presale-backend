#!/bin/bash

# NeuroSwarm Backend - AWS Deployment Script
# Usage: ./deploy-aws.sh

set -e  # Exit on error

echo "🚀 NeuroSwarm Backend - AWS Deployment"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Step 1: Installing dependencies...${NC}"
npm install

echo ""
echo -e "${YELLOW}🔨 Step 2: Building TypeScript...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Fix errors before deploying.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Build successful!${NC}"
echo ""

# Step 3: Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Create .env file with required variables:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_ANON_KEY"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - JWT_SECRET"
    echo "  - COMPUTE_SUPABASE_URL (NEW)"
    echo "  - COMPUTE_SUPABASE_ANON_KEY (NEW)"
    exit 1
fi

# Check for new Compute App env vars
if ! grep -q "COMPUTE_SUPABASE_URL" .env; then
    echo -e "${YELLOW}⚠️  Warning: COMPUTE_SUPABASE_URL not found in .env${NC}"
    echo "Plan sync from Compute App will not work!"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}🔄 Step 3: Restarting PM2 process...${NC}"

# Check if PM2 process exists
if pm2 list | grep -q "neuroswarm-backend"; then
    echo "Stopping existing process..."
    pm2 stop neuroswarm-backend
    pm2 delete neuroswarm-backend
fi

echo "Starting with ecosystem.config.js..."
pm2 start ecosystem.config.js --env production

echo "Saving PM2 configuration..."
pm2 save

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 Process Status:"
pm2 list

echo ""
echo "📝 Recent Logs:"
pm2 logs neuroswarm-backend --lines 20 --nostream

echo ""
echo -e "${GREEN}🎉 Backend is now running!${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 logs neuroswarm-backend      - View logs"
echo "  pm2 monit                        - Monitor resources"
echo "  pm2 restart neuroswarm-backend   - Restart server"
echo "  pm2 stop neuroswarm-backend      - Stop server"
echo ""
echo "Health check: curl http://localhost:3001/health"
echo ""
