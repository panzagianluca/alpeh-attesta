/**
 * Evidence Pack Validator
 * Validates evidence pack structure, integrity, and CID matching
 */

import { EvidencePackSchema } from './evidence-packer.js';
import { evidenceIPFS } from './ipfs-client.js';
import stringify from 'fast-json-stable-stringify';

/**
 * Validation Result Schema
 */
export const ValidationResult = {
  valid: false,
  errors: [],
  warnings: [],
  checks: {
    schema: false,
    contentHash: false,
    cidMatch: false,
    evidenceIntegrity: false,
    sloValid: false,
    timestampValid: false
  },
  metadata: {
    packSize: 0,
    evidenceCount: 0,
    validationTime: 0
  }
};

/**
 * Evidence Pack Validator Class
 */
export class EvidencePackValidator {
  constructor() {
    this.strictMode = false; // Set to true for stricter validation
  }

  /**
   * Comprehensive pack validation
   * @param {Object} pack - Evidence pack to validate
   * @param {Object} [options] - Validation options
   * @param {boolean} [options.skipCIDCheck] - Skip CID verification (faster)
   * @param {boolean} [options.strictMode] - Enable strict validation
   * @returns {Promise<Object>} Validation result
   */
  async validatePack(pack, options = {}) {
    const startTime = Date.now();
    const result = { ...ValidationResult };
    
    try {
      console.log('🔍 Validating evidence pack...');

      // 1. Schema validation
      result.checks.schema = await this.validateSchema(pack, result);

      // 2. Content hash validation
      result.checks.contentHash = await this.validateContentHash(pack, result);

      // 3. CID matching validation (optional)
      if (!options.skipCIDCheck && pack.metadata.packCID) {
        result.checks.cidMatch = await this.validateCIDMatch(pack, result);
      } else if (!pack.metadata.packCID) {
        result.warnings.push('Pack CID not set - skipping CID validation');
        result.checks.cidMatch = true; // Don't fail for missing CID
      }

      // 4. Evidence integrity validation
      result.checks.evidenceIntegrity = await this.validateEvidenceIntegrity(pack, result);

      // 5. SLO validation
      result.checks.sloValid = await this.validateSLO(pack, result);

      // 6. Timestamp validation
      result.checks.timestampValid = await this.validateTimestamps(pack, result);

      // Determine overall validity
      const allChecks = Object.values(result.checks);
      result.valid = allChecks.every(check => check === true);

      // Set metadata
      result.metadata.packSize = pack.metadata?.packSize || 0;
      result.metadata.evidenceCount = pack.metadata?.evidenceCount || 0;
      result.metadata.validationTime = Date.now() - startTime;

      const status = result.valid ? '✅' : '❌';
      console.log(`${status} Pack validation complete (${result.metadata.validationTime}ms)`);
      
      if (!result.valid) {
        console.log('Errors:', result.errors);
      }
      
      if (result.warnings.length > 0) {
        console.log('Warnings:', result.warnings);
      }

      return result;
    } catch (error) {
      console.error('❌ Pack validation failed:', error);
      result.errors.push(`Validation error: ${error.message}`);
      result.metadata.validationTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Validate pack against schema
   * @param {Object} pack - Evidence pack
   * @param {Object} result - Validation result object
   * @returns {Promise<boolean>} True if schema valid
   */
  async validateSchema(pack, result) {
    try {
      EvidencePackSchema.parse(pack);
      return true;
    } catch (error) {
      result.errors.push(`Schema validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate content hash integrity
   * @param {Object} pack - Evidence pack
   * @param {Object} result - Validation result object
   * @returns {Promise<boolean>} True if content hash valid
   */
  async validateContentHash(pack, result) {
    try {
      if (!pack.integrity?.contentHash) {
        result.errors.push('Content hash missing from pack integrity');
        return false;
      }

      // Recalculate content hash
      const calculatedHash = await this.calculateContentHash(pack.evidence);
      
      if (calculatedHash !== pack.integrity.contentHash) {
        result.errors.push('Content hash mismatch - pack may be corrupted');
        return false;
      }

      return true;
    } catch (error) {
      result.errors.push(`Content hash validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate CID matches pack content
   * @param {Object} pack - Evidence pack
   * @param {Object} result - Validation result object
   * @returns {Promise<boolean>} True if CID matches
   */
  async validateCIDMatch(pack, result) {
    try {
      if (!pack.metadata?.packCID) {
        result.warnings.push('Pack CID not available for validation');
        return true; // Don't fail validation for missing CID
      }

      // Generate CID from pack content
      const calculatedCID = await evidenceIPFS.generateCID(pack);
      
      if (calculatedCID !== pack.metadata.packCID) {
        result.errors.push('Pack CID mismatch - pack content differs from stored version');
        return false;
      }

      return true;
    } catch (error) {
      result.errors.push(`CID validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate evidence integrity
   * @param {Object} pack - Evidence pack
   * @param {Object} result - Validation result object
   * @returns {Promise<boolean>} True if evidence integrity valid
   */
  async validateEvidenceIntegrity(pack, result) {
    try {
      const evidence = pack.evidence || [];
      let validItems = 0;

      for (let i = 0; i < evidence.length; i++) {
        const item = evidence[i];
        
        // Validate required fields
        if (!item.id || !item.type || !item.content) {
          result.errors.push(`Evidence item ${i} missing required fields`);
          continue;
        }

        // Validate type
        const validTypes = ['file', 'url', 'hash', 'metadata', 'signature'];
        if (!validTypes.includes(item.type)) {
          result.errors.push(`Evidence item ${i} has invalid type: ${item.type}`);
          continue;
        }

        // Validate content based on type
        if (!this.validateEvidenceContent(item)) {
          result.errors.push(`Evidence item ${i} has invalid content for type ${item.type}`);
          continue;
        }

        // Validate timestamp
        if (!item.timestamp || item.timestamp > Date.now() + 300000) { // 5 min future tolerance
          result.warnings.push(`Evidence item ${i} has suspicious timestamp`);
        }

        validItems++;
      }

      // Check if we have enough valid evidence
      if (validItems === 0) {
        result.errors.push('No valid evidence items found');
        return false;
      }

      if (validItems < evidence.length) {
        result.warnings.push(`${evidence.length - validItems} evidence items failed validation`);
      }

      return validItems > 0;
    } catch (error) {
      result.errors.push(`Evidence integrity validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate evidence content based on type
   * @param {Object} item - Evidence item
   * @returns {boolean} True if content valid for type
   */
  validateEvidenceContent(item) {
    switch (item.type) {
      case 'url':
        try {
          new URL(item.content);
          return true;
        } catch {
          return false;
        }
      
      case 'hash':
        // Basic hash format validation (CID, hex, etc.)
        return typeof item.content === 'string' && item.content.length > 10;
      
      case 'file':
        // Could be CID or file path
        return typeof item.content === 'string' && item.content.length > 0;
      
      case 'metadata':
      case 'signature':
        return typeof item.content === 'string' && item.content.length > 0;
      
      default:
        return false;
    }
  }

  /**
   * Validate SLO parameters
   * @param {Object} pack - Evidence pack
   * @param {Object} result - Validation result object
   * @returns {Promise<boolean>} True if SLO valid
   */
  async validateSLO(pack, result) {
    try {
      const slo = pack.slo;
      
      if (!slo) {
        result.errors.push('SLO missing from pack');
        return false;
      }

      // Validate k <= n
      if (slo.k > slo.n) {
        result.errors.push('SLO invalid: k must be <= n');
        return false;
      }

      // Validate reasonable ranges
      if (slo.k < 1 || slo.k > 255) {
        result.errors.push('SLO invalid: k must be 1-255');
        return false;
      }

      if (slo.n < 1 || slo.n > 255) {
        result.errors.push('SLO invalid: n must be 1-255');
        return false;
      }

      if (slo.timeout < 1 || slo.timeout > 86400) { // Max 24 hours
        result.warnings.push('SLO timeout seems unusually high or low');
      }

      if (slo.window < 1 || slo.window > 604800) { // Max 1 week
        result.warnings.push('SLO window seems unusually high or low');
      }

      return true;
    } catch (error) {
      result.errors.push(`SLO validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate timestamps
   * @param {Object} pack - Evidence pack
   * @param {Object} result - Validation result object
   * @returns {Promise<boolean>} True if timestamps valid
   */
  async validateTimestamps(pack, result) {
    try {
      const packTimestamp = pack.metadata?.timestamp;
      const now = Date.now();
      
      if (!packTimestamp) {
        result.errors.push('Pack timestamp missing');
        return false;
      }

      // Check if timestamp is reasonable (not too far in future or past)
      const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
      const fiveMinutesFromNow = now + (5 * 60 * 1000);

      if (packTimestamp < oneYearAgo) {
        result.warnings.push('Pack timestamp is very old (>1 year)');
      }

      if (packTimestamp > fiveMinutesFromNow) {
        result.errors.push('Pack timestamp is in the future');
        return false;
      }

      // Validate evidence timestamps are not newer than pack timestamp
      const evidence = pack.evidence || [];
      for (let i = 0; i < evidence.length; i++) {
        const item = evidence[i];
        if (item.timestamp > packTimestamp + 60000) { // 1 min tolerance
          result.warnings.push(`Evidence item ${i} timestamp is newer than pack timestamp`);
        }
      }

      return true;
    } catch (error) {
      result.errors.push(`Timestamp validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Calculate content hash (same algorithm as packer)
   * @param {Array} evidence - Evidence array
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
      throw new Error(`Content hash calculation failed: ${error.message}`);
    }
  }

  /**
   * Quick validation (schema + basic checks only)
   * @param {Object} pack - Evidence pack
   * @returns {boolean} True if pack passes basic validation
   */
  async quickValidate(pack) {
    try {
      // Schema validation
      EvidencePackSchema.parse(pack);
      
      // Basic integrity checks
      if (!pack.evidence || pack.evidence.length === 0) {
        return false;
      }

      if (!pack.metadata?.cid || !pack.slo) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate validation report
   * @param {Object} validationResult - Result from validatePack
   * @returns {string} Human-readable report
   */
  generateReport(validationResult) {
    const { valid, errors, warnings, checks, metadata } = validationResult;
    
    let report = `Evidence Pack Validation Report\n`;
    report += `==============================\n\n`;
    report += `Overall Status: ${valid ? '✅ VALID' : '❌ INVALID'}\n`;
    report += `Validation Time: ${metadata.validationTime}ms\n`;
    report += `Pack Size: ${metadata.packSize} bytes\n`;
    report += `Evidence Count: ${metadata.evidenceCount}\n\n`;
    
    report += `Detailed Checks:\n`;
    Object.entries(checks).forEach(([check, passed]) => {
      report += `  ${passed ? '✅' : '❌'} ${check}\n`;
    });
    
    if (errors.length > 0) {
      report += `\nErrors:\n`;
      errors.forEach(error => report += `  ❌ ${error}\n`);
    }
    
    if (warnings.length > 0) {
      report += `\nWarnings:\n`;
      warnings.forEach(warning => report += `  ⚠️  ${warning}\n`);
    }
    
    return report;
  }
}

// Export singleton instance
export const evidencePackValidator = new EvidencePackValidator();

// Export class for custom instances
export default EvidencePackValidator;
