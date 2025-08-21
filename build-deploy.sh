#!/bin/bash

echo "🚀 Building Outdoor Team for deployment..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf public/
rm -rf client/dist/

# Create directories
echo "📁 Creating build directories..."
mkdir -p public/assets
mkdir -p logs

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install

# Build client
echo "🏗️  Building client..."
npm run build

# Go back to root
cd ..

# Install server dependencies 
echo "📦 Installing server dependencies..."
npm install --production

# Build server
echo "🏗️  Building server..."
npm run build:server

# Copy additional assets
echo "📄 Copying additional assets..."
npm run copy:assets

# Verify build
echo "✅ Verifying build..."
if [ ! -f "public/index.html" ]; then
    echo "❌ Error: public/index.html not found"
    exit 1
fi

if [ ! -f "public/server/index.js" ]; then
    echo "❌ Error: public/server/index.js not found"
    exit 1
fi

# Create data directory if it doesn't exist
mkdir -p data

echo "✅ Build complete!"
echo "📁 Files ready in public/ directory"
echo "🚀 Ready for deployment with: node public/server/index.js"
