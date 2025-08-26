#!/bin/bash

# Deploy Separated Architecture
# Dashboard → dashboard.lanonasis.com
# API → api.lanonasis.com (separate backend deployment)

echo "🚀 Deploying Lanonasis MaaS with separated architecture..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from lanonasis-maas directory"
    exit 1
fi

# Build dashboard
echo "📦 Building dashboard..."
cd dashboard
bun install
bun run build

if [ $? -ne 0 ]; then
    echo "❌ Dashboard build failed"
    exit 1
fi

echo "✅ Dashboard built successfully"
echo ""

# Deploy dashboard to dashboard.lanonasis.com
echo "🌐 Deploying dashboard to dashboard.lanonasis.com..."
netlify deploy --prod \
    --dir=dist \
    --site=dashboard.lanonasis.com \
    --config=netlify-dashboard.toml

if [ $? -ne 0 ]; then
    echo "❌ Dashboard deployment failed"
    echo "💡 Tip: Make sure you have a Netlify site linked to dashboard.lanonasis.com"
    echo "   Run: netlify sites:create --name dashboard-lanonasis"
    echo "   Then: netlify link"
    exit 1
fi

echo "✅ Dashboard deployed to dashboard.lanonasis.com"
echo ""

# Show deployment summary
echo "🎉 Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Dashboard: https://dashboard.lanonasis.com"
echo "🔌 API: https://api.lanonasis.com"
echo "📚 API Docs: https://api.lanonasis.com/docs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Deploy API backend separately to api.lanonasis.com"
echo "2. Update DNS records if needed"
echo "3. Test authentication flow at dashboard.lanonasis.com"