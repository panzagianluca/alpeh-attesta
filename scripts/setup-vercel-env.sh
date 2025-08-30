#!/bin/bash

# Vercel Environment Variables Setup Script
# Run this script to add all environment variables to your Vercel project

echo "🚀 Setting up Vercel environment variables for Attesta..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Make sure you're logged in and linked
echo "🔐 Make sure you're logged in to Vercel..."
vercel login

echo "🔗 Linking to your Vercel project..."
vercel link

echo "📝 Adding public environment variables..."

# Public variables (safe to expose)
vercel env add NEXT_PUBLIC_CHAIN_ID production <<< "4202"
vercel env add NEXT_PUBLIC_LISK_RPC_URL production <<< "https://rpc.sepolia-api.lisk.com"
vercel env add NEXT_PUBLIC_EXPLORER_URL production <<< "https://sepolia-blockscout.lisk.com"
vercel env add NEXT_PUBLIC_CONTRACT_ADDRESS production <<< "0x4fCD15b71119B2F1c18944F9D1e6Ac8D5eE0024a"
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID production <<< "a9a91102daad7a2bf42889d1b8ad8d00"

echo "🔒 Adding private keys (server-side only)..."

# Private keys (server-side only - NO NEXT_PUBLIC_ prefix)
vercel env add DEPLOYER_PRIVATE_KEY production <<< "0xa525a3ea54759702d3d87bd947f86727fe65e3e85a8634b5449bb623e9bd8145"
vercel env add DEPLOYER_ADDRESS production <<< "0xD451CBD99F94Bca8aB933aA7daed32Db9B6bF38A"

vercel env add POLICY_PRIVATE_KEY production <<< "0xcd5142cc9fd9d61a5b83d55fab5275b5604ca4f8a545538510015e43ac242d39"
vercel env add POLICY_ADDRESS production <<< "0x21cA08e625b3736467207F7ac3Bf2e34cd534694"

vercel env add WATCHER_PRIVATE_KEY production <<< "0xc1a65d23ca0be484f0a26008bb5964209c73425a79dc056b033e10c078950fc0"
vercel env add WATCHER_ADDRESS production <<< "0xeFF0FBCf3FB05F51098954eC34577e03D28af21C"

vercel env add PUBLISHER_PRIVATE_KEY production <<< "0xacca9158a8966b488d38208802139b0dc931223914b6305b5700ddb6f6de243b"
vercel env add PUBLISHER_ADDRESS production <<< "0x59641DEe2A9C3f1E25dCcCd9ec608C4A4e0C47f3"

vercel env add RESTAKER_PRIVATE_KEY production <<< "0xaa4abf0514f54b40c601a0167ea48c2b1e83eb7547c4fd517547d5071be94cd4"
vercel env add RESTAKER_ADDRESS production <<< "0xe6478CCb5c08278Ba91608b57dbeAB0592eAa9C2"

echo "📡 Adding IPFS credentials..."

vercel env add PINATA_API_KEY production <<< "c6925f6ae4730ca0ee1b"
vercel env add PINATA_SECRET production <<< "a170329818a51a92aa17b576b4cd9b5454e19ce16799fb7430bca29b6c997b37"
vercel env add PINATA_JWT production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkMTdlMDUwNC01YTcxLTRhZWItYTM5Ny01OTNiZGFjNzY4YmIiLCJlbWFpbCI6InBhbnphZ3VhcmRhdHRpZ2lhbmx1Y2FAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImM2OTI1ZjZhZTQ3MzBjYTBlZTFiIiwic2NvcGVkS2V5U2VjcmV0IjoiYTE3MDMyOTgxOGE1MWE5MmFhMTdiNTc2YjRjZDliNTQ1NGUxOWNlMTY3OTlmYjc0MzBiY2EyOWI2Yzk5N2IzNyIsImV4cCI6MTc4ODA5ODM5MH0.o8HxuYxnrdxYReexQiLjRBv5nSuEP1W4f9QvJ0sd14k"

echo "🎯 Adding demo CIDs..."

vercel env add CID1 production <<< "QmTL1A5z9Pv2fF8E4Q3nW6xRtHGpL9KxC2uY7aVhS8mPqN"
vercel env add DIGEST1 production <<< "0x3d7f8b1c9e4a6f5d2c8b7a3e9f1d4c6b8a2f5e3c7d9b1a4e6f8c2d5a7b3f9e1c4"

vercel env add CID2 production <<< "QmR5K8x3P7sL9mN2vB4cF6tE8wA1qY3iZ5nU7dG9jH2bX4"
vercel env add DIGEST2 production <<< "0x8f2e1d5c9b3a7f4e6d8c1b5a9f3e7d2c4b6a8f1e5d9c3b7a4e8f2d6c1a5b9f3e7"

vercel env add CID3 production <<< "QmA9H2n5X8fL4mP7sB1vC6eR3wT9qY2kZ8uI4dN7gJ5cM1"
vercel env add DIGEST3 production <<< "0x1c5a9f3e7d2b6c4a8f1e5d9c3b7a4e8f2d6c1a5b9f3e7d2c4b6a8f1e5d9c3b7a4"

vercel env add CID4 production <<< "QmP4T7yE6rI3oL9cV2bN8fK1sA5xM7wZ3qU6hG9jD2vB4nC"
vercel env add DIGEST4 production <<< "0x7a4e8f2d6c1a5b9f3e7d2c4b6a8f1e5d9c3b7a4e8f2d6c1a5b9f3e7d2c4b6a8f1"

vercel env add CID5 production <<< "QmU9zAFd3qDhAQ5eeSXuKkFADfdDDxkp7VVynAWTqaGPiA"
vercel env add DIGEST5 production <<< "0xb0c828b8daf02b3ea796bc222dbc02b559bb5dd6903f31e44d8857eb0af9f47d"

echo "✅ Environment variables setup complete!"
echo ""
echo "🚀 Next steps:"
echo "1. Run 'vercel --prod' to deploy to production"
echo "2. Test your deployment at your Vercel URL"
echo "3. Verify wallet connections work"
echo "4. Check that CID data loads correctly"
echo ""
echo "📋 View all environment variables:"
echo "vercel env ls"
