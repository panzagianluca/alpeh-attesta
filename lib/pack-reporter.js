/**
 * Pack Reporter
 * Manages evidence pack submissions to the contract with retry logic and queue management
 */

import { evidenceRegistryClient } from './contract-client.js';
import { evidencePackValidator } from './pack-validator.js';

/**
 * Report status types
 */
export const ReportStatus = {
  PENDING: 'pending',
  VALIDATING: 'validating',
  SUBMITTING: 'submitting',
  CONFIRMING: 'confirming',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying'
};

/**
 * Pack reporter configuration
 */
const REPORTER_CONFIG = {
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  confirmationTimeout: 300000, // 5 minutes
  queueProcessInterval: 2000 // 2 seconds
};

/**
 * Pack Reporter Class
 */
export class PackReporter {
  constructor() {
    this.queue = new Map(); // reportId -> ReportJob
    this.processing = false;
    this.initialized = false;
  }

  /**
   * Initialize pack reporter
   */
  async init() {
    if (this.initialized) return;

    try {
      console.log('📋 Initializing Pack Reporter...');
      
      await evidenceRegistryClient.init();
      
      this.initialized = true;
      console.log('✅ Pack Reporter ready');
      
      // Start queue processing
      this.startQueueProcessor();
    } catch (error) {
      console.error('❌ Pack Reporter initialization failed:', error);
      throw new Error(`Pack Reporter init failed: ${error.message}`);
    }
  }

  /**
   * Submit pack report to contract
   * @param {Object} options - Report options
   * @param {string} options.cid - Original CID
   * @param {string} options.packCID - Evidence pack CID
   * @param {Object} [options.pack] - Evidence pack object (for validation)
   * @param {number} [options.status] - Report status (0=OK, 1=MISSING, 2=CORRUPTED)
   * @param {number} [options.nonce] - Report nonce (auto-generated if not provided)
   * @param {boolean} [options.validate] - Validate pack before submission (default: true)
   * @param {boolean} [options.queue] - Queue for processing (default: true)
   * @returns {Promise<string>} Report ID
   */
  async submitReport({
    cid,
    packCID,
    pack = null,
    status = 0,
    nonce = null,
    validate = true,
    queue = true
  }) {
    await this.init();

    try {
      // Generate report ID
      const reportId = this.generateReportId(cid, packCID);
      console.log(`📤 Submitting pack report: ${reportId}`);

      // Create report job
      const job = {
        id: reportId,
        cid,
        packCID,
        pack,
        status,
        nonce: nonce || this.generateNonce(),
        validate,
        createdAt: Date.now(),
        attempts: 0,
        maxRetries: REPORTER_CONFIG.maxRetries,
        reportStatus: ReportStatus.PENDING,
        error: null,
        transactionHash: null,
        receipt: null
      };

      if (queue) {
        // Add to queue for processing
        this.queue.set(reportId, job);
        console.log(`📋 Report queued: ${reportId}`);
        return reportId;
      } else {
        // Process immediately
        return await this.processReport(job);
      }
    } catch (error) {
      console.error('❌ Report submission failed:', error);
      throw new Error(`Report submission failed: ${error.message}`);
    }
  }

