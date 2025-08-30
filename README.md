# Attesta 🏛️

> **SLO-backed IPFS availability with economic guarantees**

Attesta ensures verifiable availability of critical IPFS content through Service Level Objectives (SLOs), restaking economics, and automated slashing for breaches.

## 🎯 **Project Complete - Hackathon Ready!** ✅

**Live production system deployed with real CID monitoring and manual probe functionality**

### � **Final Demo Results:**
- **✅ Smart Contract Deployed:** [`0x4fCD15b71119B2F1c18944F9D1e6Ac8D5eE0024a`](https://sepolia-blockscout.lisk.com/address/0x4fCD15b71119B2F1c18944F9D1e6Ac8D5eE0024a)
- **✅ Live Frontend:** [https://attesta-seven.vercel.app/](https://attesta-seven.vercel.app/)
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

##  **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- Foundry (for smart contracts)
- Lisk Sepolia testnet access

### **Setup**
```bash
# Clone and install
git clone <repo-url>
cd attesta
npm install

# Environment setup
cp .env.example .env.local
# Configure your keys and RPC endpoints

# Deploy contracts
cd contracts
forge script script/Deploy.s.sol --rpc-url $LISK_RPC_URL --broadcast

# Start development
npm run dev
```

## 📁 **Project Structure**

```
cid-sentinel/
├── README.md                 # This file
├── docs/                     # Complete documentation
│   ├── cid-sentinel-plan.md  # 📋 Master Plan & Architecture
│   ├── phase6-demo-end-to-end.md  # 🎬 Demo Execution Guide
│   ├── phase5-onchain-integration.md  # 🔗 Smart Contract Integration
│   └── ...                   # Phase-specific documentation
├── contracts/                # Smart contracts (Solidity/Foundry)
│   ├── src/EvidenceRegistry.sol  # Main contract
│   ├── script/Deploy.s.sol   # Deployment scripts
│   └── test/                 # Contract tests
├── src/                      # Next.js application
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   ├── lib/                  # Utilities and helpers
│   └── types/                # TypeScript definitions
├── scripts/                  # Operational scripts
├── demo-cids/               # Demo dataset files
└── .env.local               # Environment configuration
```

## 📚 **Documentation**

### 📋 **Core Documentation**
- **[Master Plan & Architecture](./docs/cid-sentinel-plan.md)** - Complete system design and implementation plan
- **[Phase 6 Demo Guide](./docs/phase6-demo-end-to-end.md)** - Live breach simulation execution
- **[Smart Contract Integration](./docs/phase5-onchain-integration.md)** - On-chain deployment and testing

### 🔧 **Development Guides**
- **[Environment Setup](./docs/phase5-task0-completion.md)** - Complete environment configuration
- **[Evidence Pack System](./docs/phase3-evidence-packs.md)** - IPFS evidence generation
- **[Cron Orchestrator](./docs/phase4-cron-probe-workers.md)** - Automated monitoring system

### 🛡️ **Security & Operations**
- **[Security Policies](./docs/security-policies.md)** - Security audit and procedures
- **[Observability Runbook](./docs/task7-observability-runbook.md)** - Monitoring and alerting
- **[Deployment Verification](./docs/deployment-verification.md)** - Production deployment guide

## 🎬 **Demo Script (3 Minutes)**

### Hook (30s)
"When public evidence goes offline, truth rots. CID Sentinel keeps IPFS data alive — with economic guarantees."

### User Journey (90s)
1. **Register CID**: Connect wallet → Register CID with SLO → Bond stake
2. **Monitor**: Show dashboard with real-time availability metrics
3. **Evidence**: Open latest Evidence Pack showing multi-gateway probes

### WOW Moment (60s)
1. **Trigger Breach**: Live unpin CID from Pinata
2. **Detection**: Dashboard shows BREACH status in <60s
3. **Slashing**: On-chain `Slashed` event with economic penalties
4. **Evidence**: Show Evidence Pack proving the breach

### Value Proposition (30s)
"99%+ uptime guaranteed, breach detected in <60s, automatic economic penalties. Built on Lisk, Protocol Labs, and Vercel."

## 🏆 **Bounty Alignment**

- **🔗 Lisk**: On-chain evidence anchoring and state management with low costs  
- **📦 Protocol Labs**: IPFS monitoring, Evidence Packs, and multi-gateway probes
- **⚡ Vercel**: Serverless cron orchestration and production deployment
- **💾 Filecoin**: Persistent evidence storage and data availability

## 🔐 **Security & Trust**

- **Role-based Access**: DEPLOYER, POLICY, WATCHER, PUBLISHER, RESTAKER separation
- **Cryptographic Signatures**: ed25519 signing for Evidence Packs
- **Economic Security**: Real ETH at stake with automated slashing
- **Transparency**: All operations recorded on-chain with verifiable hashes
- **Audit Trail**: Complete evidence chain from probe to penalty

## 📞 **Contact & Support**

- **Repository**: [GitHub](https://github.com/panzagianluca/alpeh-gianluca)
- **Documentation**: Complete guides in `/docs` folder
- **Demo**: Live demonstration ready for Aleph Hackathon
- **Support**: See documentation or raise issues

---

**Built for Aleph Hackathon 2025 | Ready for Production Demo** 🚀

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
