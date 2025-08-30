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
  totalStake: bigint
  lastPackCIDDigest: string
  lastBreachAt: bigint
  consecutiveFails: number
  slashingEnabled: boolean
  publisher: string
}

// Mock evidence pack data - replace with real IPFS fetching
const mockEvidencePacks = [
  {
    cid: 'QmPackHash1234567890abcdef',
    timestamp: Date.now() - 300000, // 5 minutes ago
    status: 'OK',
    okCount: 4,
    totalChecks: 5,
    probes: [
      { vp: 'us-east', gateway: 'ipfs.io', ok: true, latMs: 420 },
      { vp: 'eu-west', gateway: 'dweb.link', ok: true, latMs: 530 },
      { vp: 'ap-south', gateway: 'cloudflare-ipfs.com', ok: true, latMs: 680 },
      { vp: 'us-west', gateway: 'gateway.pinata.cloud', ok: true, latMs: 380 },
      { vp: 'eu-north', gateway: 'ipfs.filebase.io', ok: false, latMs: 0 }
    ]
  },
  {
    cid: 'QmPackHash0987654321fedcba',
    timestamp: Date.now() - 600000, // 10 minutes ago
    status: 'OK',
    okCount: 5,
    totalChecks: 5,
    probes: [
      { vp: 'us-east', gateway: 'ipfs.io', ok: true, latMs: 390 },
      { vp: 'eu-west', gateway: 'dweb.link', ok: true, latMs: 450 },
      { vp: 'ap-south', gateway: 'cloudflare-ipfs.com', ok: true, latMs: 620 },
      { vp: 'us-west', gateway: 'gateway.pinata.cloud', ok: true, latMs: 340 },
      { vp: 'eu-north', gateway: 'ipfs.filebase.io', ok: true, latMs: 510 }
    ]
  }
]

