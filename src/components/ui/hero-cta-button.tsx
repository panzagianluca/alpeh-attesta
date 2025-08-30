'use client'

import { useAccount } from 'wagmi'
import { RainbowButton } from "@/components/magicui/rainbow-button"
import { ArrowRight } from "lucide-react"

export function HeroCTAButton() {
  const { isConnected } = useAccount()

  return (
    <a href={isConnected ? "/dashboard" : "/dashboard"}>
      <RainbowButton className="h-9 px-8 py-3 text-lg font-medium">
        {isConnected ? "Dashboard" : "Connect Wallet"}
        <ArrowRight className="ml-2 h-5 w-5" />
      </RainbowButton>
    </a>
  )
}
