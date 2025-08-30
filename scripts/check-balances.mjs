#!/usr/bin/env node

import { createPublicClient, http, formatEther, parseEther } from 'viem';
import { liskSepolia } from 'viem/chains';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Phase 5 Task 0: Balance Checker and Funding Verification
 * 
 * Checks balances for all 5 EOA accounts on Lisk Sepolia testnet
 * Verifies sufficient funding for Phase 5 operations
 */

// Simple env loader
function loadEnv() {
  const envPath = join(process.cwd(), '.env.local');
  const env = {};
  
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const [key, ...values] = line.split('=');
      if (key && values.length > 0) {
        env[key.trim()] = values.join('=').trim();
      }
    });
  }
  
  return env;
}

const env = loadEnv();

const ROLES = ['DEPLOYER', 'POLICY', 'WATCHER', 'PUBLISHER', 'RESTAKER'];

const MINIMUM_BALANCES = {
  DEPLOYER: parseEther('0.5'),   // 0.5 tLISK for deploy + testing
  POLICY: parseEther('0.1'),     // 0.1 tLISK for slashing tx
  WATCHER: parseEther('0.2'),    // 0.2 tLISK for pack anchoring
  PUBLISHER: parseEther('0.1'),  // 0.1 tLISK for register + bond
  RESTAKER: parseEther('0.1')    // 0.1 tLISK for bond
};

const LISK_TESTNET_RPC = env.NEXT_PUBLIC_LISK_RPC_URL || 'https://rpc.sepolia-api.lisk.com';
const LISK_EXPLORER = env.NEXT_PUBLIC_EXPLORER_URL || 'https://sepolia-blockscout.lisk.com';

async function checkAccountBalances() {
  console.log('💰 Checking CID Sentinel Account Balances (Lisk Sepolia)...\n');
  
  // Initialize client
  const client = createPublicClient({
    chain: liskSepolia,
    transport: http(LISK_TESTNET_RPC)
  });
  
  // Check network connection
  try {
    const chainId = await client.getChainId();
    console.log(`🌐 Connected to: Lisk Sepolia (Chain ID: ${chainId})`);
    console.log(`🔗 Explorer: ${LISK_EXPLORER}\n`);
  } catch (error) {
    console.error('❌ Failed to connect to Lisk testnet:', error.message);
    console.log('🔧 Check NEXT_PUBLIC_LISK_RPC_URL in your .env file');
    return false;
  }
  
  let allFunded = true;
  const results = [];
  
  for (const role of ROLES) {
    const addressKey = `${role}_ADDRESS`;
    const address = env[addressKey];
    
    if (!address) {
      console.log(`⚠️  ${role}: No address found (${addressKey})`);
      allFunded = false;
      continue;
    }
    
    try {
      const balance = await client.getBalance({ address });
      const balanceETH = formatEther(balance);
      const required = formatEther(MINIMUM_BALANCES[role]);
      const hasEnough = balance >= MINIMUM_BALANCES[role];
      
      const status = hasEnough ? '✅' : '❌';
      const statusText = hasEnough ? 'FUNDED' : 'NEEDS FUNDING';
      
      console.log(`${status} ${role}:`);
      console.log(`   Address: ${address}`);
      console.log(`   Balance: ${balanceETH} tLISK`);
      console.log(`   Required: ${required} tLISK`);
      console.log(`   Status: ${statusText}`);
      console.log(`   Explorer: ${LISK_EXPLORER}/address/${address}`);
      
      if (!hasEnough) {
        console.log(`   🚰 Faucet: https://sepolia-faucet.lisk.com/`);
        allFunded = false;
      }
      
      console.log('');
      
      results.push({
        role,
        address,
        balance: balanceETH,
        required,
        hasEnough,
        explorerUrl: `${LISK_EXPLORER}/address/${address}`
      });
      
    } catch (error) {
      console.log(`❌ ${role}: Error checking balance`);
      console.log(`   Address: ${address}`);
      console.log(`   Error: ${error.message}`);
      console.log('');
      allFunded = false;
    }
  }
  
  // Summary
  console.log('📊 FUNDING SUMMARY:');
  console.log('===================');
  
  const funded = results.filter(r => r.hasEnough).length;
  const total = results.length;
  
  console.log(`Funded Accounts: ${funded}/${total}`);
  console.log(`Total Required: ${formatEther(
    Object.values(MINIMUM_BALANCES).reduce((sum, val) => sum + val, 0n)
  )} tLISK`);
  
  if (allFunded) {
    console.log('\n✅ All accounts have sufficient funding!');
    console.log('🚀 Ready to proceed with contract deployment');
  } else {
    console.log('\n❌ Some accounts need funding');
    console.log('💡 Fund accounts using Lisk Sepolia faucet:');
    console.log('   https://sepolia-faucet.lisk.com/');
    console.log('');
    console.log('📋 Accounts needing funding:');
    results.filter(r => !r.hasEnough).forEach(r => {
      console.log(`   ${r.role}: ${r.address}`);
    });
  }
  
  return allFunded;
}

async function generateFundingReport() {
  const allFunded = await checkAccountBalances();
  
  // Generate funding checklist for documentation
  const checklist = {
    timestamp: new Date().toISOString(),
    network: 'Lisk Sepolia Testnet',
    rpcUrl: LISK_TESTNET_RPC,
    explorer: LISK_EXPLORER,
    allFunded,
    accounts: ROLES.map(role => ({
      role,
      address: env[`${role}_ADDRESS`],
      required: formatEther(MINIMUM_BALANCES[role])
    }))
  };
  
  return checklist;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await checkAccountBalances();
  } catch (error) {
    console.error('❌ Error checking balances:', error);
    process.exit(1);
  }
}

export { checkAccountBalances, generateFundingReport, MINIMUM_BALANCES, ROLES };
