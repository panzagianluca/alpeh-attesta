'use client'

import { Dock, DockIcon } from "@/components/magicui/dock"
import { WalletConnect } from "@/components/web3/wallet-connect"
import { Button } from "@/components/ui/button"
import { Home, BookOpen } from "lucide-react"
import Link from "next/link"

export function FloatingDock() {
  return (
    <div className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 w-[896px]">
      <Dock 
        className="bg-[#0A0A0A]/90 border-[#EDEDED]/20 backdrop-blur-md supports-backdrop-blur:bg-[#0A0A0A]/90 px-6 w-full justify-between"
        disableMagnification={true}
      >
        {/* Attesta Logo */}
        <DockIcon 
          className="bg-transparent hover:bg-[#EDEDED]/10 w-20 h-10 flex items-center justify-center"
          disableMagnification={true}
        >
          <Link href="/" className="flex items-center">
            <img 
              src="/attesta.svg" 
              alt="Attesta" 
              className="h-9 w-auto"
            />
          </Link>
        </DockIcon>

        {/* Navigation Group */}
        <div className="flex gap-12">
          {/* Home (Dashboard) */}
          <DockIcon 
            className="bg-transparent hover:bg-[#EDEDED]/10 w-20 h-10 flex items-center justify-center"
            disableMagnification={true}
          >
            <Link href="/dashboard" className="flex items-center space-x-2 text-[#EDEDED]/70 hover:text-[#38BDF8] transition-colors">
              <Home className="h-5 w-5" />
              <span className="hidden sm:block">Home</span>
            </Link>
          </DockIcon>

          {/* How it Works */}
          <DockIcon 
            className="bg-transparent hover:bg-[#EDEDED]/10 w-20 h-10 flex items-center justify-center"
            disableMagnification={true}
          >
            <Link href="/#how-it-works" className="flex items-center space-x-2 text-[#EDEDED]/70 hover:text-[#38BDF8] transition-colors">
              <BookOpen className="h-5 w-5" />
              <span className="hidden sm:block">How it Works</span>
            </Link>
          </DockIcon>
        </div>

        {/* Wallet Connect */}
        <DockIcon 
          className="bg-transparent w-20 h-10 flex items-center justify-center relative"
          disableMagnification={true}
        >
          <WalletConnect />
        </DockIcon>
      </Dock>
    </div>
  )
}
