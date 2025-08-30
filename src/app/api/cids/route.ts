import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, decodeEventLog } from 'viem'
import EvidenceRegistryABI from '@/abi/EvidenceRegistry.json'

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

export async function GET(request: NextRequest) {
  try {
    console.log('API route called')
    console.log('liskSepoliaChain.id:', liskSepoliaChain.id)
    console.log('ATTESTA_CORE_ADDRESS:', ATTESTA_CORE_ADDRESS)
    
    const contractAddress = ATTESTA_CORE_ADDRESS
    console.log('contractAddress:', contractAddress)
    
    if (!contractAddress || contractAddress.includes('0x...')) {
      console.log('Contract not deployed error')
      return NextResponse.json({ 
        success: false,
        error: 'Contract not deployed',
        debug: {
          chainId: liskSepoliaChain.id,
          contractAddress,
          expectedAddress: ATTESTA_CORE_ADDRESS
        }
      }, { status: 400 })
    }

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
        
        // Extract actual CID from transaction input data
        let realCID = `Unknown_${cidDigest.slice(2, 10)}`
        
        try {
          // Try to decode the transaction input to get the original CID string
          if (tx.input && tx.input.length > 10) {
            // Look for CID pattern in the transaction input
            const inputStr = tx.input
            // Simple heuristic: look for Qm patterns in hex
            const matches = inputStr.match(/516d[0-9a-f]+/gi)
            if (matches && matches.length > 0) {
              // Convert hex to string
              const hexCID = matches[0]
              realCID = Buffer.from(hexCID, 'hex').toString('utf8')
              
              // Validate it looks like a real CID
              if (!realCID.startsWith('Qm') || realCID.length < 40) {
                throw new Error('Invalid CID format')
              }
            }
          }
        } catch (cidError) {
          console.warn(`Could not extract CID from tx ${log.transactionHash}:`, cidError)
          // Keep the fallback value
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
