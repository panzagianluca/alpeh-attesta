/**
 * IPFS Client Configuration for Evidence Pipeline
 * Uses Helia for browser and Node.js compatibility
 */

import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { json } from '@helia/json';
import { CID } from 'multiformats/cid';
import * as Block from 'multiformats/block';
import * as codec from 'multiformats/codecs/json';
import { sha256 } from 'multiformats/hashes/sha2';

/**
 * IPFS Client wrapper for evidence operations
 */
export class EvidenceIPFS {
  constructor() {
    this.helia = null;
    this.fs = null;
    this.jsonStorage = null;
    this.initialized = false;
  }

  /**
   * Initialize IPFS client
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('🌐 Initializing IPFS client...');
      
      // Create Helia instance
      this.helia = await createHelia({
        // Configure for evidence handling
        blockstore: {
          // In-memory for demo, can be configured for persistence
        },
        datastore: {
          // Configure datastore if needed
        }
      });

      // Initialize UnixFS for file operations
      this.fs = unixfs(this.helia);
      
      // Initialize JSON storage for structured evidence
      this.jsonStorage = json(this.helia);

      this.initialized = true;
      console.log('✅ IPFS client initialized');
      
      return this.helia;
    } catch (error) {
      console.error('❌ IPFS initialization failed:', error);
      throw new Error(`IPFS init failed: ${error.message}`);
    }
  }

  /**
   * Store evidence pack as JSON
   * @param {Object} evidencePack - Structured evidence pack
   * @returns {Promise<string>} CID string
   */
  async storeEvidencePack(evidencePack) {
    await this.init();

    try {
      console.log('📦 Storing evidence pack to IPFS...');
      
      // Validate pack structure
      if (!evidencePack || typeof evidencePack !== 'object') {
        throw new Error('Invalid evidence pack structure');
      }

      // Store as JSON
      const cid = await this.jsonStorage.add(evidencePack);
      const cidString = cid.toString();

      console.log(`✅ Evidence pack stored: ${cidString}`);
      return cidString;
    } catch (error) {
      console.error('❌ Failed to store evidence pack:', error);
      throw new Error(`Store failed: ${error.message}`);
    }
  }

  /**
   * Retrieve evidence pack by CID
   * @param {string} cidString - CID to retrieve
   * @returns {Promise<Object>} Evidence pack object
   */
  async retrieveEvidencePack(cidString) {
    await this.init();

    try {
      console.log(`📥 Retrieving evidence pack: ${cidString}`);
      
      // Parse CID
      const cid = CID.parse(cidString);
      
      // Retrieve from IPFS
      const evidencePack = await this.jsonStorage.get(cid);

      console.log('✅ Evidence pack retrieved');
      return evidencePack;
    } catch (error) {
      console.error('❌ Failed to retrieve evidence pack:', error);
      throw new Error(`Retrieve failed: ${error.message}`);
    }
  }

  /**
   * Store raw file data (for binary evidence)
   * @param {Uint8Array|string} data - Raw data to store
   * @returns {Promise<string>} CID string
   */
  async storeFile(data) {
    await this.init();

    try {
      console.log('📄 Storing file to IPFS...');
      
      // Convert string to Uint8Array if needed
      const bytes = typeof data === 'string' 
        ? new TextEncoder().encode(data)
        : data;

      // Store using UnixFS
      const cid = await this.fs.addBytes(bytes);
      const cidString = cid.toString();

      console.log(`✅ File stored: ${cidString}`);
      return cidString;
    } catch (error) {
      console.error('❌ Failed to store file:', error);
      throw new Error(`File store failed: ${error.message}`);
    }
  }

  /**
   * Retrieve raw file data
   * @param {string} cidString - CID to retrieve
   * @returns {Promise<Uint8Array>} Raw file data
   */
  async retrieveFile(cidString) {
    await this.init();

    try {
      console.log(`📄 Retrieving file: ${cidString}`);
      
      // Parse CID
      const cid = CID.parse(cidString);
      
      // Retrieve bytes
      const bytes = await this.fs.cat(cid);
      
      console.log('✅ File retrieved');
      return bytes;
    } catch (error) {
      console.error('❌ Failed to retrieve file:', error);
      throw new Error(`File retrieve failed: ${error.message}`);
    }
  }

  /**
   * Generate deterministic CID for data (without storing)
   * @param {Object|string|Uint8Array} data - Data to generate CID for
   * @returns {Promise<string>} CID string
   */
  async generateCID(data) {
    try {
      let bytes;
      
      if (typeof data === 'object' && !(data instanceof Uint8Array)) {
        // JSON object - encode as JSON
        const encoded = codec.encode(data);
        bytes = encoded;
      } else if (typeof data === 'string') {
        // String - encode as UTF-8
        bytes = new TextEncoder().encode(data);
      } else {
        // Assume Uint8Array
        bytes = data;
      }

      // Create block and get CID
      const block = await Block.encode({
        value: bytes,
        codec,
        hasher: sha256
      });

      return block.cid.toString();
    } catch (error) {
      console.error('❌ Failed to generate CID:', error);
      throw new Error(`CID generation failed: ${error.message}`);
    }
  }

  /**
   * Verify CID matches data
   * @param {string} cidString - Expected CID
   * @param {Object|string|Uint8Array} data - Data to verify
   * @returns {Promise<boolean>} True if CID matches
   */
  async verifyCID(cidString, data) {
    try {
      const generatedCID = await this.generateCID(data);
      return generatedCID === cidString;
    } catch (error) {
      console.error('❌ CID verification failed:', error);
      return false;
    }
  }

  /**
   * Get IPFS node info
   * @returns {Promise<Object>} Node information
   */
  async getNodeInfo() {
    await this.init();
    
    try {
      const peerId = this.helia.libp2p.peerId;
      const addresses = this.helia.libp2p.getMultiaddrs();
      
      return {
        peerId: peerId.toString(),
        addresses: addresses.map(addr => addr.toString()),
        initialized: this.initialized
      };
    } catch (error) {
      console.error('❌ Failed to get node info:', error);
      throw new Error(`Node info failed: ${error.message}`);
    }
  }

  /**
   * Cleanup and stop IPFS client
   */
  async stop() {
    if (this.helia) {
      console.log('🛑 Stopping IPFS client...');
      await this.helia.stop();
      this.initialized = false;
      console.log('✅ IPFS client stopped');
    }
  }
}

// Export singleton instance
export const evidenceIPFS = new EvidenceIPFS();

// Export class for custom instances
export default EvidenceIPFS;
