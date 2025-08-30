'use client'

import { usePathname } from 'next/navigation'
import { CustomFloatingNavbar } from '@/components/layout/custom-floating-navbar'

export function ConditionalFloatingDock() {
  const pathname = usePathname()
  
  // Show navbar on all pages including homepage
  return <CustomFloatingNavbar />
}
