# Phase 4 Definition of Done — Verification & Compliance

## ✅ DoD Requirement 1: Orquestador descrito con paso a paso claro

### 🔄 Orchestrator Step-by-Step Process

**Implementation**: `src/app/api/cron/probe/route.ts`

```
1. INITIALIZE
   ├─ Prevent concurrent executions (isRunning guard)
   ├─ Set execution budget (25s for Vercel production)
   └─ Initialize cycle statistics

2. FETCH ACTIVE CIDs
   ├─ Use CID Manager (demo mode or on-chain events)
   ├─ Fallback to demo CIDs if fetch fails
   └─ Limit to 3 CIDs in production for budget compliance

3. PROBE EXECUTION (per CID batch)
   ├─ Execute probes across multiple IPFS gateways
   ├─ Parallel execution with concurrency control (2-3 max)
   ├─ Timeout protection (3s per probe, 8s per CID)
   └─ Status analysis: OK (≥80%), DEGRADED (50-79%), BREACH (<50%)

4. EVIDENCE PACK BUILDING
   ├─ Convert probe results to legacy format
   ├─ Build Evidence Pack with ed25519 signature
   ├─ Include metadata: timestamp, threshold, SLO parameters
   └─ Error handling with graceful degradation

5. IPFS UPLOAD
   ├─ Upload Evidence Pack to IPFS (Web3.Storage)
   ├─ Verify upload success and accessibility
   └─ Return IPFS CID for on-chain anchoring

6. ON-CHAIN REPORTING (Future Phase 5)
   ├─ Call EvidenceRegistry.reportPack()
   ├─ Anchor Evidence Pack CID on-chain
   └─ Trigger slashing if SLO breach detected

7. FINALIZE
   ├─ Update cycle statistics
   ├─ Report to health monitoring
   └─ Release execution lock
```

**Status**: ✅ COMPLETE

---

## ✅ DoD Requirement 2: Política de nonces, retries, timeouts, idempotencia y errores

### 📋 Operational Policies Documentation

#### Nonce Management
```typescript
// Current: Evidence Pack includes timestamp-based nonce
ts: Math.floor(Date.now() / 1000)

// Future on-chain: Contract-managed nonce per CID
nonce: contractState.lastNonce + 1
```

#### Retry Policy
```typescript
// Probe level: No retries (fail fast for budget compliance)
// Batch level: Continue processing other CIDs if one fails
// Cycle level: No retries within same cycle (next cycle will retry)
```

#### Timeout Configuration
```typescript
// Production timeouts (Vercel optimized)
EXECUTION_BUDGET: 25000ms    // Total cycle timeout
CID_TIMEOUT: 8000ms          // Per CID processing
PROBE_TIMEOUT: 3000ms        // Per gateway probe
IPFS_UPLOAD_TIMEOUT: 5000ms  // Evidence Pack upload
```

#### Idempotency
```typescript
// Execution level: Concurrent execution prevention
if (isRunning) return 429;

// Cycle level: Minimum 30s between manual triggers
if (Date.now() - lastExecution < 30000) return 429;

// Evidence Pack level: Deterministic based on timestamp window
windowMin: 5 // Evidence Packs for same 5-min window are identical
```

#### Error Handling Strategy
```typescript
// Graceful degradation hierarchy:
1. Probe fails → Continue with other gateways
2. CID processing fails → Continue with other CIDs  
3. Evidence Pack build fails → Log error, continue cycle
4. IPFS upload fails → Retry once, then fail gracefully
5. Critical failure → End cycle, report to monitoring
```

**Status**: ✅ COMPLETE

---

## ✅ DoD Requirement 3: Presupuesto de tiempo, concurrencia y SLO internos

### ⏱️ Time Budget & Concurrency Configuration

#### Production Time Budget (Vercel Optimized)
```typescript
TOTAL_EXECUTION_BUDGET: 25000ms    // 25s (Vercel 30s limit - 5s buffer)
├─ CID_FETCH: ~500ms               // CID Manager fetch
├─ PROBE_EXECUTION: ~12000ms       // 3 CIDs × 4s avg
├─ EVIDENCE_BUILDING: ~6000ms      // 3 Evidence Packs × 2s
├─ IPFS_UPLOADS: ~6000ms          // 3 uploads × 2s avg
└─ OVERHEAD: ~500ms               // Logging, stats, cleanup
```

