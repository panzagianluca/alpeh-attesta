# Attesta 🏛️

> **SLO-backed IPFS availability with economic guarantees for Web3 data integrity**
  
**Built for Aleph Hackathon 2025 | Track: Public Good Infrastructure**

Attesta revolutionizes IPFS reliability by introducing verifiable Service Level Objectives (SLOs) with economic guarantees. Publishers can register critical CIDs with uptime requirements, while validators earn rewards for monitoring or face slashing for breaches—creating the first economically-backed IPFS availability layer.

## 🎯 **Hackathon Submission - Complete & Live!** ✅

**✨ Full production system deployed with real economic incentives and automated monitoring**

### 🚀 **Live Demo Links:**
- **🌐 Live Application:** [https://alpeh-gianluca.vercel.app/](https://alpeh-gianluca.vercel.app/)
- **📋 Smart Contract:** [`0x4fCD15b71119B2F1c18944F9D1e6Ac8D5eE0024a`](https://sepolia-blockscout.lisk.com/address/0x4fCD15b71119B2F1c18944F9D1e6Ac8D5eE0024a) (Lisk Sepolia)
- **📺 Demo Video:** [3-minute pitch video] *(link will be added before submission)*
- **💻 Repository:** [https://github.com/panzagianluca/alpeh-attesta](https://github.com/panzagianluca/alpeh-attesta)

### 🏆 **What We Built:**
- **✅ EvidenceRegistry Smart Contract:** Full SLO tracking with economic slashing on Lisk
- **✅ Real-time IPFS Monitoring:** 5 professional gateways (IPFS.io, Cloudflare, Web3.Storage, Pinata, Protocol Labs)
- **✅ Economic Incentives:** Publishers stake ETH, validators earn rewards or get slashed
- **✅ Evidence Packs:** Cryptographically signed availability proofs stored on IPFS
- **✅ Live Dashboard:** Real CID registration, status monitoring, and evidence viewing
- **✅ Automated Detection:** Sub-60s breach detection with on-chain penalty execution**SLO-backed IPFS availability with economic guarantees**

Attesta ensures verifiable availability of critical IPFS content through Service Level Objectives (SLOs), restaking economics, and automated slashing for breaches.

## 🎯 **Project Complete - Hackathon Ready!** ✅

**Live production system deployed with real CID monitoring and manual probe functionality**

### � **Final Demo Results:**
- **✅ Smart Contract Deployed:** [`0x4fCD15b71119B2F1c18944F9D1e6Ac8D5eE0024a`](https://sepolia-blockscout.lisk.com/address/0x4fCD15b71119B2F1c18944F9D1e6Ac8D5eE0024a)
- **✅ Live Frontend:** [https://alpeh-gianluca.vercel.app/](https://alpeh-gianluca.vercel.app/)
- **✅ Real CID Monitoring:** 10+ registered CIDs with live status tracking
- **✅ Manual Probe System:** Instant verification across 5 global regions
- **✅ Dashboard Integration:** Real-time status updates and evidence display
- **✅ End-to-End Workflow:** Registration → Monitoring → Evidence → Status Display

## ️ **Architecture**

```
[Publisher] → Register CID + SLO → [Lisk EvidenceRegistry]
                                        ↓
[Vercel Cron] → Multi-gateway Probes → Evidence Packs (IPFS)
                                        ↓
[WATCHER] → Detect Breach → reportPack() → [Slashing]
```

### **Core Components:**
- **EvidenceRegistry Contract** (Lisk): On-chain SLO tracking and slashing
- **Evidence Pack Builder**: Cryptographically signed availability proofs
- **Probe Orchestrator**: Multi-gateway IPFS availability monitoring
- **Slashing Engine**: Automated economic penalties for SLO breaches

## 🚀 **Quick Start**

### **Try the Live Demo**
1. Visit [https://alpeh-gianluca.vercel.app/](https://alpeh-gianluca.vercel.app/)
2. Connect your wallet (Lisk Sepolia testnet)
3. Register a CID with SLO requirements
4. Monitor real-time availability status
5. View evidence packs and probe results

### **Local Development**
```bash
# Clone and install
git clone https://github.com/panzagianluca/alpeh-attesta.git
cd attesta
npm install

# Environment setup
cp .env.example .env.local
# Add your RPC URLs and private keys

# Start development server
npm run dev
```

### **Smart Contract Interaction**
```solidity
// Register CID with SLO
function registerCID(
    bytes32 cidDigest,
    SLO memory slo,
    bool slashingEnabled
) external payable

// Report availability breach
function reportPack(bytes32 cidDigest, bytes32 packCIDDigest) external
```

## 📱 **Features Delivered**

### ✅ **For Publishers:**
- **CID Registration**: Register any IPFS content with custom SLO requirements
- **Economic Guarantees**: Stake ETH to ensure your content stays available
- **Real-time Monitoring**: Live dashboard showing availability across 5 gateways
- **Automatic Compensation**: Get paid when your SLO is breached

### ✅ **For Validators:**
- **Monitoring Rewards**: Earn fees for providing availability monitoring
- **Slashing Penalties**: Economic incentives to provide honest monitoring
- **Evidence Generation**: Create cryptographically signed availability proofs

### ✅ **For the Ecosystem:**
- **Reliability Layer**: First economic guarantees for IPFS content availability
- **Public Infrastructure**: Open protocol anyone can build on
- **Gateway Diversity**: Reduces centralization risks in IPFS access

## 📁 **Project Structure**

```
attesta/
├── README.md                 # This hackathon submission
├── contracts/                # Smart contracts (Solidity/Foundry)
│   ├── src/EvidenceRegistry.sol  # Main SLO tracking contract
│   └── script/Deploy.s.sol   # Deployment scripts
├── src/                      # Next.js application
│   ├── app/                  # App Router pages & API routes
│   ├── components/           # React components (Dashboard, CID details)
│   └── lib/                  # Core libraries (probe executor, evidence)
├── .env.local               # Environment configuration
└── vercel.json              # Deployment configuration
```

## 🧪 **Smart Contract Details**

**Deployed Contract:** `0x4fCD15b71119B2F1c18944F9D1e6Ac8D5eE0024a` on Lisk Sepolia

**Key Functions:**
- `registerCID()`: Publishers register content with SLO requirements
- `reportPack()`: Watchers report availability breaches
- `bondStake()`: Validators bond ETH to participate in monitoring
- Automatic slashing when SLOs are breached

**Built with:** Solidity, Foundry, OpenZeppelin, deployed via Foundry scripts

---

**🏆 Submission for Aleph Hackathon 2025 | Public Good Infrastructure Track** 

*Built during January 30-February 2, 2025 | All code written during hackathon period*

## 🏆 **Bounty Alignment**

### 🎯 **Primary Track: Public Good Infrastructure**
Attesta builds critical infrastructure for the decentralized web—ensuring IPFS data availability with economic guarantees. This creates a public utility that benefits the entire ecosystem by preventing content rot and ensuring access to important data.

### 💰 **Sponsor Bounties:**
- **🔗 Lisk Bounty:** Smart contract deployed on Lisk Sepolia with optimized gas usage for evidence anchoring and state management
- **📦 Protocol Labs/IPFS:** Deep IPFS integration with multi-gateway monitoring, evidence pack generation, and availability probing
- **⚡ Vercel:** Serverless architecture with cron-based monitoring, edge computing for global probe execution
- **💾 Filecoin (if applicable):** Evidence pack storage ensuring long-term availability of monitoring proofs

## 🎬 **3-Minute Demo Script**

### 🪝 **Hook (30s)**
"When Web3 content disappears, entire dApps break. DAOs lose governance data. NFTs become worthless. Attesta guarantees your IPFS content stays alive—or automatically compensates you when it doesn't."

### 🛤️ **User Journey (90s)**
1. **Publisher Registration**: Connect MetaMask → Register critical CID → Set 99% uptime SLO → Bond 0.1 ETH stake
2. **Live Monitoring**: Dashboard shows real-time status across 5 professional gateways (IPFS.io, Cloudflare, Web3.Storage)
3. **Evidence Verification**: Click CID details → View cryptographically signed evidence packs → See probe results

### 💥 **WOW Moment (60s)**
1. **Trigger Breach**: Live demonstration - unpin content from gateway during demo
2. **Instant Detection**: Dashboard updates to BREACH status within 60 seconds
3. **Automatic Slashing**: Smart contract executes penalty, redistributes stake to validators
4. **Proof**: Show evidence pack on IPFS proving the exact moment content became unavailable

### 💡 **Value Proposition (30s)**
"First economically-backed IPFS availability layer. Built on Lisk for low costs, powered by Protocol Labs infrastructure, deployed on Vercel edge. Making Web3 data as reliable as Web2."

## 🛠️ **Technical Innovation**

### 🏗️ **Architecture**
```
[Publisher] → Register CID + SLO → [Lisk EvidenceRegistry Contract]
                                           ↓
[Vercel Cron] → 5-Gateway Probes → Signed Evidence Packs → [IPFS Storage]
                                           ↓
[Automated Watcher] → Breach Detection → reportPack() → [Economic Slashing]
```

### 🔬 **Core Innovations:**
- **Economic SLOs**: First system to create enforceable availability contracts for IPFS
- **Multi-Gateway Verification**: Eliminates single points of failure in availability checking
- **Sub-60s Detection**: Real-time monitoring with automated economic penalties
- **Cryptographic Evidence**: ed25519-signed proof packs ensuring tamper-proof monitoring
- **Gateway Diversity**: Professional infrastructure (Web3.Storage, Cloudflare, IPFS.io, Pinata)

## 🔐 **Security & Economics**

- **Role-based Access**: DEPLOYER, POLICY, WATCHER, PUBLISHER separation of concerns
- **Cryptographic Signatures**: ed25519 signing for tamper-proof evidence packs
- **Economic Security**: Real ETH staking with automated slashing for SLO breaches
- **Multi-Gateway Verification**: 5 professional gateways eliminate single points of failure
- **Transparent Operations**: All monitoring and penalties recorded on-chain

## 📞 **Team & Contact**

**Built by:** [@panzagianluca](https://github.com/panzagianluca) for Aleph Hackathon 2025

- **🐛 Issues**: [GitHub Issues](https://github.com/panzagianluca/alpeh-attesta/issues)
- **📧 Contact**: hackathon@crecimiento.build
- **🔗 Demo**: Ready for live presentation at Aleph Hackathon

---

**🏆 Submission for Aleph Hackathon 2025 | Public Good Infrastructure Track** 

*Built during January 30-February 2, 2025 | All code written during hackathon period*

## 📊 Evidence Pack Structure

```typescript
interface EvidencePackV1 {
  cid: string;                    // CIDv1 being monitored
  ts: number;                     // timestamp epoch seconds
  windowMin: number;              // monitoring window size
  threshold: {                    // SLO thresholds
    k: number;                    // minimum successes required
    n: number;                    // total vantage points
    timeoutMs: number;            // timeout per probe
  };
  probes: ProbeResult[];          // observations from each vantage point
  libp2p: { attempted: boolean }; // libp2p probe attempts
  agg: {                          // calculated aggregates
    okCount: number;              // successful probes
    status: 'OK' | 'DEGRADED' | 'BREACH';
  };
  watcherSig: string;             // ed25519 signature (base64)
  schema: 'cid-sentinel/1';       // schema version
}
```

## 🔧 API Usage

**Create Evidence Pack:**
```bash
curl -X POST http://localhost:3000/api/evidence/build \
  -H "Content-Type: application/json" \
  -d '{
    "cid": "bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
    "windowMin": 5,
    "threshold": { "k": 2, "n": 3, "timeoutMs": 5000 },
    "probes": [
      {
        "vp": "us-east",
        "method": "HTTP",
        "gateway": "https://ipfs.io",
        "ok": true,
        "latMs": 420
      }
    ],
    "attemptedLibp2p": false
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "packCID": "bafkrei...",
    "status": "OK",
    "okCount": 2,
    "buildTimeMs": 150,
    "uploadSizeBytes": 1234
  }
}
```

## 🧪 Testing

The system includes comprehensive tests covering:

- **Schema Validation**: 19 tests for Evidence Pack and input validation
- **ed25519 Signing**: 24 tests for key generation, signing, and verification
- **Builder Logic**: 14 tests for aggregation and status calculation
- **Error Handling**: Edge cases and validation failures

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run specific test suite
pnpm test src/lib/evidence
```

## Development Information

This is a [Next.js](https://nextjs.org) project with additional smart contract integration via Foundry.

```bash
# Development commands
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm test         # Run tests
pnpm test:contracts  # Run smart contract tests (requires Foundry)
```

For complete deployment instructions, see [Deployment Verification](./docs/deployment-verification.md).
