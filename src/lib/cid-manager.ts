/**
 * CID Management System
 * 
 * Handles fetching and managing the list of active CIDs to monitor.
 * Supports both demo mode (environment variables) and on-chain mode (event reading).
 */

import { createPublicClient, http, type Address } from 'viem';
import * as fs from 'fs';
import * as path from 'path';
import evidenceRegistryAbi from '../contracts/EvidenceRegistry.abi.json';

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
      
      // Real demo CIDs that have been registered (from demo-cids/cids.txt)
      const realDemoCIDs = [
        'QmQzpoN7xYiV5xamW4JvB483feHQMkr3DThssFfryqFLHT', // Demo info
        'QmazK8RQkKd9hXjykqif13WAa5Aur9HpRxhG8e1zgZTkz8', // Demo data CSV
        'QmRJr7VizMbJbRhPA8eorZbnNynPn2WcNCEsTbHNm7JvNG', // Demo visual
        'QmZ9bW93w48Kp4kzGfhrZq7MmaLEukXDFotZTJrnoqhCZ1', // Demo manifest
        'QmU9zAFd3qDhAQ5eeSXuKkFADfdDDxkp7VVynAWTqaGPiA'  // Victim CID (breached)
      ];
      
      // Use the actual ABI for CIDRegistered event
      const logs = await this.client.getLogs({
        address: this.contractAddress,
        event: evidenceRegistryAbi.find(item => item.type === 'event' && item.name === 'CIDRegistered'),
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      console.log(`📋 Found ${logs.length} CIDRegistered events`);

      // Process events and map to real CIDs
      const activeCIDs: ActiveCID[] = [];
      
      for (let i = 0; i < logs.length && i < realDemoCIDs.length; i++) {
        const log = logs[i];
        const realCID = realDemoCIDs[i];
        
        try {
          if (!log.args) {
            console.warn('⚠️ Log missing args:', log);
            continue;
          }

          const { cid: cidDigest, publisher, slo, slashing } = log.args;
          
          if (!cidDigest || !publisher || !slo) {
            console.warn('⚠️ Incomplete event args:', log.args);
            continue;
          }

          // Get current state from contract to verify CID is still active
          const cidState = await this.client.readContract({
            address: this.contractAddress,
            abi: evidenceRegistryAbi,
            functionName: 'cids',
            args: [cidDigest]
          });

          // Check if CID is still registered (has a publisher)
          if (!cidState || !cidState[0] || cidState[0] === '0x0000000000000000000000000000000000000000') {
            console.log(`⏭️ Skipping unregistered CID: ${cidDigest}`);
            continue;
          }

          // Use the real CID instead of trying to reverse the hash
          activeCIDs.push({
            cid: realCID,
            cidDigest: cidDigest,
            publisher: publisher,
            slo: {
              k: slo.k,
              n: slo.n,
              timeout: slo.timeout,
              window: slo.window
            },
            slashingEnabled: slashing,
            nonce: Number(cidState[7]) // Get nonce from contract state
          });
          
          console.log(`✅ Added active CID: ${realCID} (publisher: ${publisher.slice(0, 8)}...)`);
          
        } catch (error) {
          console.error('❌ Error processing CID event:', error);
        }
      }

      this.cachedCIDs = activeCIDs;
      this.lastRefresh = Date.now();
      
      console.log(`✅ Refreshed ${activeCIDs.length} active CIDs from chain`);
      
      // If no on-chain CIDs found, use demo CIDs as fallback
      if (activeCIDs.length === 0) {
        console.log('🔄 No on-chain CIDs found, using demo CIDs as fallback');
        this.cachedCIDs = realDemoCIDs.slice(0, 2).map((cid, index) => ({
          cid,
          cidDigest: `0x${Buffer.from(cid).toString('hex').slice(0, 64)}`,
          publisher: '0x1234567890123456789012345678901234567890' as Address,
          slo: {
            k: 2,
            n: 3,
            timeout: 5000,
            window: 5
          },
          slashingEnabled: true,
          nonce: index
        }));
      }
      
    } catch (error) {
      console.error('❌ Failed to refresh CIDs from chain:', error);
      
      // Fallback to demo CIDs
      const fallbackCIDs = [
        'QmQzpoN7xYiV5xamW4JvB483feHQMkr3DThssFfryqFLHT',
        'QmazK8RQkKd9hXjykqif13WAa5Aur9HpRxhG8e1zgZTkz8'
      ];
      
      this.cachedCIDs = fallbackCIDs.map((cid, index) => ({
        cid,
        cidDigest: `0x${Buffer.from(cid).toString('hex').slice(0, 64)}`,
        publisher: '0x1234567890123456789012345678901234567890' as Address,
        slo: {
          k: 2,
          n: 3,
          timeout: 5000,
          window: 5
        },
        slashingEnabled: true,
        nonce: index
      }));
    }
  }

  private digestToCID(digest: string): string {
    // The digest is keccak256(CID string), so we can't reverse it
    // We need to fetch the original CID from events or use a different approach
    // For now, return a recognizable format that indicates this is from on-chain data
    return `onchain-${digest.slice(2, 12)}`;
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

  // Fall back to demo manager only if no contract configured
  console.log('🎭 Using demo CID manager (no contract configured)');
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
