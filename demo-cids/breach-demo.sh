#!/bin/bash
# 🚨 CID SENTINEL DEMO - BREACH TRIGGER SCRIPT 🚨
# Execute this during live demo to trigger controlled breach

# Victim CID (5th file - the one we'll unpin)
VICTIM_CID="QmU9zAFd3qDhAQ5eeSXuKkFADfdDDxkp7VVynAWTqaGPiA"

# Pinata credentials
PINATA_API_KEY="c6925f6ae4730ca0ee1b"
PINATA_SECRET="a170329818a51a92aa17b576b4cd9b5454e19ce16799fb7430bca29b6c997b37"

echo "🚨 TRIGGERING BREACH - Unpinning victim CID: $VICTIM_CID"
echo "⏱️  Starting breach simulation..."

# Execute the unpin command
curl -X DELETE "https://api.pinata.cloud/pinning/unpin/$VICTIM_CID" \
  -H "pinata_api_key: $PINATA_API_KEY" \
  -H "pinata_secret_api_key: $PINATA_SECRET"

echo ""
echo "✅ Victim CID unpinned from Pinata"
echo "⏱️  Monitoring will detect BREACH in 2-3 cycles (2-3 minutes)"
echo "🎯 Watch dashboard for status change: OK → DEGRADED → BREACH"
echo "📊 Evidence packs will capture failed probe data"
echo "💰 Slashing will be triggered automatically"
echo ""
echo "🎬 LIVE DEMO IN PROGRESS! 🎬"
