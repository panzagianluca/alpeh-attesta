/**
 * Browser Storage for CID Mappings
 * Stores CID hash -> original CID mappings in localStorage
 */

import { keccak256, toBytes } from 'viem'

const STORAGE_KEY = 'attesta_cid_mappings'

/**
 * Get all CID mappings from localStorage
 */
export function getCIDMappingsFromStorage(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.warn('Error reading CID mappings from storage:', error)
    return {}
  }
}

/**
 * Save a CID mapping to localStorage
 */
export function saveCIDMapping(originalCID: string): string {
  if (typeof window === 'undefined') return ''
  
  try {
    const hash = keccak256(toBytes(originalCID))
    const mappings = getCIDMappingsFromStorage()
    mappings[hash] = originalCID
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
    console.log(`✅ Saved CID mapping: ${hash} -> ${originalCID}`)
    
    return hash
  } catch (error) {
    console.error('Error saving CID mapping:', error)
    return ''
  }
}

/**
 * Get original CID from hash
 */
export function getCIDFromStorageMapping(hash: string): string | null {
  const mappings = getCIDMappingsFromStorage()
  return mappings[hash] || null
}

/**
 * Initialize with known CIDs (for demo)
 */
export function initializeKnownCIDsInStorage() {
  // Add user's known CID that's currently showing as Unknown_9e70d347
  saveCIDMapping('bafybeibyutgh5ymjdkqpdt73cg3mdz34na7xep6ethwpqgrtgz5pud67iq')
  
  // Add some famous test CIDs
  saveCIDMapping('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG') // Hello World
  saveCIDMapping('QmV9tSDx9UiPeWExXEeH6aoDvmihvx6jD5eLb4jbTaKGps') // IPFS Paper
  saveCIDMapping('QmTKZgRNwDNZwHtJSjCp6r5FYefzpULfy37JvMt9DwvXse') // Protocol Labs Logo
  saveCIDMapping('QmZTR5bcpQD7cFgTorqxZDYaew1Wqgfbd2ud9QqGPAkK2V') // IPFS ASCII Art
}

/**
 * Clear all CID mappings (for debugging)
 */
export function clearCIDMappings() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
    console.log('🗑️ Cleared all CID mappings')
  }
}