#### Concurrency Limits
```typescript
// Production settings
MAX_CONCURRENT_CIDS: 2        // Process 2 CIDs simultaneously
MAX_CONCURRENT_PROBES: 3      // 3 gateways per CID
MAX_CIDS_PER_CYCLE: 3        // Total CIDs per execution

// Development settings  
MAX_CONCURRENT_CIDS: 3
MAX_CONCURRENT_PROBES: 5
MAX_CIDS_PER_CYCLE: unlimited
```

#### Internal SLOs
```typescript
// Performance SLOs
CYCLE_COMPLETION_TARGET: <22000ms  // 22s target (3s buffer)
PROBE_SUCCESS_RATE: >90%           // Gateway availability
EVIDENCE_BUILD_SUCCESS: >95%       // Build reliability
IPFS_UPLOAD_SUCCESS: >90%          // Upload reliability

// Availability SLOs
CID_CLASSIFICATION:
├─ OK: ≥80% gateway success       // 4/5 gateways responding
├─ DEGRADED: 50-79% success       // 2-3/5 gateways responding  
└─ BREACH: <50% success           // <2/5 gateways responding
```

**Status**: ✅ COMPLETE

---

## ✅ DoD Requirement 4: Observabilidad y seguridad

### 📊 Observability Implementation

#### Health Check Endpoint (`/api/health`)
```typescript
// Real-time monitoring
- System status (healthy/degraded/unhealthy)
- Execution metrics (avg time, success rate, error rate)
- Dependency status (IPFS gateways, Web3.Storage)
- Environment info (region, uptime, last execution)
```

#### Logging Strategy
```typescript
// Structured logging levels
console.log('🚀 Cycle Started')     // Info
console.warn('⚠️ Production Alert') // Warning  
console.error('❌ Cycle Failed')     // Error

// Metrics logged:
- Execution duration per phase
- Gateway response times
- Evidence Pack build times
- IPFS upload performance
- Error details and stack traces
```

#### Monitoring Integration
```typescript
// Health metrics tracking
updateHealthMetrics(duration, success, error)

// Production alerting triggers
- Budget exceeded (>25s execution)
- Health degraded (<80% success rate)
- Critical dependency failures
```

### 🔒 Security Configuration

#### Environment Variables
```bash
# Secrets (Vercel Environment Variables)
WEB3_STORAGE_TOKEN=***           # IPFS upload authentication
SIGNING_PRIVATE_KEY=***          # Evidence Pack signing key

# Configuration (Public)
IPFS_GATEWAYS=https://ipfs.io... # Gateway endpoints
DEMO_CIDS=bafybeih...           # Test CID list
```

#### Access Control
```typescript
// API endpoint security
- Rate limiting (429 for frequent requests)
- User-Agent validation for automation
- CORS configuration for frontend access
- Input validation and sanitization
```

**Status**: ✅ COMPLETE

---

## ✅ DoD Requirement 5: Plan de pruebas manuales

### 🧪 Manual Testing Plan

#### Test Cases Implementation

**File**: `scripts/test-cron.js` & `scripts/verify-deployment.js`

##### 1. Happy Path Testing
```bash
# Test health check
curl -X GET http://localhost:3000/api/health

# Test successful cron execution  
curl -X POST http://localhost:3000/api/cron/probe

# Expected: All CIDs processed, Evidence Packs created, <25s execution
```

##### 2. Breach Scenario Testing
```bash
# Configure unreachable CIDs
DEMO_CIDS=QmInvalidCID1,QmInvalidCID2 npm run dev

# Execute cron
curl -X POST http://localhost:3000/api/cron/probe

# Expected: BREACH status, error handling, cycle completion
```

##### 3. Race Condition Testing
```bash
# Concurrent execution test
curl -X POST http://localhost:3000/api/cron/probe &
curl -X POST http://localhost:3000/api/cron/probe &

# Expected: One succeeds, others return 429 (Too frequent)
```

