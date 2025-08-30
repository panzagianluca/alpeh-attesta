/**
 * Enhanced Probe Worker System
 * 
 * Executes probes across multiple IPFS gateways and analyzes results
 * to determine CID availability and network health.
 */

export interface ProbeResult {
  gateway: string;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: number;
  contentHash?: string;
  contentSize?: number;
}

export interface ProbeAnalysis {
  cid: string;
  totalProbes: number;
  successfulProbes: number;
  failedProbes: number;
  avgResponseTime: number;
  status: 'OK' | 'DEGRADED' | 'BREACH';
  results: ProbeResult[];
  analysis: {
    availability: number; // Percentage
    consistency: boolean; // Content hash consistency
    performance: 'FAST' | 'SLOW' | 'TIMEOUT';
    breach: boolean; // SLO breach detected
  };
}

export class ProbeExecutor {
  private readonly gateways: string[];
  private readonly timeout: number;
  private readonly maxConcurrency: number;

  constructor(options: {
    gateways?: string[];
    timeout?: number;
    maxConcurrency?: number;
  } = {}) {
    this.gateways = options.gateways || this.getDefaultGateways();
    this.timeout = options.timeout || 5000; // 5 seconds default
    this.maxConcurrency = options.maxConcurrency || 5;
  }

  private getDefaultGateways(): string[] {
    // Get gateways from environment or use defaults
    const envGateways = process.env.IPFS_GATEWAYS;
    if (envGateways) {
      return envGateways.split(',').map(g => g.trim()).filter(Boolean);
    }

    return [
      'https://ipfs.io/ipfs',
      'https://dweb.link/ipfs',
      'https://cloudflare-ipfs.com/ipfs',
      'https://gateway.pinata.cloud/ipfs',
      'https://4everland.io/ipfs'
    ];
  }

  /**
   * Execute probes for a single CID across all gateways
   */
  async executeProbeBatch(cid: string): Promise<ProbeAnalysis> {
    const startTime = Date.now();
    console.log(`🔍 Executing probe batch for CID: ${cid.slice(0, 12)}...`);

    // Execute probes in parallel with concurrency limit
    const probePromises = this.gateways.map(gateway => 
      this.executeSingleProbe(cid, gateway)
    );

    const results = await Promise.all(probePromises);
    const analysis = this.analyzeResults(cid, results);

    const duration = Date.now() - startTime;
    console.log(`✅ Probe batch completed in ${duration}ms - Status: ${analysis.status}`);

    return analysis;
  }

  /**
   * Execute a single probe against one gateway
   */
  private async executeSingleProbe(cid: string, gateway: string): Promise<ProbeResult> {
    const startTime = Date.now();
    const url = `${gateway}/${cid}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'HEAD', // Use HEAD to check availability without downloading
        signal: controller.signal,
        headers: {
          'User-Agent': 'CID-Sentinel/1.0 (+https://github.com/your-repo)'
        }
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return {
        gateway,
        success: response.ok,
        responseTime,
        statusCode: response.status,
        timestamp: Date.now(),
        contentSize: response.headers.get('content-length') 
          ? parseInt(response.headers.get('content-length')!)
          : undefined
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        gateway,
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Analyze probe results to determine CID status
   */
  private analyzeResults(cid: string, results: ProbeResult[]): ProbeAnalysis {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    const availability = (successful.length / results.length) * 100;
    const avgResponseTime = successful.length > 0
      ? successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length
      : 0;

    // Determine overall status based on availability
    let status: 'OK' | 'DEGRADED' | 'BREACH';
    if (availability >= 80) {
      status = 'OK';
    } else if (availability >= 50) {
      status = 'DEGRADED';
    } else {
      status = 'BREACH';
    }

    // Performance analysis
    let performance: 'FAST' | 'SLOW' | 'TIMEOUT';
    if (avgResponseTime < 2000) {
      performance = 'FAST';
    } else if (avgResponseTime < 5000) {
      performance = 'SLOW';
    } else {
      performance = 'TIMEOUT';
    }

    // Content consistency check (simplified)
    const sizes = successful
      .map(r => r.contentSize)
      .filter(size => size !== undefined);
    const consistency = sizes.length <= 1 || sizes.every(size => size === sizes[0]);

    return {
      cid,
      totalProbes: results.length,
      successfulProbes: successful.length,
      failedProbes: failed.length,
      avgResponseTime,
      status,
      results,
      analysis: {
        availability,
        consistency,
        performance,
        breach: status === 'BREACH'
      }
    };
  }

  /**
   * Execute probes for multiple CIDs in parallel
   */
  async executeMultipleProbes(cids: string[]): Promise<ProbeAnalysis[]> {
    console.log(`🚀 Executing probes for ${cids.length} CIDs across ${this.gateways.length} gateways`);
    
    const startTime = Date.now();
    
    // Process CIDs in batches to avoid overwhelming gateways
    const batchSize = Math.min(this.maxConcurrency, cids.length);
    const batches: string[][] = [];
    
    for (let i = 0; i < cids.length; i += batchSize) {
      batches.push(cids.slice(i, i + batchSize));
    }

    const allResults: ProbeAnalysis[] = [];
    
    for (const batch of batches) {
      const batchPromises = batch.map(cid => this.executeProbeBatch(cid));
      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);
    }

    const duration = Date.now() - startTime;
    const summary = this.summarizeResults(allResults);
    
    console.log(`🎯 Probe execution completed in ${duration}ms:`);
    console.log(`   - OK: ${summary.ok}, DEGRADED: ${summary.degraded}, BREACH: ${summary.breach}`);
    console.log(`   - Avg Response Time: ${summary.avgResponseTime.toFixed(0)}ms`);
    console.log(`   - Overall Availability: ${summary.overallAvailability.toFixed(1)}%`);

    return allResults;
  }

  /**
   * Summarize results across all probes
   */
  private summarizeResults(analyses: ProbeAnalysis[]) {
    const ok = analyses.filter(a => a.status === 'OK').length;
    const degraded = analyses.filter(a => a.status === 'DEGRADED').length;
    const breach = analyses.filter(a => a.status === 'BREACH').length;
    
    const totalAvailability = analyses.reduce((sum, a) => sum + a.analysis.availability, 0);
    const overallAvailability = analyses.length > 0 ? totalAvailability / analyses.length : 0;
    
    const totalResponseTime = analyses.reduce((sum, a) => sum + a.avgResponseTime, 0);
    const avgResponseTime = analyses.length > 0 ? totalResponseTime / analyses.length : 0;

    return {
      ok,
      degraded,
      breach,
      overallAvailability,
      avgResponseTime
    };
  }
}

/**
 * Factory function to create probe executor
 */
export function createProbeExecutor(): ProbeExecutor {
  return new ProbeExecutor({
    timeout: parseInt(process.env.PROBE_TIMEOUT || '5000'),
    maxConcurrency: parseInt(process.env.PROBE_CONCURRENCY || '5')
  });
}
