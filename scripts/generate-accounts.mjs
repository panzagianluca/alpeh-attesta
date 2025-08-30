#!/usr/bin/env node

import { randomBytes } from 'crypto';
import { privateKeyToAccount } from 'viem/accounts';
import nacl from 'tweetnacl';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Phase 5 Task 0: Account Generation and Management
 * 
 * Generates 5 separate EOA accounts for CID Sentinel:
 * - DEPLOYER: Deploys contract (admin)
 * - POLICY: Executes slash() (has POLICY_ROLE)  
 * - WATCHER: Calls reportPack() (has WATCHER_ROLE)
 * - PUBLISHER: Registers CIDs (resource owner)
 * - RESTAKER: Provides stake for CID
 * 
 * Also generates ed25519 keys for WATCHER signing
 */

const ROLES = ['DEPLOYER', 'POLICY', 'WATCHER', 'PUBLISHER', 'RESTAKER'];

const FUNDING_REQUIREMENTS = {
  DEPLOYER: '0.5-1.0 tLISK (deploy + testing)',
  POLICY: '0.1 tLISK (1-2 slashing tx)',
  WATCHER: '0.2 tLISK (repeated pack anchoring)',
  PUBLISHER: '0.1 tLISK (register + bond)',
  RESTAKER: '0.1 tLISK (register + bond)'
};

function generateEOAAccount() {
  const privateKey = `0x${randomBytes(32).toString('hex')}`;
  const account = privateKeyToAccount(privateKey);
  return {
    privateKey,
    address: account.address
  };
}

function generateEd25519Keys() {
  const keyPair = nacl.sign.keyPair();
  return {
    secretKey: Buffer.from(keyPair.secretKey).toString('base64'),
    publicKey: Buffer.from(keyPair.publicKey).toString('base64')
  };
}

function generateAccounts() {
  console.log('🔐 Generating CID Sentinel EOA Accounts (Phase 5)...\n');
  
  const accounts = {};
  
  // Generate 5 EOA accounts
  ROLES.forEach(role => {
    const account = generateEOAAccount();
    accounts[role] = account;
    
    console.log(`${role}:`);
    console.log(`  Address: ${account.address}`);
    console.log(`  Private Key: ${account.privateKey}`);
    console.log(`  Funding Needed: ${FUNDING_REQUIREMENTS[role]}`);
    console.log('');
  });
  
  // Generate ed25519 keys for WATCHER
  const ed25519Keys = generateEd25519Keys();
  console.log('🔑 WATCHER ed25519 Keys (for Evidence Pack signing):');
  console.log(`  Secret Key (Base64): ${ed25519Keys.secretKey}`);
  console.log(`  Public Key (Base64): ${ed25519Keys.publicKey}`);
  console.log('');
  
  // Generate .env content
  const envContent = generateEnvContent(accounts, ed25519Keys);
  
  // Write to .env.generated file
  const envPath = join(process.cwd(), '.env.generated');
  writeFileSync(envPath, envContent);
  
  console.log(`📝 Generated .env.generated file with all accounts`);
  console.log(`⚠️  SECURITY: Move private keys to secure storage before production`);
  console.log(`💰 FUNDING: Send test funds to each address on Lisk Sepolia testnet`);
  console.log(`🔗 Faucet: https://sepolia-faucet.lisk.com/`);
  
  return { accounts, ed25519Keys };
}

