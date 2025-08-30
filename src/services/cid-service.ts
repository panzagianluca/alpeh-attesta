'use client'

import { useReadContract, useChainId, usePublicClient } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/wagmi'
import EvidenceRegistryABI from '@/abi/EvidenceRegistry.json'
import type { CIDDashboardItem, CIDDetailData, EvidencePack } from '@/types/ui-data-contract'
import { keccak256, toBytes, formatEther } from 'viem'

// Hook to fetch all registered CIDs from API endpoint
export function useRegisteredCIDs() {
  const fetchCIDs = async (): Promise<CIDDashboardItem[]> => {
    try {
      const response = await fetch('/api/cids')
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch CIDs')
      }

      // Transform API data to dashboard items with real-time status
      const cids: CIDDashboardItem[] = await Promise.all(
        data.data.map(async (item: any) => {
          // Get real-time evidence data for each CID
          let status = 'OK'
          let lastPackCID = 'QmPending...'
          let lastPackTimestamp = Date.now()
          let totalStake = BigInt(0)
          
          try {
            // Fetch evidence data to get current status
            const evidenceResponse = await fetch(`/api/evidence/${item.cid}`)
            const evidenceData = await evidenceResponse.json()
            
            if (evidenceData.success && evidenceData.data) {
              // Use the aggregated status from the evidence data
              status = evidenceData.data.status || 'OK'
              lastPackTimestamp = evidenceData.data.lastUpdate || Date.now()
              
              // Generate a mock pack CID based on the timestamp for now
              if (evidenceData.data.probeData?.length > 0) {
                lastPackCID = `QmEvidence${evidenceData.data.lastUpdate.toString().slice(-8)}`
              }
            }
          } catch (evidenceError) {
            console.warn(`Failed to fetch evidence for ${item.cid}:`, evidenceError)
            // Keep defaults if evidence fetch fails
          }

          return {
            cid: item.cid,
            cidShort: `${item.cid.slice(0, 12)}...`,
            cidDigest: item.cidDigest,
            status: status as 'OK' | 'DEGRADED' | 'BREACH',
            uptime24h: status === 'OK' ? 100 : status === 'DEGRADED' ? 75 : 25,
            lastPackCID,
            lastPackTimestamp,
            totalStake, // Will be updated when stakes are bonded
            slashingEnabled: item.slashingEnabled,
            consecutiveFails: status === 'BREACH' ? 1 : 0,
            slo: item.slo,
            publisher: item.publisher,
            registeredAt: item.registeredAt,
            explorerLink: `https://sepolia-blockscout.lisk.com/tx/${item.txHash}`
          }
        })
      )

      return cids
    } catch (error) {
      console.error('Error fetching CIDs:', error)
      throw error
    }
  }

  return { fetchCIDs }
}

// Hook to get CID state from contract
export function useCIDState(cidDigest: string) {
  const chainId = useChainId()
  const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.attestaCore

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: EvidenceRegistryABI,
    functionName: 'cids',
    args: [cidDigest],
    query: {
      enabled: !!contractAddress && !!cidDigest
    }
  })
}

// Service for creating CID digest
export function createCIDDigest(cid: string): `0x${string}` {
  return keccak256(toBytes(cid))
}

// Mock evidence pack service (would fetch from IPFS in real implementation)
export function getMockEvidencePacks(cid: string): EvidencePack[] {
  return [
    {
      packCID: 'QmEvidenceHash1234567890abcdef',
      timestamp: Date.now() - 300000, // 5 minutes ago
      status: 'OK',
      probeResults: [
        { vantagePoint: 'us-east', gateway: 'ipfs.io', ok: true, latencyMs: 420 },
        { vantagePoint: 'eu-west', gateway: 'dweb.link', ok: true, latencyMs: 530 },
        { vantagePoint: 'ap-south', gateway: 'cloudflare-ipfs.com', ok: false, latencyMs: null, error: 'timeout' }
      ],
      okCount: 2,
      ipfsLink: 'https://ipfs.io/ipfs/QmEvidenceHash1234567890abcdef',
      txHash: '0x1234567890abcdef...'
    },
    {
      packCID: 'QmEvidenceHash0987654321fedcba',
      timestamp: Date.now() - 600000, // 10 minutes ago
      status: 'OK',
      probeResults: [
        { vantagePoint: 'us-east', gateway: 'ipfs.io', ok: true, latencyMs: 390 },
        { vantagePoint: 'eu-west', gateway: 'dweb.link', ok: true, latencyMs: 450 },
        { vantagePoint: 'ap-south', gateway: 'cloudflare-ipfs.com', ok: true, latencyMs: 620 }
      ],
      okCount: 3,
      ipfsLink: 'https://ipfs.io/ipfs/QmEvidenceHash0987654321fedcba',
      txHash: '0xfedcba0987654321...'
    }
  ]
}
