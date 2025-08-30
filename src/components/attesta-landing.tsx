"use client";

import React, { useRef } from "react";
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
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { ScratchToReveal } from "@/components/magicui/scratch-to-reveal";
import { MagicCard } from "@/components/magicui/magic-card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  BarChart3, 
  Globe, 
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

function AnimatedBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const publisherRef = useRef<HTMLDivElement>(null);
  const attestaRef = useRef<HTMLDivElement>(null);
  const validatorsRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      className="relative flex h-80 w-full items-center justify-center overflow-hidden bg-[#0A0A0A]" 
      ref={containerRef}
    >
      {/* Publisher - Left */}
      <div className="flex flex-col items-center">
        <div className="text-lg font-semibold text-[#EDEDED] mb-2">Publisher</div>
        <div 
          className="flex size-16 items-center justify-center rounded-full border-2 border-[#38BDF8] bg-[#0A0A0A] mb-2" 
          ref={publisherRef}
        >
          <Building className="h-6 w-6 text-[#38BDF8]" />
        </div>
        <div className="text-xs text-[#EDEDED]/60 text-center">Submits CID<br/>+ Stakes</div>
      </div>
      
      {/* Attesta Core - Center */}
      <div className="flex flex-col items-center mx-16">
        <div className="text-lg font-semibold text-[#38BDF8] mb-2">Attesta</div>
        <div 
          className="flex size-20 items-center justify-center rounded-full border-2 border-[#38BDF8] bg-[#38BDF8]/10 mb-2" 
          ref={attestaRef}
        >
          <img src="/FaviconWhite.svg" alt="Attesta" className="h-8 w-8" />
        </div>
        <div className="text-xs text-[#EDEDED]/60 text-center">Monitors &<br/>Coordinates</div>
      </div>
      
      {/* Validators - Right */}
      <div className="flex flex-col items-center">
        <div className="text-lg font-semibold text-[#EDEDED] mb-2">Validators</div>
        <div 
          className="flex size-16 items-center justify-center rounded-full border-2 border-[#38BDF8] bg-[#0A0A0A] mb-2" 
          ref={validatorsRef}
        >
          <Users className="h-6 w-6 text-[#38BDF8]" />
        </div>
        <div className="text-xs text-[#EDEDED]/60 text-center">Stake &<br/>Verify</div>
      </div>

      {/* Simple Bidirectional Beam */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={publisherRef}
        toRef={attestaRef}
        duration={2}
        curvature={0}
        gradientStartColor="#38BDF8"
        gradientStopColor="#38BDF8"
      />
      
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={attestaRef}
        toRef={validatorsRef}
        duration={2}
        delay={1}
        curvature={0}
        gradientStartColor="#38BDF8"
        gradientStopColor="#38BDF8"
      />
    </div>
  );
}

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
      description: "Validators stake tokens and face automatic slashing penalties when your content goes offline, creating real economic incentives for 99%+ uptime",
      className: "col-span-2",
      Icon: Shield,
      href: "#",
      cta: "Learn more",
    },
    {
      name: "Real-time Monitoring",
      description: "Multi-gateway probes every 60 seconds across 5 IPFS gateways with <60s breach detection and cryptographically signed evidence packs",
      className: "col-span-1",
      Icon: Activity,
      href: "#",
      cta: "View docs",
    },
    {
      name: "Global Validator Network",
      description: "Decentralized validator network with K-of-N availability thresholds, ensuring no single point of failure for your critical data",
      className: "col-span-1",
      Icon: Globe,
      href: "#",
      cta: "Explore",
    },
    {
      name: "Open Source",
      description: "Open source with smart contracts deployed on Lisk, evidence packs stored on IPFS, and full transaction transparency on-chain",
      className: "col-span-2",
      Icon: Code,
      href: "https://github.com/panzagianluca/alpeh-attesta",
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
      title: "NFT\nPlatforms",
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
          <h2 className="text-4xl font-bold mb-8">The Problem</h2>
          
          {/* Scratch to Reveal */}
          <div className="flex justify-center mb-8">
            <ScratchToReveal
              width={400}
              height={200}
              minScratchPercentage={30}
              className="border border-[#EDEDED]/20 rounded-lg overflow-hidden"
              gradientColors={["#38BDF8", "#85cfefff", "#FFFFFF"]}
            >
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#38BDF8]/10 to-[#0A0A0A] rounded-lg">
                <div className="text-center p-6">
                  <p className="text-xl font-semibold text-[#EDEDED] mb-2">
                    Is your data still there?
                  </p>
                  <p className="text-sm text-[#EDEDED]/70">
                    You don't know...
                  </p>
                </div>
              </div>
            </ScratchToReveal>
          </div>
          
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
                enableHoverEffects={item.name === "Open Source"}
              />
            ))}
          </BentoGrid>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-[896px] mx-auto">
          {/* Title & Subtitle */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-6">How It Works</h2>
            <p className="text-xl text-[#EDEDED]/70 max-w-3xl mx-auto">
              Validators stake tokens to guarantee IPFS content availability through economic incentives
            </p>
          </div>
          
          {/* Animated Beam Visualization */}
          <div className="relative mb-16">
            <AnimatedBeamDemo />
          </div>
          
          {/* Process Steps */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#38BDF8] rounded-full flex items-center justify-center mx-auto mb-6">
                <Building className="h-8 w-8 text-[#0A0A0A]" />
              </div>
              <h3 className="text-xl font-semibold mb-4">1. Submit CID</h3>
              <p className="text-[#EDEDED]/70">
                Publishers register their IPFS content with availability requirements and stake
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-[#38BDF8] rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-[#0A0A0A]" />
              </div>
              <h3 className="text-xl font-semibold mb-4">2. Attesta Monitors</h3>
              <p className="text-[#EDEDED]/70">
                Our network continuously probes IPFS gateways to verify content availability
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-[#38BDF8] rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-[#0A0A0A]" />
              </div>
              <h3 className="text-xl font-semibold mb-4">3. Validators Stake</h3>
              <p className="text-[#EDEDED]/70">
                Validators bond tokens to content, earning rewards for successful monitoring
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-[#38BDF8] rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-[#0A0A0A]" />
              </div>
              <h3 className="text-xl font-semibold mb-4">4. Guarantee</h3>
              <p className="text-[#EDEDED]/70">
                If content goes offline, validators get slashed and publishers receive compensation
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
              <MagicCard 
                key={idx} 
                className="bg-[#0A0A0A] border-[#EDEDED]/10 p-6 rounded-lg"
                gradientFrom="#38BDF8"
                gradientTo="#9333EA"
                gradientColor="#38BDF8"
                gradientOpacity={0.4}
              >
                <div className="w-12 h-12 bg-[#38BDF8]/10 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-[#38BDF8]">{useCase.icon}</div>
                </div>
                <h3 className="text-lg font-semibold mb-2 whitespace-pre-line">{useCase.title}</h3>
                <p className="text-[#EDEDED]/60">
                  {useCase.description}
                </p>
              </MagicCard>
            ))}
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
          
          <div className="flex justify-center items-center mb-8">
            <HeroCTAButton />
          </div>
        </div>
      </section>
      
      <Separator className="bg-[#EDEDED]/10" />
      
      {/* Footer */}
      <footer className="py-12 px-6">
        <div className="max-w-[896px] mx-auto text-center">
          <p className="text-[#EDEDED]/50 mb-2">
            Built for Aleph Hackathon - made by Gianluca Panza
          </p>
          <div className="flex justify-center space-x-6 text-[#EDEDED]/50 mb-4">
            <a 
              href="https://github.com/panzagianluca" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-[#38BDF8] transition-colors"
            >
              GitHub
            </a>
            <a 
              href="https://x.com/gianlucapanz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-[#38BDF8] transition-colors"
            >
              Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
