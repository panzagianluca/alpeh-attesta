/**
 * Off-chain Integration Test
 * Test the complete off-chain integration workflow
 */

import { evidenceWorkflow } from './evidence-workflow.js';
import { packReporter } from './pack-reporter.js';
import { evidenceRegistryClient } from './contract-client.js';

async function testOffChainIntegration() {
  console.log('🧪 Testing Off-chain Integration...\n');

  try {
    // Test 1: Initialize all components
    console.log('Test 1: Component Initialization');
    console.log('=================================');
    
    // Initialize in demo mode (no contract required)
    await evidenceWorkflow.init(true);
    await packReporter.init();
    
    const workflowStatus = await evidenceWorkflow.getStatus();
    const reporterStats = packReporter.getStats();
    
    console.log('Workflow Status:', {
      initialized: workflowStatus.initialized,
      demoMode: workflowStatus.demoMode,
      pipeline: workflowStatus.pipeline.initialized
    });
    
    console.log('Reporter Stats:', reporterStats);

    // Test 2: Execute demo workflow
    console.log('\nTest 2: Demo Workflow Execution');
    console.log('===============================');
    
    const testCID = 'QmTestOffChain123456789';
    const workflowResult = await evidenceWorkflow.executeDemoWorkflow(testCID, 3, {
      registerCID: false, // Skip contract operations in demo
      reportPack: false,
      stakeAmount: '0'
    });
    
    console.log('Workflow Result:', {
      success: workflowResult.success,
      state: workflowResult.state,
      packCID: workflowResult.packCID,
      evidenceCount: workflowResult.metadata.evidenceCount,
      processingTime: workflowResult.metadata.processingTime,
      errors: workflowResult.errors
    });

    if (!workflowResult.success) {
      console.log('Workflow errors:', workflowResult.errors);
      return false;
    }

    // Test 3: Pack reporter demo (queue only, no contract submission)
    console.log('\nTest 3: Pack Reporter Demo');
    console.log('==========================');
    
    const reportId = await packReporter.submitReport({
      cid: testCID,
      packCID: workflowResult.packCID,
      pack: workflowResult.pack,
      validate: true,
      queue: true // Just queue, don't process without contract
    });
    
    console.log('Report Queued:', reportId);
    
    // Get report status
    const reportStatus = packReporter.getReportStatus(reportId);
    console.log('Report Status:', reportStatus);

    // Test 4: Contract client status (demo mode)
    console.log('\nTest 4: Contract Client Status');
    console.log('==============================');
    
    const contractStatus = await evidenceRegistryClient.getStatus();
    console.log('Contract Status:', {
      contractAddress: contractStatus.contractAddress,
      deployed: contractStatus.deployed,
      initialized: contractStatus.initialized,
      accountCount: Object.keys(contractStatus.accounts || {}).length
    });

    // Cleanup
    await evidenceWorkflow.cleanup();
    await packReporter.cleanup();

    console.log('\n✅ All off-chain integration tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Off-chain integration test failed:', error);
    
    // Cleanup on error
    try {
      await evidenceWorkflow.cleanup();
      await packReporter.cleanup();
    } catch (cleanupError) {
      console.error('Cleanup also failed:', cleanupError);
    }
    
    return false;
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testOffChainIntegration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testOffChainIntegration };
