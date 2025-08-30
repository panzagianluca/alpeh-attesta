/**
 * CID Sentinel - Frontend Data Types
 * 
 * Complete TypeScript interface definitions for frontend integration
 * Compatible with Phase 3 Evidence Pack Builder and Phase 4 Cron Orchestrator
 */

// ===== CORE CONTRACT TYPES =====

export interface SLO {
  k: number;        // Minimum successes required
  n: number;        // Total vantage points
  timeoutMs: number; // Timeout per probe in milliseconds
  windowMin: number; // SLO evaluation window in minutes
}

export interface PackRef {
  cidDigest: `0x${string}`;     // keccak256(CID string)
  packCIDDigest: `0x${string}`; // keccak256(pack CID)
  ts: bigint;                   // Unix timestamp
  status: 0 | 1 | 2;           // 0=OK, 1=DEGRADED, 2=BREACH
}

// ===== UI DATA MODELS =====

export interface CIDDashboardItem {
  // Core identification
  cid: string;                    // Full CID string
  cidShort: string;               // Abbreviated display
  cidDigest: `0x${string}`;       // Contract key

  // Status & monitoring  
  status: 'OK' | 'DEGRADED' | 'BREACH';
  uptime24h: number;              // Percentage 0-100
  lastPackCID: string;            // Latest evidence pack CID
  lastPackTimestamp: number;      // Unix timestamp

  // Staking & economics
  totalStake: bigint;             // Total staked amount in wei
  slashingEnabled: boolean;       // Whether slashing is enabled
  consecutiveFails: number;       // Current consecutive failures

  // SLO configuration
  slo: SLO;

  // Metadata
  publisher: `0x${string}`;       // Publisher address
  registeredAt: number;           // Registration timestamp
  explorerLink: string;           // Blockchain explorer link
}

export interface ProbeResult {
  vantagePoint: string;           // e.g., "us-east", "eu-west"
  gateway: string;                // Gateway URL
  ok: boolean;                    // Success/failure
  latencyMs: number | null;       // Response time
  error?: string;                 // Error message if failed
}

export interface EvidencePack {
  packCID: string;                // IPFS CID of evidence pack
  timestamp: number;              // Unix timestamp
  status: 'OK' | 'DEGRADED' | 'BREACH';
  probeResults: ProbeResult[];
  okCount: number;                // Successful probes
  ipfsLink: string;               // IPFS gateway link
  txHash?: string;                // Transaction hash of reportPack
}

export interface StakingEvent {
  type: 'BONDED' | 'SLASHED';
  staker: `0x${string}`;
  amount: bigint;
  timestamp: number;
  txHash: string;
}

export interface BreachEvent {
  timestamp: number;
  consecutiveFails: number;
  evidencePackCID: string;        // Pack that triggered breach
  txHash: string;
}

export interface CIDDetailData extends CIDDashboardItem {
  // Extended evidence pack history
  evidencePacks: EvidencePack[];
  
  // Staking history
  stakingEvents: StakingEvent[];
  
  // Breach history
  breachEvents: BreachEvent[];
}

// ===== CONTRACT EVENT TYPES =====

