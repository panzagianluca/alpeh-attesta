'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
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
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { CONTRACT_ADDRESSES } from '@/lib/wagmi'
import EvidenceRegistryABI from '@/abi/EvidenceRegistry.json'

// Mock data for available CIDs - in real app this would come from contract events
const mockAvailableCIDs = [
  {
    cid: 'QmTestDemo123456789abcdef',
    totalStake: '0.5',
    validatorCount: 3,
    sloSuccess: '4/5',
    timeout: '10s',
    window: '60min',
    slashingEnabled: true,
    lastCheck: Date.now() - 300000,
    status: 'OK',
    estimatedReward: '0.02'
  },
  {
    cid: 'QmDemoContent987654321',
    totalStake: '1.2',
    validatorCount: 7,
    sloSuccess: '3/5',
    timeout: '5s',
    window: '30min',
    slashingEnabled: true,
    lastCheck: Date.now() - 180000,
    status: 'OK',
    estimatedReward: '0.01'
  },
  {
    cid: 'QmImportantData112233',
    totalStake: '0.1',
    validatorCount: 1,
    sloSuccess: '5/5',
    timeout: '1s',
    window: '15min',
    slashingEnabled: true,
    lastCheck: Date.now() - 600000,
    status: 'DEGRADED',
    estimatedReward: '0.05'
  }
]

export function ValidatorsPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [selectedCid, setSelectedCid] = useState<string | null>(null)
  const [stakeAmount, setStakeAmount] = useState('0.1')
  
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'text-green-400'
      case 'DEGRADED': return 'text-orange-400'
      case 'BREACH': return 'text-red-400'
      default: return 'text-[#EDEDED]/60'
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
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
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-[#EDEDED]/70 hover:text-[#EDEDED] hover:bg-[#EDEDED]/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[896px] mx-auto px-0 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-[#38BDF8] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#38BDF8]">12.5%</div>
              <div className="text-sm text-[#EDEDED]/60">Avg. APY</div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardContent className="p-6 text-center">
              <Shield className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-400">{mockAvailableCIDs.length}</div>
              <div className="text-sm text-[#EDEDED]/60">Available CIDs</div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-400">
                {mockAvailableCIDs.reduce((acc, cid) => acc + cid.validatorCount, 0)}
              </div>
              <div className="text-sm text-[#EDEDED]/60">Total Validators</div>
            </CardContent>
          </Card>
        </div>

        {/* Available CIDs Table */}
        <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Available Staking Opportunities</span>
            </CardTitle>
            <CardDescription>
              Choose CIDs to monitor and earn rewards for maintaining availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#EDEDED]/10">
                    <TableHead className="text-[#EDEDED]/80">CID</TableHead>
                    <TableHead className="text-[#EDEDED]/80">Total Stake</TableHead>
                    <TableHead className="text-[#EDEDED]/80">Validators</TableHead>
                    <TableHead className="text-[#EDEDED]/80">SLO</TableHead>
                    <TableHead className="text-[#EDEDED]/80">Status</TableHead>
                    <TableHead className="text-[#EDEDED]/80">Est. Reward</TableHead>
                    <TableHead className="text-[#EDEDED]/80">Last Check</TableHead>
                    <TableHead className="text-[#EDEDED]/80">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAvailableCIDs.map((cidInfo) => (
                    <TableRow key={cidInfo.cid} className="border-[#EDEDED]/10">
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="truncate max-w-[120px]">
                            {cidInfo.cid}
                          </span>
                          <Link href={`/cid/${cidInfo.cid}`}>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-[#38BDF8]">
                        {cidInfo.totalStake} ETH
                      </TableCell>
                      <TableCell>{cidInfo.validatorCount}</TableCell>
                      <TableCell className="text-sm">
                        <div>{cidInfo.sloSuccess}</div>
                        <div className="text-[#EDEDED]/60">{cidInfo.timeout}</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={`${getStatusColor(cidInfo.status)} border-current`}
                        >
                          {cidInfo.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-green-400">
                        {cidInfo.estimatedReward} ETH/month
                      </TableCell>
                      <TableCell className="text-sm text-[#EDEDED]/60">
                        {formatTimeAgo(cidInfo.lastCheck)}
                      </TableCell>
                      <TableCell>
                        {selectedCid === cidInfo.cid ? (
                          <div className="space-y-2 min-w-[200px]">
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
                              <span className="text-xs text-[#EDEDED]/60">ETH</span>
                            </div>
                            <div className="flex space-x-1">
                              <Button 
                                size="sm"
                                className="h-8 bg-[#38BDF8] text-[#0A0A0A] hover:bg-[#38BDF8]/90"
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
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button 
                            size="sm"
                            variant="outline"
                            className="border-[#38BDF8]/50 text-[#38BDF8] hover:bg-[#38BDF8]/10"
                            onClick={() => setSelectedCid(cidInfo.cid)}
                            disabled={!isConnected}
                          >
                            Stake
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
              <strong>Success!</strong> You've bonded {stakeAmount} ETH stake. You're now monitoring this CID!
            </AlertDescription>
          </Alert>
        )}

        {/* Help Section */}
        <Card className="mt-8 bg-[#0A0A0A] border-[#EDEDED]/10">
          <CardHeader>
            <CardTitle className="text-lg">How Validator Staking Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[#EDEDED]/80">
            <div>
              <strong>1. Choose a CID:</strong> Select content you want to monitor for availability.
            </div>
            <div>
              <strong>2. Stake ETH:</strong> Deposit ETH as collateral - this shows your commitment to monitoring.
            </div>
            <div>
              <strong>3. Earn Rewards:</strong> Get paid for successful monitoring based on SLO performance.
            </div>
            <div>
              <strong>4. Risk Management:</strong> Your stake gets slashed if you fail to meet SLO requirements.
            </div>
            <Alert className="border-[#38BDF8]/20 bg-[#38BDF8]/5">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> Higher stake amounts often correlate with higher rewards, but also higher potential losses. 
                Start small and build up your validator reputation.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
