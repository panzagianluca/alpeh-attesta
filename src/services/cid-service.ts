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

      // Transform API data to dashboard items
      const cids: CIDDashboardItem[] = data.data.map((item: any) => ({
        cid: item.cid,
        cidShort: `${item.cid.slice(0, 12)}...`,
        cidDigest: item.cidDigest,
        status: getStatusFromRegistration(), // Default to OK for newly registered
        uptime24h: 100, // Default high uptime for new registrations
        lastPackCID: 'QmPending...', // Placeholder until first evidence pack
        lastPackTimestamp: Date.now(),
        totalStake: BigInt(0), // Will be updated when stakes are bonded
        slashingEnabled: item.slashingEnabled,
        consecutiveFails: 0,
        slo: item.slo,
        publisher: item.publisher,
        registeredAt: item.registeredAt,
        explorerLink: `https://sepolia-blockscout.lisk.com/tx/${item.txHash}`
      }))

      return cids
    } catch (error) {
      console.error('Error fetching CIDs:', error)
      throw error
    }
  }

  return { fetchCIDs }
}

// Helper functions
function getStatusFromRegistration(): 'OK' | 'DEGRADED' | 'BREACH' {
  return 'OK' // New registrations start as OK
}

// Hook to get CID state from contract
export function useCIDState(cidDigest: string) {
  const chainId = useChainId()
  const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.attestaCore

  return useReadContract({
    address: contractAddress as `0x${string}`,
    abi: EvidenceRegistryABI,
    functionName: 'getCID',
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
