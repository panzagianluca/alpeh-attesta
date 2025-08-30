'use client'

import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WalletConnect } from '@/components/web3/wallet-connect'
import { CIDSubmissionForm } from '@/components/web3/cid-submission-form'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  Shield, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Users
} from 'lucide-react'

export function DashboardContent() {
  const { address, isConnected } = useAccount()

  // Mock data - replace with real contract data
  const mockData = {
    submittedCIDs: [
      {
        cid: 'QmYourFirstContentHashHere123456789012345678',
        status: 'active',
        uptime: '99.8%',
        daysRemaining: 23,
        guaranteeLevel: 95,
        validators: 12,
      },
      {
        cid: 'QmAnotherContentHashHere987654321098765432',
        status: 'warning',
        uptime: '87.2%',
        daysRemaining: 5,
        guaranteeLevel: 90,
        validators: 8,
      },
    ],
    networkStats: {
      totalCIDs: '2.4M',
      totalValidators: 847,
      averageUptime: '99.2%',
      totalStaked: '127K ETH',
    },
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Attesta Dashboard</h1>
              <p className="text-[#EDEDED]/70">Monitor your IPFS content availability</p>
            </div>
            <WalletConnect />
          </div>

          {/* Connect Wallet Card */}
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10 text-center py-12">
            <CardContent>
              <Shield className="h-16 w-16 text-[#38BDF8] mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-[#EDEDED]/70 mb-6 max-w-md mx-auto">
                Connect your Web3 wallet to submit content for monitoring, 
                view your submissions, and interact with the Attesta network.
              </p>
              <WalletConnect />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-[#EDEDED]/70">
              Welcome back, {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
          <WalletConnect />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#EDEDED]/60 text-sm">Active CIDs</p>
                  <p className="text-2xl font-bold">{mockData.submittedCIDs.length}</p>
                </div>
                <Activity className="h-8 w-8 text-[#38BDF8]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#EDEDED]/60 text-sm">Avg Uptime</p>
                  <p className="text-2xl font-bold text-green-500">99.2%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#EDEDED]/60 text-sm">Total Spent</p>
                  <p className="text-2xl font-bold">0.034 ETH</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#EDEDED]/60 text-sm">Validators</p>
                  <p className="text-2xl font-bold">847</p>
                </div>
                <Users className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-[#0A0A0A] border border-[#EDEDED]/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#38BDF8] data-[state=active]:text-[#0A0A0A]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="submit" className="data-[state=active]:bg-[#38BDF8] data-[state=active]:text-[#0A0A0A]">
              Submit CID
            </TabsTrigger>
            <TabsTrigger value="validator" className="data-[state=active]:bg-[#38BDF8] data-[state=active]:text-[#0A0A0A]">
              Become Validator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Active Submissions */}
            <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
              <CardHeader>
                <CardTitle>Your Monitored Content</CardTitle>
                <CardDescription>
                  Track the availability status of your submitted content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockData.submittedCIDs.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-lg border border-[#EDEDED]/10"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {item.cid.slice(0, 12)}...
                          </Badge>
                          {item.status === 'active' ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Warning
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-[#EDEDED]/60">Uptime: </span>
                            <span className={item.uptime.startsWith('99') ? 'text-green-500' : 'text-orange-500'}>
                              {item.uptime}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#EDEDED]/60">Days Left: </span>
                            <span>{item.daysRemaining}</span>
                          </div>
                          <div>
                            <span className="text-[#EDEDED]/60">Guarantee: </span>
                            <span>{item.guaranteeLevel}%</span>
                          </div>
                          <div>
                            <span className="text-[#EDEDED]/60">Validators: </span>
                            <span>{item.validators}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="border-[#38BDF8] text-[#38BDF8]">
                        Details
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submit">
            <CIDSubmissionForm />
          </TabsContent>

          <TabsContent value="validator">
            <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
              <CardHeader>
                <CardTitle>Become a Validator</CardTitle>
                <CardDescription>
                  Stake tokens to validate content availability and earn rewards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Shield className="h-16 w-16 text-[#38BDF8] mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Validator Features Coming Soon</h3>
                  <p className="text-[#EDEDED]/70 mb-4">
                    Validator staking and management features are currently in development
                  </p>
                  <Button variant="outline" className="border-[#38BDF8] text-[#38BDF8]">
                    Join Waitlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
