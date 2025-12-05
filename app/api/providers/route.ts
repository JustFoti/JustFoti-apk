/**
 * Provider Availability API
 * Returns which stream providers are enabled/available
 */

import { NextResponse } from 'next/server';
import { VIDSRC_ENABLED } from '@/app/lib/services/vidsrc-extractor';

export async function GET() {
  return NextResponse.json({
    providers: {
      vidsrc: {
        enabled: VIDSRC_ENABLED,
        name: 'VidSrc',
      },
      moviesapi: {
        enabled: true,
        name: 'MoviesAPI',
      },
      '2embed': {
        enabled: true,
        name: '2Embed',
      },
    },
  });
}
