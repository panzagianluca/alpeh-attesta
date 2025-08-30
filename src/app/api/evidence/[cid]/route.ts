/**
 * Evidence Pack API - Get real probe data for a CID
 * 
 * This endpoint fetches the latest evidence pack for a CID
 * and returns real gateway latencies and probe results
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProbeExecutor } from '@/lib/probe-executor';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params;

  if (!cid) {
    return NextResponse.json({ error: 'CID is required' }, { status: 400 });
  }

  try {
    console.log(`🔍 Getting evidence data for CID: ${cid}`);

    // Execute real probes right now
    const probeExecutor = createProbeExecutor();
    const analysis = await probeExecutor.executeProbeBatch(cid);

    // Transform probe results into UI-friendly format
    const probeData = analysis.results.map((result, index) => {
      // Convert gateway URL to region name for display
      const region = getRegionFromGateway(result.gateway, index);
      
      return {
        region,
        gateway: result.gateway,
        success: result.success,
        latency: result.responseTime,
        status: result.success ? 'OK' : 'Failed',
        error: result.error,
        timestamp: result.timestamp
      };
    });

    // Calculate summary stats
    const summary = {
      cid,
      status: analysis.status,
      availability: analysis.analysis.availability,
      avgLatency: analysis.avgResponseTime,
      totalProbes: analysis.totalProbes,
      successfulProbes: analysis.successfulProbes,
      lastUpdate: Date.now(),
      probeData
    };

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error(`❌ Error getting evidence for CID ${cid}:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Convert gateway URL to a readable region name
 */
function getRegionFromGateway(gateway: string, index: number): string {
  const gatewayRegions: Record<string, string> = {
    'ipfs.io': 'us-east',
    'dweb.link': 'eu-west', 
    'cloudflare-ipfs.com': 'global-cdn',
    'gateway.pinata.cloud': 'us-west',
    '4everland.io': 'ap-south'
  };

  // Find region by matching gateway hostname
  for (const [hostname, region] of Object.entries(gatewayRegions)) {
    if (gateway.includes(hostname)) {
      return region;
    }
  }

  // Fallback to generic names
  const fallbacks = ['us-east', 'eu-west', 'ap-south', 'us-west', 'eu-north'];
  return fallbacks[index % fallbacks.length] || `gateway-${index + 1}`;
}
