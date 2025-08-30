/**
 * Evidence Pack Builder System - Main Exports
 * 
 * This module provides a complete system for creating, signing,
 * and uploading Evidence Packs to IPFS.
 */

// Core interfaces and types
export type {
  EvidencePackV1,
  ProbeResult,
  BuilderInputs,
} from './schema';

export {
  validateEvidencePack,
  validateBuilderInputs,
  calculateStatus,
} from './schema';

// Signing system
export type {
  WatcherKeys,
  SignerConfig,
} from './signer';

export {
  generateKeys,
  keysToBase64,
  loadKeysFromEnv,
  signEvidencePack,
  verifyEvidencePackSignature,
  completePack,
  validateKeys,
  testKeys,
  canonicalizePack,
} from './signer';

// IPFS integration
export type {
  IPFSConfig,
  UploadResult,
  UploadError,
  UploadResponse,
} from './ipfs';

export {
  createIPFSClient,
  uploadEvidencePack,
  verifyPackAccess,
  uploadWithRetry,
  validateConfig,
} from './ipfs';

// Builder system
export type {
  BuilderConfig,
  BuildResult,
  BuildError,
  BuildResponse,
} from './builder';

export {
  EvidencePackBuilder,
  buildEvidencePack,
  createMinimalEvidencePack,
  logBuilderOperation,
} from './builder';

// Convenience function for end-to-end workflow
import type { BuilderConfig, BuildResponse } from './builder';
import type { BuilderInputs } from './schema';
import { buildEvidencePack } from './builder';

export async function createAndUploadEvidencePack(
  inputs: BuilderInputs,
  config?: BuilderConfig
): Promise<BuildResponse> {
  return buildEvidencePack(inputs, config);
}

// Version info
export const VERSION = '1.0.0';
export const SCHEMA_VERSION = '1' as const;
