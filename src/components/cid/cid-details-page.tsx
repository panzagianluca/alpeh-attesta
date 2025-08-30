'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { keccak256, toBytes, parseEther } from 'viem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft,
  Copy,
  ExternalLink,
  Globe,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Activity,
  Download,
  Loader2,
  Info
} from 'lucide-react'
import Link from 'next/link'
import { CONTRACT_ADDRESSES } from '@/lib/wagmi'
import EvidenceRegistryABI from '@/abi/EvidenceRegistry.json'

interface CIDDetailsPageProps {
  cid: string
}

interface CIDData {
  slo: {
    k: number
    n: number
    timeout: number
    window: number
  }
  slashingEnabled: boolean
  totalStake: bigint
}

interface EvidencePack {
  cid: string
  timestamp: number
  status: string
  okCount: number
  totalChecks: number
  probes: Array<{
    vp: string
    gateway: string
    ok: boolean
    latMs: number
  }>
}

export function CIDDetailsPage({ cid }: CIDDetailsPageProps) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const [selectedPack, setSelectedPack] = useState(0)
  const [stakeAmount, setStakeAmount] = useState('0.1')
  const [showStakeInput, setShowStakeInput] = useState(false)
  const [evidencePacks, setEvidencePacks] = useState<EvidencePack[]>([])
  const [loadingEvidence, setLoadingEvidence] = useState(false)
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null)

  // Calculate CID digest for contract interaction
  const cidDigest = keccak256(toBytes(cid))

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

  // Read CID data from contract
  const { 
    data: cidData, 
    isLoading: isLoadingCID,
    error: cidError 
  } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: EvidenceRegistryABI,
    functionName: 'cids',
    args: [cidDigest],
    query: {
      enabled: !!contractAddress && contractAddress !== '0x...'
    }
  })

  // Parse contract data (returns array: [publisher, slo, totalStake, lastPackCIDDigest, lastBreachAt, consecutiveFails, slashingEnabled])
  const parsedCidData = cidData && Array.isArray(cidData) ? {
    publisher: (cidData as any[])[0] as string,
    slo: {
      k: ((cidData as any[])[1] as any[])[0] as number,
      n: ((cidData as any[])[1] as any[])[1] as number, 
      timeout: ((cidData as any[])[1] as any[])[2] as number,
      window: ((cidData as any[])[1] as any[])[3] as number
    },
    totalStake: (cidData as any[])[2] as bigint,
    lastPackCIDDigest: (cidData as any[])[3] as string,
    lastBreachAt: (cidData as any[])[4] as bigint,
    consecutiveFails: (cidData as any[])[5] as number,
    slashingEnabled: (cidData as any[])[6] as boolean
  } : null

  // Debug logging to understand data structure
  useEffect(() => {
    if (cidData) {
      console.log('Raw CID Data from contract:', cidData)
      console.log('Parsed CID Data:', parsedCidData)
    }
    if (cidError) {
      console.error('CID Error:', cidError)
    }
  }, [cidData, cidError, parsedCidData])

  // Fetch evidence data when component mounts
  useEffect(() => {
    const fetchEvidenceData = async () => {
      setLoadingEvidence(true)
      try {
        // Fetch current evidence
        const response = await fetch(`/api/evidence/${cid}`)
        if (response.ok) {
          const data = await response.json()
          
          if (data.success && data.data) {
            // Convert to EvidencePack format using the correct API structure
            const evidencePack: EvidencePack = {
              cid: `QmEvidence${Date.now()}`, // Evidence pack CID would come from IPFS
              timestamp: Date.now(),
              status: data.data.status,
              okCount: data.data.successfulProbes || 0,
              totalChecks: data.data.totalProbes || 0,
              probes: (data.data.probeData || []).map((result: any) => ({
                vp: result.gatewayName || result.gateway.split('//')[1] || result.gateway,
                gateway: result.gateway.split('//')[1] || result.gateway,
                ok: result.success,
                latMs: result.latency
              }))
            }
            
            setEvidencePacks([evidencePack])
            setLastCheckTime(new Date())
          } else {
            console.warn('Evidence API returned no data:', data)
            setEvidencePacks([])
          }
        } else {
          console.error('Evidence API request failed:', response.status)
          setEvidencePacks([])
        }
      } catch (error) {
        console.error('Failed to fetch evidence data:', error)
        // Set empty array on error
        setEvidencePacks([])
      } finally {
        setLoadingEvidence(false)
      }
    }

    if (cid) {
      fetchEvidenceData()
    }
  }, [cid])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const openInGateway = (targetCid: string) => {
    window.open(`https://ipfs.io/ipfs/${targetCid}`, '_blank')
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleBondStake = async () => {
    if (!isConnected || !contractAddress || contractAddress === '0x...') {
      alert('Please connect your wallet and ensure you are on the correct network')
      return
    }

    try {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            OK
          </Badge>
        )
      case 'DEGRADED':
        return (
          <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
            <Clock className="w-3 h-3 mr-1" />
            DEGRADED
          </Badge>
        )
      case 'BREACH':
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            BREACH
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] relative pt-24">
        <div className="flex items-center justify-center min-h-screen p-6">
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10 max-w-md w-full text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-[#38BDF8]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Globe className="h-8 w-8 text-[#38BDF8]" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-[#EDEDED]/70 mb-6">
                Connect your wallet to view CID details and monitoring data.
              </p>
              <div className="text-center">
                <Link href="/dashboard">
                  <Button variant="outline" className="border-[#EDEDED]/20 text-[#EDEDED] hover:bg-[#EDEDED]/10">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] relative pb-24 pt-24">
      {/* Header */}
      <div className="border-b border-[#EDEDED]/10 bg-[#0A0A0A]">
        <div className="max-w-[896px] mx-auto px-0 py-4">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">CID Details</h1>
                <div className="flex items-center space-x-2">
                  <code className="text-sm bg-[#EDEDED]/10 px-3 py-2 rounded font-mono">
                    {cid.slice(0, 20)}...{cid.slice(-8)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(cid)}
                    className="h-8 w-8 p-0 hover:bg-[#EDEDED]/10"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openInGateway(cid)}
                    className="h-8 w-8 p-0 hover:bg-[#EDEDED]/10"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-[#EDEDED]/70 hover:text-[#EDEDED] hover:bg-[#EDEDED]/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[896px] mx-auto px-0 py-8">
        {/* Error States */}
        {cidError && (
          <Alert className="border-red-500/20 bg-red-500/10 mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              Failed to load CID data: {cidError?.message}
            </AlertDescription>
          </Alert>
        )}

        {!contractAddress || contractAddress === '0x...' ? (
          <Alert className="border-orange-500/20 bg-orange-500/5 mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-orange-400">
              Contract not deployed on this network. Please switch to Lisk Sepolia Testnet.
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Three Cards Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Status Overview Card */}
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Status Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingCID ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-[#EDEDED]/60">Loading...</span>
                </div>
              ) : parsedCidData ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[#EDEDED]/60">Current Status</span>
                    {evidencePacks.length > 0 ? 
                      getStatusBadge(evidencePacks[0].status) : 
                      <Badge variant="outline">Unknown</Badge>
                    }
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#EDEDED]/60">Last Check</span>
                    <span className="text-sm">
                      {lastCheckTime ? `${Math.round((Date.now() - lastCheckTime.getTime()) / 60000)} minutes ago` : 'No data'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#EDEDED]/60">Total Stake</span>
                    <span className="font-bold text-[#38BDF8]">
                      {parsedCidData.totalStake > BigInt(0) 
                        ? `${(Number(parsedCidData.totalStake) / 1e18).toFixed(4)} ETH`
                        : '0 ETH'
                      }
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[#EDEDED]/60">No status data available</div>
              )}
            </CardContent>
          </Card>

          {/* SLO Configuration Card */}
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>SLO Config</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {parsedCidData ? (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <Label className="text-xs text-[#EDEDED]/60">Success Rate</Label>
                      <div className="text-lg font-mono">
                        {parsedCidData.slo.k}/{parsedCidData.slo.n}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[#EDEDED]/60">Timeout</Label>
                      <div className="text-lg font-mono">{parsedCidData.slo.timeout}ms</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <Label className="text-xs text-[#EDEDED]/60">Slashing</Label>
                      <div className="text-sm">
                        {parsedCidData.slashingEnabled ? '✅ Enabled' : '❌ Disabled'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[#EDEDED]/60">Window</Label>
                      <div className="text-lg font-mono">{parsedCidData.slo.window}m</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-[#EDEDED]/60">No SLO data available</div>
              )}
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bond Stake Section */}
              {!showStakeInput ? (
                <Button 
                  className="w-full bg-[#38BDF8] text-[#0A0A0A] hover:bg-[#38BDF8]/90"
                  onClick={() => setShowStakeInput(true)}
                  disabled={!isConnected}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Bond Stake
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="stakeAmount" className="text-sm">Stake Amount</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="stakeAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="bg-[#0A0A0A] border-[#EDEDED]/20 text-[#EDEDED] text-sm"
                        placeholder="0.1"
                      />
                      <span className="text-[#EDEDED]/60 text-xs">ETH</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      size="sm"
                      className="flex-1 bg-[#38BDF8] text-[#0A0A0A] hover:bg-[#38BDF8]/90"
                      onClick={handleBondStake}
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
                      className="border-[#EDEDED]/20 text-[#EDEDED] hover:bg-[#EDEDED]/10"
                      onClick={() => setShowStakeInput(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* View Content Button */}
              <Button 
                variant="outline" 
                size="sm"
                className="w-full border-[#EDEDED]/20 text-[#EDEDED] hover:bg-[#EDEDED]/10"
                onClick={() => openInGateway(cid)}
              >
                <Globe className="w-3 h-3 mr-2" />
                View Content
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Status Alerts */}
        {bondError && (
          <Alert className="border-red-500/20 bg-red-500/10 mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400 text-sm">
              <strong>Error:</strong> {bondError?.message}
            </AlertDescription>
          </Alert>
        )}
        
        {isBondConfirmed && (
          <Alert className="border-green-500/20 bg-green-500/10 mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-400 text-sm">
              <strong>Success!</strong> You've bonded {stakeAmount} ETH stake to this CID. You're now a validator!
            </AlertDescription>
          </Alert>
        )}

        {/* Evidence Packs Timeline - Full Width Below */}
        <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Evidence Packs Timeline</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {loadingEvidence ? 'Loading...' : `${evidencePacks.length} packs`}
              </Badge>
            </CardTitle>
            <CardDescription>
              Monitoring evidence collected from distributed validators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingEvidence ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading evidence data...</span>
              </div>
            ) : evidencePacks.length === 0 ? (
              <div className="text-center py-8 text-[#EDEDED]/60">
                <Info className="h-8 w-8 mx-auto mb-2" />
                <p>No evidence packs available</p>
                <p className="text-sm">Run a probe to collect evidence data</p>
              </div>
            ) : (
              <>
                {/* Pack Selection */}
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {evidencePacks.map((pack: EvidencePack, index: number) => (
                    <Button
                      key={index}
                      variant={selectedPack === index ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPack(index)}
                      className={`flex-shrink-0 ${
                        selectedPack === index 
                          ? 'bg-[#38BDF8] text-[#0A0A0A]' 
                          : 'border-[#EDEDED]/20 text-[#EDEDED] hover:bg-[#EDEDED]/10'
                      }`}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimestamp(pack.timestamp).split(',')[1]?.trim()}
                    </Button>
                  ))}
                </div>

                {/* Selected Pack Details */}
                {evidencePacks[selectedPack] && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Pack {selectedPack + 1}</h4>
                        <p className="text-sm text-[#EDEDED]/60">
                          {formatTimestamp(evidencePacks[selectedPack].timestamp)}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(evidencePacks[selectedPack].status)}
                        <p className="text-sm text-[#EDEDED]/60 mt-1">
                          {evidencePacks[selectedPack].okCount}/{evidencePacks[selectedPack].totalChecks} success
                        </p>
                      </div>
                    </div>

                    {/* Probe Results */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Probe Results</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {evidencePacks[selectedPack].probes.map((probe, probeIndex: number) => (
                          <div 
                            key={probeIndex}
                            className="flex items-center justify-between p-3 bg-[#EDEDED]/5 rounded"
                          >
                            <div className="flex items-center space-x-2">
                              {probe.ok ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-red-500" />
                              )}
                              <span className="text-sm font-mono">{probe.vp}</span>
                            </div>
                            <div className="text-xs text-[#EDEDED]/60">
                              {probe.ok ? `${probe.latMs}ms` : 'Failed'}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-[#EDEDED]/50 mt-2">
                        Gateway endpoints: {evidencePacks[selectedPack].probes.map((p: any) => p.gateway).join(', ')}
                      </div>
                    </div>

                    {/* Pack CID */}
                    <div className="p-4 bg-[#EDEDED]/5 rounded">
                      <Label className="text-xs text-[#EDEDED]/60">Evidence Pack CID</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <code className="text-sm font-mono flex-1">
                          {evidencePacks[selectedPack].cid}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(evidencePacks[selectedPack].cid)}
                          className="h-8 w-8 p-0 hover:bg-[#EDEDED]/10"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openInGateway(evidencePacks[selectedPack].cid)}
                          className="h-8 w-8 p-0 hover:bg-[#EDEDED]/10"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
