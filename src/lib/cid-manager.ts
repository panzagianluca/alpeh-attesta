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
import { getCIDFromHash, initializeKnownCIDs } from './cid-mapping';

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
      nonce: index
    }));
  }

  async refreshFromChain(): Promise<void> {
    // Demo mode doesn't refresh from chain
    console.log('📋 Demo mode: No chain refresh needed');
  }
}

/**
 * On-chain CID Manager - Fetches from deployed smart contract
 */
export class OnChainCIDManager implements CIDManager {
  private client: ReturnType<typeof createPublicClient>;
  private contractAddress: Address;
  private cachedCIDs: ActiveCID[] = [];

  constructor(rpcUrl: string, contractAddress: Address, chain: any) {
    this.contractAddress = contractAddress;
    this.chain = chain;
    
    // Initialize known CID mappings
    initializeKnownCIDs();

    this.client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  }

  async getActiveCIDs(): Promise<ActiveCID[]> {
    if (this.cachedCIDs.length === 0) {
      await this.refreshFromChain();
    }
    return this.cachedCIDs;
  }

  async refreshFromChain(): Promise<void> {
    try {
      console.log('🔍 Refreshing CID list from on-chain events...');
      
      // Use the actual ABI for CIDRegistered event
      const logs = await this.client.getLogs({
        address: this.contractAddress,
        event: evidenceRegistryAbi.find(item => item.type === 'event' && item.name === 'CIDRegistered'),
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      console.log(`📋 Found ${logs.length} CIDRegistered events`);

      // Process events and extract real CIDs
      const activeCIDs: ActiveCID[] = [];
      
      for (const log of logs) {
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

          // Extract actual CID from mapping or transaction data
          let realCID = getCIDFromHash(cidDigest)
          
          if (!realCID) {
            // Fallback to transaction data extraction if not in mapping
            realCID = `Unknown_${cidDigest.slice(2, 10)}`
            
            try {
              // Get the transaction to extract the real CID
              const tx = await this.client.getTransaction({ hash: log.transactionHash });
              
              if (tx.input && tx.input.length > 10) {
                // Skip the function selector (first 4 bytes = 8 hex chars)
                const inputData = tx.input.slice(10)
                
                // Look for common CID patterns in different formats
                const patterns = [
                  /Qm[a-zA-Z0-9]{44}/g,  // CIDv0
                  /b[a-z2-7]{58}/g,      // CIDv1 base32
                  /z[a-zA-Z0-9]+/g       // CIDv1 base58btc
                ]
                
                // Convert hex to string and search for CID patterns
                let searchString = ''
                try {
                  // Try to decode as UTF-8
                  searchString = Buffer.from(inputData, 'hex').toString('utf8')
                } catch {
                  // If UTF-8 fails, use the hex string directly
                  searchString = inputData
                }
                
                for (const pattern of patterns) {
                  const matches = searchString.match(pattern)
                  if (matches && matches.length > 0) {
                    const candidateCID = matches[0]
                    // Validate the CID format
                    if (candidateCID.length >= 40 && candidateCID.length <= 100) {
                      realCID = candidateCID
                      console.log(`✅ Extracted CID: ${realCID} from tx ${log.transactionHash}`)
                      break
                    }
                  }
                }
              }
            } catch (cidError) {
              console.warn(`Could not extract CID from tx ${log.transactionHash}:`, cidError)
            }
          } else {
            console.log(`✅ Found CID in mapping: ${realCID}`)
          }

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
            nonce: 0 // Will be updated from contract state if needed
          });

        } catch (error) {
          console.error('Error processing log:', error);
        }
      }
      
      // Store cached results
      this.cachedCIDs = activeCIDs;
      console.log(`✅ Loaded ${activeCIDs.length} active CIDs from chain`);
      
    } catch (error) {
      console.error('❌ Failed to refresh CIDs from chain:', error);
      
      // Return empty array on error - no more demo fallbacks
      this.cachedCIDs = [];
    }
  }
}

/**
 * Factory function to create the appropriate CID manager based on configuration
 */
export function createCIDManager(): CIDManager {
  const mode = process.env.CID_MANAGER_MODE || 'on-chain';
  
  if (mode === 'demo') {
    console.log('🔧 Using demo CID manager');
    return new DemoCIDManager();
  }
  
  // Default to on-chain mode
  console.log('🔗 Using on-chain CID manager');
  
  const rpcUrl = process.env.LISK_RPC_URL || 'https://rpc.sepolia-api.lisk.com';
  const contractAddress = process.env.ATTESTA_CORE_ADDRESS as Address;
  
  if (!contractAddress || contractAddress.includes('0x...')) {
    throw new Error('Contract address not configured');
  }

  // Lisk Sepolia chain configuration
  const liskSepoliaChain = {
    id: 4202,
    name: 'Lisk Sepolia Testnet',
    nativeCurrency: {
      decimals: 18,
      name: 'Lisk',
      symbol: 'LSK',
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
    blockExplorers: {
      default: {
        name: 'Lisk Sepolia Explorer',
        url: 'https://sepolia-blockscout.lisk.com',
      },
    },
    testnet: true,
  };

  return new OnChainCIDManager(rpcUrl, contractAddress, liskSepoliaChain);
}

/**
 * Legacy alias for backwards compatibility
 */
export const getCIDManager = createCIDManager;
