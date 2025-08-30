/**
 * Tests for Evidence Pack Schema and Validation
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateEvidencePack,
  validateBuilderInputs,
  calculateStatus,
  type EvidencePackV1,
  type BuilderInputs,
  type ThresholdConfig,
} from '../schema';

describe('Evidence Pack Schema', () => {
  const validThreshold: ThresholdConfig = {
    k: 2,
    n: 3,
    timeoutMs: 5000,
  };

  const validPack: EvidencePackV1 = {
    cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    ts: 1690000000,
    probes: [
      { vp: 'us-east', method: 'HTTP', gateway: 'https://ipfs.io', ok: true, latMs: 420 },
      { vp: 'eu-west', method: 'HTTP', gateway: 'https://dweb.link', ok: true, latMs: 530 },
      { vp: 'sa-south', method: 'HTTP', gateway: 'https://cloudflare-ipfs.com', ok: false, err: 'timeout' },
    ],
    meta: {
      builder: 'CID-Sentinel-v1.0.0',
      region: 'global',
      windowMin: 5,
      threshold: validThreshold,
      attemptedLibp2p: false,
    },
    watcherSig: 'validSignatureBase64==',
    schema: 'cid-sentinel/1',
  };

  describe('validateEvidencePack', () => {
    it('should pass validation for valid pack', () => {
      const errors = validateEvidencePack(validPack);
      expect(errors).toEqual([]);
    });

    it('should fail validation for missing CID', () => {
      const invalidPack = { ...validPack, cid: '' };
      const errors = validateEvidencePack(invalidPack);
      expect(errors).toContain('cid missing');
    });

    it('should fail validation for invalid timestamp', () => {
      const invalidPack = { ...validPack, ts: -1 };
      const errors = validateEvidencePack(invalidPack);
      expect(errors).toContain('ts invalid');
    });

    it('should fail validation for windowMin out of range', () => {
      const invalidPack = {
        ...validPack,
        meta: { ...validPack.meta!, windowMin: 0 },
      };
      const errors = validateEvidencePack(invalidPack);
      expect(errors).toContain('windowMin out of range');
    });

    it('should fail validation for invalid threshold k/n', () => {
      const invalidPack = {
        ...validPack,
        meta: {
          ...validPack.meta!,
          threshold: { k: 3, n: 2, timeoutMs: 5000 }, // k > n
        },
      };
      const errors = validateEvidencePack(invalidPack);
      expect(errors).toContain('threshold k/n invalid');
    });

    it('should fail validation for timeout out of range', () => {
      const invalidPack = {
        ...validPack,
        meta: {
          ...validPack.meta!,
          threshold: { k: 2, n: 3, timeoutMs: 100 }, // too low
        },
      };
      const errors = validateEvidencePack(invalidPack);
      expect(errors).toContain('timeoutMs out of range');
    });

    it('should fail validation for empty probes', () => {
      const invalidPack = { ...validPack, probes: [] };
      const errors = validateEvidencePack(invalidPack);
      expect(errors).toContain('probes missing');
    });

    it('should fail validation for duplicate vantage points', () => {
      const invalidPack = {
        ...validPack,
        probes: [
          { vp: 'us-east', method: 'HTTP' as const, gateway: 'https://ipfs.io', ok: true, latMs: 420 },
          { vp: 'us-east', method: 'HTTP' as const, gateway: 'https://dweb.link', ok: true, latMs: 530 }, // duplicate vp
        ],
      };
      const errors = validateEvidencePack(invalidPack);
      expect(errors).toContain('duplicate vp');
    });

    it('should fail validation for HTTP probe missing gateway', () => {
      const invalidPack = {
        ...validPack,
        probes: [
          { vp: 'us-east', method: 'HTTP' as const, ok: true, latMs: 420 }, // missing gateway
        ],
      };
      const errors = validateEvidencePack(invalidPack);
      expect(errors).toContain('probe.gateway missing for HTTP');
    });

    it('should fail validation for failed probe without error', () => {
      const invalidPack = {
        ...validPack,
        probes: [
          { vp: 'us-east', method: 'HTTP' as const, gateway: 'https://ipfs.io', ok: false }, // no err
        ],
      };
      const errors = validateEvidencePack(invalidPack);
      expect(errors).toContain('probe.err missing for failed probe');
    });

    it('should work with legacy format', () => {
      const legacyPack: EvidencePackV1 = {
        cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        ts: 1690000000,
        windowMin: 5, // legacy field
        threshold: validThreshold, // legacy field
        probes: [
          { vp: 'us-east', method: 'HTTP', gateway: 'https://ipfs.io', ok: true, latMs: 420 },
        ],
        libp2p: { attempted: false },
        agg: { okCount: 1, status: 'OK' },
        watcherSig: 'validSignatureBase64==',
        schema: 'cid-sentinel/1',
      };

      const errors = validateEvidencePack(legacyPack);
      expect(errors).toEqual([]);
    });
  });

  describe('validateBuilderInputs', () => {
    const validInputs: BuilderInputs = {
      cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      windowMin: 5,
      threshold: validThreshold,
      probes: [
        { vp: 'us-east', method: 'HTTP', gateway: 'https://ipfs.io', ok: true, latMs: 420 },
        { vp: 'eu-west', method: 'HTTP', gateway: 'https://dweb.link', ok: true, latMs: 530 },
      ],
      attemptedLibp2p: false,
    };

    it('should pass validation for valid inputs', () => {
      const errors = validateBuilderInputs(validInputs);
      expect(errors).toEqual([]);
    });

    it('should fail validation for missing CID', () => {
      const invalidInputs = { ...validInputs, cid: '' };
      const errors = validateBuilderInputs(invalidInputs);
      expect(errors).toContain('cid missing or invalid');
    });

    it('should fail validation for windowMin out of range', () => {
      const invalidInputs = { ...validInputs, windowMin: 0 };
      const errors = validateBuilderInputs(invalidInputs);
      expect(errors).toContain('windowMin out of range (1-60)');
    });

    it('should fail validation for invalid threshold', () => {
      const invalidInputs = {
        ...validInputs,
        threshold: { k: 5, n: 3, timeoutMs: 5000 }, // k > n
      };
      const errors = validateBuilderInputs(invalidInputs);
      expect(errors).toContain('threshold k/n invalid (k must be 1-n, n max 10)');
    });

    it('should fail validation for empty probes', () => {
      const invalidInputs = { ...validInputs, probes: [] };
      const errors = validateBuilderInputs(invalidInputs);
      expect(errors).toContain('probes missing or empty');
    });

    it('should fail validation for invalid probe method', () => {
      const invalidInputs = {
        ...validInputs,
        probes: [
          { vp: 'us-east', method: 'INVALID' as unknown as 'HTTP', gateway: 'https://ipfs.io', ok: true },
        ],
      };
      const errors = validateBuilderInputs(invalidInputs);
      expect(errors).toContain('invalid probe method: INVALID');
    });

    it('should fail validation for invalid attemptedLibp2p', () => {
      const invalidInputs = { ...validInputs, attemptedLibp2p: 'yes' as unknown as boolean };
      const errors = validateBuilderInputs(invalidInputs);
      expect(errors).toContain('attemptedLibp2p must be boolean');
    });

    it('should fail validation for invalid timestamp', () => {
      const invalidInputs = { ...validInputs, ts: -1 };
      const errors = validateBuilderInputs(invalidInputs);
      expect(errors).toContain('ts invalid (must be positive integer timestamp)');
    });
  });

  describe('calculateStatus', () => {
    it('should return OK when okCount >= targetK', () => {
      expect(calculateStatus(3, 2)).toBe('OK');
      expect(calculateStatus(2, 2)).toBe('OK');
    });

    it('should return DEGRADED when 0 < okCount < targetK', () => {
      expect(calculateStatus(1, 2)).toBe('DEGRADED');
      expect(calculateStatus(1, 3)).toBe('DEGRADED');
    });

    it('should return BREACH when okCount = 0', () => {
      expect(calculateStatus(0, 2)).toBe('BREACH');
      expect(calculateStatus(0, 5)).toBe('BREACH');
    });
  });
});
