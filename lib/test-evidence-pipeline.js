/**
 * Evidence Pipeline Test
 * Basic test to verify IPFS evidence pipeline functionality
 */

import { evidencePipeline } from './evidence-pipeline.js';

async function testEvidencePipeline() {
  console.log('🧪 Testing Evidence Pipeline...\n');

  try {
    // Test 1: Create demo evidence
    console.log('Test 1: Demo Evidence Creation');
    console.log('==============================');
    
    const testCID = 'QmTest123456789AbcDef';
    const demoResult = await evidencePipeline.createDemoEvidence(testCID, 4);
    
    console.log('Demo Result:', {
      success: demoResult.success,
      packCID: demoResult.packCID,
      evidenceCount: demoResult.metadata.evidenceCount,
      packSize: demoResult.metadata.packSize,
      processingTime: demoResult.metadata.processingTime
    });

    if (!demoResult.success) {
      console.log('Errors:', demoResult.errors);
      return false;
    }

    // Test 2: Retrieve and validate
    console.log('\nTest 2: Evidence Retrieval');
    console.log('==========================');
    
    const retrivalResult = await evidencePipeline.retrieveEvidence(demoResult.packCID);
    
    console.log('Retrieval Result:', {
      success: retrivalResult.success,
      packCID: retrivalResult.packCID,
      evidenceCount: retrivalResult.metadata.evidenceCount,
      validationPassed: retrivalResult.validation?.valid
    });

    if (!retrivalResult.success) {
      console.log('Errors:', retrivalResult.errors);
      return false;
    }

    // Test 3: Pipeline Status
    console.log('\nTest 3: Pipeline Status');
    console.log('=======================');
    
    const status = await evidencePipeline.getStatus();
    console.log('Status:', status);

    // Cleanup
    await evidencePipeline.cleanup();

    console.log('\n✅ All tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Cleanup on error
    try {
      await evidencePipeline.cleanup();
    } catch (cleanupError) {
      console.error('Cleanup also failed:', cleanupError);
    }
    
    return false;
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEvidencePipeline()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testEvidencePipeline };
