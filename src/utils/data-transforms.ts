/**
 * CID Sentinel - Data Transformation Utilities
 * 
 * Helper functions for converting between contract data, IPFS data, and UI-friendly formats
 */

import { keccak256, toBytes, formatEther, parseEther } from 'viem';
import type {
  CIDDashboardItem,
  CIDDetailData,
  EvidencePackIPFS,
  EvidencePack,
  SLO,
  CIDStatus,
  ProbeResult
} from '../types/ui-data-contract';

// ===== CID PROCESSING =====

/**
 * Convert full CID string to contract digest (keccak256)
 */
export function cidToDigest(cid: string): `0x${string}` {
  return keccak256(toBytes(cid));
}

/**
 * Abbreviate CID for UI display
 */
export function abbreviateCID(cid: string): string {
  if (cid.length <= 16) return cid;
  return `${cid.slice(0, 8)}...${cid.slice(-6)}`;
}

/**
 * Generate IPFS gateway link
 */
export function getIPFSLink(cid: string, gateway = 'https://ipfs.io'): string {
  const baseUrl = gateway.endsWith('/') ? gateway.slice(0, -1) : gateway;
  return `${baseUrl}/ipfs/${cid}`;
}

/**
 * Validate CID format (basic check)
 */
export function isValidCID(cid: string): boolean {
  // Basic CIDv1 format check
  return /^bafy[a-z2-7]{59}$|^Qm[1-9A-HJ-NP-Za-km-z]{44}$/i.test(cid);
}

// ===== STATUS CALCULATIONS =====

/**
 * Convert numeric status to string
 */
export function statusFromNumber(status: 0 | 1 | 2): CIDStatus {
  switch (status) {
    case 0: return 'OK';
    case 1: return 'DEGRADED';
    case 2: return 'BREACH';
    default: return 'BREACH';
  }
}

/**
 * Convert string status to number
 */
export function statusToNumber(status: CIDStatus): 0 | 1 | 2 {
  switch (status) {
    case 'OK': return 0;
    case 'DEGRADED': return 1;
    case 'BREACH': return 2;
    default: return 2;
  }
}

/**
 * Calculate uptime percentage from evidence packs
 */
export function calculate24hUptime(evidencePacks: EvidencePack[]): number {
  if (evidencePacks.length === 0) return 0;
  
  // Filter to last 24 hours
  const now = Date.now() / 1000;
  const oneDayAgo = now - (24 * 60 * 60);
  const recent = evidencePacks.filter(pack => pack.timestamp >= oneDayAgo);
  
  if (recent.length === 0) return 0;
  
  // Calculate uptime based on OK/DEGRADED vs BREACH
  const okPacks = recent.filter(pack => pack.status === 'OK' || pack.status === 'DEGRADED');
  return Math.round((okPacks.length / recent.length) * 100);
}

/**
 * Determine current status based on consecutive fails and SLO
 */
export function getCurrentStatus(
  latestPack: EvidencePack | null,
  consecutiveFails: number,
  slo: SLO
): CIDStatus {
  if (!latestPack) return 'BREACH';
  
  // If we have recent breach evidence and consecutive fails exceed threshold
  if (consecutiveFails >= 2) return 'BREACH';
  
  // Otherwise use the latest pack status
  return latestPack.status;
}

// ===== EVIDENCE PACK TRANSFORMATIONS =====

/**
 * Transform IPFS evidence pack to UI format
 */
export function transformEvidencePack(
  ipfsPack: EvidencePackIPFS,
  packCID: string,
  txHash?: string
): EvidencePack {
  return {
    packCID,
    timestamp: ipfsPack.ts,
    status: ipfsPack.agg.status as CIDStatus,
    probeResults: ipfsPack.probes.map(probe => ({
      vantagePoint: probe.vp,
      gateway: probe.gateway,
      ok: probe.ok,
      latencyMs: probe.latMs || null,
      error: probe.err
    })),
    okCount: ipfsPack.agg.okCount,
    ipfsLink: getIPFSLink(packCID),
    txHash
  };
}

/**
 * Extract probe results for display
 */
export function extractProbeResults(ipfsPack: EvidencePackIPFS): ProbeResult[] {
  return ipfsPack.probes.map(probe => ({
    vantagePoint: probe.vp,
    gateway: probe.gateway,
    ok: probe.ok,
    latencyMs: probe.latMs || null,
    error: probe.err
  }));
}

/**
 * Calculate average latency from probe results
 */
export function calculateAverageLatency(probeResults: ProbeResult[]): number | null {
  const validLatencies = probeResults
    .filter(p => p.ok && p.latencyMs !== null)
    .map(p => p.latencyMs!);
  
  if (validLatencies.length === 0) return null;
  
  return Math.round(validLatencies.reduce((sum, lat) => sum + lat, 0) / validLatencies.length);
}

// ===== BLOCKCHAIN DATA FORMATTING =====

/**
 * Format token amounts for display
 */
