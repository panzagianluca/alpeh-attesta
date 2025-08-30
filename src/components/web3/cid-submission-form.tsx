'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Loader2, Upload } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Mock ABI - replace with actual contract ABI
const ATTESTA_ABI = [
  {
    name: 'submitCID',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'cid', type: 'string' },
      { name: 'duration', type: 'uint256' },
      { name: 'guaranteeLevel', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

export function CIDSubmissionForm() {
  const { address, isConnected } = useAccount()
  const [cid, setCid] = useState('')
  const [duration, setDuration] = useState('30') // days
  const [guaranteeLevel, setGuaranteeLevel] = useState([90]) // percentage
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

  // Validate CID format
  const validateCID = (value: string) => {
    // Basic CID validation - starts with Qm and is ~46 characters
    const cidRegex = /^Qm[a-zA-Z0-9]{44}$/
    setIsValidCid(cidRegex.test(value))
  }

  const handleCidChange = (value: string) => {
    setCid(value)
    validateCID(value)
  }

  const calculateCost = () => {
    const baseCost = 0.001 // ETH
    const durationMultiplier = parseInt(duration) / 30
    const guaranteeMultiplier = guaranteeLevel[0] / 100
    return baseCost * durationMultiplier * guaranteeMultiplier
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !isValidCid) return

    try {
      // In a real implementation, you'd get the contract address from your config
      const contractAddress = '0x...' // Replace with actual contract address
      
      writeContract({
        address: contractAddress as `0x${string}`,
        abi: ATTESTA_ABI,
        functionName: 'submitCID',
        args: [cid, BigInt(parseInt(duration) * 24 * 60 * 60), BigInt(guaranteeLevel[0])],
        value: parseEther(calculateCost().toString()),
      })
    } catch (error) {
      console.error('Failed to submit CID:', error)
    }
  }

  const getGuaranteeDescription = (level: number) => {
    if (level >= 95) return 'Enterprise - Maximum availability guarantee'
    if (level >= 90) return 'Professional - High availability guarantee'
    if (level >= 80) return 'Standard - Good availability guarantee'
    return 'Basic - Minimum availability guarantee'
  }

  if (!isConnected) {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-[#0A0A0A] border-[#EDEDED]/10">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-[#EDEDED]/70 mb-4">
            Please connect your wallet to submit content for monitoring
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isConfirmed) {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-[#0A0A0A] border-[#EDEDED]/10">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-[#38BDF8] mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">CID Submitted Successfully!</h3>
          <p className="text-[#EDEDED]/70 mb-4">
            Your content is now being monitored by our validator network
          </p>
          <Badge variant="outline" className="border-[#38BDF8]/20 text-[#38BDF8]">
            CID: {cid.slice(0, 12)}...
          </Badge>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-[#0A0A0A] border-[#EDEDED]/10">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Submit Content for Monitoring</span>
        </CardTitle>
        <CardDescription>
          Add your IPFS content to our monitoring network with economic guarantees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CID Input */}
          <div className="space-y-2">
            <Label htmlFor="cid">IPFS Content Identifier (CID)</Label>
            <Input
              id="cid"
              placeholder="QmYourContentHashHere..."
              value={cid}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCidChange(e.target.value)}
              className={`bg-[#0A0A0A] border-[#EDEDED]/20 ${
                cid && (isValidCid ? 'border-green-500' : 'border-red-500')
              }`}
            />
            {cid && !isValidCid && (
              <p className="text-sm text-red-400">
                Please enter a valid IPFS CID (starts with Qm)
              </p>
            )}
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <Label htmlFor="duration">Monitoring Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-[#0A0A0A] border-[#EDEDED]/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0A0A] border-[#EDEDED]/10">
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Guarantee Level */}
          <div className="space-y-4">
            <Label>Availability Guarantee: {guaranteeLevel[0]}%</Label>
            <div className="px-2">
              <Slider
                value={guaranteeLevel}
                onValueChange={setGuaranteeLevel}
                max={99}
                min={50}
                step={5}
                className="w-full"
              />
            </div>
            <p className="text-sm text-[#EDEDED]/70">
              {getGuaranteeDescription(guaranteeLevel[0])}
            </p>
          </div>

          {/* Cost Display */}
          <div className="p-4 bg-[#38BDF8]/10 rounded-lg border border-[#38BDF8]/20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#EDEDED]/70">Estimated Cost:</span>
              <span className="font-semibold text-[#38BDF8]">
                {calculateCost().toFixed(4)} ETH
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-[#EDEDED]/70">
              <span>Duration: {duration} days</span>
              <span>Guarantee: {guaranteeLevel[0]}%</span>
            </div>
          </div>

          {/* Error Display */}
          {writeError && (
            <Alert className="border-red-500/20 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {writeError.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-[#38BDF8] text-[#0A0A0A] hover:bg-[#38BDF8]/90"
            disabled={!isValidCid || isWritePending || isConfirming}
          >
            {isWritePending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isWritePending ? 'Submitting...' : 'Confirming...'}
              </>
            ) : (
              `Submit CID for ${calculateCost().toFixed(4)} ETH`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