export interface CIDRegisteredEvent {
  cid: `0x${string}`;
  publisher: `0x${string}`;
  slo: SLO;
  slashingEnabled: boolean;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface EvidenceAnchoredEvent {
  cid: `0x${string}`;
  packCID: `0x${string}`;
  status: 0 | 1 | 2;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface StakeBondedEvent {
  cid: `0x${string}`;
  staker: `0x${string}`;
  amount: bigint;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export interface BreachDetectedEvent {
  cid: `0x${string}`;
  timestamp: bigint;
  blockNumber: number;
  transactionHash: string;
}

export interface SlashedEvent {
  cid: `0x${string}`;
  amount: bigint;
  slasher: `0x${string}`;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

// ===== API REQUEST/RESPONSE TYPES =====

export interface RegisterCIDRequest {
  cid: string;
  slo: SLO;
  slashingEnabled: boolean;
}

export interface RegisterCIDResponse {
  txHash: string;
  estimatedGas: bigint;
}

export interface DashboardDataResponse {
  cids: CIDDashboardItem[];
  totalRegistered: number;
  totalStaked: bigint;
  averageUptime: number;
  lastUpdated: number;
}

export interface CIDDetailResponse extends CIDDetailData {
  // Additional computed fields
  stakingStats: {
    totalBonded: bigint;
    totalSlashed: bigint;
    netStake: bigint;
    stakersCount: number;
  };
  uptimeHistory: Array<{
    date: string;                 // ISO date string
    uptime: number;               // Percentage 0-100
  }>;
}

// ===== EVIDENCE PACK SCHEMA (FROM IPFS) =====

export interface EvidencePackIPFS {
  cid: string;                    // Full CID string
  ts: number;                     // Unix timestamp
  windowMin: number;              // SLO window in minutes
  threshold: {
    k: number;
    n: number;
    timeoutMs: number;
  };
  probes: Array<{
    vp: string;                   // Vantage point identifier
    method: string;               // "HTTP" or "libp2p"
    gateway: string;              // Gateway URL
    ok: boolean;                  // Success/failure
    latMs?: number;               // Latency in milliseconds
    err?: string;                 // Error message
  }>;
  libp2p?: {
    attempted: boolean;
    peers?: number;
    dhtProviders?: number;
  };
  agg: {
    okCount: number;              // Total successful probes
    status: 'OK' | 'DEGRADED' | 'BREACH';
  };
  watcherSig: string;             // ed25519 signature (base64)
  schema: string;                 // Schema version
}

// ===== CONFIGURATION TYPES =====

export interface SLOPresets {
  strict: SLO;
  normal: SLO;
  relaxed: SLO;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  contractAddress: `0x${string}`;
  faucetUrl?: string;
}

export interface GatewayConfig {
  url: string;
  region: string;                 // e.g., "us-east", "eu-west"
  priority: number;               // Higher = preferred
  timeout: number;                // Timeout in milliseconds
}

// ===== COMPONENT PROP TYPES =====

export interface CIDTableProps {
  cids: CIDDashboardItem[];
  loading: boolean;
  onRefresh: () => void;
  onCIDClick: (cid: string) => void;
  sortBy: 'status' | 'uptime' | 'stake' | 'registered';
  sortOrder: 'asc' | 'desc';
  onSort: (field: string, order: 'asc' | 'desc') => void;
}

export interface CIDDetailProps {
  cid: string;
  data: CIDDetailData | null;
  loading: boolean;
  onStake: (amount: bigint) => Promise<string>; // Returns tx hash
  onWithdraw: (amount: bigint) => Promise<string>;
  onRefresh: () => void;
}

export interface EvidencePackTimelineProps {
  evidencePacks: EvidencePack[];
  onPackClick: (packCID: string) => void;
  maxItems?: number;
  showTimestamp?: boolean;
}

export interface RegisterCIDFormProps {
  onSubmit: (request: RegisterCIDRequest) => Promise<void>;
  sloPresets: SLOPresets;
  availableGateways: GatewayConfig[];
  estimateGas: (cid: string, slo: SLO) => Promise<bigint>;
}

// ===== UTILITY TYPES =====

export interface DataCache<T> {
  data: T | null;
  timestamp: number;
  ttl: number;                    // Time to live in milliseconds
  loading: boolean;
  error: Error | null;
}

export interface ContractInteraction {
  type: 'read' | 'write';
  method: string;
  args: unknown[];
  gasEstimate?: bigint;
  txHash?: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

// ===== ERROR TYPES =====

export class CIDSentinelError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CIDSentinelError';
  }
}

export interface ErrorWithCode {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

// ===== HOOKS & CONTEXT TYPES =====

export interface CIDSentinelContext {
  // Network configuration
  network: NetworkConfig;
  
  // Contract interaction
  contract: {
    read: <T>(method: string, args?: unknown[]) => Promise<T>;
    write: (method: string, args?: unknown[]) => Promise<string>;
    estimateGas: (method: string, args?: unknown[]) => Promise<bigint>;
  };
  
  // IPFS integration
  ipfs: {
    get: (cid: string) => Promise<EvidencePackIPFS>;
    isAccessible: (cid: string) => Promise<boolean>;
  };
  
  // Real-time updates
  subscribe: (eventName: string, callback: (data: unknown) => void) => () => void;
}

// ===== RE-EXPORT CONVENIENCE TYPES =====

export type CIDStatus = 'OK' | 'DEGRADED' | 'BREACH';
export type EventType = 'CIDRegistered' | 'EvidenceAnchored' | 'StakeBonded' | 'BreachDetected' | 'Slashed';
export type SortField = 'status' | 'uptime' | 'stake' | 'registered';
export type SortOrder = 'asc' | 'desc';

// Default configurations for UI components
export const DEFAULT_SLO_PRESETS: SLOPresets = {
  strict: { k: 3, n: 3, timeoutMs: 2000, windowMin: 5 },
  normal: { k: 2, n: 3, timeoutMs: 3000, windowMin: 10 },
  relaxed: { k: 1, n: 3, timeoutMs: 5000, windowMin: 15 }
};

export const DEFAULT_GATEWAYS: GatewayConfig[] = [
  { url: 'https://ipfs.io', region: 'global', priority: 3, timeout: 3000 },
  { url: 'https://dweb.link', region: 'global', priority: 2, timeout: 3000 },
  { url: 'https://cloudflare-ipfs.com', region: 'global', priority: 1, timeout: 3000 }
];

export const CACHE_SETTINGS = {
  DASHBOARD_DATA: 30_000,         // 30 seconds
  CID_DETAIL: 10_000,             // 10 seconds
  EVIDENCE_PACK: 300_000,         // 5 minutes
  CONTRACT_STATE: 5_000,          // 5 seconds
} as const;

// ===== API INTERFACE =====

export interface CIDSentinelAPI {
  getCIDList: () => Promise<CIDListResponse>;
  getCIDDetail: (cid: string) => Promise<CIDDetailResponse>;
  getEvidenceHistory: (cid: string, limit?: number, offset?: number) => Promise<EvidenceHistoryResponse>;
  stakeCID: (cid: string, amount: string) => Promise<StakeResponse>;
  unstakeCID: (cid: string, amount: string) => Promise<UnstakeResponse>;
  registerCID: (cid: string, slo: SLO) => Promise<RegisterResponse>;
  updateSLO: (cid: string, slo: SLO) => Promise<UpdateSLOResponse>;
}

// ===== API RESPONSES =====

export interface BaseResponse {
  success: boolean;
  error?: string;
}

export interface CIDListResponse extends BaseResponse {
  data: CIDDashboardItem[];
  total: number;
}

export interface CIDDetailResponse extends BaseResponse {
  data: CIDDetailData;
}

export interface EvidenceHistoryResponse extends BaseResponse {
  data: EvidencePack[];
  hasMore: boolean;
}

export interface StakeResponse extends BaseResponse {
  txHash?: string;
  newStake?: string;
}

export interface UnstakeResponse extends BaseResponse {
  txHash?: string;
  newStake?: string;
}

export interface RegisterResponse extends BaseResponse {
  txHash?: string;
  cidDigest?: string;
}

export interface UpdateSLOResponse extends BaseResponse {
  txHash?: string;
}

// ===== CACHE CONFIGURATION =====

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
}
