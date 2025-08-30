/**
 * Evidence Workflow
 * End-to-end evidence processing from raw evidence to contract submission
 */

import { evidencePipeline } from './evidence-pipeline.js';
import { evidenceRegistryClient } from './contract-client.js';
import { createHash } from 'crypto';

/**
 * Workflow states
 */
export const WorkflowState = {
  CREATED: 'created',
  PACK_GENERATED: 'pack_generated',
  IPFS_STORED: 'ipfs_stored',
  CID_REGISTERED: 'cid_registered',
  PACK_REPORTED: 'pack_reported',
  STAKE_BONDED: 'stake_bonded',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Workflow result structure
 */
export const WorkflowResult = {
  success: false,
  state: WorkflowState.CREATED,
  cid: null,
  packCID: null,
  transactions: [],
  errors: [],
  metadata: {
    processingTime: 0,
    evidenceCount: 0,
    packSize: 0,
    gasUsed: 0,
    stakeAmount: 0
  }
};

/**
 * Evidence Workflow Class
 */
export class EvidenceWorkflow {
  constructor() {
    this.initialized = false;
    this.demoMode = false;
  }

  /**
   * Initialize workflow
   * @param {boolean} [demoMode] - Run in demo mode (no contract interactions)
   */
  async init(demoMode = false) {
    if (this.initialized) return;

    try {
      console.log('🚀 Initializing Evidence Workflow...');
      this.demoMode = demoMode;

      // Initialize IPFS pipeline
      await evidencePipeline.init();

      // Initialize contract client (unless in demo mode)
      if (!demoMode) {
        await evidenceRegistryClient.init();
        
        // Check if contract is deployed
        const isDeployed = await evidenceRegistryClient.isContractDeployed();
        if (!isDeployed) {
          console.log('⚠️  Contract not deployed - switching to demo mode');
          this.demoMode = true;
        }
      }

      this.initialized = true;
      const mode = this.demoMode ? 'demo mode' : 'live contract mode';
      console.log(`✅ Evidence Workflow ready (${mode})`);
    } catch (error) {
      console.error('❌ Workflow initialization failed:', error);
      throw new Error(`Workflow init failed: ${error.message}`);
    }
  }

  /**
   * Execute complete evidence workflow
   * @param {Object} options - Workflow options
   * @param {string} options.cid - Original CID to create evidence for
   * @param {Array} options.evidence - Evidence array
   * @param {Object} options.slo - Service level objectives
   * @param {Object} [options.metadata] - Additional metadata
   * @param {boolean} [options.registerCID] - Register CID on contract (default: true)
   * @param {boolean} [options.reportPack] - Report pack to contract (default: true)
   * @param {string} [options.stakeAmount] - Amount to stake in ETH (default: '0.01')
   * @returns {Promise<Object>} Workflow result
   */
  async executeWorkflow({
    cid,
    evidence,
    slo,
    metadata = {},
    registerCID = true,
    reportPack = true,
    stakeAmount = '0.01'
  }) {
    const startTime = Date.now();
    const result = { ...WorkflowResult };

    try {
      await this.init();

      console.log(`📊 Executing evidence workflow for CID: ${cid}`);
      result.cid = cid;

      // Step 1: Generate evidence pack and store to IPFS
      console.log('\n📦 Step 1: Creating and storing evidence pack...');
      result.state = WorkflowState.PACK_GENERATED;

      const pipelineResult = await evidencePipeline.processEvidence({
        cid,
        evidence,
        slo,
        metadata: {
          ...metadata,
          workflow: 'evidence-workflow',
          timestamp: Date.now()
        }
      });

      if (!pipelineResult.success) {
        result.errors = pipelineResult.errors;
        result.state = WorkflowState.FAILED;
        return result;
      }

      result.packCID = pipelineResult.packCID;
      result.state = WorkflowState.IPFS_STORED;
      result.metadata.evidenceCount = pipelineResult.metadata.evidenceCount;
      result.metadata.packSize = pipelineResult.metadata.packSize;

      console.log(`✅ Evidence pack stored to IPFS: ${result.packCID}`);

      // Skip contract operations in demo mode
      if (this.demoMode) {
        console.log('🎭 Demo mode - skipping contract operations');
        result.success = true;
        result.state = WorkflowState.COMPLETED;
        result.metadata.processingTime = Date.now() - startTime;
        return result;
      }

      // Step 2: Register CID on contract (if requested)
      if (registerCID) {
        console.log('\n📝 Step 2: Registering CID on contract...');
        
        try {
          const cidDigest = this.cidToBytes32(cid);
          
          const registerTxHash = await evidenceRegistryClient.registerCID({
            cid: cidDigest,
            slo,
            slashingEnabled: true
          });

          result.transactions.push({
            type: 'registerCID',
            hash: registerTxHash,
            cid: cidDigest
          });

          result.state = WorkflowState.CID_REGISTERED;
          console.log(`✅ CID registered: ${registerTxHash}`);

          // Wait for confirmation
          await evidenceRegistryClient.waitForTransaction(registerTxHash);
        } catch (error) {
          console.error('❌ CID registration failed:', error);
          result.errors.push(`CID registration failed: ${error.message}`);
          // Continue workflow - registration failure doesn't stop pack reporting
        }
      }

      // Step 3: Report evidence pack (if requested)
      if (reportPack) {
        console.log('\n📦 Step 3: Reporting evidence pack...');
        
        try {
          const packRef = {
            cidDigest: this.cidToBytes32(cid),
            packCIDDigest: this.cidToBytes32(result.packCID),
            ts: Math.floor(Date.now() / 1000), // Unix timestamp
            status: 0, // 0 = OK
            nonce: 1 // Starting nonce
          };

          const reportTxHash = await evidenceRegistryClient.reportPack(packRef);

          result.transactions.push({
            type: 'reportPack',
            hash: reportTxHash,
            packRef
          });

          result.state = WorkflowState.PACK_REPORTED;
          console.log(`✅ Pack reported: ${reportTxHash}`);

          // Wait for confirmation
          await evidenceRegistryClient.waitForTransaction(reportTxHash);
        } catch (error) {
          console.error('❌ Pack reporting failed:', error);
          result.errors.push(`Pack reporting failed: ${error.message}`);
          // Continue workflow - reporting failure doesn't stop staking
        }
      }

      // Step 4: Bond stake (optional)
      if (stakeAmount && parseFloat(stakeAmount) > 0) {
        console.log(`\n💰 Step 4: Bonding stake (${stakeAmount} ETH)...`);
        
        try {
          const cidDigest = this.cidToBytes32(cid);
          
          const stakeTxHash = await evidenceRegistryClient.bondStake(
            cidDigest,
            stakeAmount,
            'PUBLISHER'
          );

          result.transactions.push({
            type: 'bondStake',
            hash: stakeTxHash,
            amount: stakeAmount
          });

          result.state = WorkflowState.STAKE_BONDED;
          result.metadata.stakeAmount = parseFloat(stakeAmount);
          console.log(`✅ Stake bonded: ${stakeTxHash}`);

          // Wait for confirmation
          await evidenceRegistryClient.waitForTransaction(stakeTxHash);
        } catch (error) {
          console.error('❌ Stake bonding failed:', error);
          result.errors.push(`Stake bonding failed: ${error.message}`);
        }
      }

      // Workflow completion
      result.success = true;
      result.state = WorkflowState.COMPLETED;
      result.metadata.processingTime = Date.now() - startTime;

      console.log(`\n✅ Evidence workflow completed (${result.metadata.processingTime}ms)`);
      console.log(`   Transactions: ${result.transactions.length}`);
      console.log(`   Errors: ${result.errors.length}`);

      return result;
    } catch (error) {
      console.error('❌ Workflow execution failed:', error);
      result.errors.push(error.message);
      result.state = WorkflowState.FAILED;
      result.metadata.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Execute workflow with demo evidence
   * @param {string} cid - CID to create demo evidence for
   * @param {number} [evidenceCount] - Number of demo evidence items
   * @param {Object} [options] - Additional workflow options
   * @returns {Promise<Object>} Workflow result
   */
  async executeDemoWorkflow(cid, evidenceCount = 3, options = {}) {
    try {
      console.log(`🎭 Executing demo workflow for CID: ${cid}`);

      // Generate demo evidence
      const evidence = this.generateDemoEvidence(evidenceCount);

      // Demo SLO
      const slo = {
        k: 2,
        n: 3,
        timeout: 3600, // 1 hour
        window: 86400  // 24 hours
      };

      // Execute workflow
      return await this.executeWorkflow({
        cid,
        evidence,
        slo,
        metadata: {
          demo: true,
          created: new Date().toISOString()
        },
        ...options
      });
    } catch (error) {
      console.error('❌ Demo workflow failed:', error);
      throw error;
    }
  }

  /**
   * Monitor workflow transactions
   * @param {Object} workflowResult - Result from executeWorkflow
   * @returns {Promise<Object>} Monitoring result
   */
  async monitorTransactions(workflowResult) {
    if (!workflowResult.transactions || workflowResult.transactions.length === 0) {
      return { monitored: 0, confirmed: 0, failed: 0 };
    }

    console.log(`🔍 Monitoring ${workflowResult.transactions.length} transactions...`);

    const results = {
      monitored: workflowResult.transactions.length,
      confirmed: 0,
      failed: 0,
      details: []
    };

    for (const tx of workflowResult.transactions) {
      try {
        const receipt = await evidenceRegistryClient.waitForTransaction(tx.hash, 2);
        
        results.details.push({
          ...tx,
          status: 'confirmed',
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed
        });
        
        results.confirmed++;
      } catch (error) {
        results.details.push({
          ...tx,
          status: 'failed',
          error: error.message
        });
        
        results.failed++;
      }
    }

    console.log(`✅ Transaction monitoring complete: ${results.confirmed} confirmed, ${results.failed} failed`);
    return results;
  }

  /**
   * Generate demo evidence items
   * @param {number} count - Number of evidence items
   * @returns {Array} Demo evidence array
   */
  generateDemoEvidence(count = 3) {
    const evidence = [];
    const timestamp = Date.now();

    for (let i = 0; i < count; i++) {
      evidence.push({
        id: `demo_evidence_${i}_${timestamp}`,
        type: i % 4 === 0 ? 'file' : i % 4 === 1 ? 'url' : i % 4 === 2 ? 'hash' : 'metadata',
        content: this.generateDemoContent(i, timestamp),
        timestamp: timestamp + i * 1000,
        metadata: {
          source: 'workflow-demo',
          index: i,
          generated: true
        }
      });
    }

    return evidence;
  }

  /**
   * Generate demo content based on type
   * @param {number} index - Evidence index
   * @param {number} timestamp - Base timestamp
   * @returns {string} Demo content
   */
  generateDemoContent(index, timestamp) {
    const type = index % 4;
    
    switch (type) {
      case 0: // file
        return `QmDemo${index}File${timestamp.toString(36)}`;
      case 1: // url
        return `https://evidence.example.com/item/${index}/${timestamp}`;
      case 2: // hash
        return createHash('sha256').update(`evidence_${index}_${timestamp}`).digest('hex');
      case 3: // metadata
        return JSON.stringify({
          type: 'demo_metadata',
          index,
          timestamp,
          description: `Demo evidence item ${index}`
        });
      default:
        return `demo_content_${index}_${timestamp}`;
    }
  }

  /**
   * Convert CID to bytes32 format
   * @param {string} cid - CID string
   * @returns {string} Bytes32 representation
   */
  cidToBytes32(cid) {
    if (cid.startsWith('0x')) {
      return cid;
    }

    // Simple conversion - in production would use proper CID parsing
    const hash = createHash('sha256').update(cid).digest('hex');
    return `0x${hash}`;
  }

  /**
   * Get workflow status
   * @returns {Promise<Object>} Status information
   */
  async getStatus() {
    try {
      const pipelineStatus = await evidencePipeline.getStatus();
      const contractStatus = this.demoMode ? { demoMode: true } : await evidenceRegistryClient.getStatus();

      return {
        initialized: this.initialized,
        demoMode: this.demoMode,
        pipeline: pipelineStatus,
        contract: contractStatus,
        timestamp: Date.now()
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
   * Cleanup workflow resources
   */
  async cleanup() {
    try {
      console.log('🧹 Cleaning up Evidence Workflow...');
      await evidencePipeline.cleanup();
      this.initialized = false;
      console.log('✅ Workflow cleanup complete');
    } catch (error) {
      console.error('❌ Workflow cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const evidenceWorkflow = new EvidenceWorkflow();

// Export class for custom instances
export default EvidenceWorkflow;
