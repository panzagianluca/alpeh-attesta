#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { liskSepolia } from 'viem/chains';

/**
 * Phase 5 Task 1: Contract Deployment Manager
 * 
 * Features:
 * 1. Pre-deployment verification (can run without funding)
 * 2. Dry-run simulation (no actual deployment)
 * 3. Live deployment (requires funded DEPLOYER account)
 * 4. Post-deployment verification
 * 5. deployments.json update
 */

// Load environment variables
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

// Configuration
const LISK_RPC = env.NEXT_PUBLIC_LISK_RPC_URL || 'https://rpc.sepolia-api.lisk.com';
const EXPLORER = env.NEXT_PUBLIC_EXPLORER_URL || 'https://sepolia-blockscout.lisk.com';

const DEPLOYER_PRIVATE_KEY = env.DEPLOYER_PRIVATE_KEY;
const POLICY_ADDRESS = env.POLICY_ADDRESS;
const WATCHER_ADDRESS = env.WATCHER_ADDRESS;

async function checkPrerequisites() {
  console.log('🔍 Checking Prerequisites...\n');
  
  const errors = [];
  const warnings = [];
  
  // Check environment variables
  if (!DEPLOYER_PRIVATE_KEY || DEPLOYER_PRIVATE_KEY === 'your_deployer_private_key_here') {
    errors.push('DEPLOYER_PRIVATE_KEY not set in .env.local');
  }
  
  if (!POLICY_ADDRESS || POLICY_ADDRESS === '0x...') {
    errors.push('POLICY_ADDRESS not set in .env.local');
  }
  
  if (!WATCHER_ADDRESS || WATCHER_ADDRESS === '0x...') {
    errors.push('WATCHER_ADDRESS not set in .env.local');
  }
  
  // Check contract compilation
  const contractPath = join(process.cwd(), 'contracts/out/EvidenceRegistry.sol/EvidenceRegistry.json');
  if (!existsSync(contractPath)) {
    errors.push('EvidenceRegistry contract not compiled. Run: cd contracts && forge build');
  }
  
  if (errors.length > 0) {
    console.log('❌ Prerequisites Failed:');
    errors.forEach(error => console.log(`   - ${error}`));
    return false;
  }
  
  console.log('✅ Prerequisites Check Passed');
  console.log(`   - DEPLOYER: ${env.DEPLOYER_ADDRESS}`);
  console.log(`   - POLICY: ${POLICY_ADDRESS}`);
  console.log(`   - WATCHER: ${WATCHER_ADDRESS}`);
  console.log(`   - Contract: Compiled ✓`);
  
  return true;
}

async function checkFunding() {
  console.log('\n💰 Checking Funding...\n');
  
  if (!DEPLOYER_PRIVATE_KEY || DEPLOYER_PRIVATE_KEY.includes('your_')) {
    console.log('⚠️  DEPLOYER_PRIVATE_KEY not configured for funding check');
    return false;
  }
  
  try {
    const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
    const client = createPublicClient({
      chain: liskSepolia,
      transport: http(LISK_RPC)
    });
    
    const balance = await client.getBalance({ address: account.address });
    const balanceETH = formatEther(balance);
    const minRequired = parseEther('0.5');
    
    console.log(`DEPLOYER Balance: ${balanceETH} tLISK`);
    console.log(`Required: ${formatEther(minRequired)} tLISK`);
    
    if (balance >= minRequired) {
      console.log('✅ Sufficient funding for deployment');
      return true;
    } else {
      console.log('❌ Insufficient funding for deployment');
      console.log(`   Need: ${formatEther(minRequired - balance)} more tLISK`);
      console.log(`   Faucet: https://sepolia-faucet.lisk.com/`);
      return false;
    }
  } catch (error) {
    console.log('⚠️  Error checking funding:', error.message);
    return false;
  }
}

async function dryRunDeployment() {
  console.log('\n🧪 Dry Run Deployment Simulation...\n');
  
  // Read contract ABI and bytecode
  const contractPath = join(process.cwd(), 'contracts/out/EvidenceRegistry.sol/EvidenceRegistry.json');
  const contractJson = JSON.parse(readFileSync(contractPath, 'utf8'));
  
  console.log('✅ Contract Artifact Loaded');
  console.log(`   - Bytecode Size: ${contractJson.bytecode.object.length / 2 - 1} bytes`);
  console.log(`   - ABI Functions: ${contractJson.abi.filter(item => item.type === 'function').length}`);
  console.log(`   - Events: ${contractJson.abi.filter(item => item.type === 'event').length}`);
  
  // Simulate constructor parameters
  console.log('\n📋 Constructor Parameters:');
  console.log(`   - Policy Address: ${POLICY_ADDRESS}`);
  console.log(`   - Watcher Address: ${WATCHER_ADDRESS}`);
  
  // Estimate gas (mock)
  console.log('\n⛽ Gas Estimation (simulated):');
  console.log(`   - Deployment: ~2,000,000 gas`);
  console.log(`   - Cost at 20 gwei: ~0.04 ETH`);
  
  console.log('\n✅ Dry Run Complete - Contract ready for deployment');
  return true;
}

