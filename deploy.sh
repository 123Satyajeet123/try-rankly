#!/bin/bash

# Rankly Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting Rankly Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please don't run this script as root${NC}"
   exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 not found. Installing PM2...${NC}"
    sudo npm install -g pm2
fi

# Navigate to project directory
cd "$(dirname "$0")"

echo -e "${GREEN}📦 Installing dependencies...${NC}"

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Build frontend
echo -e "${GREEN}🔨 Building Next.js application...${NC}"
npm run build

# Create logs directory
mkdir -p logs

# Stop existing PM2 processes
echo -e "${YELLOW}🛑 Stopping existing PM2 processes...${NC}"
pm2 stop ecosystem.config.js 2>/dev/null || true
pm2 delete ecosystem.config.js 2>/dev/null || true

# Start PM2 processes
echo -e "${GREEN}▶️  Starting PM2 processes...${NC}"
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 PM2 Status:"
pm2 status
echo ""
echo "📝 View logs with: pm2 logs"
echo "🔄 Restart with: pm2 restart all"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo "  1. Configure nginx (see DEPLOYMENT_GUIDE.md)"
echo "  2. Set up SSL certificate"
echo "  3. Update Google OAuth redirect URIs"
echo "  4. Configure environment variables"




