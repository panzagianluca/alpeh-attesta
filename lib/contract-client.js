/**
 * Contract Client for EvidenceRegistry
 * Viem-based wrapper for smart contract interactions
 */

import { createPublicClient, createWalletClient, http, formatEther, parseEther, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { liskSepolia } from 'viem/chains';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Contract configuration
 */
const CONTRACT_CONFIG = {
  chain: liskSepolia,
  rpcUrl: process.env.LISK_SEPOLIA_RPC_URL || 'https://rpc.sepolia-api.lisk.com',
  explorerUrl: 'https://sepolia-blockscout.lisk.com'
};

/**
 * Load contract ABI
 */
function loadContractABI() {
  try {
    const abiPath = join(process.cwd(), 'src/contracts/EvidenceRegistry.abi.json');
    return JSON.parse(readFileSync(abiPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to load contract ABI: ${error.message}`);
  }
}

/**
 * EvidenceRegistry Contract Client
 */
export class EvidenceRegistryClient {
  constructor() {
    this.abi = loadContractABI();
    this.contractAddress = null;
    this.publicClient = null;
    this.walletClients = new Map(); // Role -> WalletClient
    this.accounts = new Map(); // Role -> Account
    this.initialized = false;
  }

  /**
   * Initialize contract client
   * @param {string} [contractAddress] - Deployed contract address
   */
  async init(contractAddress = null) {
    if (this.initialized) return;

    try {
      console.log('🔗 Initializing Contract Client...');

      // Set contract address
      this.contractAddress = contractAddress || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      
      if (!this.contractAddress) {
        console.log('⚠️  No contract address - running in preparation mode');
      }

      // Create public client for reading
      this.publicClient = createPublicClient({
        chain: CONTRACT_CONFIG.chain,
        transport: http(CONTRACT_CONFIG.rpcUrl)
      });

      // Initialize accounts and wallet clients
      await this.initializeAccounts();

      this.initialized = true;
      console.log('✅ Contract client initialized');
      
      if (this.contractAddress) {
        console.log(`   Contract: ${this.contractAddress}`);
        console.log(`   Explorer: ${CONTRACT_CONFIG.explorerUrl}/address/${this.contractAddress}`);
      }

    } catch (error) {
      console.error('❌ Contract client initialization failed:', error);
      throw new Error(`Contract client init failed: ${error.message}`);
    }
  }

  /**
   * Initialize accounts and wallet clients for each role
   */
  async initializeAccounts() {
    const roles = ['DEPLOYER', 'POLICY', 'WATCHER', 'PUBLISHER', 'RESTAKER'];
    
    for (const role of roles) {
      const privateKeyEnv = `${role}_PRIVATE_KEY`;
      const privateKey = process.env[privateKeyEnv];
      
      if (!privateKey) {
        console.log(`⚠️  ${role} private key not found - role unavailable`);
        continue;
      }

      try {
        // Create account from private key
        const account = privateKeyToAccount(privateKey);
        this.accounts.set(role, account);

        // Create wallet client for this role
        const walletClient = createWalletClient({
          account,
          chain: CONTRACT_CONFIG.chain,
          transport: http(CONTRACT_CONFIG.rpcUrl)
        });
        this.walletClients.set(role, walletClient);

        console.log(`✅ ${role} account ready: ${account.address}`);
      } catch (error) {
        console.error(`❌ Failed to initialize ${role} account:`, error);
      }
    }
  }

  /**
   * Check if contract is deployed and accessible
   * @returns {Promise<boolean>} True if contract is accessible
   */
  async isContractDeployed() {
    if (!this.contractAddress || !this.publicClient) {
      return false;
    }

    try {
      // Try to read a simple view function
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'paused'
      });

      return typeof result === 'boolean';
    } catch (error) {
      console.log('Contract not accessible:', error.message);
      return false;
    }
  }

  /**
   * Get account balance for role
   * @param {string} role - Account role
   * @returns {Promise<string>} Balance in ETH
   */
  async getBalance(role) {
    const account = this.accounts.get(role);
    if (!account || !this.publicClient) {
      throw new Error(`Account or client not available for role: ${role}`);
    }

    try {
      const balance = await this.publicClient.getBalance({
        address: account.address
      });

      return formatEther(balance);
    } catch (error) {
      throw new Error(`Failed to get balance for ${role}: ${error.message}`);
    }
  }

  /**
   * Register CID with SLO (POLICY role required)
   * @param {Object} params - Registration parameters
   * @param {string} params.cid - CID to register (as bytes32)
   * @param {Object} params.slo - Service level objectives
   * @param {boolean} params.slashingEnabled - Enable slashing
   * @returns {Promise<string>} Transaction hash
   */
  async registerCID({ cid, slo, slashingEnabled = true }) {
    await this.init();
    
    const walletClient = this.walletClients.get('POLICY');
    if (!walletClient) {
      throw new Error('POLICY wallet not available');
    }

    if (!this.contractAddress) {
      throw new Error('Contract not deployed - cannot register CID');
    }

    try {
      console.log(`📝 Registering CID: ${cid}`);

      // Convert CID to bytes32 if needed
      const cidBytes32 = cid.startsWith('0x') ? cid : `0x${Buffer.from(cid).toString('hex')}`;

      // Prepare SLO tuple
      const sloTuple = {
        k: slo.k,
        n: slo.n, 
        timeout: slo.timeout,
        window: slo.window
      };

      // Execute transaction
      const hash = await walletClient.writeContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'registerCID',
        args: [cidBytes32, sloTuple, slashingEnabled]
      });

      console.log(`✅ CID registration submitted: ${hash}`);
      return hash;
    } catch (error) {
      console.error('❌ CID registration failed:', error);
      throw new Error(`CID registration failed: ${error.message}`);
    }
  }

  /**
   * Report evidence pack (WATCHER role required)
   * @param {Object} packRef - Pack reference data
   * @param {string} packRef.cidDigest - Original CID digest
   * @param {string} packRef.packCIDDigest - Evidence pack CID digest
   * @param {number} packRef.ts - Timestamp
   * @param {number} packRef.status - Status code (0=OK, 1=MISSING, 2=CORRUPTED)
   * @param {number} packRef.nonce - Nonce for this report
   * @returns {Promise<string>} Transaction hash
   */
  async reportPack(packRef) {
    await this.init();
    
    const walletClient = this.walletClients.get('WATCHER');
    if (!walletClient) {
      throw new Error('WATCHER wallet not available');
    }

    if (!this.contractAddress) {
      throw new Error('Contract not deployed - cannot report pack');
    }

    try {
      console.log(`📦 Reporting pack: ${packRef.packCIDDigest}`);

      // Prepare pack reference tuple
      const packTuple = {
        cidDigest: packRef.cidDigest,
        packCIDDigest: packRef.packCIDDigest,
        ts: BigInt(packRef.ts),
        status: packRef.status,
        nonce: BigInt(packRef.nonce)
      };

      // Execute transaction
      const hash = await walletClient.writeContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'reportPack',
        args: [packTuple]
      });

      console.log(`✅ Pack report submitted: ${hash}`);
      return hash;
    } catch (error) {
      console.error('❌ Pack report failed:', error);
      throw new Error(`Pack report failed: ${error.message}`);
    }
  }

  /**
   * Bond stake for CID (anyone can call)
   * @param {string} cidDigest - CID digest to stake on
   * @param {string} amount - Amount to stake in ETH
   * @param {string} [role] - Role to use for staking (default: PUBLISHER)
   * @returns {Promise<string>} Transaction hash
   */
  async bondStake(cidDigest, amount, role = 'PUBLISHER') {
    await this.init();
    
    const walletClient = this.walletClients.get(role);
    if (!walletClient) {
      throw new Error(`${role} wallet not available`);
    }

    if (!this.contractAddress) {
      throw new Error('Contract not deployed - cannot bond stake');
    }

    try {
      console.log(`💰 Bonding stake: ${amount} ETH for ${cidDigest}`);

      const value = parseEther(amount);

      // Execute transaction with ETH value
      const hash = await walletClient.writeContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'bondStake',
        args: [cidDigest],
        value
      });

      console.log(`✅ Stake bonding submitted: ${hash}`);
      return hash;
    } catch (error) {
      console.error('❌ Stake bonding failed:', error);
      throw new Error(`Stake bonding failed: ${error.message}`);
    }
  }

  /**
   * Get CID information
   * @param {string} cidDigest - CID digest to query
   * @returns {Promise<Object>} CID information
   */
  async getCIDInfo(cidDigest) {
    await this.init();

    if (!this.contractAddress) {
      throw new Error('Contract not deployed - cannot query CID');
    }

    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'cids',
        args: [cidDigest]
      });

      // Parse result tuple
      const [publisher, slo, totalStake, lastPackCIDDigest, lastBreachAt, consecutiveFails, slashingEnabled, nonce] = result;

      return {
        publisher,
        slo: {
          k: slo.k,
          n: slo.n,
          timeout: slo.timeout,
          window: slo.window
        },
        totalStake: formatEther(totalStake),
        lastPackCIDDigest,
        lastBreachAt: Number(lastBreachAt),
        consecutiveFails,
        slashingEnabled,
        nonce: Number(nonce)
      };
    } catch (error) {
      console.error('❌ CID query failed:', error);
      throw new Error(`CID query failed: ${error.message}`);
    }
  }

  /**
   * Check if account has role
   * @param {string} role - Role to check
   * @param {string} [account] - Account address (default: role's account)
   * @returns {Promise<boolean>} True if account has role
   */
  async hasRole(role, account = null) {
    await this.init();

    if (!this.contractAddress) {
      return false; // Cannot check roles without deployed contract
    }

    try {
      const roleBytes32 = this.getRoleBytes32(role);
      const accountAddress = account || this.accounts.get(role)?.address;

      if (!accountAddress) {
        throw new Error(`No account available for role: ${role}`);
      }

      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'hasRole',
        args: [roleBytes32, accountAddress]
      });

      return result;
    } catch (error) {
      console.error('❌ Role check failed:', error);
      return false;
    }
  }

  /**
   * Get role bytes32 identifier
   * @param {string} role - Role name
   * @returns {string} Role bytes32
   */
  getRoleBytes32(role) {
    switch (role) {
      case 'POLICY':
        return '0xfb5864e8ff833c3cb2d2d08505e82ff02a43554c74a35d4f5a64e852612783117'; // POLICY_ROLE
      case 'WATCHER':
        return '0x2125d1e225cadc5c8296e2cc1f96ee607770bf4a4a16131e62f6819937437c89'; // WATCHER_ROLE
      default:
        return '0x0000000000000000000000000000000000000000000000000000000000000000'; // DEFAULT_ADMIN_ROLE
    }
  }

  /**
   * Estimate gas for transaction
   * @param {string} functionName - Contract function name
   * @param {Array} args - Function arguments
   * @param {string} [role] - Role to use for estimation
   * @returns {Promise<bigint>} Gas estimate
   */
  async estimateGas(functionName, args, role = 'PUBLISHER') {
    await this.init();

    const account = this.accounts.get(role);
    if (!account || !this.contractAddress) {
      throw new Error('Account or contract not available for gas estimation');
    }

    try {
      const gas = await this.publicClient.estimateContractGas({
        address: this.contractAddress,
        abi: this.abi,
        functionName,
        args,
        account: account.address
      });

      return gas;
    } catch (error) {
      console.error('❌ Gas estimation failed:', error);
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Wait for transaction confirmation
   * @param {string} hash - Transaction hash
   * @param {number} [confirmations] - Number of confirmations to wait for
   * @returns {Promise<Object>} Transaction receipt
   */
  async waitForTransaction(hash, confirmations = 1) {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      console.log(`⏳ Waiting for transaction: ${hash}`);
      
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
        confirmations
      });

      console.log(`✅ Transaction confirmed: ${hash}`);
      return receipt;
    } catch (error) {
      console.error('❌ Transaction wait failed:', error);
      throw new Error(`Transaction wait failed: ${error.message}`);
    }
  }

  /**
   * Get contract status and info
   * @returns {Promise<Object>} Contract status
   */
  async getStatus() {
    await this.init();

    try {
      const status = {
        contractAddress: this.contractAddress,
        deployed: await this.isContractDeployed(),
        accounts: {},
        roles: {},
        initialized: this.initialized
      };

      // Get account balances
      for (const [role, account] of this.accounts) {
        try {
          status.accounts[role] = {
            address: account.address,
            balance: await this.getBalance(role)
          };
        } catch (error) {
          status.accounts[role] = {
            address: account.address,
            error: error.message
          };
        }
      }

      // Check roles if contract is deployed
      if (status.deployed) {
        for (const role of ['POLICY', 'WATCHER']) {
          try {
            status.roles[role] = await this.hasRole(role);
          } catch (error) {
            status.roles[role] = false;
          }
        }
      }

      return status;
    } catch (error) {
      return {
        error: error.message,
        initialized: this.initialized
      };
    }
  }
}

// Export singleton instance
export const evidenceRegistryClient = new EvidenceRegistryClient();

// Export class for custom instances
export default EvidenceRegistryClient;
