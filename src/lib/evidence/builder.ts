/**
 * Evidence Pack Builder
 * 
 * Central orchestrator that combines:
 * 1. Monitoring data from CID probes
 * 2. JSON schema validation
 * 3. Ed25519 signing
 * 4. IPFS storage
 * 
 * This is the core component that transforms probe results into
 * signed, verifiable Evidence Packs stored on IPFS.
 */

import type { 
  EvidencePackV1, 
  BuilderInputs,
  ProbeResult
} from './schema';
import { validateBuilderInputs, calculateStatus } from './schema';
import { completePack, verifyEvidencePackSignature } from './signer';
import { uploadWithRetry, verifyPackAccess, type IPFSConfig } from './ipfs';

export interface BuilderConfig {
  ipfs?: IPFSConfig;
  signingKeyPair?: {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  };
  retryAttempts?: number;
  verifyUpload?: boolean;
}

export interface BuildResult {
  success: true;
  evidencePack: EvidencePackV1;
  ipfsCID: string;
  signature: string;
  buildTimeMs: number;
  uploadSizeBytes: number;
  status: 'OK' | 'DEGRADED' | 'BREACH';
}

export interface BuildError {
  success: false;
  error: string;
  stage: 'validation' | 'signing' | 'upload' | 'verification';
  details?: unknown;
  buildTimeMs: number;
}

export type BuildResponse = BuildResult | BuildError;

/**
 * Main Evidence Pack Builder class
 */
export class EvidencePackBuilder {
  private config: Required<BuilderConfig>;
  
  constructor(config: BuilderConfig = {}) {
    this.config = {
      ipfs: config.ipfs || {},
      signingKeyPair: config.signingKeyPair || this.generateKeyPair(),
      retryAttempts: config.retryAttempts || 2,
      verifyUpload: config.verifyUpload ?? true,
    };
  }
  
  /**
   * Generate new ed25519 key pair for signing
   */
  private generateKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
    // This would use tweetnacl in practice, but for now we'll simulate
    const secretKey = new Uint8Array(64).fill(0).map((_, i) => i % 256);
    const publicKey = new Uint8Array(32).fill(0).map((_, i) => (i * 7) % 256);
    
