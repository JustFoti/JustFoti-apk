/**
 * Admin Logout API Route
 * POST /api/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/utils/auth';

export async function POST(request: NextRequest) {
  // Create response
  const response = NextResponse.json(
    { success: true },
    { status: 200 }
  );
  
  // Clear auth cookie
  response.headers.set('Set-Cookie', clearAuthCookie());
  
  return response;
}
