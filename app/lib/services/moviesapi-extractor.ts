/**
 * MoviesAPI Extractor
 * Uses the moviesapi.to scrapify API with proper encryption
 * Returns ALL available sources with their names
 */

import CryptoJS from 'crypto-js';

interface StreamSource {
    quality: string;
    title: string;
    url: string;
    type: 'hls';
    referer: string;
    requiresSegmentProxy: boolean;
    status?: 'working' | 'down';
}

interface ExtractionResult {
    success: boolean;
    sources: StreamSource[];
    error?: string;
}

// API Configuration
const ENCRYPTION_KEY = 'moviesapi-secure-encryption-key-2024-v1';
const PLAYER_API_KEY = 'moviesapi-player-auth-key-2024-secure';
const SCRAPIFY_URL = 'https://w1.moviesapi.to/api/scrapify';

// Source configurations - ordered by reliability
// Each source has a display name and technical config
const SOURCES = [
    { name: 'Orion', source: 'm4uhd', priority: 1, description: 'Best for newer movies' },
    { name: 'Beta', source: 'fmovies', priority: 2, description: 'Good general fallback' },
    { name: 'Apollo', source: 'sflix2', srv: '0', priority: 3, description: 'Fast CDN' },
    { name: 'Alpha', source: 'sflix2', srv: '1', priority: 4, description: 'Alternative CDN' },
    { name: 'Nexon', source: 'bmovies', priority: 5, description: 'Backup source' },
];

/**
 * Fetch from scrapify API with encryption
 */
async function fetchFromScrapify(
    tmdbId: string,
    type: 'movie' | 'tv',
    season?: number,
    episode?: number,
    sourceName: string = 'fmovies',
    srv?: string
): Promise<{ url: string; subtitles: any[] } | null> {
    try {
        // Build payload
        const payload: any = {
            source: sourceName,
            type: type,
            id: tmdbId,
        };
        
        if (type === 'tv' && season && episode) {
            payload.season = season;
            payload.episode = episode;
        }
        
        if (srv) {
            payload.srv = srv;
        }

        // Encrypt payload
        const encrypted = CryptoJS.AES.encrypt(
            JSON.stringify(payload),
            ENCRYPTION_KEY
        ).toString();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(`${SCRAPIFY_URL}/v1/fetch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-player-key': PLAYER_API_KEY,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://w1.moviesapi.to/',
                'Origin': 'https://w1.moviesapi.to'
            },
            body: JSON.stringify({ payload: encrypted }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return null;
        }

        const json = await response.json();
        
        let streamUrl = '';
        let subtitles: any[] = [];
        
        if (json.sources && json.sources[0]) {
            streamUrl = json.sources[0].url;
            subtitles = json.sources[0].tracks || json.sources[0].subtitles || [];
        } else if (json.url) {
            streamUrl = json.url;
            subtitles = json.tracks || json.subtitles || [];
        }

        if (!streamUrl) {
            return null;
        }

        return { url: streamUrl, subtitles };
    } catch (error) {
        return null;
    }
}

/**
 * Apply URL transformations based on source
 */
function transformUrl(url: string, sourceName: string): string {
    if (sourceName === 'Apollo' || sourceName === 'Nexon') {
        const stripped = url.replace(/^https?:\/\//, '');
        return `https://ax.1hd.su/${stripped}`;
    } else if (sourceName === 'Alpha') {
        const stripped = url.replace(/^https?:\/\//, '');
        return `https://xd.flix1.online/${stripped}`;
    }
    return url;
}

/**
 * Check if stream URL is accessible
 */
async function checkStreamAccessibility(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'HEAD',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://w1.moviesapi.to/'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Try to extract from a single source
 */
async function trySource(
    src: typeof SOURCES[0],
    tmdbId: string,
    type: 'movie' | 'tv',
    season?: number,
    episode?: number
): Promise<StreamSource | null> {
    try {
        const result = await fetchFromScrapify(
            tmdbId,
            type,
            season,
            episode,
            src.source,
            src.srv
        );

        if (!result || !result.url) {
            return null;
        }

        // Transform URL if needed
        const streamUrl = transformUrl(result.url, src.name);

        // Check if stream is accessible
        const isAccessible = await checkStreamAccessibility(streamUrl);
        
        return {
            quality: 'auto',
            title: src.name,
            url: streamUrl,
            type: 'hls',
            referer: 'https://w1.moviesapi.to/',
            requiresSegmentProxy: true,
            status: isAccessible ? 'working' : 'down'
        };
    } catch {
        return null;
    }
}

/**
 * Main extraction function - returns ALL available sources
 */
export async function extractMoviesApiStreams(
    tmdbId: string,
    type: 'movie' | 'tv',
    season?: number,
    episode?: number
): Promise<ExtractionResult> {
    console.log(`[MoviesApi] Extracting ALL sources for ${type} ID ${tmdbId}...`);

    // Try all sources in parallel for speed
    const sourcePromises = SOURCES.map(src => 
        trySource(src, tmdbId, type, season, episode)
            .then(result => ({ src, result }))
            .catch(() => ({ src, result: null }))
    );

    const results = await Promise.all(sourcePromises);
    
    // Collect all sources (both working and down)
    const allSources: StreamSource[] = [];
    const workingSources: StreamSource[] = [];
    
    for (const { src, result } of results) {
        if (result) {
            allSources.push(result);
            if (result.status === 'working') {
                workingSources.push(result);
                console.log(`[MoviesApi] ✓ ${src.name} working`);
            } else {
                console.log(`[MoviesApi] ✗ ${src.name} down (403/blocked)`);
            }
        } else {
            console.log(`[MoviesApi] ✗ ${src.name} no response`);
        }
    }

    // Sort by priority (working sources first, then by original priority)
    allSources.sort((a, b) => {
        // Working sources come first
        if (a.status === 'working' && b.status !== 'working') return -1;
        if (a.status !== 'working' && b.status === 'working') return 1;
        // Then sort by original priority
        const aPriority = SOURCES.find(s => s.name === a.title)?.priority || 99;
        const bPriority = SOURCES.find(s => s.name === b.title)?.priority || 99;
        return aPriority - bPriority;
    });

    if (workingSources.length > 0) {
        console.log(`[MoviesApi] Found ${workingSources.length} working sources out of ${allSources.length} total`);
        return {
            success: true,
            sources: allSources // Return all sources so UI can show status
        };
    }

    // If no working sources, still return what we found (marked as down)
    if (allSources.length > 0) {
        console.log(`[MoviesApi] Found ${allSources.length} sources but none accessible`);
        return {
            success: false,
            sources: allSources,
            error: 'All MoviesAPI sources currently blocked'
        };
    }

    console.error('[MoviesApi] All sources failed to respond');
    return {
        success: false,
        sources: [],
        error: 'All MoviesAPI sources unavailable'
    };
}
