'use client'

import { WalletConnect } from "@/components/web3/wallet-connect"
import { Home, BookOpen } from "lucide-react"
import Link from "next/link"

export function CustomFloatingNavbar() {
  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] w-[896px]">
      <div className="bg-transparent border border-[#EDEDED]/10 backdrop-blur-md rounded-2xl px-6 py-3 flex items-center justify-between gap-8 shadow-lg w-full">
        {/* Attesta Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <img 
              src="/attesta.svg" 
              alt="Attesta" 
              style={{ 
                height: '24px',
                width: 'auto',
                minHeight: '24px',
                maxHeight: '24px',
                flexShrink: 0
              }}
            />
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#EDEDED]/70 hover:text-[#38BDF8] hover:bg-[#EDEDED]/10 transition-all duration-200"
          >
            <Home className="h-4 w-4" />
            <span className="text-sm font-medium">Home</span>
          </Link>

          <Link 
            href="/#how-it-works" 
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#EDEDED]/70 hover:text-[#38BDF8] hover:bg-[#EDEDED]/10 transition-all duration-200"
          >
            <BookOpen className="h-4 w-4" />
            <span className="text-sm font-medium">How it Works</span>
          </Link>
        </div>

        {/* Wallet Connect */}
        <div className="flex items-center">
          <WalletConnect />
        </div>
      </div>
    </div>
  )
}
