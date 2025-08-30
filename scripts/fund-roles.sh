#!/bin/bash
# Fund role wallets for Phase 6 demo
# Conservative approach: 5-8 LSK total usage

source .env.local

echo "🔄 PHASE 6: Funding Role Wallets"
echo "Strategy: Conservative funding for demo execution"
echo ""

# Convert 0.02 LSK to wei for calculations
CURRENT_BALANCE=19999999377043757
echo "Current DEPLOYER balance: $CURRENT_BALANCE wei (~0.02 LSK)"

# Fund amounts (in wei) - conservative approach
POLICY_FUND="2000000000000000"      # 0.002 LSK (slashing tx)
WATCHER_FUND="2000000000000000"     # 0.002 LSK (reportPack tx)  
PUBLISHER_FUND="1000000000000000"   # 0.001 LSK (registerCID tx)
RESTAKER_FUND="2000000000000000"    # 0.002 LSK (bondStake tx)

echo "Planned funding (conservative):"
echo "- POLICY:    0.002 LSK (slashing transactions)"
echo "- WATCHER:   0.002 LSK (evidence pack anchoring)"
echo "- PUBLISHER: 0.001 LSK (CID registration)"
echo "- RESTAKER:  0.002 LSK (stake bonding)"
echo "- Total:     0.007 LSK (35% of available balance)"
echo ""

# Fund POLICY
echo "Funding POLICY wallet..."
cast send $POLICY_ADDRESS \
  --value $POLICY_FUND \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url $NEXT_PUBLIC_LISK_RPC_URL

# Fund WATCHER  
echo "Funding WATCHER wallet..."
cast send $WATCHER_ADDRESS \
  --value $WATCHER_FUND \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url $NEXT_PUBLIC_LISK_RPC_URL

# Fund PUBLISHER
echo "Funding PUBLISHER wallet..."
cast send $PUBLISHER_ADDRESS \
  --value $PUBLISHER_FUND \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url $NEXT_PUBLIC_LISK_RPC_URL

# Fund RESTAKER
echo "Funding RESTAKER wallet..."
cast send $RESTAKER_ADDRESS \
  --value $RESTAKER_FUND \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url $NEXT_PUBLIC_LISK_RPC_URL

echo ""
echo "✅ Funding complete! Verifying balances..."
echo ""

# Verify balances
echo "Final balances:"
echo "POLICY:    $(cast balance $POLICY_ADDRESS --rpc-url $NEXT_PUBLIC_LISK_RPC_URL) wei"
echo "WATCHER:   $(cast balance $WATCHER_ADDRESS --rpc-url $NEXT_PUBLIC_LISK_RPC_URL) wei"  
echo "PUBLISHER: $(cast balance $PUBLISHER_ADDRESS --rpc-url $NEXT_PUBLIC_LISK_RPC_URL) wei"
echo "RESTAKER:  $(cast balance $RESTAKER_ADDRESS --rpc-url $NEXT_PUBLIC_LISK_RPC_URL) wei"
echo "DEPLOYER:  $(cast balance $DEPLOYER_ADDRESS --rpc-url $NEXT_PUBLIC_LISK_RPC_URL) wei"

echo ""
echo "🎯 Role funding verification complete!"
echo "Ready for Phase 6 demo execution."
