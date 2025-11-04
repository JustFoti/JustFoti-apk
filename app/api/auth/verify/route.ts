/**
 * Auth Verification API Route
 * GET /api/auth/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  const user = verifyAuth(request);
  
  if (!user) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
  
  return NextResponse.json(
    {
      authenticated: true,
      user: {
        userId: user.userId,
        username: user.username,
      },
    },
    { status: 200 }
  );
}
