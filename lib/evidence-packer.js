/**
 * Evidence Pack Generator
 * Creates standardized evidence packs for IPFS storage
 */

import { z } from 'zod';
import stringify from 'fast-json-stable-stringify';

/**
 * Evidence Pack Schema
 */
export const EvidencePackSchema = z.object({
  version: z.string().default('1.0.0'),
  metadata: z.object({
    cid: z.string(),
    packCID: z.string().optional(), // Set after pack creation
    timestamp: z.number(),
    packSize: z.number().optional(),
    evidenceCount: z.number(),
    creator: z.string().optional(),
    description: z.string().optional()
  }),
  slo: z.object({
    k: z.number().min(1).max(255),
    n: z.number().min(1).max(255),
    timeout: z.number().min(1),
    window: z.number().min(1)
  }),
  evidence: z.array(z.object({
    id: z.string(),
    type: z.enum(['file', 'url', 'hash', 'metadata', 'signature']),
    content: z.string(), // CID, URL, hash, or raw content
    timestamp: z.number(),
    size: z.number().optional(),
    metadata: z.record(z.any()).optional()
  })),
  integrity: z.object({
    contentHash: z.string(), // Hash of sorted evidence content
    packHash: z.string().optional(), // Set after pack creation
    signature: z.string().optional() // Optional digital signature
  })
});

/**
 * Evidence Pack Generator Class
 */
export class EvidencePackGenerator {
  constructor() {
    this.version = '1.0.0';
  }

  /**
   * Create evidence pack from evidence array
   * @param {Object} options - Pack creation options
   * @param {string} options.cid - Original CID being evidenced
   * @param {Array} options.evidence - Array of evidence items
   * @param {Object} options.slo - Service level objectives
   * @param {Object} [options.metadata] - Additional metadata
   * @returns {Promise<Object>} Generated evidence pack
   */
  async createPack({ cid, evidence, slo, metadata = {} }) {
    try {
      console.log(`📦 Creating evidence pack for CID: ${cid}`);

      // Validate input
      if (!cid || !evidence || !slo) {
        throw new Error('Missing required parameters: cid, evidence, slo');
      }

      if (!Array.isArray(evidence) || evidence.length === 0) {
        throw new Error('Evidence must be non-empty array');
      }

      // Generate timestamp
      const timestamp = Date.now();

      // Process evidence items
      const processedEvidence = await this.processEvidence(evidence);

      // Calculate content hash
      const contentHash = await this.calculateContentHash(processedEvidence);

      // Build evidence pack
      const evidencePack = {
        version: this.version,
        metadata: {
          cid,
          timestamp,
          evidenceCount: processedEvidence.length,
          packSize: 0, // Will be calculated after stringification
          creator: metadata.creator || 'cid-sentinel',
          description: metadata.description || `Evidence pack for ${cid}`,
          ...metadata
        },
        slo: {
          k: slo.k,
          n: slo.n,
          timeout: slo.timeout,
          window: slo.window
        },
        evidence: processedEvidence,
        integrity: {
          contentHash,
          packHash: '', // Will be set after CID generation
          signature: metadata.signature || null
        }
      };

      // Calculate pack size
      const packString = stringify(evidencePack);
      evidencePack.metadata.packSize = new TextEncoder().encode(packString).length;

      // Validate against schema
      const validated = EvidencePackSchema.parse(evidencePack);

      console.log(`✅ Evidence pack created (${validated.evidence.length} items, ${validated.metadata.packSize} bytes)`);
      
      return validated;
    } catch (error) {
      console.error('❌ Failed to create evidence pack:', error);
      throw new Error(`Pack creation failed: ${error.message}`);
    }
  }

  /**
   * Process and validate evidence items
   * @param {Array} evidence - Raw evidence array
   * @returns {Promise<Array>} Processed evidence items
   */
  async processEvidence(evidence) {
    const processed = [];

    for (let i = 0; i < evidence.length; i++) {
      const item = evidence[i];
      
      try {
        const processedItem = await this.processEvidenceItem(item, i);
        processed.push(processedItem);
      } catch (error) {
        console.error(`❌ Failed to process evidence item ${i}:`, error);
        throw new Error(`Evidence item ${i} processing failed: ${error.message}`);
      }
    }

    return processed;
  }

