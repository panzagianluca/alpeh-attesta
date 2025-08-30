/**
 * CID Mapping Service
 * Maps CID hashes back to original CID strings
 * This is a temporary solution until we implement proper on-chain CID storage
 */

import { keccak256, toBytes } from 'viem'

// Known CID mappings (can be extended)
const KNOWN_CID_MAPPINGS: Record<string, string> = {
  // Add known CIDs here
  // The key is the keccak256 hash of the CID, the value is the original CID
}

/**
 * Add a CID mapping
 */
export function addCIDMapping(originalCID: string): string {
  const hash = keccak256(toBytes(originalCID))
  KNOWN_CID_MAPPINGS[hash] = originalCID
  console.log(`✅ Added CID mapping: ${hash} -> ${originalCID}`)
  return hash
}

/**
 * Get original CID from hash
 */
export function getCIDFromHash(hash: string): string | null {
  return KNOWN_CID_MAPPINGS[hash] || null
}

/**
 * Initialize with known CIDs
 */
export function initializeKnownCIDs() {
  // Add user's known CID
  addCIDMapping('bafybeibyutgh5ymjdkqpdt73cg3mdz34na7xep6ethwpqgrtgz5pud67iq')
  
  // Add some famous test CIDs
  addCIDMapping('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG') // Hello World
  addCIDMapping('QmV9tSDx9UiPeWExXEeH6aoDvmihvx6jD5eLb4jbTaKGps') // IPFS Paper
  addCIDMapping('QmTKZgRNwDNZwHtJSjCp6r5FYefzpULfy37JvMt9DwvXse') // Protocol Labs Logo
  addCIDMapping('QmZTR5bcpQD7cFgTorqxZDYaew1Wqgfbd2ud9QqGPAkK2V') // IPFS ASCII Art
  addCIDMapping('QmYHnEfru4Rd3DgHg628W2dNbqRwHzk7NHRvWMHLBNnbft') // IPFS Docs
}

/**
 * Get all mapped CIDs
 */
export function getAllMappedCIDs(): Record<string, string> {
  return { ...KNOWN_CID_MAPPINGS }
}
