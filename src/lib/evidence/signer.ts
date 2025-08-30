/**
 * ed25519 Signing System for Evidence Packs
 * 
 * Handles deterministic signing and verification of Evidence Packs
 * using tweetnacl ed25519 implementation.
 */

import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { EvidencePackV1 } from './schema';

export interface WatcherKeys {
  secretKey: Uint8Array;  // 64 bytes
  publicKey: Uint8Array;  // 32 bytes
}

export interface SignerConfig {
  secretKeyBase64: string;
  publicKeyBase64: string;
}

/**
 * Generate new ed25519 key pair for testing
 */
export function generateKeys(): WatcherKeys {
  const keyPair = nacl.sign.keyPair();
  return {
    secretKey: keyPair.secretKey,
    publicKey: keyPair.publicKey,
  };
}

/**
 * Convert keys to base64 for environment variables
 */
export function keysToBase64(keys: WatcherKeys): SignerConfig {
  return {
    secretKeyBase64: encodeBase64(keys.secretKey),
    publicKeyBase64: encodeBase64(keys.publicKey),
  };
}

/**
 * Load keys from base64 environment variables
 */
export function loadKeysFromEnv(): WatcherKeys | null {
  const secretKeyBase64 = process.env.WATCHER_SECRET_KEY_BASE64;
  const publicKeyBase64 = process.env.WATCHER_PUBLIC_KEY_BASE64;
  
  if (!secretKeyBase64 || !publicKeyBase64) {
    return null;
  }
  
  try {
    return {
      secretKey: decodeBase64(secretKeyBase64),
      publicKey: decodeBase64(publicKeyBase64),
    };
  } catch (error) {
    console.error('Failed to decode watcher keys:', error);
    return null;
  }
}

/**
 * Serializa el JSON canónico excluyendo watcherSig
 */
export function canonicalizePack(pack: Omit<EvidencePackV1, 'watcherSig'>): string {
  // Ordenar claves y serializar determinísticamente
  return JSON.stringify(pack, Object.keys(pack).sort());
}

export function signEvidencePack(
  pack: Omit<EvidencePackV1, 'watcherSig'>, 
  secretKeyBase64: string
): string {
  const secretKey = decodeBase64(secretKeyBase64);
  const msg = decodeUTF8(canonicalizePack(pack));
  const sig = nacl.sign.detached(msg, secretKey);
  return encodeBase64(sig);
}

export function verifyEvidencePackSignature(
  pack: EvidencePackV1,
  publicKeyBase64: string
): boolean {
  const publicKey = decodeBase64(publicKeyBase64);
  const { watcherSig, ...rest } = pack;
  
  if (!watcherSig) {
    return false;
  }
  
  const msg = decodeUTF8(canonicalizePack(rest));
  const sig = decodeBase64(watcherSig);
  return nacl.sign.detached.verify(msg, sig, publicKey);
}

/**
 * Complete signing workflow - adds signature to pack
 */
export function completePack(
  packWithoutSig: Omit<EvidencePackV1, 'watcherSig'>,
  secretKey: Uint8Array
): EvidencePackV1 {
  const secretKeyBase64 = encodeBase64(secretKey);
  const watcherSig = signEvidencePack(packWithoutSig, secretKeyBase64);
  
  return {
    ...packWithoutSig,
    watcherSig,
  };
}

/**
 * Validate key formats
 */
export function validateKeys(keys: WatcherKeys): string | null {
  if (keys.secretKey.length !== nacl.sign.secretKeyLength) {
    return `Secret key must be ${nacl.sign.secretKeyLength} bytes, got ${keys.secretKey.length}`;
  }
  
  if (keys.publicKey.length !== nacl.sign.publicKeyLength) {
    return `Public key must be ${nacl.sign.publicKeyLength} bytes, got ${keys.publicKey.length}`;
  }
  
  return null;
}

/**
 * Test that keys work together (sign + verify)
 */
export function testKeys(keys: WatcherKeys): boolean {
  const testMessage = 'test message for key validation';
  const message = new TextEncoder().encode(testMessage);
  
  try {
    const signature = nacl.sign.detached(message, keys.secretKey);
    return nacl.sign.detached.verify(message, signature, keys.publicKey);
  } catch {
    return false;
  }
}

/**
 * Utility to generate keys for demo/testing
 */
export function generateAndLogKeys(): void {
  const keys = generateKeys();
  const config = keysToBase64(keys);
  
  console.log('Generated ed25519 keys for CID Sentinel:');
  console.log('WATCHER_SECRET_KEY_BASE64=' + config.secretKeyBase64);
  console.log('WATCHER_PUBLIC_KEY_BASE64=' + config.publicKeyBase64);
  console.log('');
  console.log('Add these to your .env.local file');
  console.log('Keep the secret key secure and never expose it in client-side code!');
}
