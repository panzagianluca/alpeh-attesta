/**
 * Manual Evidence Test - Trigger real probe for demo
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProbeExecutor } from '@/lib/probe-executor';

export async function POST(request: NextRequest) {
  try {
    const { cid } = await request.json();
    
    if (!cid) {
      return NextResponse.json({ error: 'CID is required' }, { status: 400 });
    }

    console.log(`🧪 Manual evidence test for CID: ${cid}`);

    // Execute real probes
    const probeExecutor = createProbeExecutor();
    const analysis = await probeExecutor.executeProbeBatch(cid);

    // Return formatted results
    const results = {
      cid,
      status: analysis.status,
      availability: analysis.analysis.availability,
      avgLatency: analysis.avgResponseTime,
      probes: analysis.results.map((result, index) => ({
        gateway: result.gateway,
        region: getRegionFromGateway(result.gateway, index),
        success: result.success,
        latency: result.responseTime,
        error: result.error,
        timestamp: result.timestamp
      })),
      summary: {
        total: analysis.totalProbes,
        successful: analysis.successfulProbes,
        failed: analysis.failedProbes,
        performance: analysis.analysis.performance
      }
    };

    return NextResponse.json({
      success: true,
      message: `Evidence test completed for ${cid}`,
      data: results
    });

  } catch (error) {
    console.error('❌ Manual evidence test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getRegionFromGateway(gateway: string, index: number): string {
  const gatewayRegions: Record<string, string> = {
    'ipfs.io': 'us-east',
    'dweb.link': 'eu-west', 
    'cloudflare-ipfs.com': 'global-cdn',
    'gateway.pinata.cloud': 'us-west',
    '4everland.io': 'ap-south'
  };

  for (const [hostname, region] of Object.entries(gatewayRegions)) {
    if (gateway.includes(hostname)) {
      return region;
    }
  }

  const fallbacks = ['us-east', 'eu-west', 'ap-south', 'us-west', 'eu-north'];
  return fallbacks[index % fallbacks.length] || `gateway-${index + 1}`;
}
