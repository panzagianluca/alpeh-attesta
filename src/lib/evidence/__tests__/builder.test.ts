/**
 * Evidence Pack Builder Tests - Simplified
 * 
 * Tests core validation and status calculation logic without IPFS dependencies.
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateStatus,
  validateBuilderInputs,
  type BuilderInputs,
} from '../schema';

// Helper function to create test inputs without importing builder module
function createTestInputs(cid: string, available: boolean): BuilderInputs {
  return {
    cid,
    probes: available ? [
      {
        vp: 'gateway-1.test',
        method: 'HTTP' as const,
        gateway: 'https://gateway1.test',
        ok: true,
        latMs: 150,
      },
      {
        vp: 'gateway-2.test',
        method: 'HTTP' as const,
        gateway: 'https://gateway2.test',
        ok: true,
        latMs: 220,
      },
      {
        vp: 'gateway-3.test',
        method: 'HTTP' as const,
        gateway: 'https://gateway3.test',
        ok: true,
        latMs: 180,
      },
    ] : [
      {
        vp: 'gateway-1.test',
        method: 'HTTP' as const,
        gateway: 'https://gateway1.test',
        ok: false,
        err: 'Timeout',
      },
      {
        vp: 'gateway-2.test',
        method: 'HTTP' as const,
        gateway: 'https://gateway2.test',
        ok: false,
        err: 'Not found',
      },
      {
        vp: 'gateway-3.test',
        method: 'HTTP' as const,
        gateway: 'https://gateway3.test',
        ok: false,
        err: 'Connection refused',
      },
    ],
    threshold: { k: 2, n: 3, timeoutMs: 5000 },
    windowMin: 5,
    attemptedLibp2p: false,
  };
}

describe('Evidence Pack Builder - Core Functions', () => {
  describe('Input Validation', () => {
    it('should validate correct minimal inputs', () => {
      const inputs = createTestInputs(
        'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
        true
      );
      
      const validation = validateBuilderInputs(inputs);
      expect(validation).toEqual([]); // empty array means valid
    });

    it('should reject invalid CID', () => {
      const inputs = createTestInputs('', true); // empty CID
      const validation = validateBuilderInputs(inputs);
      expect(validation).toContain('cid missing or invalid');
    });

    it('should reject invalid SLO thresholds', () => {
      const inputs = createTestInputs(
        'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
        true
      );
      
      // Invalid k > n
      inputs.threshold = { k: 5, n: 3, timeoutMs: 5000 };
      const validation = validateBuilderInputs(inputs);
      expect(validation).toContain('threshold k/n invalid (k must be 1-n, n max 10)');
    });

    it('should reject missing probes', () => {
      const inputs = createTestInputs(
        'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
        true
      );
      
      inputs.probes = [];
      const validation = validateBuilderInputs(inputs);
      expect(validation).toContain('probes missing or empty');
    });

    it('should reject invalid windowMin', () => {
      const inputs = createTestInputs(
        'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
        true
      );
      
      inputs.windowMin = 0; // invalid
      const validation = validateBuilderInputs(inputs);
      expect(validation).toContain('windowMin out of range (1-60)');
    });

    it('should reject invalid timeout values', () => {
      const inputs = createTestInputs(
        'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
        true
      );
      
      inputs.threshold.timeoutMs = 100; // too low
      const validation = validateBuilderInputs(inputs);
      expect(validation).toContain('timeoutMs out of range (200-30000ms)');
    });
  });

  describe('Status Calculation', () => {
    it('should calculate OK status when k probes succeed', () => {
      expect(calculateStatus(2, 2)).toBe('OK'); // 2/2 meets threshold
      expect(calculateStatus(3, 2)).toBe('OK'); // 3/2 exceeds threshold
    });

    it('should calculate DEGRADED status for partial success', () => {
      expect(calculateStatus(1, 2)).toBe('DEGRADED'); // 1/2 partial
      expect(calculateStatus(2, 3)).toBe('DEGRADED'); // 2/3 partial
    });

    it('should calculate BREACH status for complete failure', () => {
      expect(calculateStatus(0, 2)).toBe('BREACH'); // 0/2 complete failure
      expect(calculateStatus(0, 5)).toBe('BREACH'); // 0/5 complete failure
    });

    it('should handle edge cases correctly', () => {
      expect(calculateStatus(1, 1)).toBe('OK'); // 1/1 threshold met
      expect(calculateStatus(0, 1)).toBe('BREACH'); // 0/1 complete failure
    });
  });

  describe('Test Input Helper', () => {
    it('should create inputs for available CID', () => {
      const cid = 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku';
      const inputs = createTestInputs(cid, true);
      
      expect(inputs.cid).toBe(cid);
      expect(inputs.probes).toHaveLength(3);
      expect(inputs.probes.every(p => p.ok)).toBe(true);
      expect(inputs.threshold.k).toBe(2);
      expect(inputs.threshold.n).toBe(3);
      expect(inputs.windowMin).toBe(5);
      expect(inputs.attemptedLibp2p).toBe(false);
    });

    it('should create inputs for unavailable CID', () => {
      const cid = 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku';
      const inputs = createTestInputs(cid, false);
      
      expect(inputs.cid).toBe(cid);
      expect(inputs.probes.every(p => !p.ok)).toBe(true);
      expect(inputs.probes.every(p => p.err)).toBeTruthy();
    });

    it('should generate unique vantage point names', () => {
      const cid = 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku';
      const inputs = createTestInputs(cid, true);
      
      const vps = inputs.probes.map(p => p.vp);
      const uniqueVps = new Set(vps);
      expect(uniqueVps.size).toBe(3); // all unique
      expect(vps.every(vp => vp.includes('gateway-'))).toBe(true);
    });

    it('should include realistic latencies for available probes', () => {
      const cid = 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku';
      const inputs = createTestInputs(cid, true);
      
      inputs.probes.forEach(probe => {
        if (probe.ok) {
          expect(probe.latMs).toBeGreaterThan(0);
          expect(probe.latMs).toBeLessThan(1000); // reasonable latency
        }
      });
    });
  });
});
