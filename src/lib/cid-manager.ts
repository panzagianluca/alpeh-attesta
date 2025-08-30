/**
 * CID Management System
 * 
 * Handles fetching and managing the list of active CIDs to monitor.
 * Supports both demo mode (environment variables) and on-chain mode (event reading).
 */

import { createPublicClient, http, parseAbiItem, type Address } from 'viem';
import * as fs from 'fs';
import * as path from 'path';

export interface ActiveCID {
  cid: string;
  cidDigest: string;
  publisher: Address;
  slo: {
    k: number;
    n: number;
    timeout: number;
    window: number;
  };
  slashingEnabled: boolean;
  nonce: number;
}

export interface CIDManager {
  getActiveCIDs(): Promise<ActiveCID[]>;
  refreshFromChain(): Promise<void>;
}

/**
 * Demo CID Manager - Uses environment variables
 */
export class DemoCIDManager implements CIDManager {
  private demoCIDs: string[];

  constructor() {
    const demoCIDsEnv = process.env.DEMO_CIDS;
    this.demoCIDs = demoCIDsEnv 
      ? demoCIDsEnv.split(',').map(cid => cid.trim()).filter(Boolean)
      : [
          'bafybeihkoviema7g3gxyt6la7b7kbbv2dzx3cgwnp2fvq5mw6u7pjzjwm4',
          'bafybeidj6idz6p5vgjo5bqqzipbdf5q5a6pqm4nww3kfbmntplm5v3lx7a'
        ];
  }

  async getActiveCIDs(): Promise<ActiveCID[]> {
    return this.demoCIDs.map((cid, index) => ({
      cid,
      cidDigest: `0x${Buffer.from(cid).toString('hex').slice(0, 64)}`, // Mock digest
      publisher: '0x1234567890123456789012345678901234567890' as Address,
      slo: {
        k: 2,
        n: 3,
        timeout: 5000,
        window: 5
      },
      slashingEnabled: true,
      nonce: index // Mock nonce
    }));
  }

  async refreshFromChain(): Promise<void> {
    // No-op for demo mode
    console.log('📋 Demo mode: using environment CIDs, no chain refresh needed');
  }
}

/**
 * On-chain CID Manager - Reads from EvidenceRegistry events
 */
export class OnChainCIDManager implements CIDManager {
  private client: any;
  private contractAddress: Address;
  private cachedCIDs: ActiveCID[] = [];
  private lastRefresh = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(rpcUrl: string, contractAddress: Address) {
    this.client = createPublicClient({
      transport: http(rpcUrl)
    });
    this.contractAddress = contractAddress;
  }

  async getActiveCIDs(): Promise<ActiveCID[]> {
    // Refresh cache if needed
    if (Date.now() - this.lastRefresh > this.CACHE_TTL) {
      await this.refreshFromChain();
    }
    
    return this.cachedCIDs;
  }

  async refreshFromChain(): Promise<void> {
    try {
      console.log('🔍 Refreshing CID list from on-chain events...');
      
      // Use proper ABI from contract
      const contractAbi = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'contracts/out/EvidenceRegistry.sol/EvidenceRegistry.json'), 'utf8')
      ).abi;
      
      // Fetch CIDRegistered events
      const logs = await this.client.getLogs({
        address: this.contractAddress,
        abi: contractAbi,
        eventName: 'CIDRegistered',
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      // Process events and fetch current state
      const activeCIDs: ActiveCID[] = [];
      
      for (const log of logs) {
        try {
          const { cid: cidDigest, publisher, slo, slashing } = log.args;
          
          // Get current state from contract
          const cidState = await this.client.readContract({
            address: this.contractAddress,
            abi: [
              {
                name: 'cids',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ name: 'cid', type: 'bytes32' }],
                outputs: [
                  { name: 'slo', type: 'tuple', components: [
                    { name: 'k', type: 'uint8' },
                    { name: 'n', type: 'uint8' },
                    { name: 'timeout', type: 'uint16' },
                    { name: 'window', type: 'uint16' }
                  ]},
                  { name: 'totalStake', type: 'uint256' },
                  { name: 'lastPackCID', type: 'bytes32' }
                ]
              }
            ],
            functionName: 'cids',
            args: [cidDigest]
          });

          // Convert cidDigest back to CID string (this would need proper implementation)
          const cidString = this.digestToCID(cidDigest);
          
          activeCIDs.push({
            cid: cidString,
            cidDigest,
            publisher,
            slo: {
              k: slo.k,
              n: slo.n,
              timeout: slo.timeout,
              window: slo.window
            },
            slashingEnabled: slashing,
            nonce: 0 // Would need to read from contract state
          });
          
        } catch (error) {
          console.error('Error processing CID event:', error);
        }
      }

      this.cachedCIDs = activeCIDs;
      this.lastRefresh = Date.now();
      
      console.log(`✅ Refreshed ${activeCIDs.length} active CIDs from chain`);
      
    } catch (error) {
      console.error('❌ Failed to refresh CIDs from chain:', error);
      throw error;
    }
  }

  private digestToCID(digest: string): string {
    // TODO: Implement proper digest to CID conversion
    // For now, return a placeholder
    return `bafybei${digest.slice(2, 10)}placeholder`;
  }
}

/**
 * Factory function to create appropriate CID manager based on configuration
 */
export function createCIDManager(): CIDManager {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const rpcUrl = process.env.NEXT_PUBLIC_LISK_RPC_URL;

  // Use on-chain manager if contract is deployed
  if (contractAddress && rpcUrl) {
    console.log('🔗 Using on-chain CID manager');
    return new OnChainCIDManager(rpcUrl, contractAddress as Address);
  }

  // Fall back to demo manager
  console.log('🎭 Using demo CID manager');
  return new DemoCIDManager();
}

/**
 * Global CID manager instance
 */
let cidManager: CIDManager | null = null;

export function getCIDManager(): CIDManager {
  if (!cidManager) {
    cidManager = createCIDManager();
  }
  return cidManager;
}
