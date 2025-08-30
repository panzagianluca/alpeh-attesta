/**
 * Evidence Pack JSON Schema and Types
 * 
 * Defines the structure and validation for Evidence Packs v1.
 * These packs contain proof of CID availability/unavailability
 * from distributed monitoring probes.
 */

export type Probe = {
  vp: string;
  method: 'HTTP' | 'LIBP2P';
  gateway?: string;
  ok: boolean;
  latMs?: number;
  err?: string;
};

export type ProbeResult = Probe;

export type ThresholdConfig = {
  k: number;
  n: number;
  timeoutMs: number;
};

export type BuilderInputs = {
  cid: string;
  windowMin: number;
  threshold: ThresholdConfig;
  probes: ProbeResult[];
  attemptedLibp2p: boolean;
  ts?: number;
};

export type BuilderOutputs = {
  evidencePack: EvidencePackV1;
  ipfsCID: string;
  signature: string;
  buildTimeMs: number;
};

export type BuilderResponse = {
  success: boolean;
  data?: BuilderOutputs;
  error?: string;
  stage?: string;
};

export type EvidencePackV1 = {
  cid: string;
  ts: number;
  probes: Probe[];
  slo?: {
    target: number;
    actual: number;
    breach: boolean;
  };
  meta?: {
    builder: string;
    region: string;
    windowMin: number;
    threshold: ThresholdConfig;
    attemptedLibp2p: boolean;
  };
  // Legacy fields for backward compatibility
  windowMin?: number;
  threshold?: ThresholdConfig;
  libp2p?: { attempted: boolean };
  agg?: {
    okCount: number;
    status: 'OK' | 'DEGRADED' | 'BREACH';
  };
  watcherSig?: string;
  schema?: 'cid-sentinel/1';
};

export function validateEvidencePack(pack: EvidencePackV1): string[] {
  const errors: string[] = [];
  if (!pack.cid) errors.push('cid missing');
  if (!Number.isInteger(pack.ts) || pack.ts <= 0) errors.push('ts invalid');
  
  // Check for windowMin in meta or legacy location
  const windowMin = pack.meta?.windowMin || pack.windowMin;
  if (!windowMin || !Number.isInteger(windowMin) || windowMin < 1 || windowMin > 60) {
    errors.push('windowMin out of range');
  }
  
  // Check for threshold in meta or legacy location
  const threshold = pack.meta?.threshold || pack.threshold;
  if (!threshold) {
    errors.push('threshold missing');
  } else {
    const { k, n, timeoutMs } = threshold;
    if (!(k >= 1 && k <= n && n <= 5)) errors.push('threshold k/n invalid');
    if (!(timeoutMs >= 200 && timeoutMs <= 30000)) errors.push('timeoutMs out of range');
  }
  
  if (!Array.isArray(pack.probes) || pack.probes.length < 1) errors.push('probes missing');
  const vps = new Set<string>();
  for (const probe of pack.probes) {
    if (!probe.vp) errors.push('probe.vp missing');
    if (vps.has(probe.vp)) errors.push('duplicate vp');
    vps.add(probe.vp);
    if (probe.method === 'HTTP' && !probe.gateway) errors.push('probe.gateway missing for HTTP');
    if (probe.latMs !== undefined && probe.latMs < 0) errors.push('probe.latMs invalid');
    if (!probe.ok && !probe.err) errors.push('probe.err missing for failed probe');
  }
  
  // Check aggregation data if present (legacy format)
  if (pack.agg && (typeof pack.agg.okCount !== 'number' || !['OK','DEGRADED','BREACH'].includes(pack.agg.status))) {
    errors.push('agg invalid');
  }
  
  // watcherSig is optional in new format
  if (pack.watcherSig !== undefined && typeof pack.watcherSig !== 'string') {
    errors.push('watcherSig invalid');
  }
  
  // schema is optional in new format
  if (pack.schema !== undefined && pack.schema !== 'cid-sentinel/1') {
    errors.push('schema invalid');
  }
  
  return errors;
}

export function validateBuilderInputs(inputs: BuilderInputs): string[] {
  const errors: string[] = [];
  
  if (!inputs.cid || typeof inputs.cid !== 'string') {
    errors.push('cid missing or invalid');
  }
  
  if (!Number.isInteger(inputs.windowMin) || inputs.windowMin < 1 || inputs.windowMin > 60) {
    errors.push('windowMin out of range (1-60)');
  }
  
  if (!inputs.threshold) {
    errors.push('threshold missing');
  } else {
    const { k, n, timeoutMs } = inputs.threshold;
    if (!(k >= 1 && k <= n && n <= 10)) {
      errors.push('threshold k/n invalid (k must be 1-n, n max 10)');
    }
    if (!(timeoutMs >= 200 && timeoutMs <= 30000)) {
      errors.push('timeoutMs out of range (200-30000ms)');
    }
  }
  
  if (!Array.isArray(inputs.probes) || inputs.probes.length < 1) {
    errors.push('probes missing or empty');
  } else {
    const vps = new Set<string>();
    for (const probe of inputs.probes) {
      if (!probe.vp) errors.push('probe.vp missing');
      if (vps.has(probe.vp)) errors.push(`duplicate vp: ${probe.vp}`);
      vps.add(probe.vp);
      if (!['HTTP', 'LIBP2P'].includes(probe.method)) {
        errors.push(`invalid probe method: ${probe.method}`);
      }
      if (probe.method === 'HTTP' && !probe.gateway) {
        errors.push('probe.gateway missing for HTTP method');
      }
      if (probe.latMs !== undefined && (probe.latMs < 0 || probe.latMs > 60000)) {
        errors.push(`invalid probe.latMs: ${probe.latMs}`);
      }
    }
  }
  
  if (typeof inputs.attemptedLibp2p !== 'boolean') {
    errors.push('attemptedLibp2p must be boolean');
  }
  
  if (inputs.ts !== undefined && (!Number.isInteger(inputs.ts) || inputs.ts <= 0)) {
    errors.push('ts invalid (must be positive integer timestamp)');
  }
  
  return errors;
}

export function calculateStatus(okCount: number, targetK: number): 'OK' | 'DEGRADED' | 'BREACH' {
  if (okCount >= targetK) {
    return 'OK';
  } else if (okCount > 0) {
    return 'DEGRADED';
  } else {
    return 'BREACH';
  }
}
