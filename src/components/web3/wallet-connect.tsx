'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, Home } from 'lucide-react'
import { useState } from 'react'

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="group relative h-9 border border-[#38BDF8] text-[#38BDF8] bg-transparent rounded-lg px-4 py-1.5 text-sm font-medium flex items-center gap-2 hover:bg-[#38BDF8]/10 shadow-[inset_0_-8px_10px_#38BDF81f] transform-gpu transition-all duration-300 ease-in-out hover:shadow-[inset_0_-6px_10px_#38BDF83f] active:shadow-[inset_0_-10px_10px_#38BDF83f]">
            <Wallet className="h-4 w-4" />
            <span>{formatAddress(address)}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          side="bottom"
          sideOffset={8}
          className="w-56 bg-[#0A0A0A] border-[#EDEDED]/10 z-[150]"
        >
          <div className="px-3 py-2">
            <p className="text-sm text-[#EDEDED]/60">Connected to</p>
            <p className="text-sm font-medium">{chain?.name || 'Unknown'}</p>
          </div>
          <DropdownMenuSeparator className="bg-[#EDEDED]/10" />
          <DropdownMenuItem className="text-[#38BDF8] hover:bg-[#38BDF8]/10 cursor-pointer">
            <a href="/dashboard" className="flex items-center w-full">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#EDEDED]/10" />
          <DropdownMenuItem 
            onClick={copyAddress}
            className="text-[#EDEDED] hover:bg-[#EDEDED]/10 cursor-pointer"
          >
            <Copy className="mr-2 h-4 w-4" />
            {copied ? 'Copied!' : 'Copy Address'}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-[#EDEDED] hover:bg-[#EDEDED]/10 cursor-pointer">
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Explorer
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#EDEDED]/10" />
          <DropdownMenuItem 
            onClick={() => disconnect()}
            className="text-red-400 hover:bg-red-400/10 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group relative h-9 bg-[#38BDF8] text-[#0A0A0A] rounded-lg px-4 py-1.5 text-sm font-medium flex items-center gap-2 shadow-[inset_0_-8px_10px_#ffffff1f] transform-gpu transition-all duration-300 ease-in-out hover:shadow-[inset_0_-6px_10px_#ffffff3f] hover:bg-[#38BDF8]/90 active:shadow-[inset_0_-10px_10px_#ffffff3f]">
          <Wallet className="h-4 w-4" />
          <span>Connect Wallet</span>
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        side="bottom"
        sideOffset={8}
        className="w-56 bg-[#0A0A0A] border-[#EDEDED]/10 z-[150]"
      >
        {connectors.map((connector) => (
          <DropdownMenuItem
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="text-[#EDEDED] hover:bg-[#EDEDED]/10 cursor-pointer"
          >
            {connector.name}
            {isPending && ' (connecting...)'}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
