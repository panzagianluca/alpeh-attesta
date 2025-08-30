'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useChainId, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { keccak256, toBytes, parseEther, formatEther } from 'viem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  ArrowLeft,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Shield,
  TrendingUp,
  Clock,
  Users,
  Loader2,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { CONTRACT_ADDRESSES } from '@/lib/wagmi'
import EvidenceRegistryABI from '@/abi/EvidenceRegistry.json'

// Real demo CIDs from the deployment
const DEMO_CIDS = [
  'QmQzpoN7xYiV5xamW4JvB483feHQMkr3DThssFfryqFLHT', // Demo info
  'QmazK8RQkKd9hXjykqif13WAa5Aur9HpRxhG8e1zgZTkz8', // Demo data CSV
  'QmRJr7VizMbJbRhPA8eorZbnNynPn2WcNCEsTbHNm7JvNG', // Demo visual
  'QmZ9bW93w48Kp4kzGfhrZq7MmaLEukXDFotZTJrnoqhCZ1', // Demo manifest
  'QmU9zAFd3qDhAQ5eeSXuKkFADfdDDxkp7VVynAWTqaGPiA'  // Victim CID (breached)
]

interface CIDData {
  cid: string
  cidDigest: string
  publisher: string
  slo: {
    k: number
    n: number
    timeout: number
    window: number
  }
  totalStake: bigint
  slashingEnabled: boolean
  consecutiveFails: number
  lastBreachAt: bigint
  nonce: bigint
  // Real evidence data
  evidenceData?: {
    status: 'OK' | 'DEGRADED' | 'BREACH'
    availability: number
    avgLatency: number
    probeData: Array<{
      region: string
      gateway: string
      success: boolean
      latency: number
      status: string
      error?: string
    }>
    lastUpdate: number
  }
}

interface ValidatorStats {
  totalCIDs: number
  totalStake: string
  averageAPY: string
  activeValidators: number
}

