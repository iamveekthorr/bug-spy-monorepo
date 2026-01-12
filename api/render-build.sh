#!/bin/bash

# Render build script for Puppeteer application
set -o errexit

echo "🚀 Starting Render build process..."

# Install system dependencies for Puppeteer/Chromium
echo "📦 Installing system dependencies..."

# Note: Render's Docker environment should have these through our Dockerfile
# This script is a fallback for non-Docker deployments

# Install Node dependencies
echo "📋 Installing Node.js dependencies..."
npm ci --only=production

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Build completed successfully!"

# Create screenshots directory if it doesn't exist
mkdir -p /app/screenshots

echo "🎯 Build process finished. Ready for deployment!"