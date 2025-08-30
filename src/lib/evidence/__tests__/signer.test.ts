/**
 * Tests for ed25519 Signing System
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  generateKeys,
  keysToBase64,
  loadKeysFromEnv,
  canonicalizePack,
  signEvidencePack,
  verifyEvidencePackSignature,
  completePack,
  validateKeys,
  testKeys as testKeyPair,
  type WatcherKeys,
} from '../signer';
import type { EvidencePackV1 } from '../schema';

describe('ed25519 Signing System', () => {
  let keyPair: WatcherKeys;
  let keyPairBase64: { secretKeyBase64: string; publicKeyBase64: string };

  beforeAll(() => {
    keyPair = generateKeys();
    keyPairBase64 = keysToBase64(keyPair);
  });

  const samplePackWithoutSig: Omit<EvidencePackV1, 'watcherSig'> = {
    cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    ts: 1690000000,
    probes: [
      { vp: 'us-east', method: 'HTTP', gateway: 'https://ipfs.io', ok: true, latMs: 420 },
      { vp: 'eu-west', method: 'HTTP', gateway: 'https://dweb.link', ok: false, err: 'timeout' },
    ],
    meta: {
      builder: 'CID-Sentinel-v1.0.0',
      region: 'global',
      windowMin: 5,
      threshold: { k: 2, n: 3, timeoutMs: 5000 },
      attemptedLibp2p: false,
    },
  };

  describe('generateKeys', () => {
    it('should generate valid ed25519 key pair', () => {
      const keys = generateKeys();
      expect(keys.secretKey).toHaveLength(64); // ed25519 secret key length
      expect(keys.publicKey).toHaveLength(32); // ed25519 public key length
    });

    it('should generate different keys each time', () => {
      const keys1 = generateKeys();
      const keys2 = generateKeys();
      expect(keys1.secretKey).not.toEqual(keys2.secretKey);
      expect(keys1.publicKey).not.toEqual(keys2.publicKey);
    });
  });

  describe('keysToBase64', () => {
    it('should convert keys to base64 format', () => {
      const base64Keys = keysToBase64(keyPair);
      expect(typeof base64Keys.secretKeyBase64).toBe('string');
      expect(typeof base64Keys.publicKeyBase64).toBe('string');
      expect(base64Keys.secretKeyBase64.length).toBeGreaterThan(80); // base64 encoded 64 bytes
      expect(base64Keys.publicKeyBase64.length).toBeGreaterThan(40); // base64 encoded 32 bytes
    });
  });

  describe('loadKeysFromEnv', () => {
    it('should return null when env vars not set', () => {
      const originalSecret = process.env.WATCHER_SECRET_KEY_BASE64;
      const originalPublic = process.env.WATCHER_PUBLIC_KEY_BASE64;

      delete process.env.WATCHER_SECRET_KEY_BASE64;
      delete process.env.WATCHER_PUBLIC_KEY_BASE64;

      const keys = loadKeysFromEnv();
      expect(keys).toBeNull();

      // Restore env vars
      if (originalSecret) process.env.WATCHER_SECRET_KEY_BASE64 = originalSecret;
      if (originalPublic) process.env.WATCHER_PUBLIC_KEY_BASE64 = originalPublic;
    });

    it('should load keys from env vars when available', () => {
      const originalSecret = process.env.WATCHER_SECRET_KEY_BASE64;
      const originalPublic = process.env.WATCHER_PUBLIC_KEY_BASE64;

      process.env.WATCHER_SECRET_KEY_BASE64 = keyPairBase64.secretKeyBase64;
      process.env.WATCHER_PUBLIC_KEY_BASE64 = keyPairBase64.publicKeyBase64;

      const keys = loadKeysFromEnv();
      expect(keys).not.toBeNull();
      expect(keys?.secretKey).toEqual(keyPair.secretKey);
      expect(keys?.publicKey).toEqual(keyPair.publicKey);

      // Restore env vars
      if (originalSecret) process.env.WATCHER_SECRET_KEY_BASE64 = originalSecret;
      else delete process.env.WATCHER_SECRET_KEY_BASE64;
      if (originalPublic) process.env.WATCHER_PUBLIC_KEY_BASE64 = originalPublic;
      else delete process.env.WATCHER_PUBLIC_KEY_BASE64;
    });
  });

  describe('canonicalizePack', () => {
    it('should produce deterministic JSON', () => {
      const pack1 = { ...samplePackWithoutSig };
      const pack2 = { ts: pack1.ts, cid: pack1.cid, probes: pack1.probes, meta: pack1.meta };

      const canonical1 = canonicalizePack(pack1);
      const canonical2 = canonicalizePack(pack2);

      expect(canonical1).toBe(canonical2);
    });

    it('should sort keys alphabetically', () => {
      const canonical = canonicalizePack(samplePackWithoutSig);
      const parsed = JSON.parse(canonical);
      const keys = Object.keys(parsed);
      const sortedKeys = [...keys].sort();
      expect(keys).toEqual(sortedKeys);
    });
  });

  describe('signEvidencePack', () => {
    it('should create valid signature', () => {
      const signature = signEvidencePack(samplePackWithoutSig, keyPairBase64.secretKeyBase64);
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(80); // base64 encoded signature
    });

    it('should produce same signature for same input', () => {
      const sig1 = signEvidencePack(samplePackWithoutSig, keyPairBase64.secretKeyBase64);
      const sig2 = signEvidencePack(samplePackWithoutSig, keyPairBase64.secretKeyBase64);
      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different keys', () => {
      const otherKeys = generateKeys();
      const otherKeysBase64 = keysToBase64(otherKeys);

      const sig1 = signEvidencePack(samplePackWithoutSig, keyPairBase64.secretKeyBase64);
      const sig2 = signEvidencePack(samplePackWithoutSig, otherKeysBase64.secretKeyBase64);
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifyEvidencePackSignature', () => {
    it('should verify valid signature', () => {
      const packWithSig = completePack(samplePackWithoutSig, keyPair.secretKey);
      const isValid = verifyEvidencePackSignature(packWithSig, keyPairBase64.publicKeyBase64);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const packWithSig = completePack(samplePackWithoutSig, keyPair.secretKey);
      const otherKeys = generateKeys();
      const otherKeysBase64 = keysToBase64(otherKeys);

      const isValid = verifyEvidencePackSignature(packWithSig, otherKeysBase64.publicKeyBase64);
      expect(isValid).toBe(false);
    });

    it('should reject pack without signature', () => {
      const packWithoutSig = { ...samplePackWithoutSig } as EvidencePackV1;
      const isValid = verifyEvidencePackSignature(packWithoutSig, keyPairBase64.publicKeyBase64);
      expect(isValid).toBe(false);
    });

    it('should reject tampered pack', () => {
      const packWithSig = completePack(samplePackWithoutSig, keyPair.secretKey);
      const tamperedPack = { ...packWithSig, ts: packWithSig.ts + 1 }; // tamper with timestamp

      const isValid = verifyEvidencePackSignature(tamperedPack, keyPairBase64.publicKeyBase64);
      expect(isValid).toBe(false);
    });
  });

  describe('completePack', () => {
    it('should add valid signature to pack', () => {
      const completedPack = completePack(samplePackWithoutSig, keyPair.secretKey);
      
      expect(completedPack.watcherSig).toBeDefined();
      expect(typeof completedPack.watcherSig).toBe('string');
      expect(completedPack.cid).toBe(samplePackWithoutSig.cid);
      expect(completedPack.ts).toBe(samplePackWithoutSig.ts);
    });

    it('should create verifiable pack', () => {
      const completedPack = completePack(samplePackWithoutSig, keyPair.secretKey);
      const isValid = verifyEvidencePackSignature(completedPack, keyPairBase64.publicKeyBase64);
      expect(isValid).toBe(true);
    });
  });

  describe('validateKeys', () => {
    it('should pass validation for valid keys', () => {
      const error = validateKeys(keyPair);
      expect(error).toBeNull();
    });

    it('should fail validation for invalid secret key length', () => {
      const invalidKeys = {
        secretKey: new Uint8Array(32), // wrong length
        publicKey: keyPair.publicKey,
      };
      const error = validateKeys(invalidKeys);
      expect(error).toContain('Secret key must be 64 bytes');
    });

    it('should fail validation for invalid public key length', () => {
      const invalidKeys = {
        secretKey: keyPair.secretKey,
        publicKey: new Uint8Array(16), // wrong length
      };
      const error = validateKeys(invalidKeys);
      expect(error).toContain('Public key must be 32 bytes');
    });
  });

  describe('testKeys', () => {
    it('should pass test for valid key pair', () => {
      const isValid = testKeyPair(keyPair);
      expect(isValid).toBe(true);
    });

    it('should fail test for mismatched keys', () => {
      const otherKeys = generateKeys();
      const mismatchedKeys = {
        secretKey: keyPair.secretKey,
        publicKey: otherKeys.publicKey, // mismatched
      };
      const isValid = testKeyPair(mismatchedKeys);
      expect(isValid).toBe(false);
    });
  });
});
