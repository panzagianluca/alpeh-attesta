#!/usr/bin/env node

/**
 * Vercel Deployment Verification Script
 * 
 * Tests production deployment health and cron functionality
 */

const VERCEL_URL = process.argv[2] || 'http://localhost:3000';

async function testHealth() {
  console.log('🏥 Testing health endpoint...');
  
  try {
    const response = await fetch(`${VERCEL_URL}/api/health`);
    const health = await response.json();
    
    console.log('✅ Health Status:', {
      status: health.status,
      environment: health.environment,
      region: health.region,
      successRate: health.metrics?.successRate?.toFixed(1) + '%',
      avgExecutionTime: health.metrics?.averageExecutionTime?.toFixed(0) + 'ms'
    });
    
    // Check gateway status
    const downGateways = Object.entries(health.dependencies?.ipfsGateways || {})
      .filter(([_, status]) => status === 'down');
    
    if (downGateways.length > 0) {
      console.warn('⚠️  Down gateways:', downGateways.map(([gw]) => gw));
    }
    
    return health.status === 'healthy';
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testCronExecution() {
  console.log('\n🚀 Testing cron execution...');
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${VERCEL_URL}/api/cron/probe`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Vercel-Deployment-Test/1.0'
      }
    });
    
    const result = await response.json();
    const duration = Date.now() - startTime;
    
    console.log('✅ Cron Execution:', {
      success: result.success,
      processed: result.cycle?.processed,
      duration: result.cycle?.duration + 'ms',
      budget: result.cycle?.budget,
      httpDuration: duration + 'ms'
    });
    
    if (result.results && result.results.length > 0) {
      console.log('📦 CID Results:');
      result.results.forEach(cid => {
        console.log(`   - ${cid.cid.slice(0, 12)}...: ${cid.status} (${cid.okCount || 0} OK probes)`);
      });
    }
    
    return result.success;
  } catch (error) {
    console.error('❌ Cron execution failed:', error.message);
    return false;
  }
}

async function testCronSchedule() {
  console.log('\n⏰ Testing cron schedule...');
  
  try {
    // Check if cron is configured
    const response = await fetch(`${VERCEL_URL}/api/cron/probe`);
    const status = await response.json();
    
    console.log('✅ Cron Status:', {
      service: status.service,
      status: status.status,
      lastExecution: status.lastExecution
    });
    
    if (status.lastExecution) {
      const lastRun = new Date(status.lastExecution);
      const now = new Date();
      const timeSinceLastRun = (now.getTime() - lastRun.getTime()) / 1000;
      
      console.log(`⏱️  Last execution: ${timeSinceLastRun.toFixed(0)}s ago`);
      
      if (timeSinceLastRun > 120) { // More than 2 minutes
        console.warn('⚠️  Cron might not be running (last execution > 2min ago)');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Cron schedule check failed:', error.message);
    return false;
  }
}

async function main() {
  console.log(`🧪 Vercel Deployment Verification for: ${VERCEL_URL}\n`);
  
  const healthOk = await testHealth();
  const cronOk = await testCronExecution();
  const scheduleOk = await testCronSchedule();
  
  console.log('\n📊 Summary:');
  console.log(`   Health: ${healthOk ? '✅' : '❌'}`);
  console.log(`   Cron Execution: ${cronOk ? '✅' : '❌'}`);
  console.log(`   Cron Schedule: ${scheduleOk ? '✅' : '❌'}`);
  
  if (healthOk && cronOk && scheduleOk) {
    console.log('\n🎉 Deployment verification passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Deployment verification failed!');
    process.exit(1);
  }
}

main().catch(console.error);
