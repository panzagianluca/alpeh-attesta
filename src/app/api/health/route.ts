/**
 * Production Health Check and Monitoring Endpoint
 * 
 * Provides detailed health status for production monitoring
 */

export const runtime = 'nodejs';
export const maxDuration = 10;

import { NextResponse } from 'next/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  region: string;
  uptime: number;
  lastCronExecution?: string;
  metrics: {
    averageExecutionTime: number;
    successRate: number;
    errorRate: number;
    lastErrors: string[];
  };
  dependencies: {
    ipfsGateways: { [gateway: string]: 'up' | 'down' | 'unknown' };
    web3Storage: 'connected' | 'disconnected' | 'unknown';
  };
}

// In-memory metrics (would be replaced with Redis/DB in real production)
let healthMetrics = {
  executions: [] as Array<{ timestamp: number; duration: number; success: boolean; error?: string }>,
  lastChecked: 0
};

export async function GET() {
  try {
    const now = Date.now();
    const uptime = process.uptime ? process.uptime() * 1000 : 0;
    
    // Test critical dependencies
    const gatewayStatus = await testGateways();
    const web3StorageStatus = await testWeb3Storage();
    
    // Calculate metrics from recent executions
    const recentExecutions = healthMetrics.executions.filter(e => now - e.timestamp < 3600000); // Last hour
    const successRate = recentExecutions.length > 0 
      ? (recentExecutions.filter(e => e.success).length / recentExecutions.length) * 100 
      : 100;
    
    const averageExecutionTime = recentExecutions.length > 0
      ? recentExecutions.reduce((sum, e) => sum + e.duration, 0) / recentExecutions.length
      : 0;
    
    const errorRate = 100 - successRate;
    const lastErrors = recentExecutions
      .filter(e => !e.success && e.error)
      .slice(-5)
      .map(e => e.error!);
    
    // Determine overall health status
    let status: HealthStatus['status'] = 'healthy';
    if (successRate < 80 || averageExecutionTime > 20000) {
      status = 'degraded';
    }
    if (successRate < 50 || Object.values(gatewayStatus).filter(s => s === 'down').length > 2) {
      status = 'unhealthy';
    }
    
    const health: HealthStatus = {
      status,
      timestamp: new Date(now).toISOString(),
      environment: process.env.NODE_ENV || 'development',
      region: process.env.VERCEL_REGION || 'local',
      uptime,
      metrics: {
        averageExecutionTime,
        successRate,
        errorRate,
        lastErrors
      },
      dependencies: {
        ipfsGateways: gatewayStatus,
        web3Storage: web3StorageStatus
      }
    };
    
    return NextResponse.json(health);
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      region: process.env.VERCEL_REGION || 'local',
      uptime: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      metrics: {
        averageExecutionTime: 0,
        successRate: 0,
        errorRate: 100,
        lastErrors: [error instanceof Error ? error.message : 'Unknown error']
      },
      dependencies: {
        ipfsGateways: {},
        web3Storage: 'unknown'
      }
    } as HealthStatus, { status: 503 });
  }
}

/**
 * Update health metrics (called by cron)
 */
export function updateHealthMetrics(duration: number, success: boolean, error?: string) {
  const now = Date.now();
  
  healthMetrics.executions.push({
    timestamp: now,
    duration,
    success,
    error
  });
  
  // Keep only last 100 executions
  if (healthMetrics.executions.length > 100) {
    healthMetrics.executions = healthMetrics.executions.slice(-100);
  }
  
  healthMetrics.lastChecked = now;
}

async function testGateways(): Promise<{ [gateway: string]: 'up' | 'down' | 'unknown' }> {
  const gateways = (process.env.IPFS_GATEWAYS || 'https://ipfs.io/ipfs,https://dweb.link/ipfs')
    .split(',')
    .map(g => g.trim());
  
  const status: { [gateway: string]: 'up' | 'down' | 'unknown' } = {};
  
  await Promise.allSettled(
    gateways.map(async (gateway) => {
      try {
        const testCID = 'bafybeihkoviema7g3gxyt6la7b7kbbv2dzx3cgwnp2fvq5mw6u7pjzjwm4';
        const response = await fetch(`${gateway}/${testCID}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000)
        });
        status[gateway] = response.ok ? 'up' : 'down';
      } catch {
        status[gateway] = 'down';
      }
    })
  );
  
  return status;
}

async function testWeb3Storage(): Promise<'connected' | 'disconnected' | 'unknown'> {
  if (!process.env.WEB3_STORAGE_TOKEN) {
    return 'unknown';
  }
  
  try {
    const response = await fetch('https://api.web3.storage/user/uploads', {
      headers: {
        'Authorization': `Bearer ${process.env.WEB3_STORAGE_TOKEN}`
      },
      signal: AbortSignal.timeout(3000)
    });
    
    return response.ok ? 'connected' : 'disconnected';
  } catch {
    return 'disconnected';
  }
}
