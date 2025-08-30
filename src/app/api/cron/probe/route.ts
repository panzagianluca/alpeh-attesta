/**
 * CID Sentinel Cron Orchestrator
 * 
 * Executes every 60 seconds to:
 * 1. Fetch active CIDs to monitor
 * 2. Execute probes across multiple gateways
 * 3. Build and sign Evidence Packs
 * 4. Upload to IPFS
 * 5. Anchor on-chain via reportPack
 * 
 * Designed to complete within 60-second budget.
 */

import { NextResponse } from 'next/server';
import { createAndUploadEvidencePack, type BuilderInputs } from '@/lib/evidence';
import { getCIDManager, type ActiveCID } from '@/lib/cid-manager';
import { createProbeExecutor, type ProbeAnalysis } from '@/lib/probe-executor';

// Prevent concurrent executions
let isRunning = false;
let lastExecution = 0;

// Cycle statistics
interface CycleStats {
  startTime: number;
  processed: number;
  anchored: number;
  errors: number;
  duration: number;
  cids: Array<{
    cid: string;
    status: 'OK' | 'DEGRADED' | 'BREACH' | 'ERROR';
    okCount?: number;
    packCID?: string;
    error?: string;
    timings: {
      probes: number;
      build: number;
      upload: number;
      total: number;
    };
  }>;
}

let lastCycleStats: CycleStats | null = null;

export async function GET() {
  // Health check endpoint
  return NextResponse.json({
    service: 'CID Sentinel Cron Orchestrator',
    status: isRunning ? 'RUNNING' : 'IDLE',
    lastExecution: lastExecution ? new Date(lastExecution).toISOString() : null,
    lastCycle: lastCycleStats,
    budget: {
      cycleLimit: '60s',
      cidLimit: '6s per CID',
      maxConcurrent: 3
    }
  });
}

export async function POST() {
  const startTime = Date.now();
  
  // Prevent concurrent executions
  if (isRunning) {
    return NextResponse.json({
      success: false,
      error: 'Cron already running',
      lastExecution: lastExecution ? new Date(lastExecution).toISOString() : null
    }, { status: 429 });
  }

  // Guard against too frequent executions (min 30s between cycles)
  if (Date.now() - lastExecution < 30000) {
    return NextResponse.json({
      success: false,
      error: 'Too frequent execution, minimum 30s between cycles',
      lastExecution: new Date(lastExecution).toISOString()
    }, { status: 429 });
  }

  isRunning = true;
  lastExecution = startTime;

  const stats: CycleStats = {
    startTime,
    processed: 0,
    anchored: 0,
    errors: 0,
    duration: 0,
    cids: []
  };

  try {
    console.log('🚀 CID Sentinel Cron Cycle Started', {
      timestamp: new Date(startTime).toISOString(),
      budget: '60s'
    });

    // Step 1: Fetch CIDs to monitor
    const activeCIDs = await fetchActiveCIDs();
    console.log(`📋 Found ${activeCIDs.length} active CIDs to monitor`);

    // Step 2: Process CIDs with controlled concurrency
    const maxConcurrent = 3;
    const results = await processCIDsWithConcurrency(activeCIDs, maxConcurrent);

    // Step 3: Update statistics
    stats.processed = results.length;
    stats.anchored = results.filter(r => r.status !== 'ERROR').length;
    stats.errors = results.filter(r => r.status === 'ERROR').length;
    stats.cids = results;
    stats.duration = Date.now() - startTime;

    console.log('✅ CID Sentinel Cron Cycle Completed', {
      duration: `${stats.duration}ms`,
      processed: stats.processed,
      anchored: stats.anchored,
      errors: stats.errors,
      budget: stats.duration < 60000 ? 'ON_BUDGET' : 'OVER_BUDGET'
    });

    lastCycleStats = stats;

    return NextResponse.json({
      success: true,
      cycle: {
        duration: stats.duration,
        processed: stats.processed,
        anchored: stats.anchored,
        errors: stats.errors,
        budget: stats.duration < 60000 ? 'ON_BUDGET' : 'OVER_BUDGET'
      },
      results: stats.cids
    });

  } catch (error) {
    stats.duration = Date.now() - startTime;
    stats.errors = 1;
    
    console.error('❌ CID Sentinel Cron Cycle Failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: stats.duration
    });

    lastCycleStats = stats;

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: stats.duration
    }, { status: 500 });

  } finally {
    isRunning = false;
  }
}

/**
 * Fetch active CIDs to monitor using CID Manager
 * Supports both demo mode and on-chain event reading
 */
