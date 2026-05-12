#!/bin/bash

# SATS Web App Setup Script
# This script automates the installation and setup of the SATS web application

set -e

echo "=================================================="
echo "Smart Asset Tracker - Web App Setup"
echo "=================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✓ Dependencies installed successfully"
echo ""

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cp .env.local.example .env.local
    echo "✓ .env.local created. Please update the API URL if needed."
else
    echo "ℹ️  .env.local already exists"
fi

echo ""
echo "=================================================="
echo "Setup Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Update API URL in .env.local if needed"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "Default login credentials:"
echo "  Email: admin@example.com"
echo "  Password: password123"
echo ""
