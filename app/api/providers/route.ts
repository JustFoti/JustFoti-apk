/**
 * Provider Availability API
 * Returns which stream providers are enabled/available
 * 
 * Provider Priority:
 * - VidSrc: PRIMARY provider
 * - Flixer: 2nd fallback (flixer.sh / Hexa)
 * - 1movies: 3rd fallback (111movies.com)
 * - Videasy: Final fallback with multi-language support
 * - AnimeKai: PRIMARY for anime content only (auto-detected)
 */

import { NextResponse } from 'next/server';
import { VIDSRC_ENABLED } from '@/app/lib/services/vidsrc-extractor';
import { ANIMEKAI_ENABLED } from '@/app/lib/services/animekai-extractor';
import { ONEMOVIES_ENABLED } from '@/app/lib/services/onemovies-extractor';
import { FLIXER_ENABLED } from '@/app/lib/services/flixer-extractor';

export async function GET() {
  return NextResponse.json({
    providers: {
      vidsrc: {
        enabled: VIDSRC_ENABLED,
        name: 'VidSrc',
        primary: true,
        description: 'Primary streaming source',
      },
      flixer: {
        enabled: FLIXER_ENABLED,
        name: 'Flixer',
        primary: false,
        description: 'Flixer/Hexa - TV shows and movies streaming',
      },
      '1movies': {
        enabled: ONEMOVIES_ENABLED,
        name: '1movies',
        primary: false,
        description: '111movies.com - Multiple servers with HLS streams',
      },
      videasy: {
        enabled: true,
        name: 'Videasy',
        primary: false,
        description: 'Multi-language streaming fallback',
      },
      animekai: {
        enabled: ANIMEKAI_ENABLED,
        name: 'AnimeKai',
        primary: false,
        animeOnly: true,
        description: 'Specialized anime streaming with Japanese audio',
      },
    },
  });
}
