'use client'

import { useAccount, useSwitchChain } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { liskSepolia } from '@/lib/wagmi'

export function NetworkSwitcher() {
  const { chain, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  // Don't show if not connected
  if (!isConnected) {
    return null
  }

  // Don't show if already on correct network
  if (chain?.id === liskSepolia.id) {
    return null
  }

  const handleSwitchNetwork = () => {
    switchChain({ chainId: liskSepolia.id })
  }

  return (
    <Alert className="border-yellow-500/20 bg-yellow-500/10">
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <p className="font-medium text-yellow-500">Wrong Network</p>
          <p className="text-sm text-[#EDEDED]/70 mt-1">
            Please switch to Lisk Sepolia Testnet to register CIDs.
          </p>
          <p className="text-xs text-[#EDEDED]/50 mt-1">
            Current: {chain?.id} • Required: {liskSepolia.id} ({liskSepolia.name})
          </p>
        </div>
        <Button
          onClick={handleSwitchNetwork}
          disabled={isPending}
          size="sm"
          className="ml-4 bg-[#38BDF8] text-[#0A0A0A] hover:bg-[#38BDF8]/90"
        >
          {isPending ? (
            'Switching...'
          ) : (
            <>
              Switch Network
              <ArrowRight className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
