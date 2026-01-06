#!/bin/bash

# Deployment script with private key from environment
# Usage: PRIVATE_KEY=your_key npm run deploy:arc

set -e

echo "🚀 Starting Arc Network Deployment..."
echo ""

# Check if private key is provided
if [ -z "$PRIVATE_KEY" ]; then
  echo "❌ Error: PRIVATE_KEY environment variable is not set"
  echo ""
  echo "Usage:"
  echo "  PRIVATE_KEY=your_private_key npm run deploy:arc"
  echo ""
  echo "Or export it first:"
  echo "  export PRIVATE_KEY=your_private_key"
  echo "  npm run deploy:arc"
  exit 1
fi

# Check if private key starts with 0x
if [[ $PRIVATE_KEY == 0x* ]]; then
  echo "⚠️  Warning: Private key should not include '0x' prefix"
  echo "   Removing '0x' prefix..."
  PRIVATE_KEY=${PRIVATE_KEY#0x}
fi

# Set environment variables
export ARC_RPC_URL=${ARC_RPC_URL:-"https://rpc.arc.network"}
export ARC_CHAIN_ID=${ARC_CHAIN_ID:-"12345"}

echo "📋 Configuration:"
echo "   RPC URL: $ARC_RPC_URL"
echo "   Chain ID: $ARC_CHAIN_ID"
echo "   Private Key: ${PRIVATE_KEY:0:10}...${PRIVATE_KEY: -10} (hidden)"
echo ""

# Run deployment
echo "🔨 Deploying contracts..."
npx hardhat run scripts/deploy.cjs --network arc

echo ""
echo "✅ Deployment completed!"
echo ""
echo "⚠️  IMPORTANT: Private key was only used in memory and not saved to disk."
echo "   Make sure to add the contract addresses to your .env file."

