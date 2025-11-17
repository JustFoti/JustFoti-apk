/**
 * Vercel Edge Function Test for Decoder System
 * 
 * This API route tests the decoder system in Vercel Edge Runtime.
 * It verifies edge compatibility and provides diagnostic information.
 * 
 * Usage: GET /api/test-edge-decoder
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyEdgeCompatibility } from '@/app/lib/decoders/edge-runtime-test';
import { decode } from '@/app/lib/decoders';

// Force edge runtime
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Run compatibility tests
    const compatibilityResults = await verifyEdgeCompatibility();
    
    // Test with sample encoded string from query params
    const searchParams = request.nextUrl.searchParams;
    const testString = searchParams.get('test');
    
    let decodeResult = null;
    if (testString) {
      decodeResult = await decode(testString, { enableDiagnostics: true });
    }
    
    return NextResponse.json({
      success: true,
      edgeRuntime: true,
      compatibility: compatibilityResults,
      decodeTest: decodeResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