export function formatStakeAmount(amount: bigint, decimals = 4): string {
  const ether = formatEther(amount);
  const num = parseFloat(ether);
  
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  
  return num.toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * Parse user input to bigint amount
 */
export function parseStakeAmount(input: string): bigint {
  try {
    return parseEther(input);
  } catch {
    return BigInt(0);
  }
}

/**
 * Format timestamp for UI display
 */
export function formatTimestamp(timestamp: number, format: 'relative' | 'absolute' = 'relative'): string {
  const date = new Date(timestamp * 1000);
  
  if (format === 'absolute') {
    return date.toLocaleString();
  }
  
  // Relative time formatting
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format block explorer URL
 */
export function getExplorerLink(
  address: string,
  type: 'address' | 'tx' = 'address',
  explorerUrl = 'https://sepolia-blockscout.lisk.com'
): string {
  const baseUrl = explorerUrl.endsWith('/') ? explorerUrl.slice(0, -1) : explorerUrl;
  return `${baseUrl}/${type}/${address}`;
}

// ===== SLO VALIDATION =====

/**
 * Validate SLO configuration
 */
export function validateSLO(slo: SLO): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (slo.k > slo.n) {
    errors.push('Minimum successes (k) cannot exceed total vantage points (n)');
  }
  
  if (slo.k < 1) {
    errors.push('Minimum successes (k) must be at least 1');
  }
  
  if (slo.n < 1 || slo.n > 10) {
    errors.push('Total vantage points (n) must be between 1 and 10');
  }
  
  if (slo.timeoutMs < 1000 || slo.timeoutMs > 30000) {
    errors.push('Timeout must be between 1 and 30 seconds');
  }
  
  if (slo.windowMin < 1 || slo.windowMin > 1440) {
    errors.push('Window must be between 1 minute and 24 hours');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Get SLO description for UI
 */
export function describeSLO(slo: SLO): string {
  return `${slo.k}/${slo.n} success within ${slo.timeoutMs}ms, ${slo.windowMin}min window`;
}

// ===== SORTING UTILITIES =====

/**
 * Sort CID dashboard items
 */
export function sortCIDs(
  cids: CIDDashboardItem[],
  field: 'status' | 'uptime' | 'stake' | 'registered',
  order: 'asc' | 'desc'
): CIDDashboardItem[] {
  const sortedCIDs = [...cids].sort((a, b) => {
    let aVal: string | number | bigint;
    let bVal: string | number | bigint;
    
    switch (field) {
      case 'status':
        // Sort by status priority: BREACH > DEGRADED > OK
        const statusPriority = { 'BREACH': 3, 'DEGRADED': 2, 'OK': 1 };
        aVal = statusPriority[a.status];
        bVal = statusPriority[b.status];
        break;
      case 'uptime':
        aVal = a.uptime24h;
        bVal = b.uptime24h;
        break;
      case 'stake':
        aVal = a.totalStake;
        bVal = b.totalStake;
        break;
      case 'registered':
        aVal = a.registeredAt;
        bVal = b.registeredAt;
        break;
      default:
        return 0;
    }
    
    if (typeof aVal === 'bigint' && typeof bVal === 'bigint') {
      return order === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
    }
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sortedCIDs;
}

// ===== DATA VALIDATION =====

/**
 * Validate evidence pack structure
 */
export function validateEvidencePack(data: unknown): data is EvidencePackIPFS {
  if (!data || typeof data !== 'object') return false;
  
  const pack = data as Record<string, unknown>;
  
  return (
    typeof pack.cid === 'string' &&
    typeof pack.ts === 'number' &&
    typeof pack.schema === 'string' &&
    Array.isArray(pack.probes) &&
    typeof pack.agg === 'object' &&
    pack.agg !== null &&
    typeof (pack.agg as Record<string, unknown>).status === 'string'
  );
}

/**
 * Safe number conversion with fallback
 */
export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Safe bigint conversion with fallback
 */
export function safeBigInt(value: unknown, fallback = BigInt(0)): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value);
  if (typeof value === 'string') {
    try {
      return BigInt(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

// ===== CACHE UTILITIES =====

/**
 * Check if cached data is still valid
 */
export function isCacheValid(timestamp: number, ttl: number): boolean {
  return (Date.now() - timestamp) < ttl;
}

/**
 * Generate cache key for data
 */
export function getCacheKey(type: string, ...params: string[]): string {
  return `cid-sentinel:${type}:${params.join(':')}`;
}

// ===== EXPORT ALL UTILITIES =====

export const CIDUtils = {
  cidToDigest,
  abbreviateCID,
  getIPFSLink,
  isValidCID
};

export const StatusUtils = {
  statusFromNumber,
  statusToNumber,
  calculate24hUptime,
  getCurrentStatus
};

export const EvidenceUtils = {
  transformEvidencePack,
  extractProbeResults,
  calculateAverageLatency,
  validateEvidencePack
};

export const FormatUtils = {
  formatStakeAmount,
  parseStakeAmount,
  formatTimestamp,
  getExplorerLink
};

export const SLOUtils = {
  validateSLO,
  describeSLO
};

export const DataUtils = {
  sortCIDs,
  safeNumber,
  safeBigInt,
  isCacheValid,
  getCacheKey
};