  /**
   * Process individual evidence item
   * @param {Object} item - Evidence item
   * @param {number} index - Item index
   * @returns {Promise<Object>} Processed evidence item
   */
  async processEvidenceItem(item, index) {
    // Generate ID if not provided
    const id = item.id || `evidence_${index}_${Date.now()}`;
    
    // Determine type
    let type = item.type;
    if (!type) {
      if (item.content?.startsWith('http')) {
        type = 'url';
      } else if (item.content?.match(/^[a-zA-Z0-9]{46,59}$/)) {
        type = 'hash'; // Likely a CID or hash
      } else {
        type = 'metadata';
      }
    }

    // Calculate size if content is string
    let size = item.size;
    if (!size && typeof item.content === 'string') {
      size = new TextEncoder().encode(item.content).length;
    }

    return {
      id,
      type,
      content: item.content,
      timestamp: item.timestamp || Date.now(),
      size: size || 0,
      metadata: item.metadata || {}
    };
  }

  /**
   * Calculate deterministic content hash
   * @param {Array} evidence - Processed evidence array
   * @returns {Promise<string>} Content hash
   */
  async calculateContentHash(evidence) {
    try {
      // Sort evidence by ID for deterministic hashing
      const sortedEvidence = [...evidence].sort((a, b) => a.id.localeCompare(b.id));
      
      // Create hash input
      const hashInput = sortedEvidence.map(item => ({
        id: item.id,
        type: item.type,
        content: item.content,
        timestamp: item.timestamp
      }));

      // Stringify deterministically
      const hashString = stringify(hashInput);
      
      // Calculate SHA-256 hash
      const encoder = new TextEncoder();
      const data = encoder.encode(hashString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      console.error('❌ Content hash calculation failed:', error);
      throw new Error(`Content hash failed: ${error.message}`);
    }
  }

  /**
   * Update pack with generated CID
   * @param {Object} pack - Evidence pack
   * @param {string} packCID - Generated pack CID
   * @returns {Object} Updated pack
   */
  updatePackCID(pack, packCID) {
    const updatedPack = { ...pack };
    updatedPack.metadata.packCID = packCID;
    updatedPack.integrity.packHash = packCID;
    return updatedPack;
  }

  /**
   * Extract evidence summary from pack
   * @param {Object} pack - Evidence pack
   * @returns {Object} Evidence summary
   */
  extractSummary(pack) {
    return {
      cid: pack.metadata.cid,
      packCID: pack.metadata.packCID,
      timestamp: pack.metadata.timestamp,
      evidenceCount: pack.metadata.evidenceCount,
      packSize: pack.metadata.packSize,
      contentHash: pack.integrity.contentHash,
      version: pack.version,
      slo: pack.slo
    };
  }

  /**
   * Validate evidence pack structure
   * @param {Object} pack - Evidence pack to validate
   * @returns {boolean} True if valid
   */
  validatePack(pack) {
    try {
      EvidencePackSchema.parse(pack);
      return true;
    } catch (error) {
      console.error('❌ Pack validation failed:', error);
      return false;
    }
  }

  /**
   * Generate mock evidence for testing
   * @param {number} count - Number of evidence items
   * @returns {Array} Mock evidence array
   */
  generateMockEvidence(count = 3) {
    const evidence = [];
    const timestamp = Date.now();

    for (let i = 0; i < count; i++) {
      evidence.push({
        id: `mock_evidence_${i}`,
        type: i % 3 === 0 ? 'file' : i % 3 === 1 ? 'url' : 'hash',
        content: i % 3 === 0 
          ? `QmMockFile${i}Hash123456789` 
          : i % 3 === 1 
          ? `https://example.com/evidence/${i}` 
          : `hash_${i}_${timestamp}`,
        timestamp: timestamp + i * 1000,
        metadata: {
          source: 'mock',
          index: i
        }
      });
    }

    return evidence;
  }
}

// Export singleton instance
export const evidencePackGenerator = new EvidencePackGenerator();

// Export class for custom instances
export default EvidencePackGenerator;
