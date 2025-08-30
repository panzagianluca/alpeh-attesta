/**
 * Evidence Pack Builder API Endpoint
 * 
 * Provides HTTP interface for creating Evidence Packs.
 * Used for testing and integration with external systems.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildEvidencePack, type BuilderInputs, validateBuilderInputs } from '@/lib/evidence';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    // Cast to BuilderInputs (TypeScript validation)
    const inputs: BuilderInputs = {
      cid: body.cid,
      windowMin: body.windowMin,
      threshold: body.threshold,
      probes: body.probes,
      attemptedLibp2p: body.attemptedLibp2p,
      ts: body.ts, // optional
    };

    // Validate inputs using schema validation
    const validationErrors = validateBuilderInputs(inputs);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: validationErrors 
        },
        { status: 400 }
      );
    }

    // Build Evidence Pack
    const result = await buildEvidencePack(inputs);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          packCID: result.ipfsCID,
          status: result.status,
          okCount: result.evidencePack.agg?.okCount,
          buildTimeMs: result.buildTimeMs,
          uploadSizeBytes: result.uploadSizeBytes,
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          stage: result.stage 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Evidence Pack API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Evidence Pack Builder API',
    version: '1.0.0',
    endpoints: {
      'POST /api/evidence/build': 'Create Evidence Pack from probe results',
    },
    example: {
      cid: 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
      windowMin: 5,
      threshold: { k: 2, n: 3, timeoutMs: 5000 },
      probes: [
        {
          vp: 'us-east',
          method: 'HTTP',
          gateway: 'https://ipfs.io',
          ok: true,
          latMs: 420
        }
      ],
      attemptedLibp2p: false
    }
  });
}
