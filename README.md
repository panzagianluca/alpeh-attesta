# CID Sentinel - Evidence Pack Builder

CID Sentinel is a distributed monitoring system that ensures **verifiable availability** of critical CIDs in IPFS through SLO monitoring, cryptographic evidence, and automated enforcement.

## 🎯 Phase 3: Evidence Pack Builder ✅

This system provides the core functionality for creating, signing, and storing Evidence Packs that prove CID availability across multiple vantage points.

### ✅ Implemented Features

- **Evidence Pack Schema v1**: Complete TypeScript types and JSON schema validation
- **ed25519 Signing**: Cryptographic signing with tweetnacl for tamper-proof evidence
- **IPFS Integration**: Upload Evidence Packs to IPFS with @storacha/client
- **Builder System**: Complete orchestration from probe results to signed Evidence Packs
- **API Endpoint**: HTTP interface for Evidence Pack creation
- **Comprehensive Tests**: 57 tests covering all scenarios (schema, signing, builder logic)

### 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the application
pnpm build

# Start development server
pnpm dev
```

### 📊 Evidence Pack Structure

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

### 🔧 API Usage

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

### 🧪 Testing

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

### 🔐 Security Features

- **Ed25519 Signatures**: Deterministic signing for Evidence Pack integrity
- **Input Validation**: Strict schema validation for all inputs
- **Size Limits**: Evidence Packs limited to 10KB for efficiency
- **Rate Limiting**: Built-in protections against abuse
- **Secret Management**: Private keys never exposed in responses

### 📚 Documentation

- [Phase 3 Implementation Plan](./docs/phase3-evidence-packs.md)
- [API Reference](http://localhost:3000/api/evidence/build) (GET for docs)
- [Test Coverage Report](./coverage/lcov-report/index.html) (after running tests with coverage)

### 🛣️ Roadmap

**✅ Phase 3 Complete** - Evidence Pack Builder System
**🔄 Phase 4 Next** - Cron job integration and probe workers
**📋 Phase 5** - Frontend UI for manual testing
**🎯 Phase 6** - Demo automation and breach simulation

### 🔧 Environment Variables

```bash
# Required for IPFS uploads
WEB3_STORAGE_TOKEN=your_token_here

# Required for signing (auto-generated if missing)
WATCHER_PRIVATE_KEY=base64_ed25519_private_key
WATCHER_PUBLIC_KEY=base64_ed25519_public_key
```

### 📈 System Status

**Definition of Done Progress: 8/9 Complete ✅**

- [x] Evidence Pack schema implemented & validated
- [x] ed25519 signing working with tweetnacl  
- [x] IPFS upload working with web3.storage
- [x] Builder aggregation logic implemented
- [x] API endpoint functional
- [x] Tests covering main scenarios
- [x] Hand-off ready for Phase 4 (cron integration)
- [ ] Documentation complete (in progress)
- [ ] Security policies documented (in progress)

---

## Next.js Information

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