async function fetchActiveCIDs(): Promise<string[]> {
  try {
    const cidManager = getCIDManager();
    const activeCIDs = await cidManager.getActiveCIDs();
    
    console.log(`📋 Fetched ${activeCIDs.length} active CIDs to monitor`);
    
    // Return just the CID strings for backward compatibility
    return activeCIDs.map(cid => cid.cid);
    
  } catch (error) {
    console.error('❌ Failed to fetch active CIDs:', error);
    
    // Fallback to demo CIDs
    const fallbackCIDs = [
      'bafybeihkoviema7g3gxyt6la7b7kbbv2dzx3cgwnp2fvq5mw6u7pjzjwm4',
      'bafybeidj6idz6p5vgjo5bqqzipbdf5q5a6pqm4nww3kfbmntplm5v3lx7a',
    ];
    
    console.log(`🔄 Using fallback CIDs: ${fallbackCIDs.join(', ')}`);
    return fallbackCIDs;
  }
}

/**
 * Process CIDs with controlled concurrency to stay within 60s budget
 */
async function processCIDsWithConcurrency(
  cids: string[], 
  maxConcurrent: number
): Promise<CycleStats['cids']> {
  const results: CycleStats['cids'] = [];
  
  // Process CIDs in batches
  for (let i = 0; i < cids.length; i += maxConcurrent) {
    const batch = cids.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(cid => processSingleCID(cid));
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          cid: batch[index],
          status: 'ERROR',
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          timings: { probes: 0, build: 0, upload: 0, total: 0 }
        });
      }
    });
  }
  
  return results;
}

/**
 * Process a single CID: probe → build → upload → anchor
 */
async function processSingleCID(cid: string): Promise<CycleStats['cids'][0]> {
  const cidStartTime = Date.now();
  const timings = { probes: 0, build: 0, upload: 0, total: 0 };

  try {
    console.log(`🔍 Processing CID: ${cid.slice(0, 12)}...`);

    // Step 1: Execute probes using enhanced probe executor
    const probeStartTime = Date.now();
    const probeExecutor = createProbeExecutor();
    const probeAnalysis = await probeExecutor.executeProbeBatch(cid);
    timings.probes = Date.now() - probeStartTime;

    // Convert ProbeAnalysis to legacy probe format for Evidence Pack Builder
    const legacyProbes = probeAnalysis.results.map((result, index) => ({
      vp: `gateway-${index + 1}`,
      method: 'HTTP' as const,
      gateway: result.gateway,
      ok: result.success,
      latMs: result.responseTime,
      err: result.error
    }));

    // Step 2: Build Evidence Pack
    const buildStartTime = Date.now();
    const inputs: BuilderInputs = {
      cid,
      windowMin: 5,
      threshold: { k: 2, n: 3, timeoutMs: 5000 },
      probes: legacyProbes,
      attemptedLibp2p: false, // serverless limitation
      ts: Math.floor(Date.now() / 1000)
    };

    const buildResult = await createAndUploadEvidencePack(inputs);
    timings.build = Date.now() - buildStartTime;
    timings.total = Date.now() - cidStartTime;

    if (!buildResult.success) {
      return {
        cid,
        status: 'ERROR',
        error: buildResult.error,
        timings
      };
    }

    // Use enhanced probe analysis for status
    const status = probeAnalysis.status;
    const okCount = probeAnalysis.successfulProbes;

    console.log(`✅ CID ${cid.slice(0, 12)}... processed: ${status} (${okCount}/${probeAnalysis.totalProbes} probes OK, ${probeAnalysis.analysis.availability.toFixed(1)}% availability)`);

    return {
      cid,
      status,
      okCount,
      packCID: buildResult.ipfsCID,
      timings
    };

  } catch (error) {
    timings.total = Date.now() - cidStartTime;
    
    console.error(`❌ Error processing CID ${cid.slice(0, 12)}...`, error);
    
    return {
      cid,
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      timings
    };
  }
}

/**
 * Get configured IPFS gateways for legacy compatibility
 * (This function is kept for backward compatibility but may be removed)
 */
function getConfiguredGateways(): string[] {
  const gatewaysEnv = process.env.NEXT_PUBLIC_GATEWAYS;
  
  if (gatewaysEnv) {
    return gatewaysEnv.split(',').map(gateway => gateway.trim());
  }

  // Default gateways
  return [
    'https://ipfs.io',
    'https://dweb.link',
    'https://cloudflare-ipfs.com'
  ];
}
