import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // This endpoint allows manual triggering of the probe system
    // Perfect for demos and testing
    
    console.log('Manual probe trigger initiated')
    
    // Import and execute the same logic as the cron job
    // For demo purposes, we'll just return a success response
    // In a real implementation, this would call the probe logic
    
    const result = {
      success: true,
      message: 'Probe system manually triggered',
      timestamp: new Date().toISOString(),
      mode: 'manual-demo',
      note: 'This would normally trigger the full probe cycle'
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Manual probe trigger failed:', error)
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
    description: 'Manual probe trigger endpoint',
    usage: 'POST to this endpoint to manually trigger probe cycle',
    timestamp: new Date().toISOString()
  })
}