    return { publicKey, secretKey };
  }
  
  /**
   * Build Evidence Pack from monitoring inputs
   */
  async buildEvidencePack(inputs: BuilderInputs): Promise<BuildResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Validate inputs
      const inputValidation = validateBuilderInputs(inputs);
      if (inputValidation) {
        return {
          success: false,
          error: 'Invalid builder inputs',
          stage: 'validation',
          details: inputValidation,
          buildTimeMs: Date.now() - startTime,
        };
      }
      
      // 2. Calculate availability metrics
      const okCount = inputs.probes.filter((p: ProbeResult) => p.ok).length;
      const actualAvailability = okCount / inputs.probes.length;
      const status = calculateStatus(okCount, inputs.threshold.k);
      
      // 3. Create Evidence Pack structure (without signature)
      const packWithoutSig: Omit<EvidencePackV1, 'watcherSig'> = {
        cid: inputs.cid,
        ts: inputs.ts || Date.now(),
        probes: inputs.probes, // Use probes directly as they match ProbeResult interface
        slo: {
          target: inputs.threshold.k / inputs.threshold.n, // Convert k/n to ratio
          actual: actualAvailability,
          breach: status === 'BREACH',
        },
        meta: {
          builder: 'CID-Sentinel-v1.0.0',
          region: 'global',
          windowMin: inputs.windowMin,
          threshold: inputs.threshold,
          attemptedLibp2p: inputs.attemptedLibp2p,
        },
      };
      
      // 4. Sign the pack
      let evidencePack: EvidencePackV1;
      try {
        evidencePack = completePack(packWithoutSig, this.config.signingKeyPair.secretKey);
      } catch (error) {
        return {
          success: false,
          error: `Signing failed: ${error}`,
          stage: 'signing',
          details: error,
          buildTimeMs: Date.now() - startTime,
        };
      }
      
      // 5. Upload to IPFS
      const uploadResult = await uploadWithRetry(
        evidencePack,
        this.config.retryAttempts,
        this.config.ipfs
      );
      
      if (!uploadResult.success) {
        return {
          success: false,
          error: `IPFS upload failed: ${uploadResult.error}`,
          stage: 'upload',
          details: uploadResult,
          buildTimeMs: Date.now() - startTime,
        };
      }
      
      // 6. Verify upload if requested
      if (this.config.verifyUpload) {
        try {
          const verificationResults = await verifyPackAccess(
            uploadResult.cid,
            evidencePack,
            3000 // 3 second timeout
          );
          
          const successfulGateways = verificationResults.filter(r => r.success);
          if (successfulGateways.length === 0) {
            return {
              success: false,
              error: 'Upload verification failed on all gateways',
              stage: 'verification',
              details: verificationResults,
              buildTimeMs: Date.now() - startTime,
            };
          }
        } catch (error) {
          // Verification failure is not critical, just log it
          console.warn('Upload verification failed:', error);
        }
      }
      
      // 7. Return successful result
      return {
        success: true,
        evidencePack,
        ipfsCID: uploadResult.cid,
        signature: evidencePack.watcherSig || '',
        buildTimeMs: Date.now() - startTime,
        uploadSizeBytes: uploadResult.size,
        status,
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Unexpected error: ${error}`,
        stage: 'validation',
        details: error,
        buildTimeMs: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Verify an existing Evidence Pack
   */
  async verifyEvidencePack(
    pack: EvidencePackV1,
    publicKey?: Uint8Array
  ): Promise<{ valid: boolean; error?: string; details?: unknown }> {
    try {
      if (!pack.watcherSig) {
        return {
          valid: false,
          error: 'Pack has no signature',
        };
      }
      
      // Verify signature
      const keyToUse = publicKey ? Buffer.from(publicKey).toString('base64') : 
                      Buffer.from(this.config.signingKeyPair.publicKey).toString('base64');
      const signatureValid = verifyEvidencePackSignature(pack, keyToUse);
      
      if (!signatureValid) {
        return {
          valid: false,
          error: 'Invalid signature',
        };
      }
      
      return { valid: true };
      
    } catch (error) {
      return {
        valid: false,
        error: `Verification error: ${error}`,
        details: error,
      };
    }
  }
  
  /**
   * Get builder configuration info
   */
  getConfig(): {
    publicKey: string;
    retryAttempts: number;
    verifyUpload: boolean;
  } {
    return {
      publicKey: Buffer.from(this.config.signingKeyPair.publicKey).toString('hex'),
      retryAttempts: this.config.retryAttempts,
      verifyUpload: this.config.verifyUpload,
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(updates: Partial<BuilderConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      ipfs: { ...this.config.ipfs, ...updates.ipfs },
    };
  }
}

/**
 * Convenience function to build Evidence Pack
 */
export async function buildEvidencePack(
  inputs: BuilderInputs,
  config?: BuilderConfig
): Promise<BuildResponse> {
  const builder = new EvidencePackBuilder(config);
  return builder.buildEvidencePack(inputs);
}

/**
 * Create Evidence Pack from minimal probe data
 */
export function createMinimalEvidencePack(
  cid: string,
  isAvailable: boolean,
  probeCount: number = 3,
  kOfN: { k: number; n: number } = { k: 2, n: 3 }
): BuilderInputs {
  const timestamp = Date.now();
  
  // Simulate probe results
  const probes: ProbeResult[] = Array.from({ length: probeCount }, (_, i) => ({
    vp: `probe-${i + 1}`,
    method: 'HTTP' as const,
    gateway: `gateway-${i + 1}.example.com`,
    ok: isAvailable,
    latMs: isAvailable ? 50 + Math.random() * 200 : undefined,
    err: isAvailable ? undefined : 'Connection timeout',
  }));
  
  return {
    cid,
    windowMin: 5,
    threshold: {
      k: kOfN.k,
      n: kOfN.n,
      timeoutMs: 5000,
    },
    probes,
    attemptedLibp2p: false,
    ts: timestamp,
  };
}

/**
 * Log builder operation for observability
 */
export function logBuilderOperation(
  operation: 'build' | 'verify',
  result: BuildResponse | { valid: boolean; error?: string },
  cid: string,
  durationMs: number
): void {
  const success = 'success' in result ? result.success : result.valid;
  const error = 'success' in result && result.success === false ? result.error : 
                'valid' in result && result.valid === false ? result.error : undefined;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation,
    cid: cid.slice(0, 12) + '...',
    success,
    durationMs,
    error,
  };
  
  if (logEntry.success) {
    console.log(`Evidence Pack ${operation} successful:`, logEntry);
  } else {
    console.error(`Evidence Pack ${operation} failed:`, logEntry);
  }
}
