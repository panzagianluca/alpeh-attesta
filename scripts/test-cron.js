#!/usr/bin/env node

/**
 * Test script for CID Sentinel Cron Endpoint
 * 
 * Tests both GET (health check) and POST (execution) endpoints
 */

const BASE_URL = 'http://localhost:3000';

async function testHealthCheck() {
  console.log('🏥 Testing health check endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/cron/probe`);
    const data = await response.json();
    
    console.log('✅ Health check response:', {
      status: response.status,
      service: data.service,
      currentStatus: data.status,
      lastExecution: data.lastExecution
    });
    
    if (data.service !== 'CID Sentinel Cron Orchestrator') {
      throw new Error('Unexpected service name');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testExecution() {
  console.log('\n🚀 Testing cron execution endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/cron/probe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CID-Sentinel-Test/1.0'
      }
    });

    const data = await response.json();
    
    console.log('✅ Execution response:', {
      status: response.status,
      success: data.success,
      processed: data.processed,
      duration: data.duration
    });

    if (data.stats) {
      console.log('📊 Execution stats:', {
        processed: data.stats.processed,
        anchored: data.stats.anchored,
        errors: data.stats.errors,
        duration: `${data.stats.duration}ms`
      });

      if (data.stats.cids && data.stats.cids.length > 0) {
        console.log('📦 CID Results:');
        data.stats.cids.forEach(cid => {
          console.log(`   - ${cid.cid.slice(0, 12)}...: ${cid.status} (${cid.okCount || 0} OK probes)`);
          if (cid.packCID) {
            console.log(`     Evidence Pack: ${cid.packCID.slice(0, 12)}...`);
          }
          if (cid.error) {
            console.log(`     Error: ${cid.error}`);
          }
        });
      }
    }

    return response.ok;
  } catch (error) {
    console.error('❌ Execution test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Starting CID Sentinel Cron Tests\n');
  
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.error('\n❌ Health check failed, skipping execution test');
    process.exit(1);
  }
  
  const executionOk = await testExecution();
  if (!executionOk) {
    console.error('\n❌ Execution test failed');
    process.exit(1);
  }
  
  console.log('\n✅ All tests passed! Cron endpoint is working correctly.');
}

// Check if server is accessible
fetch(`${BASE_URL}/api/cron/probe`)
  .then(() => main())
  .catch(() => {
    console.error(`❌ Server not accessible at ${BASE_URL}`);
    console.log('   Please run: npm run dev');
    process.exit(1);
  });