export function CIDDetailsPage({ cid }: CIDDetailsPageProps) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const [selectedPack, setSelectedPack] = useState(0)
  const [stakeAmount, setStakeAmount] = useState('0.1')
  const [showStakeInput, setShowStakeInput] = useState(false)

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

  // Debug logging to understand data structure
  useEffect(() => {
    if (cidData) {
      console.log('CID Data from contract:', cidData)
      console.log('CID Data type:', typeof cidData)
      console.log('CID Data keys:', Object.keys(cidData || {}))
    }
    if (cidError) {
      console.error('CID Error:', cidError)
    }
  }, [cidData, cidError])

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
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] relative pb-24 pt-24">
      {/* Header */}
      <div className="sticky top-24 z-40 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#EDEDED]/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-[#EDEDED]/70 hover:text-[#EDEDED] hover:bg-[#EDEDED]/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold">CID Details</h1>
              <div className="flex items-center space-x-2 mt-1">
                <code className="text-sm bg-[#EDEDED]/10 px-2 py-1 rounded">
                  {cid.slice(0, 20)}...{cid.slice(-8)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(cid)}
                  className="h-6 w-6 p-0 hover:bg-[#EDEDED]/10"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openInGateway(cid)}
                  className="h-6 w-6 p-0 hover:bg-[#EDEDED]/10"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error States */}
        {cidError && (
          <Alert className="border-red-500/20 bg-red-500/10 mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              Failed to load CID data: {cidError.message}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - CID Info & SLO */}
          <div className="lg:col-span-1 space-y-6">
            {/* CID Status Overview */}
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
                    <span>Loading...</span>
                  </div>
                ) : cidData ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[#EDEDED]/60">Current Status</span>
                      {getStatusBadge(mockEvidencePacks[selectedPack]?.status || 'OK')}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#EDEDED]/60">24h Uptime</span>
                      <span className="font-mono">99.2%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#EDEDED]/60">Total Stake</span>
                      <span className="font-mono">
                        {(cidData as CIDData)?.totalStake?.toString() || '0'} wei
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#EDEDED]/60">Consecutive Fails</span>
                      <span className="font-mono">
                        {(cidData as CIDData)?.consecutiveFails?.toString() || '0'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-[#EDEDED]/60">No data available</div>
                )}
              </CardContent>
            </Card>

            {/* SLO Configuration */}
            <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>SLO Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingCID ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : cidData ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-[#EDEDED]/60">Success Threshold</div>
                        <div className="text-lg font-mono">
                          {(cidData as CIDData)?.slo?.k || 0}/{(cidData as CIDData)?.slo?.n || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-[#EDEDED]/60">Timeout</div>
                        <div className="text-lg font-mono">{(cidData as CIDData)?.slo?.timeout || 0}s</div>
                      </div>
                      <div>
                        <div className="text-sm text-[#EDEDED]/60">Window</div>
                        <div className="text-lg font-mono">{(cidData as CIDData)?.slo?.window || 0}m</div>
                      </div>
                      <div>
                        <div className="text-sm text-[#EDEDED]/60">Slashing</div>
                        <div className="text-lg">
                          {(cidData as CIDData)?.slashingEnabled ? '✅ Enabled' : '❌ Disabled'}
                        </div>
                      </div>
                    </div>
                    <Alert className="border-[#38BDF8]/20 bg-[#38BDF8]/5">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-[#EDEDED]/80 text-sm">
                        {(cidData as CIDData)?.slo?.k || 0} out of {(cidData as CIDData)?.slo?.n || 0} checks must succeed within {(cidData as CIDData)?.slo?.timeout || 0} seconds, 
                        checked every {(cidData as CIDData)?.slo?.window || 0} minutes.
                      </AlertDescription>
                    </Alert>
                  </>
                ) : (
                  <div className="text-[#EDEDED]/60">No SLO data available</div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
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
                    Bond Stake as Validator
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
                          className="bg-[#0A0A0A] border-[#EDEDED]/20 text-[#EDEDED]"
                          placeholder="0.1"
                        />
                        <span className="text-[#EDEDED]/60 text-sm">ETH</span>
                      </div>
                      <p className="text-xs text-[#EDEDED]/60">
                        Stake ETH to become a validator for this CID. You'll earn rewards for monitoring availability.
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        className="flex-1 bg-[#38BDF8] text-[#0A0A0A] hover:bg-[#38BDF8]/90"
                        onClick={handleBondStake}
                        disabled={isBondPending || isBondConfirming || !stakeAmount || parseFloat(stakeAmount) <= 0}
                      >
                        {isBondPending || isBondConfirming ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {isBondPending ? 'Confirming...' : 'Processing...'}
                          </>
                        ) : (
                          'Bond Stake'
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-[#EDEDED]/20 text-[#EDEDED] hover:bg-[#EDEDED]/10"
                        onClick={() => setShowStakeInput(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Transaction Status */}
                {bondError && (
                  <Alert className="border-red-500/20 bg-red-500/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-400 text-sm">
                      <strong>Error:</strong> {bondError.message}
                    </AlertDescription>
                  </Alert>
                )}
                
                {isBondConfirmed && (
                  <Alert className="border-green-500/20 bg-green-500/10">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-green-400 text-sm">
                      <strong>Success!</strong> You've bonded {stakeAmount} ETH stake to this CID. You're now a validator!
                    </AlertDescription>
                  </Alert>
                )}

                {/* View Content Button */}
                <Button 
                  variant="outline" 
                  className="w-full border-[#EDEDED]/20 text-[#EDEDED] hover:bg-[#EDEDED]/10"
                  onClick={() => openInGateway(cid)}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  View Content
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Evidence Packs Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Download className="h-5 w-5" />
                    <span>Evidence Packs Timeline</span>
                  </div>
                  <Badge variant="outline" className="border-[#38BDF8]/20 text-[#38BDF8]">
                    {mockEvidencePacks.length} Pack{mockEvidencePacks.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Historical monitoring data and availability probes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pack Selection */}
                <div className="space-y-3">
                  {mockEvidencePacks.map((pack, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPack(idx)}
                      className={`w-full p-4 rounded-lg border text-left transition-colors ${
                        selectedPack === idx
                          ? 'border-[#38BDF8] bg-[#38BDF8]/5'
                          : 'border-[#EDEDED]/10 hover:border-[#EDEDED]/20 hover:bg-[#EDEDED]/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(pack.status)}
                          <code className="text-sm bg-[#EDEDED]/10 px-2 py-1 rounded">
                            {pack.cid.slice(0, 12)}...
                          </code>
                        </div>
                        <div className="text-sm text-[#EDEDED]/60">
                          {formatTimestamp(pack.timestamp)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Selected Pack Details */}
                {mockEvidencePacks[selectedPack] && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[#EDEDED]/5 rounded-lg">
                      <div>
                        <h4 className="font-semibold">Evidence Pack Details</h4>
                        <p className="text-sm text-[#EDEDED]/60">
                          {mockEvidencePacks[selectedPack].okCount}/{mockEvidencePacks[selectedPack].totalChecks} checks passed
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInGateway(mockEvidencePacks[selectedPack].cid)}
                        className="border-[#38BDF8] text-[#38BDF8] hover:bg-[#38BDF8]/10"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Pack
                      </Button>
                    </div>

                    {/* Probe Results */}
                    <div className="space-y-2">
                      <h5 className="font-medium">Probe Results</h5>
                      {mockEvidencePacks[selectedPack].probes.map((probe, probeIdx) => (
                        <div
                          key={probeIdx}
                          className="flex items-center justify-between p-3 bg-[#EDEDED]/5 rounded border border-[#EDEDED]/10"
                        >
                          <div className="flex items-center space-x-3">
                            {probe.ok ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <div>
                              <div className="text-sm font-mono">{probe.vp}</div>
                              <div className="text-xs text-[#EDEDED]/60">{probe.gateway}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-mono">
                              {probe.ok ? `${probe.latMs}ms` : 'Failed'}
                            </div>
                            <div className="text-xs text-[#EDEDED]/60">
                              {probe.ok ? 'Success' : 'Timeout'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
