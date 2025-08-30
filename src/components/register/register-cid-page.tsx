'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { parseEther, keccak256, toBytes } from 'viem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { saveCIDMapping } from '@/lib/cid-storage'
import { 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  ArrowLeft,
  Info,
  Shield,
  ChevronDown,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { CONTRACT_ADDRESSES, liskSepolia } from '@/lib/wagmi'
import EvidenceRegistryABI from '@/abi/EvidenceRegistry.json'
import { NetworkSwitcher } from '@/components/web3/network-switcher'

// SLO Presets according to your spec
const SLO_PRESETS = {
  'Estricto': { k: 4, n: 5, timeout: 15, window: 30 },
  'Normal': { k: 3, n: 5, timeout: 30, window: 60 },
  'Laxo': { k: 2, n: 3, timeout: 45, window: 120 }
}

export function RegisterCIDPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [cid, setCid] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('Normal')
  const [customSLO, setCustomSLO] = useState(SLO_PRESETS.Normal)
  const [slashingEnabled, setSlashingEnabled] = useState(true)
  const [minimumStake, setMinimumStake] = useState('0.1')
  const [slashingPercentage, setSlashingPercentage] = useState('10')
  const [monthlyBudget, setMonthlyBudget] = useState('0.1')
  const [selectedTier, setSelectedTier] = useState('Good')
  const [isValidCid, setIsValidCid] = useState(false)

  const { 
    writeContract, 
    isPending: isWritePending,
    data: hash,
    error: writeError 
  } = useWriteContract()

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed 
  } = useWaitForTransactionReceipt({
    hash,
  })

  // Validate CID format (basic v1 validation)
  const validateCID = (value: string) => {
    // CIDv1 typically starts with 'b' and is base32 encoded
    const cidV1Regex = /^(Qm[a-zA-Z0-9]{44}|b[a-z2-7]{58}|z[a-zA-Z0-9]+)$/
    setIsValidCid(cidV1Regex.test(value))
  }

  const handleCidChange = (value: string) => {
    setCid(value)
    validateCID(value)
  }

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset)
    if (preset in SLO_PRESETS) {
      setCustomSLO(SLO_PRESETS[preset as keyof typeof SLO_PRESETS])
    }
  }

  const handleTierSelection = (tier: any) => {
    setSelectedTier(tier.level)
    setMonthlyBudget(tier.monthlyBudget)
    setMinimumStake(tier.validatorStake)
    
    // Update SLO based on tier
    const sloMapping = {
      'Basic': { k: 1, n: 5, timeout: 10, window: 60 },
      'Good': { k: 3, n: 5, timeout: 5, window: 30 },
      'Premium': { k: 5, n: 5, timeout: 1, window: 15 }
    }
    setCustomSLO(sloMapping[tier.level as keyof typeof sloMapping])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !isValidCid) return

    try {
      // Save CID mapping to localStorage BEFORE sending to contract
      const cidHash = saveCIDMapping(cid)
      console.log(`💾 Saved CID mapping: ${cidHash} -> ${cid}`)
      
      // Calculate CID digest (keccak256 of the CID string)
      const cidDigest = keccak256(toBytes(cid))
      
      // Get contract address for current chain
      const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.attestaCore
      
      if (!contractAddress || contractAddress === '0x...') {
        throw new Error('Contract not deployed on this network. Please switch to Lisk Sepolia Testnet.')
      }

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: EvidenceRegistryABI,
        functionName: 'registerCID',
        args: [
          cid,  // Pass the actual CID string, not the hash!
          {
            k: customSLO.k,
            n: customSLO.n,
            timeout: customSLO.timeout,
            window: customSLO.window
          },
          slashingEnabled
        ],
      })
    } catch (error) {
      console.error('Failed to register CID:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] relative pt-24">
        <div className="flex items-center justify-center min-h-screen p-6">
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10 max-w-md w-full text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-[#38BDF8]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="h-8 w-8 text-[#38BDF8]" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-[#EDEDED]/70 mb-6">
                Connect your wallet to register CIDs for monitoring with economic guarantees.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (isConfirmed) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] relative pt-24">
        <div className="flex items-center justify-center min-h-screen p-6">
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10 max-w-2xl w-full text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-[#38BDF8]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-[#38BDF8]" />
              </div>
              <h2 className="text-2xl font-bold mb-4">CID Registered Successfully!</h2>
              <p className="text-[#EDEDED]/70 mb-6">
                Your content is now being monitored by our validator network with the configured SLO.
              </p>
              <div className="space-y-2 mb-6">
                <Badge variant="outline" className="border-[#38BDF8]/20 text-[#38BDF8]">
                  CID: {cid.slice(0, 12)}...
                </Badge>
                <div className="text-sm text-[#EDEDED]/60">
                  SLO: {customSLO.k}/{customSLO.n} • {customSLO.timeout}s timeout • {customSLO.window}min window
                </div>
              </div>
              <div className="flex space-x-4 justify-center">
                <Link href={`/cid/${cid}`}>
                  <Button className="bg-[#38BDF8] text-[#0A0A0A] hover:bg-[#38BDF8]/90">
                    View CID Details
                  </Button>
                </Link>
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
              <h1 className="text-2xl font-bold">Register CID</h1>
              <p className="text-[#EDEDED]/60 text-sm mt-2">
                Add your IPFS content to our monitoring network
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

      {/* Registration Form */}
      <div className="max-w-[896px] mx-auto px-0 py-8">
        {/* Network Switcher - Show if wrong network */}
        <div className="mb-6">
          <NetworkSwitcher />
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* CID Input */}
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Content Identifier</span>
              </CardTitle>
              <CardDescription>
                Enter your IPFS CID (Content Identifier) for monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cid">IPFS CID (v1 supported)</Label>
                <Input
                  id="cid"
                  placeholder="QmYourContentHashHere... or bafybeig..."
                  value={cid}
                  onChange={(e) => handleCidChange(e.target.value)}
                  className={`bg-[#0A0A0A] border-[#EDEDED]/20 ${
                    cid && (isValidCid ? 'border-green-500 focus:border-green-500' : 'border-red-500 focus:border-red-500')
                  }`}
                />
                {cid && !isValidCid && (
                  <p className="text-sm text-red-400 flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>Please enter a valid IPFS CID</span>
                  </p>
                )}
                {cid && isValidCid && (
                  <p className="text-sm text-green-400 flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>Valid CID format</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SLO Configuration */}
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardHeader>
              <CardTitle>Service Level Objectives (SLO)</CardTitle>
              <CardDescription>
                Configure availability requirements and monitoring parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preset Selection */}
              <div className="space-y-2">
                <Label>SLO Preset</Label>
                <Select value={selectedPreset} onValueChange={handlePresetChange}>
                  <SelectTrigger className="bg-[#0A0A0A] border-[#EDEDED]/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-[#EDEDED]/10">
                    <SelectItem value="Estricto">Estricto - High availability</SelectItem>
                    <SelectItem value="Normal">Normal - Balanced</SelectItem>
                    <SelectItem value="Laxo">Laxo - Relaxed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* SLO Parameters Display */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-[#EDEDED]/60">Success Threshold (K)</Label>
                  <div className="text-lg font-mono">{customSLO.k}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#EDEDED]/60">Total Checks (N)</Label>
                  <div className="text-lg font-mono">{customSLO.n}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#EDEDED]/60">Timeout (seconds)</Label>
                  <div className="text-lg font-mono">{customSLO.timeout}s</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#EDEDED]/60">Window (minutes)</Label>
                  <div className="text-lg font-mono">{customSLO.window}m</div>
                </div>
              </div>

              <Alert className="border-[#38BDF8]/20 bg-[#38BDF8]/5">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-[#EDEDED]/80">
                  <strong>SLO Explanation:</strong> {customSLO.k} out of {customSLO.n} checks must succeed within {customSLO.timeout} seconds, 
                  checked every {customSLO.window} minutes. Failure to meet this triggers breach conditions.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Validator Requirements */}
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Validator Requirements</span>
              </CardTitle>
              <CardDescription>
                Set the minimum requirements for validators who want to monitor this CID
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Enable Economic Guarantees</Label>
                  <p className="text-sm text-[#EDEDED]/60">
                    Validators must stake ETH and can be slashed for SLO violations
                  </p>
                </div>
                <Switch
                  checked={slashingEnabled}
                  onCheckedChange={setSlashingEnabled}
                  className="data-[state=checked]:bg-[#38BDF8]"
                />
              </div>

              {slashingEnabled && (
                <div className="space-y-4 pt-4 border-t border-[#EDEDED]/10">
                  {/* Minimum Validator Stake */}
                  <div className="space-y-2">
                    <Label htmlFor="minimumStake" className="text-base">Minimum Validator Stake</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="minimumStake"
                        type="number"
                        step="0.01"
                        min="0"
                        value={minimumStake}
                        onChange={(e) => setMinimumStake(e.target.value)}
                        className="bg-[#0A0A0A] border-[#EDEDED]/20 text-[#EDEDED] max-w-32"
                        placeholder="0.1"
                      />
                      <span className="text-[#EDEDED]/60 text-sm">ETH</span>
                    </div>
                    <p className="text-sm text-[#EDEDED]/60">
                      Minimum amount validators must stake (their own money) to monitor this CID
                    </p>
                  </div>

                  {/* Slashing Percentage */}
                  <div className="space-y-2">
                    <Label htmlFor="slashingPercentage" className="text-base">Slashing Penalty</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="slashingPercentage"
                        type="number"
                        min="1"
                        max="100"
                        value={slashingPercentage}
                        onChange={(e) => setSlashingPercentage(e.target.value)}
                        className="bg-[#0A0A0A] border-[#EDEDED]/20 text-[#EDEDED] max-w-24"
                        placeholder="10"
                      />
                      <span className="text-[#EDEDED]/60 text-sm">% of stake</span>
                    </div>
                    <p className="text-sm text-[#EDEDED]/60">
                      Percentage of validator stake slashed for SLO violations
                    </p>
                  </div>

                  {/* Validator Economics Info */}
                  <div className="bg-[#38BDF8]/5 border border-[#38BDF8]/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-[#38BDF8] mb-2">How Validator Staking Works</h4>
                    <div className="space-y-2 text-xs text-[#EDEDED]/70">
                      <div>• <strong>Validators stake their own ETH</strong> (minimum {minimumStake || '0.1'} ETH) to monitor your CID</div>
                      <div>• <strong>They earn rewards</strong> from the network for successful monitoring</div>
                      <div>• <strong>They lose {slashingPercentage || '10'}% of their stake</strong> if they fail to meet SLO requirements</div>
                      <div>• <strong>Higher stake requirements</strong> attract more serious validators</div>
                    </div>
                  </div>
                </div>
              )}
              
              {slashingEnabled && (
                <Alert className="border-orange-500/20 bg-orange-500/5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-orange-400">
                    <strong>Validator Economics:</strong> Validators must stake {minimumStake || '0.1'} ETH minimum of their own money. 
                    {slashingPercentage || '10'}% of their stake will be slashed for SLO violations.
                    <br />
                    <strong>Note:</strong> Registration is free for you. Validators pay to participate and earn rewards for good service.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Error Display */}
          {writeError && (
            <Alert className="border-red-500/20 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                <strong>Transaction Failed:</strong> {writeError.message}
                {writeError.message.includes('invalid') && (
                  <div className="mt-2">
                    <p>Please ensure you're connected to <strong>Lisk Sepolia Testnet</strong> and have enough LSK for gas fees.</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Network Warning */}
          {chainId !== liskSepolia.id && (
            <Alert className="border-orange-500/20 bg-orange-500/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-orange-400">
                <strong>Wrong Network:</strong> Please switch to Lisk Sepolia Testnet to register CIDs.
                <br />
                <span className="text-sm">Current: {chainId} • Required: {liskSepolia.id} (Lisk Sepolia)</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              className="bg-[#38BDF8] text-[#0A0A0A] hover:bg-[#38BDF8]/90 px-8 py-3 text-lg"
              disabled={!isValidCid || isWritePending || isConfirming || chainId !== liskSepolia.id}
            >
              {isWritePending || isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isWritePending ? 'Registering...' : 'Confirming...'}
                </>
              ) : chainId !== liskSepolia.id ? (
                'Switch to Lisk Sepolia'
              ) : (
                'Register CID'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
