'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search, 
  Copy, 
  ExternalLink, 
  Eye, 
  DollarSign,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { useRegisteredCIDs } from '@/services/cid-service'
import type { CIDDashboardItem } from '@/types/ui-data-contract'
import { formatEther } from 'viem'
import { NetworkSwitcher } from '@/components/web3/network-switcher'

export function DashboardPage() {
  const { isConnected } = useAccount()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [cids, setCids] = useState<CIDDashboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { fetchCIDs } = useRegisteredCIDs()

  // Load CIDs from contract
  const loadCIDs = async () => {
    try {
      setLoading(true)
      setError(null)
      const contractCIDs = await fetchCIDs()
      setCids(contractCIDs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CIDs')
      setCids([])
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (isConnected) {
      loadCIDs()
    }
  }, [isConnected])

  const filteredCIDs = cids.filter(cid => {
    const matchesSearch = cid.cid.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || cid.status === statusFilter
    return matchesSearch && matchesStatus
  })

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const openInGateway = (cid: string) => {
    window.open(`https://ipfs.io/ipfs/${cid}`, '_blank')
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] relative pt-24">
        {/* Connect Wallet State */}
        <div className="flex items-center justify-center min-h-screen p-6">
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10 max-w-md w-full text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-[#38BDF8]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <DollarSign className="h-8 w-8 text-[#38BDF8]" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-[#EDEDED]/70 mb-6">
                Connect your wallet to view your CIDs, register new content, and manage your stakes.
              </p>
              <div className="space-y-3">
                <p className="text-sm text-[#EDEDED]/50">
                  ⌘K to open command palette • / to search
                </p>
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
      <div className="sticky top-24 z-40 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#EDEDED]/10">
        <div className="max-w-[896px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-[#EDEDED]/60 text-sm">
                Monitor your IPFS content availability and stakes
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadCIDs}
                disabled={loading}
                className="border-[#EDEDED]/20 text-[#EDEDED]/70 hover:bg-[#EDEDED]/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link href="/register">
                <Button className="bg-[#38BDF8] text-[#0A0A0A] hover:bg-[#38BDF8]/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Register CID
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-[896px] mx-auto px-6 py-6">
        {/* Network Switcher - Show if wrong network */}
        <div className="mb-6">
          <NetworkSwitcher />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#EDEDED]/40" />
            <Input
              placeholder="Search CIDs... (press / to focus)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#0A0A0A] border-[#EDEDED]/20 focus:border-[#38BDF8] focus:ring-[#38BDF8]/20"
            />
          </div>
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-[#0A0A0A] border-[#EDEDED]/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-[#EDEDED]/10">
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="OK">OK</SelectItem>
              <SelectItem value="DEGRADED">Degraded</SelectItem>
              <SelectItem value="BREACH">Breach</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-400">Failed to load CIDs: {error}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={loadCIDs}
                  className="text-red-400 hover:bg-red-500/10"
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CIDs Table */}
        {loading ? (
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-[#38BDF8]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="h-8 w-8 text-[#38BDF8] animate-spin" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Loading CIDs...</h3>
              <p className="text-[#EDEDED]/60">
                Fetching your registered content from the blockchain
              </p>
            </CardContent>
          </Card>
        ) : filteredCIDs.length === 0 ? (
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-[#38BDF8]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus className="h-8 w-8 text-[#38BDF8]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No CIDs Found</h3>
              <p className="text-[#EDEDED]/60 mb-6">
                {searchTerm || statusFilter !== 'All' 
                  ? 'No CIDs match your search criteria' 
                  : 'Register your first CID to start monitoring'}
              </p>
              <Link href="/register">
                <Button className="bg-[#38BDF8] text-[#0A0A0A] hover:bg-[#38BDF8]/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Register First CID
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Your Monitored Content</span>
                <Badge variant="outline" className="border-[#38BDF8]/20 text-[#38BDF8]">
                  {filteredCIDs.length} CID{filteredCIDs.length !== 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#EDEDED]/10">
                    <TableHead className="text-[#EDEDED]/60">CID</TableHead>
                    <TableHead className="text-[#EDEDED]/60">Status</TableHead>
                    <TableHead className="text-[#EDEDED]/60">Last Pack</TableHead>
                    <TableHead className="text-[#EDEDED]/60">Stake Total</TableHead>
                    <TableHead className="text-[#EDEDED]/60">SLO</TableHead>
                    <TableHead className="text-[#EDEDED]/60">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCIDs.map((cidData, idx) => (
                    <TableRow key={idx} className="border-[#EDEDED]/10 hover:bg-[#EDEDED]/5">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="text-sm bg-[#EDEDED]/10 px-2 py-1 rounded">
                            {cidData.cid.slice(0, 12)}...
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(cidData.cid)}
                            className="h-6 w-6 p-0 hover:bg-[#EDEDED]/10"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInGateway(cidData.cid)}
                            className="h-6 w-6 p-0 hover:bg-[#EDEDED]/10"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(cidData.status)}
                      </TableCell>
                      <TableCell>
                        <a 
                          href={`https://ipfs.io/ipfs/${cidData.lastPackCID}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#38BDF8] hover:underline text-sm"
                        >
                          {cidData.lastPackCID.slice(0, 12)}...
                        </a>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {cidData.totalStake > 0 ? `${formatEther(cidData.totalStake)} ETH` : '0 ETH'}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-[#EDEDED]/70">
                          {cidData.slo.k}/{cidData.slo.n} • {cidData.slo.timeoutMs}ms • {cidData.slo.windowMin}m
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Link href={`/cid/${cidData.cid}`}>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-[#38BDF8] text-[#38BDF8] hover:bg-[#38BDF8]/10"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-[#EDEDED]/20 text-[#EDEDED]/70 hover:bg-[#EDEDED]/10"
                          >
                            <DollarSign className="w-3 h-3 mr-1" />
                            Bond
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