export function ValidatorsPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const [selectedCid, setSelectedCid] = useState<string | null>(null)
  const [stakeAmount, setStakeAmount] = useState('0.1')
  const [cidData, setCidData] = useState<CIDData[]>([])
  const [loading, setLoading] = useState(true)
  const [testingEvidence, setTestingEvidence] = useState<string | null>(null)
  const [stats, setStats] = useState<ValidatorStats>({
    totalCIDs: 0,
    totalStake: '0',
    averageAPY: '12.5',
    activeValidators: 0
  })
  
  // Get contract address for current chain
  const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.attestaCore

  // Write contract hook for bonding stake
  const { 
    writeContract: bondStake, 
    isPending: isBondPending,
    data: bondHash,
    error: bondError 
  } = useWriteContract()

  // Wait for bond transaction confirmation
  const { 
    isLoading: isBondConfirming, 
    isSuccess: isBondConfirmed 
  } = useWaitForTransactionReceipt({
    hash: bondHash,
  })

  // Fetch real CID data from contract and evidence API
  const fetchCIDData = async () => {
    if (!contractAddress || !publicClient) return

    setLoading(true)
    try {
      const cidDataResults: CIDData[] = []
      let totalStake = BigInt(0)

      for (const cid of DEMO_CIDS) {
        try {
          const cidDigest = keccak256(toBytes(cid))
          
          // Read CID data from contract
          const result = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: EvidenceRegistryABI,
            functionName: 'cids',
            args: [cidDigest]
          }) as any

          // Only include CIDs that are actually registered (have a publisher)
          if (result[0] && result[0] !== '0x0000000000000000000000000000000000000000') {
            const cidInfo: CIDData = {
              cid,
              cidDigest: cidDigest,
              publisher: result[0],
              slo: {
                k: result[1].k,
                n: result[1].n,
                timeout: result[1].timeout,
                window: result[1].window
              },
              totalStake: result[2],
              slashingEnabled: result[6],
              consecutiveFails: result[5],
              lastBreachAt: result[4],
              nonce: result[7]
            }
            
            // Fetch real evidence data
            try {
              const evidenceResponse = await fetch(`/api/evidence/${cid}`)
              if (evidenceResponse.ok) {
                const evidenceResult = await evidenceResponse.json()
                if (evidenceResult.success) {
                  cidInfo.evidenceData = evidenceResult.data
                }
              }
            } catch (evidenceError) {
              console.log(`Evidence data not available for ${cid}:`, evidenceError)
            }
            
            cidDataResults.push(cidInfo)
            totalStake += result[2]
          }
        } catch (error) {
          console.log(`CID ${cid} not registered yet:`, error)
        }
      }

      setCidData(cidDataResults)
      setStats({
        totalCIDs: cidDataResults.length,
        totalStake: formatEther(totalStake),
        averageAPY: '12.5', // Static for demo
        activeValidators: cidDataResults.reduce((acc, cid) => acc + (cid.totalStake > BigInt(0) ? 1 : 0), 0)
      })
    } catch (error) {
      console.error('Error fetching CID data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCIDData()
  }, [contractAddress, publicClient])

  const handleBondStake = async (cid: string) => {
    if (!isConnected || !contractAddress || contractAddress === '0x...') {
      alert('Please connect your wallet and ensure you are on the correct network')
      return
    }

    try {
      const cidDigest = keccak256(toBytes(cid))
      bondStake({
        address: contractAddress as `0x${string}`,
        abi: EvidenceRegistryABI,
        functionName: 'bondStake',
        args: [cidDigest],
        value: parseEther(stakeAmount)
      })
    } catch (error) {
      console.error('Bond stake error:', error)
    }
  }

  const getStatusFromCIDData = (cidInfo: CIDData) => {
    // Use real evidence data if available, otherwise fall back to contract data
    if (cidInfo.evidenceData) {
      return cidInfo.evidenceData.status
    }
    
    // Fallback to contract consecutive fails
    if (cidInfo.consecutiveFails >= 3) return 'BREACH'
    if (cidInfo.consecutiveFails >= 1) return 'DEGRADED'
    return 'OK'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'text-green-400'
      case 'DEGRADED': return 'text-orange-400'
      case 'BREACH': return 'text-red-400'
      default: return 'text-[#EDEDED]/60'
    }
  }

  const formatSLO = (slo: { k: number; n: number; timeout: number; window: number }) => {
    return {
      success: `${slo.k}/${slo.n}`,
      timeout: `${slo.timeout}ms`,
      window: `${slo.window}min`
    }
  }

  const estimateReward = (totalStake: bigint) => {
    // Simple estimation: higher stake = lower percentage reward
    const stakeETH = parseFloat(formatEther(totalStake))
    if (stakeETH > 1) return '0.01'
    if (stakeETH > 0.5) return '0.02'
    return '0.05'
  }

  const testEvidence = async (cid: string) => {
    setTestingEvidence(cid)
    try {
      const response = await fetch('/api/test-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cid })
      })
      
      if (response.ok) {
        // Refresh data to show new evidence
        await fetchCIDData()
      }
    } catch (error) {
      console.error('Test evidence failed:', error)
    } finally {
      setTestingEvidence(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] relative pb-24 pt-24">
      {/* Header */}
      <div className="border-b border-[#EDEDED]/10 bg-[#0A0A0A]">
        <div className="max-w-[896px] mx-auto px-0 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Validator Opportunities</h1>
              <p className="text-[#EDEDED]/60 text-sm max-w-2xl">
                Stake ETH to monitor CIDs and earn rewards for maintaining availability guarantees
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-[#EDEDED]/70 hover:text-[#EDEDED] hover:bg-[#EDEDED]/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchCIDData}
                disabled={loading}
                className="text-[#EDEDED]/70 hover:text-[#EDEDED] hover:bg-[#EDEDED]/10"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[896px] mx-auto px-0 py-8">
        {/* Compact Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0A0A0A] border border-[#EDEDED]/10 rounded-lg p-4 text-center">
            <div className="text-lg font-bold text-[#38BDF8]">{stats.averageAPY}%</div>
            <div className="text-xs text-[#EDEDED]/60">Avg. APY</div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#EDEDED]/10 rounded-lg p-4 text-center">
            <div className="text-lg font-bold text-green-400">{stats.totalCIDs}</div>
            <div className="text-xs text-[#EDEDED]/60">Available CIDs</div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#EDEDED]/10 rounded-lg p-4 text-center">
            <div className="text-lg font-bold text-orange-400">{stats.activeValidators}</div>
            <div className="text-xs text-[#EDEDED]/60">Active Validators</div>
          </div>
          <div className="bg-[#0A0A0A] border border-[#EDEDED]/10 rounded-lg p-4 text-center">
            <div className="text-lg font-bold text-[#EDEDED]">{parseFloat(stats.totalStake).toFixed(3)}</div>
            <div className="text-xs text-[#EDEDED]/60">Total Stake (ETH)</div>
          </div>
        </div>

        {/* CIDs Table */}
        <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Available Opportunities</span>
                </CardTitle>
                <CardDescription>
                  Real CIDs from Lisk Sepolia testnet with live monitoring data
                </CardDescription>
              </div>
              {loading && (
                <div className="flex items-center space-x-2 text-[#EDEDED]/60">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {cidData.length === 0 && !loading ? (
              <div className="text-center py-8 text-[#EDEDED]/60">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No registered CIDs found on this network.</p>
                <p className="text-sm mt-2">Make sure you're connected to Lisk Sepolia testnet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#EDEDED]/10">
                      <TableHead className="text-[#EDEDED]/80">CID</TableHead>
                      <TableHead className="text-[#EDEDED]/80">Stake</TableHead>
                      <TableHead className="text-[#EDEDED]/80">SLO</TableHead>
                      <TableHead className="text-[#EDEDED]/80">Status</TableHead>
                      <TableHead className="text-[#EDEDED]/80">Reward Est.</TableHead>
                      <TableHead className="text-[#EDEDED]/80">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cidData.map((cidInfo) => {
                      const status = getStatusFromCIDData(cidInfo)
                      const slo = formatSLO(cidInfo.slo)
                      const reward = estimateReward(cidInfo.totalStake)
                      
                      return (
                        <TableRow key={cidInfo.cid} className="border-[#EDEDED]/10">
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="truncate max-w-[140px]" title={cidInfo.cid}>
                                {cidInfo.cid.slice(0, 16)}...
                              </span>
                              <Link href={`/cid/${cidInfo.cid}`}>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 text-[#38BDF8]"
                                onClick={() => testEvidence(cidInfo.cid)}
                                disabled={testingEvidence === cidInfo.cid}
                                title="Test real evidence collection"
                              >
                                {testingEvidence === cidInfo.cid ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-[#38BDF8]">
                              {parseFloat(formatEther(cidInfo.totalStake)).toFixed(3)} ETH
                            </div>
                            {cidInfo.slashingEnabled && (
                              <div className="text-xs text-orange-400">Slashing On</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="space-y-1">
                              <div>{slo.success}</div>
                              <div className="text-[#EDEDED]/60 text-xs">{slo.timeout}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Badge 
                                variant="secondary" 
                                className={`${getStatusColor(status)} border-current`}
                              >
                                {status}
                              </Badge>
                              {cidInfo.consecutiveFails > 0 && (
                                <div className="text-xs text-red-400">
                                  {cidInfo.consecutiveFails} fails
                                </div>
                              )}
                              {/* Real probe data */}
                              {cidInfo.evidenceData && (
                                <div className="text-xs text-[#EDEDED]/60 space-y-1">
                                  <div>{cidInfo.evidenceData.availability.toFixed(1)}% available</div>
                                  <div>Avg: {cidInfo.evidenceData.avgLatency.toFixed(0)}ms</div>
                                  <div className="text-xs text-[#EDEDED]/40">
                                    Updated: {new Date(cidInfo.evidenceData.lastUpdate).toLocaleTimeString()}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-green-400 text-sm">
                            {reward} ETH/mo
                          </TableCell>
                          <TableCell>
                            {selectedCid === cidInfo.cid ? (
                              <div className="space-y-2 min-w-[180px]">
                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={stakeAmount}
                                    onChange={(e) => setStakeAmount(e.target.value)}
                                    className="bg-[#0A0A0A] border-[#EDEDED]/20 text-[#EDEDED] h-8 text-sm"
                                    placeholder="0.1"
                                  />
                                  <span className="text-xs text-[#EDEDED]/60 whitespace-nowrap">ETH</span>
                                </div>
                                <div className="flex space-x-1">
                                  <Button 
                                    size="sm"
                                    className="h-8 bg-[#38BDF8] text-[#0A0A0A] hover:bg-[#38BDF8]/90 flex-1"
                                    onClick={() => handleBondStake(cidInfo.cid)}
                                    disabled={isBondPending || isBondConfirming || !stakeAmount || parseFloat(stakeAmount) <= 0}
                                  >
                                    {isBondPending || isBondConfirming ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      'Stake'
                                    )}
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                    className="h-8 border-[#EDEDED]/20 text-[#EDEDED] hover:bg-[#EDEDED]/10"
                                    onClick={() => setSelectedCid(null)}
                                  >
                                    ×
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button 
                                size="sm"
                                variant="outline"
                                className="border-[#38BDF8]/50 text-[#38BDF8] hover:bg-[#38BDF8]/10 h-8"
                                onClick={() => setSelectedCid(cidInfo.cid)}
                                disabled={!isConnected}
                              >
                                Stake
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Status */}
        {bondError && (
          <Alert className="mt-6 border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              <strong>Error:</strong> {bondError.message}
            </AlertDescription>
          </Alert>
        )}
        
        {isBondConfirmed && (
          <Alert className="mt-6 border-green-500/20 bg-green-500/10">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-400">
              <strong>Success!</strong> You've bonded {stakeAmount} ETH stake. Transaction confirmed!
            </AlertDescription>
          </Alert>
        )}

        {/* Real-time Gateway Status */}
        {cidData.length > 0 && (
          <Card className="mt-6 bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <RefreshCw className="h-5 w-5" />
                <span>Live Gateway Performance</span>
              </CardTitle>
              <CardDescription>
                Real-time latency data from IPFS gateways (updated every 60 seconds)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cidData.map((cidInfo) => (
                  cidInfo.evidenceData && (
                    <div key={cidInfo.cid} className="p-4 border border-[#EDEDED]/10 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-mono text-sm">
                          {cidInfo.cid.slice(0, 20)}...
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={`${getStatusColor(cidInfo.evidenceData.status)} border-current`}
                        >
                          {cidInfo.evidenceData.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {cidInfo.evidenceData.probeData.map((probe, index) => (
                          <div 
                            key={index}
                            className="p-3 bg-[#EDEDED]/5 rounded border border-[#EDEDED]/5"
                          >
                            <div className="text-xs font-medium text-[#EDEDED]/80 mb-1">
                              {probe.region}
                            </div>
                            <div className={`text-sm font-bold ${probe.success ? 'text-green-400' : 'text-red-400'}`}>
                              {probe.success ? `${probe.latency}ms` : 'Failed'}
                            </div>
                            {probe.error && (
                              <div className="text-xs text-red-400 mt-1 truncate" title={probe.error}>
                                {probe.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-[#EDEDED]/60 flex justify-between">
                        <span>{cidInfo.evidenceData.availability.toFixed(1)}% availability</span>
                        <span>Avg: {cidInfo.evidenceData.avgLatency.toFixed(0)}ms</span>
                        <span>Last update: {new Date(cidInfo.evidenceData.lastUpdate).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  )
                ))}
                {cidData.filter(c => c.evidenceData).length === 0 && (
                  <div className="text-center py-6 text-[#EDEDED]/60">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No real-time data available yet.</p>
                    <p className="text-sm mt-1">Evidence packs are generated every 60 seconds.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="mt-6 bg-[#0A0A0A] border-[#EDEDED]/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[#EDEDED]/80">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>1. Choose & Stake:</strong> Select a CID and deposit ETH as collateral for monitoring.
              </div>
              <div>
                <strong>2. Monitor & Earn:</strong> Your node monitors availability and earns rewards for meeting SLOs.
              </div>
              <div>
                <strong>3. Slashing Risk:</strong> Stake gets slashed if you fail to maintain availability guarantees.
              </div>
              <div>
                <strong>4. Withdraw:</strong> Unbond your stake anytime (subject to withdrawal delays).
              </div>
            </div>
            <Alert className="border-[#38BDF8]/20 bg-[#38BDF8]/5 mt-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Live Data:</strong> This shows real CIDs from Lisk Sepolia with actual stake amounts and SLO configurations.
                Connect to Lisk Sepolia testnet to interact.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
