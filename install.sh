#!/bin/bash

# Financial Risk Analyzer App - Installation Script
# Reda SALHI - Financial Engineering

echo "🚀 Installing Financial Risk Analyzer App..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js and npm are installed${NC}"

# Install Expo CLI globally if not installed
if ! command -v expo &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Expo CLI globally...${NC}"
    npm install -g @expo/cli
fi

echo -e "${GREEN}✅ Expo CLI is ready${NC}"

# Install project dependencies
echo -e "${YELLOW}📦 Installing project dependencies...${NC}"
npm install

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Create src directory structure if it doesn't exist
echo -e "${YELLOW}📁 Creating directory structure...${NC}"
mkdir -p src/utils
mkdir -p src/components
mkdir -p assets/documents

echo -e "${GREEN}✅ Directory structure created${NC}"

# Final success message
echo ""
echo "🎉 Installation completed successfully!"
echo "================================================"
echo -e "${BLUE}📱 To start the app:${NC}"
echo "   npx expo start"
echo ""
echo -e "${BLUE}📊 Features included:${NC}"
echo "   ✅ Real-time financial data (Yahoo Finance)"
echo "   ✅ Portfolio optimization (Markowitz)"
echo "   ✅ VaR calculations (4 methods)"
echo "   ✅ Interactive charts"
echo "   ✅ CAPM analysis"
echo ""
echo -e "${BLUE}📱 Test on your device:${NC}"
echo "   1. Install 'Expo Go' app on your phone"
echo "   2. Scan the QR code when the metro bundler starts"
echo "   3. Enjoy your financial analysis app!"
echo ""
echo -e "${GREEN}🎓 Created by: SALHI Reda - Financial Engineering${NC}"