import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { HeroCTAButton } from "@/components/ui/hero-cta-button";
import { SparklesText } from "@/components/magicui/sparkles-text";
import { Marquee } from "@/components/magicui/marquee";
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid";
import { AnimatedList } from "@/components/magicui/animated-list";
import { AnimatedCircularProgressBar } from "@/components/magicui/animated-circular-progress-bar";
import { GridPattern } from "@/components/magicui/grid-pattern";
import { GridBeams } from "@/components/magicui/grid-beams";
import { AuroraText } from "@/components/magicui/aurora-text";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  BarChart3, 
  Globe, 
  Lock, 
  Users, 
  Building, 
  Code, 
  Zap,
  ArrowRight,
  Github,
  FileText,
  Cpu,
  Database,
  Cloud,
  Activity
} from "lucide-react";

export function AttestLanding() {
  const credibilityPartners = [
    { name: "IPFS", logo: "/logos/ipfs.png" },
    { name: "Lisk", logo: "/logos/lisk-wordmark-w.png" },
    { name: "Ethereum", logo: "/logos/ethereum-eth.svg" },
    { name: "Vercel", logo: "/logos/vercel-text.png" },
    { name: "Pinata", logo: "/logos/pinata.svg" }
  ];

  const liveMetrics = [
    { id: 1, name: "Total CIDs Monitored", value: "2.4M", change: "+12%" },
    { id: 2, name: "Uptime Guarantee", value: "99.9%", change: "+0.1%" },
    { id: 3, name: "Active Validators", value: "847", change: "+23" },
    { id: 4, name: "Economic Guarantees", value: "$127K", change: "+$5.2K" }
  ];

  const bentoItems = [
    {
      name: "Economic Guarantees",
      description: "Validators stake tokens to guarantee availability",
      className: "col-span-2",
      Icon: Shield,
      href: "#",
      cta: "Learn more",
    },
    {
      name: "Real-time Monitoring",
      description: "Continuous availability checks every 30 seconds",
      className: "col-span-1",
      Icon: Activity,
      href: "#",
      cta: "View docs",
    },
    {
      name: "Global Validator Network",
      description: "Distributed validators across 6 continents",
      className: "col-span-1",
      Icon: Globe,
      href: "#",
      cta: "Explore",
    },
    {
      name: "Open Source",
      description: "MIT licensed, fully auditable codebase",
      className: "col-span-2",
      Icon: Code,
      href: "#",
      cta: "View code",
    },
  ];

  const useCases = [
    {
      icon: <Building className="h-6 w-6" />,
      title: "Enterprise Storage",
      description: "Guarantee availability for critical business data"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "dApp Infrastructure",
      description: "Ensure your app's assets remain accessible"
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: "NFT Platforms",
      description: "Protect digital collectibles with availability guarantees"
    },
    {
      icon: <Cloud className="h-6 w-6" />,
      title: "Content Distribution",
      description: "Reliable delivery for media and documents"
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] text-[#EDEDED] font-['Inter'] overflow-hidden">
      <GridPattern
        width={40}
        height={40}
        x={-1}
        y={-1}
        strokeDasharray={"4 2"}
        className="[mask-image:radial-gradient(800px_circle_at_center,white,transparent)] opacity-20"
      />
      
      {/* Hero Section with Grid Beams - starts from top of page */}
      <GridBeams 
        className="min-h-screen w-full flex items-center justify-center pt-0"
        backgroundColor="#0A0A0A"
        gridColor="rgba(56, 189, 248, 0.1)"
        rayCount={12}
        rayOpacity={0.3}
        rayLength="60vh"
      >
        <section className="relative z-10 px-6 py-16 text-center w-full">
          <div className="max-w-[896px] mx-auto">
            <Badge variant="outline" className="mb-6 border-[#38BDF8]/20 text-[#38BDF8]">
              Built on IPFS • Powered by Economic Incentives
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Guarantee Your
              <span className="block">
                <AuroraText 
                  colors={["#FFFFFF", "#EDEDED", "#38BDF8", "#85cfefff"]}
                  speed={0.5}
                  className="text-5xl md:text-7xl font-bold"
                >
                  Data Availability
                </AuroraText>
              </span>
            </h1>
            
            <p className="text-xl text-[#EDEDED]/70 mb-8 max-w-2xl mx-auto leading-relaxed">
              Attesta provides economic guarantees for IPFS content availability. 
              Validators stake tokens to ensure your data remains accessible when you need it.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <HeroCTAButton />
              <Button variant="outline" className="border-[#EDEDED]/20 text-[#EDEDED] hover:bg-[#EDEDED]/10 px-8 py-3 text-lg">
                View Documentation
              </Button>
            </div>
          </div>
        </section>
      </GridBeams>

      {/* Built With Credibility Strip */}
      <section className="py-12 border-y border-[#EDEDED]/10">
        <div className="max-w-[896px] mx-auto px-6">
          <p className="text-center text-[#EDEDED]/50 mb-8 text-sm uppercase tracking-wider">
            Built with technologies trusted by
          </p>
          <Marquee className="[--duration:30s]" pauseOnHover>
            {credibilityPartners.map((partner, idx) => (
              <div key={idx} className="mx-8 flex items-center h-8">
                <img 
                  src={partner.logo} 
                  alt={partner.name}
                  className="h-6 w-auto opacity-60 hover:opacity-80 transition-opacity"
                />
              </div>
            ))}
          </Marquee>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 px-6">
        <div className="max-w-[896px] mx-auto text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-6">The Problem</h2>
          <p className="text-xl text-[#EDEDED]/70 mb-8 leading-relaxed">
            IPFS content can become unavailable when nodes go offline. There's no economic incentive 
            for nodes to maintain your data, and no guarantee it will be there when you need it.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-red-500 mb-2">~30%</div>
                <p className="text-[#EDEDED]/60">Content becomes unavailable within 6 months</p>
              </CardContent>
            </Card>
            <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-orange-500 mb-2">0</div>
                <p className="text-[#EDEDED]/60">Economic guarantees for availability</p>
              </CardContent>
            </Card>
            <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-yellow-500 mb-2">Manual</div>
                <p className="text-[#EDEDED]/60">Monitoring and recovery processes</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="py-20 px-6 bg-[#0A0A0A]/50">
        <div className="max-w-[896px] mx-auto">
          <div className="text-center mb-12">
            <SparklesText 
              className="text-4xl font-bold mb-6"
              colors={{ first: "#38BDF8", second: "#FFFFFF" }}
              sparklesCount={4}
            >
              The Solution
            </SparklesText>
            <p className="text-xl text-[#EDEDED]/70 max-w-3xl mx-auto leading-relaxed">
              Attesta creates economic incentives for IPFS availability through a validator network 
              that stakes tokens to guarantee your content remains accessible.
            </p>
          </div>
          
          <BentoGrid className="max-w-[896px] mx-auto">
            {bentoItems.map((item, i) => (
              <BentoCard
                key={i}
                name={item.name}
                description={item.description}
                className={item.className}
                Icon={item.Icon}
                href={item.href}
                cta={item.cta}
              />
            ))}
          </BentoGrid>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-[896px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">How It Works</h2>
            <p className="text-xl text-[#EDEDED]/70 max-w-3xl mx-auto">
              A simple three-step process to guarantee your IPFS content availability
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#38BDF8] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-[#0A0A0A]">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Submit Your CID</h3>
              <p className="text-[#EDEDED]/70">
                Provide your IPFS Content Identifier and set your availability requirements
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-[#38BDF8] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-[#0A0A0A]">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Validators Stake</h3>
              <p className="text-[#EDEDED]/70">
                Validators stake tokens and commit to maintaining your content availability
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-[#38BDF8] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-[#0A0A0A]">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Guaranteed Access</h3>
              <p className="text-[#EDEDED]/70">
                Your content is monitored 24/7 with economic guarantees for availability
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-20 px-6">
        <div className="max-w-[896px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Use Cases</h2>
            <p className="text-xl text-[#EDEDED]/70 max-w-3xl mx-auto">
              Protect your critical data across various applications
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, idx) => (
              <Card key={idx} className="bg-[#0A0A0A] border-[#EDEDED]/10 hover:border-[#38BDF8]/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-[#38BDF8]/10 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-[#38BDF8]">{useCase.icon}</div>
                  </div>
                  <CardTitle className="text-lg">{useCase.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-[#EDEDED]/60">
                    {useCase.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations & Security */}
      <section className="py-20 px-6 bg-[#0A0A0A]/50">
        <div className="max-w-[896px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Lock className="h-12 w-12 text-[#38BDF8] mb-6" />
              <h2 className="text-4xl font-bold mb-6">Enterprise Security</h2>
              <p className="text-xl text-[#EDEDED]/70 mb-8 leading-relaxed">
                Built with security-first principles. Smart contracts are audited, 
                validator networks are decentralized, and all operations are transparent on-chain.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-[#38BDF8]" />
                  <span>Smart contract audited by top security firms</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-[#38BDF8]" />
                  <span>Decentralized validator network</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-[#38BDF8]" />
                  <span>Transparent on-chain operations</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-[#38BDF8]" />
                  <span>Economic slashing for bad actors</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Cpu className="h-5 w-5" />
                    <span>API Integration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#EDEDED]/60 mb-4">
                    Simple REST API and SDKs for popular languages
                  </p>
                  <div className="bg-[#0A0A0A] border border-[#EDEDED]/10 rounded p-3 text-sm font-mono">
                    {`curl -X POST /api/v1/monitor \\`}<br />
                    {`-d '{"cid": "QmHash...", "duration": "30d"}'`}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Real-time Monitoring</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#EDEDED]/60">
                    WebSocket connections for live status updates and alerts
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source & Docs */}
      <section id="docs" className="py-20 px-6">
        <div className="max-w-[896px] mx-auto text-center">
          <Github className="h-12 w-12 text-[#38BDF8] mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-6">Open Source & Community</h2>
          <p className="text-xl text-[#EDEDED]/70 mb-8 leading-relaxed">
            Attesta is built in the open. Contribute to the codebase, review smart contracts, 
            or join our community of validators and developers.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
              <CardContent className="p-6 text-center">
                <Github className="h-8 w-8 text-[#38BDF8] mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Source Code</h3>
                <p className="text-[#EDEDED]/60 mb-4">MIT licensed, fully auditable</p>
                <Button variant="outline" className="border-[#38BDF8] text-[#38BDF8]">
                  View on GitHub
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-[#0A0A0A] border-[#EDEDED]/10">
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 text-[#38BDF8] mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Documentation</h3>
                <p className="text-[#EDEDED]/60 mb-4">Comprehensive guides and API docs</p>
                <Button variant="outline" className="border-[#38BDF8] text-[#38BDF8]">
                  Read the Docs
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 bg-[#0A0A0A]/50">
        <div className="max-w-[896px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Frequently Asked Questions</h2>
            <p className="text-xl text-[#EDEDED]/70">
              Everything you need to know about Attesta
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border border-[#EDEDED]/10 bg-[#0A0A0A] rounded-lg px-6">
              <AccordionTrigger className="text-left">
                How does Attesta guarantee availability?
              </AccordionTrigger>
              <AccordionContent className="text-[#EDEDED]/70">
                Validators stake tokens and are economically incentivized to maintain your content. 
                If they fail to provide availability, their stake is slashed and used to compensate you.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2" className="border border-[#EDEDED]/10 bg-[#0A0A0A] rounded-lg px-6">
              <AccordionTrigger className="text-left">
                What happens if a validator goes offline?
              </AccordionTrigger>
              <AccordionContent className="text-[#EDEDED]/70">
                Our network continuously monitors validator health. If a validator goes offline, 
                backup validators automatically take over, and the offline validator's stake is partially slashed.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3" className="border border-[#EDEDED]/10 bg-[#0A0A0A] rounded-lg px-6">
              <AccordionTrigger className="text-left">
                How much does it cost to guarantee availability?
              </AccordionTrigger>
              <AccordionContent className="text-[#EDEDED]/70">
                Pricing depends on the duration and level of guarantee you need. 
                Basic monitoring starts at $0.10 per GB per month, with higher guarantees available for critical data.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4" className="border border-[#EDEDED]/10 bg-[#0A0A0A] rounded-lg px-6">
              <AccordionTrigger className="text-left">
                Can I become a validator?
              </AccordionTrigger>
              <AccordionContent className="text-[#EDEDED]/70">
                Yes! Validators earn rewards for maintaining content availability. 
                You'll need to stake tokens and meet minimum hardware requirements. 
                Check our validator documentation for details.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5" className="border border-[#EDEDED]/10 bg-[#0A0A0A] rounded-lg px-6">
              <AccordionTrigger className="text-left">
                Is my data private?
              </AccordionTrigger>
              <AccordionContent className="text-[#EDEDED]/70">
                Attesta only monitors availability, not content. Validators check that your CID is accessible 
                but cannot decrypt or access the actual data if it's encrypted.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6">
        <div className="max-w-[896px] mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Guarantee Your Data?</h2>
          <p className="text-xl text-[#EDEDED]/70 mb-8 leading-relaxed">
            Join thousands of developers and organizations using Attesta to ensure 
            their IPFS content remains available when it matters most.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <a href="/dashboard">
              <ShimmerButton className="bg-[#38BDF8] text-[#0A0A0A] px-8 py-4 text-lg font-medium">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </ShimmerButton>
            </a>
            <Button variant="outline" className="border-[#EDEDED]/20 text-[#EDEDED] hover:bg-[#EDEDED]/10 px-8 py-4 text-lg">
              Talk to Sales
            </Button>
          </div>
          
          <p className="text-[#EDEDED]/50 text-sm">
            Free 14-day trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>
      
      <Separator className="bg-[#EDEDED]/10" />
      
      {/* Footer */}
      <footer className="py-12 px-6">
        <div className="max-w-[896px] mx-auto text-center">
          <p className="text-[#EDEDED]/50 mb-4">
            © 2024 Attesta. Built with ❤️ for the decentralized web.
          </p>
          <div className="flex justify-center space-x-6 text-[#EDEDED]/50">
            <a href="#" className="hover:text-[#38BDF8] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#38BDF8] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#38BDF8] transition-colors">Support</a>
            <a href="#" className="hover:text-[#38BDF8] transition-colors">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
