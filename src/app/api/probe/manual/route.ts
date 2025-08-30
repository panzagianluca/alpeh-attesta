import { NextRequest, NextResponse } from 'next/server'
import { getCIDManager } from '@/lib/cid-manager'
import { createProbeExecutor } from '@/lib/probe-executor'
import { createAndUploadEvidencePack, type BuilderInputs } from '@/lib/evidence'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Manual probe triggered from dashboard')
    
    // Step 1: Get active CIDs from CID manager
    const cidManager = getCIDManager()
    const activeCIDs = await cidManager.getActiveCIDs()
    console.log(`📋 Found ${activeCIDs.length} CIDs to probe:`, activeCIDs.map(c => c.cid.slice(0, 12) + '...'))
    
    if (activeCIDs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No CIDs found to probe',
        message: 'No user-registered CIDs found in the smart contract. Users need to register CIDs first.'
      }, { status: 404 })
    }

    // Step 2: Process each CID
    const results = []
    const probeExecutor = createProbeExecutor()
    
    for (const activeCID of activeCIDs) {
      const startTime = Date.now()
      
      try {
        console.log(`🔍 Probing CID: ${activeCID.cid.slice(0, 12)}...`)
        
        // Execute probes
        const probeAnalysis = await probeExecutor.executeProbeBatch(activeCID.cid)
        
        // Convert to legacy format for evidence pack builder
        const legacyProbes = probeAnalysis.results.map((result, index) => ({
          vp: `gateway-${index + 1}`,
          method: 'HTTP' as const,
          gateway: result.gateway,
          ok: result.success,
          latMs: result.responseTime,
          err: result.error
        }))

        // Build evidence pack if needed (only for issues)
        let packCID = null
        if (probeAnalysis.status !== 'OK') {
          const inputs: BuilderInputs = {
            cid: activeCID.cid,
            windowMin: 5,
            threshold: { k: 2, n: 3, timeoutMs: 5000 },
            probes: legacyProbes,
            attemptedLibp2p: false,
            ts: Math.floor(Date.now() / 1000)
          }

          const buildResult = await createAndUploadEvidencePack(inputs)
          if (buildResult.success) {
            packCID = buildResult.ipfsCID
          }
        }

        const duration = Date.now() - startTime
        
        results.push({
          cid: activeCID.cid,
          status: probeAnalysis.status,
          successfulProbes: probeAnalysis.successfulProbes,
          totalProbes: probeAnalysis.totalProbes,
          availability: probeAnalysis.analysis.availability,
          packCID,
          duration
        })

        console.log(`✅ Completed ${activeCID.cid.slice(0, 12)}...: ${probeAnalysis.status} (${duration}ms)`)
        
      } catch (error) {
        console.error(`❌ Failed to probe ${activeCID.cid.slice(0, 12)}...:`, error)
        results.push({
          cid: activeCID.cid,
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        })
      }
    }

    console.log('✅ Manual probe cycle completed:', {
      processed: results.length,
      successful: results.filter(r => r.status !== 'ERROR').length,
      errors: results.filter(r => r.status === 'ERROR').length
    })

    return NextResponse.json({
      success: true,
      message: `Manual probe completed - processed ${results.length} CIDs`,
      timestamp: new Date().toISOString(),
      mode: 'manual-trigger',
      results: results,
      summary: {
        processed: results.length,
        successful: results.filter(r => r.status !== 'ERROR').length,
        errors: results.filter(r => r.status === 'ERROR').length,
        evidencePacks: results.filter(r => r.packCID).length
      }
    })

  } catch (error) {
    console.error('❌ Manual probe trigger failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // GET endpoint to check status
  return NextResponse.json({
    status: 'ready',
    description: 'Manual probe trigger - executes full cron cycle',
    usage: 'POST to this endpoint to manually trigger the complete probe cycle (fetch CIDs → probe gateways → build evidence packs → upload to IPFS → anchor on-chain)',
    note: 'This calls the same logic as /api/cron/probe but can be triggered manually for demos',
    timestamp: new Date().toISOString()
  })
}
