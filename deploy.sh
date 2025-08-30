#!/bin/bash

echo "🚀 Deploying Attesta to Vercel..."
echo ""

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "📦 Building and deploying..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Set environment variables in Vercel dashboard:"
echo "   - NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID"
echo "   - WATCHER_PRIVATE_KEY"
echo "   - POLICY_PRIVATE_KEY" 
echo "   - RESTAKER_PRIVATE_KEY"
echo ""
echo "2. Test your app:"
echo "   - Landing page: https://your-app.vercel.app/"
echo "   - Health check: https://your-app.vercel.app/api/health"
echo "   - Manual probe: Use dashboard button or POST to /api/probe/manual"
echo ""
echo "🎬 Demo ready! Use the 'Manual Probe' button for live demonstrations."
