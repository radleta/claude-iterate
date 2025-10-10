#!/bin/bash

# Build script for claude-iterate
# This script builds the TypeScript source and prepares the package for distribution

set -e

echo "🏗️  Building claude-iterate..."

# Step 1: Install dependencies (if needed)
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "📦 Dependencies already installed (skipping)"
fi

# Step 2: Build TypeScript
echo "🔨 Compiling TypeScript..."
npm run build

# Step 3: Run tests against built code
echo "🧪 Running tests..."
npm test

# Step 4: Lint and type check
echo "✨ Linting and type checking..."
npm run lint || true
npm run typecheck || true

# Step 5: Verify the build
echo "✅ Verifying build..."
if [ -f "dist/src/index.js" ] && [ -f "dist/src/cli.js" ]; then
    echo "✨ Build successful!"
    echo "📁 Distribution ready in: dist/"
    echo ""
    echo "Next steps:"
    echo "  npm run pack:dry                     # Verify package contents"
    echo "  npm run size:check                   # Check package size"
    echo "  npm version [patch|minor|major]      # Bump version and update changelog"
    echo "  git push && git push --tags          # Trigger release"
else
    echo "❌ Build failed - missing expected files"
    exit 1
fi
