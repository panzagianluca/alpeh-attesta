import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, decodeEventLog } from 'viem'
import EvidenceRegistryABI from '@/abi/EvidenceRegistry.json'
import { getCIDFromHash, initializeKnownCIDs } from '@/lib/cid-mapping'

// Define Lisk Sepolia chain directly in API route to avoid import issues
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
      http: ['https://rpc.sepolia-api.lisk.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Lisk Sepolia Explorer',
      url: 'https://sepolia-blockscout.lisk.com',
    },
  },
  testnet: true,
} as const

// Contract address directly defined
const ATTESTA_CORE_ADDRESS = '0x4fCD15b71119B2F1c18944F9D1e6Ac8D5eE0024a'

export async function GET() {
  try {
    console.log('API route called')
    
    // Initialize CID mappings
    initializeKnownCIDs();

    const contractAddress = process.env.ATTESTA_CORE_ADDRESS
    const rpcUrl = process.env.LISK_RPC_URL || 'https://rpc.sepolia-api.lisk.com'

    // Create public client for Lisk Sepolia
    const publicClient = createPublicClient({
      chain: liskSepoliaChain,
      transport: http()
    })

    // Get CIDRegistered events using the contract ABI
    const logs = await publicClient.getLogs({
      address: contractAddress as `0x${string}`,
      event: {
        name: 'CIDRegistered',
        type: 'event',
        inputs: [
          { type: 'bytes32', name: 'cid', indexed: true },
          { type: 'address', name: 'publisher', indexed: true },
          { 
            type: 'tuple', 
            name: 'slo',
            components: [
              { type: 'uint8', name: 'k' },
              { type: 'uint8', name: 'n' },
              { type: 'uint16', name: 'timeout' },
              { type: 'uint16', name: 'window' }
            ]
          },
          { type: 'bool', name: 'slashing' }
        ]
      },
      fromBlock: 'earliest'
    })

    const cids = []
    
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      try {
        const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
        
        // Get the transaction to extract the real CID from input data
        const tx = await publicClient.getTransaction({ hash: log.transactionHash })
        
        // Decode the log data
        const decoded = decodeEventLog({
          abi: EvidenceRegistryABI,
          data: log.data,
          topics: log.topics
        })
        
        const { cid: cidDigest, publisher, slo, slashing } = decoded.args as any
        
        // Extract actual CID from mapping or transaction input data
        let realCID = getCIDFromHash(cidDigest)
        
        if (!realCID) {
          // Fallback to transaction data extraction
          realCID = `Unknown_${cidDigest.slice(2, 10)}`
        
        try {
          // Try to decode the transaction input to get the original CID string
          if (tx.input && tx.input.length > 10) {
            // Skip the function selector (first 4 bytes = 8 hex chars)
            const inputData = tx.input.slice(10)
            
            // Decode the input data which contains the CID string
            // The function signature is registerCID(bytes32,SLO,bool)
            // So we need to find the CID string in the input data
            
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
        
        cids.push({
          cid: realCID,
          cidDigest: cidDigest,
          publisher: publisher,
          slo: {
            k: slo.k,
            n: slo.n,
            timeoutMs: slo.timeout,
            windowMin: slo.window
          },
          slashingEnabled: slashing,
          registeredAt: Number(block.timestamp) * 1000,
          txHash: log.transactionHash,
          blockNumber: Number(log.blockNumber)
        })
      } catch (error) {
        console.error('Error processing log:', error)
      }
    }

    return NextResponse.json({ 
      success: true,
      data: cids.reverse(), // Most recent first
      total: cids.length 
    })

  } catch (error) {
    console.error('Error fetching CIDs:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch CIDs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