function generateEnvContent(accounts, ed25519Keys) {
  return `# =====================================================
# CID SENTINEL - GENERATED ACCOUNTS (Phase 5)
# Generated: ${new Date().toISOString()}
# =====================================================

# ===== NETWORK CONFIGURATION (Lisk Testnet) =====
NEXT_PUBLIC_CHAIN_ID=4202
NEXT_PUBLIC_LISK_RPC_URL=https://rpc.sepolia-api.lisk.com
NEXT_PUBLIC_EXPLORER_URL=https://sepolia-blockscout.lisk.com
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # Deploy EvidenceRegistry here

# ===== EOA ACCOUNTS (5 SEPARATE ADDRESSES) =====
# DEPLOYER: ${FUNDING_REQUIREMENTS.DEPLOYER}
DEPLOYER_PRIVATE_KEY=${accounts.DEPLOYER.privateKey}
DEPLOYER_ADDRESS=${accounts.DEPLOYER.address}

# POLICY: ${FUNDING_REQUIREMENTS.POLICY}
POLICY_PRIVATE_KEY=${accounts.POLICY.privateKey}
POLICY_ADDRESS=${accounts.POLICY.address}

# WATCHER: ${FUNDING_REQUIREMENTS.WATCHER}
WATCHER_PRIVATE_KEY=${accounts.WATCHER.privateKey}
WATCHER_ADDRESS=${accounts.WATCHER.address}

# PUBLISHER: ${FUNDING_REQUIREMENTS.PUBLISHER}
PUBLISHER_PRIVATE_KEY=${accounts.PUBLISHER.privateKey}
PUBLISHER_ADDRESS=${accounts.PUBLISHER.address}

# RESTAKER: ${FUNDING_REQUIREMENTS.RESTAKER}
RESTAKER_PRIVATE_KEY=${accounts.RESTAKER.privateKey}
RESTAKER_ADDRESS=${accounts.RESTAKER.address}

# ===== WATCHER CRYPTOGRAPHIC KEY (ed25519) =====
WATCHER_SECRET_KEY_BASE64=${ed25519Keys.secretKey}
WATCHER_PUBLIC_KEY_BASE64=${ed25519Keys.publicKey}

# ===== STORAGE CREDENTIALS (IPFS/Filecoin) =====
WEB3_STORAGE_TOKEN=your_web3_storage_token_here

# ===== PROBE CONFIGURATION =====
NEXT_PUBLIC_GATEWAYS=https://ipfs.io,https://dweb.link,https://cloudflare-ipfs.com

# ===== DEMO CONFIGURATION =====
DEMO_CIDS=bafybeihkoviema7g3gxyt6la7b7kbbv2dzx3cgwnp2fvq5mw6u7pjzjwm4,bafybeidj6idz6p5vgjo5bqqzipbdf5q5a6pqm4nww3kfbmntplm5v3lx7a

# ===== OPERATIONAL SETTINGS =====
PROBE_TIMEOUT_MS=3000
IPFS_UPLOAD_TIMEOUT_MS=2500
REPORTPACK_TIMEOUT_MS=1500
MAX_CONCURRENT_CIDS=3
MAX_CONCURRENT_PROBES=5
MAX_IPFS_RETRIES=2
MAX_NONCE_RETRIES=1
`;
}

function checkBalance(address) {
  // This would check balance on Lisk testnet
  // For now, just return a placeholder
  return '0.0 tLISK (⚠️ NEEDS FUNDING)';
}

function generateFundingChecklist(accounts) {
  console.log('\n📋 FUNDING CHECKLIST:');
  console.log('=====================');
  
  ROLES.forEach(role => {
    const account = accounts[role];
    const balance = checkBalance(account.address);
    const required = FUNDING_REQUIREMENTS[role];
    
    console.log(`[ ] ${role}: ${account.address}`);
    console.log(`    Required: ${required}`);
    console.log(`    Current: ${balance}`);
    console.log(`    Faucet: https://sepolia-faucet.lisk.com/`);
    console.log('');
  });
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const { accounts, ed25519Keys } = generateAccounts();
    generateFundingChecklist(accounts);
    
    console.log('\n✅ Phase 5 Task 0: Account generation complete!');
    console.log('📁 Next steps:');
    console.log('   1. Copy .env.generated to .env.local');
    console.log('   2. Fund all accounts using Lisk Sepolia faucet');
    console.log('   3. Update WEB3_STORAGE_TOKEN');
    console.log('   4. Proceed to Task 1: Contract Deployment');
    
  } catch (error) {
    console.error('❌ Error generating accounts:', error);
    process.exit(1);
  }
}

export { generateAccounts, generateEd25519Keys, ROLES, FUNDING_REQUIREMENTS };