  /**
   * Process a single report job
   * @param {Object} job - Report job
   * @returns {Promise<string>} Report ID
   */
  async processReport(job) {
    try {
      console.log(`🔄 Processing report: ${job.id}`);
      job.reportStatus = ReportStatus.VALIDATING;
      job.attempts++;

      // Step 1: Validate pack (if requested and pack provided)
      if (job.validate && job.pack) {
        console.log('🔍 Validating evidence pack...');
        
        const validationResult = await evidencePackValidator.validatePack(job.pack);
        
        if (!validationResult.valid) {
          job.reportStatus = ReportStatus.FAILED;
          job.error = `Pack validation failed: ${validationResult.errors.join(', ')}`;
          console.log('❌ Pack validation failed');
          return job.id;
        }
        
        console.log('✅ Pack validation passed');
      }

      // Step 2: Submit to contract
      job.reportStatus = ReportStatus.SUBMITTING;
      console.log('📝 Submitting to contract...');

      const packRef = {
        cidDigest: this.cidToBytes32(job.cid),
        packCIDDigest: this.cidToBytes32(job.packCID),
        ts: Math.floor(Date.now() / 1000),
        status: job.status,
        nonce: job.nonce
      };

      const transactionHash = await evidenceRegistryClient.reportPack(packRef);
      job.transactionHash = transactionHash;
      job.reportStatus = ReportStatus.CONFIRMING;

      console.log(`✅ Transaction submitted: ${transactionHash}`);

      // Step 3: Wait for confirmation
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await evidenceRegistryClient.waitForTransaction(
        transactionHash,
        1 // 1 confirmation
      );
      
      job.receipt = receipt;
      job.reportStatus = ReportStatus.COMPLETED;

      console.log(`✅ Report completed: ${job.id}`);
      console.log(`   Transaction: ${transactionHash}`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.gasUsed}`);

      return job.id;
    } catch (error) {
      console.error(`❌ Report processing failed for ${job.id}:`, error);
      
      job.error = error.message;
      
      // Check if we should retry
      if (job.attempts < job.maxRetries && this.shouldRetry(error)) {
        job.reportStatus = ReportStatus.RETRYING;
        console.log(`🔄 Scheduling retry for ${job.id} (attempt ${job.attempts + 1}/${job.maxRetries})`);
        
        // Schedule retry
        setTimeout(() => {
          if (this.queue.has(job.id)) {
            this.processReport(job);
          }
        }, REPORTER_CONFIG.retryDelay);
      } else {
        job.reportStatus = ReportStatus.FAILED;
        console.log(`❌ Report failed permanently: ${job.id}`);
      }

      return job.id;
    }
  }

  /**
   * Start queue processor
   */
  startQueueProcessor() {
    if (this.processing) return;

    this.processing = true;
    
    const processQueue = async () => {
      if (this.queue.size === 0) {
        setTimeout(processQueue, REPORTER_CONFIG.queueProcessInterval);
        return;
      }

      // Find next pending job
      const pendingJob = Array.from(this.queue.values()).find(
        job => job.reportStatus === ReportStatus.PENDING
      );

      if (pendingJob) {
        await this.processReport(pendingJob);
      }

      // Clean up completed jobs older than 1 hour
      this.cleanupOldJobs();

      setTimeout(processQueue, REPORTER_CONFIG.queueProcessInterval);
    };

    processQueue();
    console.log('🔄 Queue processor started');
  }

  /**
   * Get report status
   * @param {string} reportId - Report ID
   * @returns {Object|null} Report job or null if not found
   */
  getReportStatus(reportId) {
    const job = this.queue.get(reportId);
    if (!job) return null;

    return {
      id: job.id,
      status: job.reportStatus,
      cid: job.cid,
      packCID: job.packCID,
      attempts: job.attempts,
      transactionHash: job.transactionHash,
      error: job.error,
      createdAt: job.createdAt,
      receipt: job.receipt ? {
        blockNumber: job.receipt.blockNumber,
        gasUsed: job.receipt.gasUsed,
        status: job.receipt.status
      } : null
    };
  }

  /**
   * Get all report statuses
   * @returns {Array} Array of report statuses
   */
  getAllReports() {
    return Array.from(this.queue.keys()).map(id => this.getReportStatus(id));
  }

  /**
   * Cancel pending report
   * @param {string} reportId - Report ID to cancel
   * @returns {boolean} True if cancelled
   */
  cancelReport(reportId) {
    const job = this.queue.get(reportId);
    if (!job || job.reportStatus !== ReportStatus.PENDING) {
      return false;
    }

    job.reportStatus = ReportStatus.FAILED;
    job.error = 'Cancelled by user';
    return true;
  }

  /**
   * Batch submit multiple reports
   * @param {Array} reports - Array of report options
   * @returns {Promise<Array>} Array of report IDs
   */
  async batchSubmit(reports) {
    const reportIds = [];
    
    console.log(`📊 Batch submitting ${reports.length} reports...`);

    for (const reportOptions of reports) {
      try {
        const reportId = await this.submitReport(reportOptions);
        reportIds.push(reportId);
      } catch (error) {
        console.error('❌ Batch report failed:', error);
        reportIds.push(null);
      }
    }

    const successful = reportIds.filter(id => id !== null).length;
    console.log(`✅ Batch submit complete: ${successful}/${reports.length} queued`);

    return reportIds;
  }

  /**
   * Generate report ID
   * @param {string} cid - Original CID
   * @param {string} packCID - Pack CID
   * @returns {string} Report ID
   */
  generateReportId(cid, packCID) {
    const timestamp = Date.now();
    const hash = require('crypto')
      .createHash('sha256')
      .update(`${cid}:${packCID}:${timestamp}`)
      .digest('hex')
      .substring(0, 8);
    
    return `report_${hash}_${timestamp}`;
  }

  /**
   * Generate nonce for report
   * @returns {number} Nonce value
   */
  generateNonce() {
    return Math.floor(Date.now() / 1000); // Unix timestamp as nonce
  }

  /**
   * Convert CID to bytes32
   * @param {string} cid - CID string
   * @returns {string} Bytes32 representation
   */
  cidToBytes32(cid) {
    if (cid.startsWith('0x')) {
      return cid;
    }

    // Simple conversion - in production would use proper CID parsing
    const hash = require('crypto').createHash('sha256').update(cid).digest('hex');
    return `0x${hash}`;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} True if should retry
   */
  shouldRetry(error) {
    const retryableErrors = [
      'network error',
      'timeout',
      'connection refused',
      'gas estimation failed',
      'nonce too low'
    ];

    return retryableErrors.some(errorType => 
      error.message.toLowerCase().includes(errorType)
    );
  }

  /**
   * Clean up old completed jobs
   */
  cleanupOldJobs() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [reportId, job] of this.queue) {
      if (job.createdAt < oneHourAgo && 
          (job.reportStatus === ReportStatus.COMPLETED || 
           job.reportStatus === ReportStatus.FAILED)) {
        this.queue.delete(reportId);
      }
    }
  }

  /**
   * Get reporter statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const jobs = Array.from(this.queue.values());
    
    const stats = {
      total: jobs.length,
      pending: 0,
      validating: 0,
      submitting: 0,
      confirming: 0,
      completed: 0,
      failed: 0,
      retrying: 0
    };

    for (const job of jobs) {
      switch (job.reportStatus) {
        case ReportStatus.PENDING:
          stats.pending++;
          break;
        case ReportStatus.VALIDATING:
          stats.validating++;
          break;
        case ReportStatus.SUBMITTING:
          stats.submitting++;
          break;
        case ReportStatus.CONFIRMING:
          stats.confirming++;
          break;
        case ReportStatus.COMPLETED:
          stats.completed++;
          break;
        case ReportStatus.FAILED:
          stats.failed++;
          break;
        case ReportStatus.RETRYING:
          stats.retrying++;
          break;
      }
    }

    return stats;
  }

  /**
   * Stop queue processor and cleanup
   */
  async cleanup() {
    try {
      console.log('🧹 Cleaning up Pack Reporter...');
      this.processing = false;
      this.queue.clear();
      this.initialized = false;
      console.log('✅ Pack Reporter cleanup complete');
    } catch (error) {
      console.error('❌ Pack Reporter cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const packReporter = new PackReporter();

// Export class for custom instances
export default PackReporter;