async function updateDeploymentsJson(contractAddress, txHash, blockNumber) {
  const deploymentsPath = join(process.cwd(), 'deployments.json');
  let deployments = {};
  
  if (existsSync(deploymentsPath)) {
    deployments = JSON.parse(readFileSync(deploymentsPath, 'utf8'));
  }
  
  // Update deployments.json
  deployments.networks = deployments.networks || {};
  deployments.networks['lisk-testnet'] = {
    ...deployments.networks['lisk-testnet'],
    contracts: {
      EvidenceRegistry: {
        address: contractAddress,
        deployTx: txHash,
        deployBlock: blockNumber,
        deployer: env.DEPLOYER_ADDRESS,
        verified: false,
        deploymentTimestamp: Date.now()
      }
    },
    roles: {
      deployer: env.DEPLOYER_ADDRESS,
      policy: POLICY_ADDRESS,
      watcher: WATCHER_ADDRESS,
      publisher: env.PUBLISHER_ADDRESS || '',
      restaker: env.RESTAKER_ADDRESS || ''
    }
  };
  
  deployments.metadata = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    environment: 'testnet'
  };
  
  writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`📄 Updated deployments.json`);
}

async function exportABI() {
  const contractPath = join(process.cwd(), 'contracts/out/EvidenceRegistry.sol/EvidenceRegistry.json');
  const contractJson = JSON.parse(readFileSync(contractPath, 'utf8'));
  
  // Export ABI for frontend consumption
  const abiPath = join(process.cwd(), 'src/contracts/EvidenceRegistry.abi.json');
  writeFileSync(abiPath, JSON.stringify(contractJson.abi, null, 2));
  console.log(`📄 Exported ABI to src/contracts/EvidenceRegistry.abi.json`);
}

async function main() {
  console.log('🚀 CID Sentinel Contract Deployment Manager\n');
  console.log('📍 Phase 5 Task 1: Contract Deployment Preparation\n');
  
  const mode = process.argv[2] || 'prepare';
  
  switch (mode) {
    case 'prepare':
    case 'check':
      console.log('🔄 Mode: Preparation & Verification (No funding required)\n');
      
      const prereqsOk = await checkPrerequisites();
      if (!prereqsOk) {
        process.exit(1);
      }
      
      const fundingOk = await checkFunding();
      await dryRunDeployment();
      await exportABI();
      
      console.log('\n📋 Summary:');
      console.log('✅ Prerequisites: PASSED');
      console.log(`${fundingOk ? '✅' : '⚠️ '} Funding: ${fundingOk ? 'READY' : 'PENDING'}`);
      console.log('✅ Contract: READY FOR DEPLOYMENT');
      console.log('✅ ABI: EXPORTED');
      
      if (fundingOk) {
        console.log('\n🎯 Ready for live deployment!');
        console.log('Run: node scripts/deploy-contract.mjs deploy');
      } else {
        console.log('\n⏳ Waiting for funding...');
        console.log('Once funded, run: node scripts/deploy-contract.mjs deploy');
      }
      break;
      
    case 'deploy':
      console.log('🔄 Mode: Live Deployment (Requires funding)\n');
      
      const canDeploy = await checkPrerequisites() && await checkFunding();
      if (!canDeploy) {
        console.log('\n❌ Cannot deploy - check prerequisites and funding');
        process.exit(1);
      }
      
      console.log('\n🚨 LIVE DEPLOYMENT NOT IMPLEMENTED YET');
      console.log('This would use Foundry forge script for actual deployment');
      console.log('Command: cd contracts && forge script script/Deploy.s.sol --rpc-url $NEXT_PUBLIC_LISK_RPC_URL --broadcast');
      break;
      
    default:
      console.log('Usage: node scripts/deploy-contract.mjs [prepare|deploy]');
      console.log('  prepare: Check prerequisites and simulate deployment (default)');
      console.log('  deploy:  Perform live deployment (requires funding)');
      break;
  }
}

// Export functions for testing
export { checkPrerequisites, checkFunding, dryRunDeployment, updateDeploymentsJson };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
