/**
 * Evidence Pipeline
 * Orchestrates evidence pack creation, IPFS storage, validation, and retrieval
 */

import { evidenceIPFS } from './ipfs-client.js';
import { evidencePackGenerator } from './evidence-packer.js';
import { evidencePackValidator } from './pack-validator.js';

/**
 * Pipeline result structure
 */
export const PipelineResult = {
  success: false,
  cid: null,
  packCID: null,
  pack: null,
  validation: null,
  errors: [],
  metadata: {
    processingTime: 0,
    packSize: 0,
    evidenceCount: 0
  }
};

/**
 * Evidence Pipeline Class
 */
export class EvidencePipeline {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize pipeline (starts IPFS client)
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('🚀 Initializing Evidence Pipeline...');
      await evidenceIPFS.init();
      this.initialized = true;
      console.log('✅ Evidence Pipeline ready');
    } catch (error) {
      console.error('❌ Pipeline initialization failed:', error);
      throw new Error(`Pipeline init failed: ${error.message}`);
    }
  }

  /**
   * Process evidence through complete pipeline
   * @param {Object} options - Processing options
   * @param {string} options.cid - Original CID being evidenced
   * @param {Array} options.evidence - Array of evidence items
   * @param {Object} options.slo - Service level objectives
   * @param {Object} [options.metadata] - Additional metadata
   * @param {boolean} [options.validate] - Validate pack before storage (default: true)
   * @param {boolean} [options.store] - Store to IPFS (default: true)
   * @returns {Promise<Object>} Pipeline result
   */
  async processEvidence({ cid, evidence, slo, metadata = {}, validate = true, store = true }) {
    const startTime = Date.now();
    const result = { ...PipelineResult };

    try {
      await this.init();
      
      console.log(`📊 Processing evidence for CID: ${cid}`);
      result.cid = cid;

      // 1. Create evidence pack
      console.log('📦 Creating evidence pack...');
      const pack = await evidencePackGenerator.createPack({
        cid,
        evidence,
        slo,
        metadata
      });

      result.pack = pack;
      result.metadata.evidenceCount = pack.evidence.length;
      result.metadata.packSize = pack.metadata.packSize;

      // 2. Validate pack (optional)
      if (validate) {
        console.log('🔍 Validating evidence pack...');
        const validation = await evidencePackValidator.validatePack(pack, {
          skipCIDCheck: true // Skip CID check since we haven't stored yet
        });

        result.validation = validation;

        if (!validation.valid) {
          result.errors = validation.errors;
          result.metadata.processingTime = Date.now() - startTime;
          console.log('❌ Pack validation failed');
          return result;
        }
      }

      // 3. Store to IPFS (optional)
      if (store) {
        console.log('📤 Storing to IPFS...');
        const packCID = await evidenceIPFS.storeEvidencePack(pack);
        
        // Update pack with CID
        const updatedPack = evidencePackGenerator.updatePackCID(pack, packCID);
        
        result.packCID = packCID;
        result.pack = updatedPack;

        // Re-validate with CID if initial validation was done
        if (validate) {
          console.log('🔍 Re-validating with CID...');
          const cidValidation = await evidencePackValidator.validatePack(updatedPack);
          result.validation = cidValidation;

          if (!cidValidation.valid) {
            result.errors = cidValidation.errors;
            result.metadata.processingTime = Date.now() - startTime;
            console.log('❌ CID validation failed');
            return result;
          }
        }
      }

      // Success
      result.success = true;
      result.metadata.processingTime = Date.now() - startTime;

      console.log(`✅ Evidence processing complete (${result.metadata.processingTime}ms)`);
      console.log(`   Pack CID: ${result.packCID}`);
      console.log(`   Evidence Count: ${result.metadata.evidenceCount}`);
      console.log(`   Pack Size: ${result.metadata.packSize} bytes`);

      return result;
    } catch (error) {
      console.error('❌ Evidence processing failed:', error);
      result.errors.push(error.message);
      result.metadata.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Retrieve and validate evidence pack from IPFS
   * @param {string} packCID - Pack CID to retrieve
   * @param {boolean} [validate] - Validate retrieved pack (default: true)
   * @returns {Promise<Object>} Retrieval result
   */
  async retrieveEvidence(packCID, validate = true) {
    const startTime = Date.now();
    const result = { ...PipelineResult };

    try {
      await this.init();
      
      console.log(`📥 Retrieving evidence pack: ${packCID}`);
      result.packCID = packCID;

      // Retrieve pack from IPFS
      const pack = await evidenceIPFS.retrieveEvidencePack(packCID);
      result.pack = pack;
      result.cid = pack.metadata?.cid;
      result.metadata.evidenceCount = pack.evidence?.length || 0;
      result.metadata.packSize = pack.metadata?.packSize || 0;

      // Validate retrieved pack
      if (validate) {
        console.log('🔍 Validating retrieved pack...');
        const validation = await evidencePackValidator.validatePack(pack);
        result.validation = validation;

        if (!validation.valid) {
          result.errors = validation.errors;
          result.metadata.processingTime = Date.now() - startTime;
          console.log('❌ Retrieved pack validation failed');
          return result;
        }
      }

      result.success = true;
      result.metadata.processingTime = Date.now() - startTime;

      console.log(`✅ Evidence retrieval complete (${result.metadata.processingTime}ms)`);
      
      return result;
    } catch (error) {
      console.error('❌ Evidence retrieval failed:', error);
      result.errors.push(error.message);
      result.metadata.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Create and store evidence pack for demo/testing
   * @param {string} cid - CID to create evidence for
   * @param {number} [evidenceCount] - Number of mock evidence items
   * @returns {Promise<Object>} Demo result
   */
  async createDemoEvidence(cid, evidenceCount = 3) {
    try {
      console.log(`🎭 Creating demo evidence for CID: ${cid}`);

      // Generate mock evidence
      const evidence = evidencePackGenerator.generateMockEvidence(evidenceCount);

      // Demo SLO
      const slo = {
        k: 2,
        n: 3,
        timeout: 3600, // 1 hour
        window: 86400  // 24 hours
      };

      // Demo metadata
      const metadata = {
        creator: 'cid-sentinel-demo',
        description: `Demo evidence pack for ${cid}`,
        demo: true
      };

      // Process through pipeline
      return await this.processEvidence({
        cid,
        evidence,
        slo,
        metadata
      });
    } catch (error) {
      console.error('❌ Demo evidence creation failed:', error);
      throw error;
    }
  }

  /**
   * Batch process multiple evidence sets
   * @param {Array} evidenceSets - Array of evidence processing options
   * @returns {Promise<Array>} Array of pipeline results
   */
  async batchProcess(evidenceSets) {
    const results = [];
    
    console.log(`📊 Batch processing ${evidenceSets.length} evidence sets...`);
    
    for (let i = 0; i < evidenceSets.length; i++) {
      const evidenceSet = evidenceSets[i];
      
      try {
        console.log(`Processing set ${i + 1}/${evidenceSets.length}`);
        const result = await this.processEvidence(evidenceSet);
        results.push(result);
      } catch (error) {
        console.error(`❌ Batch item ${i} failed:`, error);
        results.push({
          ...PipelineResult,
          errors: [error.message],
          metadata: { setIndex: i }
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    console.log(`✅ Batch processing complete: ${successful}/${evidenceSets.length} successful`);
    
    return results;
  }

  /**
   * Generate pipeline status report
   * @returns {Promise<Object>} Status information
   */
  async getStatus() {
    try {
      const ipfsInfo = this.initialized 
        ? await evidenceIPFS.getNodeInfo()
        : { initialized: false };

      return {
        initialized: this.initialized,
        ipfs: ipfsInfo,
        timestamp: Date.now(),
        version: '1.0.0'
      };
    } catch (error) {
      return {
        initialized: this.initialized,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Cleanup pipeline resources
   */
  async cleanup() {
    try {
      console.log('🧹 Cleaning up Evidence Pipeline...');
      await evidenceIPFS.stop();
      this.initialized = false;
      console.log('✅ Pipeline cleanup complete');
    } catch (error) {
      console.error('❌ Pipeline cleanup failed:', error);
    }
  }
}

/**
 * Utility function for quick evidence processing
 * @param {string} cid - CID to process evidence for
 * @param {Array} evidence - Evidence array
 * @param {Object} slo - SLO configuration
 * @returns {Promise<string>} Pack CID
 */
export async function quickProcessEvidence(cid, evidence, slo) {
  const pipeline = new EvidencePipeline();
  
  try {
    const result = await pipeline.processEvidence({
      cid,
      evidence,
      slo
    });

    await pipeline.cleanup();

    if (!result.success) {
      throw new Error(`Processing failed: ${result.errors.join(', ')}`);
    }

    return result.packCID;
  } catch (error) {
    await pipeline.cleanup();
    throw error;
  }
}

/**
 * Utility function for quick evidence retrieval
 * @param {string} packCID - Pack CID to retrieve
 * @returns {Promise<Object>} Evidence pack
 */
export async function quickRetrieveEvidence(packCID) {
  const pipeline = new EvidencePipeline();
  
  try {
    const result = await pipeline.retrieveEvidence(packCID);

    await pipeline.cleanup();

    if (!result.success) {
      throw new Error(`Retrieval failed: ${result.errors.join(', ')}`);
    }

    return result.pack;
  } catch (error) {
    await pipeline.cleanup();
    throw error;
  }
}

// Export singleton instance
export const evidencePipeline = new EvidencePipeline();

// Export class for custom instances
export default EvidencePipeline;