##### 4. Permission Testing
```bash
# Missing environment variables
unset WEB3_STORAGE_TOKEN
curl -X POST http://localhost:3000/api/cron/probe

# Expected: Graceful degradation, error logging
```

##### 5. IPFS Down Testing
```bash
# Invalid gateways
IPFS_GATEWAYS=http://invalid.gateway npm run dev
curl -X POST http://localhost:3000/api/cron/probe

# Expected: All probes fail, BREACH status, cycle continues
```

**Status**: ✅ COMPLETE

---

## ✅ DoD Requirement 6: Checklist de envs y permisos on-chain

### 🔧 Environment & Permissions Checklist

#### Development Environment
```bash
# ✅ Required for Phase 4 (Current)
✅ DEMO_CIDS=bafybeih...,bafybeid...
✅ IPFS_GATEWAYS=https://ipfs.io/ipfs,https://dweb.link/ipfs,https://cloudflare-ipfs.com/ipfs
✅ WEB3_STORAGE_TOKEN=eyJ...
✅ SIGNING_PRIVATE_KEY=*** (ed25519 for Evidence Pack signing)

# ✅ Optional for Phase 4
✅ PROBE_TIMEOUT=3000
✅ PROBE_CONCURRENCY=3
✅ MAX_CIDS_PER_EXECUTION=3
```

#### Production Environment (Vercel)
```bash
# ✅ Vercel Configuration
✅ vercel.json with cron schedule and function config
✅ Runtime: nodejs, maxDuration: 25
✅ Environment variables configured in Vercel dashboard
✅ Deployment verification script ready
```

#### Phase 5 Preparation Checklist
```bash
# 🚧 Required for Phase 5 (Blockchain Integration)
🚧 NEXT_PUBLIC_LISK_RPC_URL=https://rpc.api.lisk.com
🚧 NEXT_PUBLIC_CONTRACT_ADDRESS=0x... (after deployment)
🚧 DEPLOYER_PRIVATE_KEY=*** (for contract deployment)
🚧 OPERATOR_PRIVATE_KEY=*** (for reportPack transactions)

# 🚧 Smart Contract Deployment
🚧 Deploy EvidenceRegistry to Lisk testnet
🚧 Verify contract on Lisk block explorer
🚧 Configure contract permissions (operator role)
🚧 Fund operator wallet with test ETH
```

#### Security & Access Control
```bash
# ✅ Current Security Setup
✅ Environment variables properly secured
✅ API rate limiting implemented
✅ Error handling without information leakage
✅ Structured logging for monitoring

# 🚧 Phase 5 Security Requirements
🚧 Multi-sig wallet setup for production
🚧 Role-based access control on contract
🚧 Monitoring and alerting for on-chain transactions
🚧 Backup and recovery procedures
```

**Status**: ✅ PHASE 4 COMPLETE, 🚧 PHASE 5 PREPARED

---

## 🎯 Phase 4 DoD Compliance Summary

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **1. Orchestrator Step-by-Step** | ✅ COMPLETE | `src/app/api/cron/probe/route.ts` - Clear 7-step process |
| **2. Operational Policies** | ✅ COMPLETE | Documented nonces, retries, timeouts, idempotency, errors |
| **3. Time Budget & SLOs** | ✅ COMPLETE | 25s budget, concurrency limits, internal SLOs defined |
| **4. Observability & Security** | ✅ COMPLETE | Health endpoint, monitoring, environment security |
| **5. Manual Test Plan** | ✅ COMPLETE | Comprehensive test scripts with critical scenarios |
| **6. Environment Checklist** | ✅ COMPLETE | Phase 4 ready, Phase 5 preparation documented |

### ✅ **PHASE 4 IS COMPLETE AND READY FOR PRODUCTION**

All Definition of Done requirements have been met. The system is production-ready on Vercel with comprehensive monitoring, testing, and operational documentation.

**Ready to proceed to Phase 5: Frontend Dashboard & On-chain Integration**
