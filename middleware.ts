import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Block admin routes on non-Cloudflare environments (Vercel)
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    // Check if we're on Cloudflare by looking for CF-specific headers
    const isCloudflare = request.headers.get('cf-ray') !== null;
    
    if (!isCloudflare) {
      // Return 404 for admin routes on Vercel
      return new NextResponse(null, { status: 404 });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
