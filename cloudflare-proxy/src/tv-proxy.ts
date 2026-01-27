/**
 * TV Proxy Cloudflare Worker
 *
 * DLHD ONLY - NO IPTV/STALKER PROVIDERS!
 * 
 * Proxies DLHD live streams with automatic server lookup.
 * Uses proper channel routing to differentiate from other providers.
 *
 * Routes:
 *   GET /?channel=<id>           - Get proxied M3U8 playlist (DLHD channels only)
 *   GET /cdnlive?url=<url>       - Proxy nested M3U8 manifests (through Next.js /tv route)
 *   GET /segment?url=<url>       - Proxy video segments (DIRECT to worker, bypasses Next.js)
 *   GET /key?url=<encoded_url>   - Proxy encryption key (with PoW auth)
 *   GET /health                  - Health check
 * 
 * ROUTING ARCHITECTURE (January 2026):
 * - Manifests (.m3u8) → /tv/cdnlive (through Next.js for proper handling)
 * - Segments (.ts) → /segment (DIRECT to worker for optimal performance)
 * - This separation reduces latency and improves video playback
 * - See: cloudflare-proxy/SECURITY-ANALYSIS-TV-PROXY.md for details
 * 
 * KEY FETCHING (January 2026 Update):
 * - WASM-based PoW computation (bundled from DLHD's player v2.0.0-hardened)
 * - PoW runs entirely in CF worker - no external dependencies for nonce computation
 * - RPI proxy only needed for final key fetch (residential IP required)
 */

import { createLogger, type LogLevel } from './logger';
import { initDLHDPoW, computeNonce as computeWasmNonce, getVersion as getWasmVersion } from './dlhd-pow';

export interface Env {
  LOG_LEVEL?: string;
  RPI_PROXY_URL?: string;
  RPI_PROXY_KEY?: string;
  RATE_LIMIT_KV?: KVNamespace; // For rate limiting segment requests
  SEGMENT_TOKEN_SECRET?: string; // For signed segment URLs
}

const ALLOWED_ORIGINS = [
  'https://tv.vynx.cc',
  'https://flyx.tv',
  'https://www.flyx.tv',
  'http://localhost:3000',
  'http://localhost:3001',
  // SECURITY: Removed '*' - was allowing all origins, defeating anti-leech protection
  '.vercel.app',
  '.pages.dev',
  '.workers.dev',
];

// UPDATED January 2026: epicplayplay.cfd is DEAD! Using topembed.pw instead
const PLAYER_DOMAIN = 'topembed.pw';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ============================================================================
// MULTI-BACKEND SYSTEM - January 2026
// ============================================================================
// DLHD has 6 players, each using different backends. We implement fallback:
// 1. Player 3 (topembed.pw → dvalna.ru) - Requires JWT + PoW
// 2. Player 5 (cdn-live.tv → cdn-live-tv.ru) - Simple token, NO JWT/PoW!
// 3. Player 6 (moveonjoy.com) - NO AUTH AT ALL!
// ============================================================================

// Channel ID to cdn-live.tv channel name mapping
// COMPLETE MAPPING - Extracted from ALL DLHD channels via Player 5 (ddyplayer.cfd)
// Format: { channelId: { name: 'channel-name', code: 'country-code' } }
// These are dynamically extracted - the proxy will fetch fresh tokens from ddyplayer.cfd
const CHANNEL_TO_CDNLIVE: Record<string, { name: string; code: string }> = {
  // UK Sports
  '31': { name: 'tnt sports 1', code: 'gb' },
  '32': { name: 'tnt sports 2', code: 'gb' },
  '33': { name: 'tnt sports 3', code: 'gb' },
  '34': { name: 'tnt sports 4', code: 'gb' },
  '35': { name: 'sky sports football', code: 'gb' },
  '36': { name: 'sky sports arena', code: 'gb' },
  '37': { name: 'sky sports action', code: 'gb' },
  '38': { name: 'sky sports main event', code: 'gb' },
  '46': { name: 'sky sports tennis', code: 'gb' },
  '60': { name: 'sky sports f1', code: 'gb' },
  '65': { name: 'sky sports cricket', code: 'gb' },
  '70': { name: 'sky sports golf', code: 'gb' },
  '130': { name: 'sky sports premier league', code: 'gb' },
  '230': { name: 'dazn 1', code: 'gb' },
  '276': { name: 'laliga tv', code: 'gb' },
  '449': { name: 'sky sports mix', code: 'gb' },
  '451': { name: 'viaplay sports 1', code: 'gb' },
  '550': { name: 'viaplay sports 2', code: 'gb' },
  '554': { name: 'sky sports racing', code: 'gb' },
  '576': { name: 'sky sports news', code: 'gb' },
  '350': { name: 'itv 1', code: 'gb' },
  '351': { name: 'itv 2', code: 'gb' },
  '352': { name: 'itv 3', code: 'gb' },
  '353': { name: 'itv 4', code: 'gb' },
  '354': { name: 'channel 4', code: 'gb' },
  '355': { name: 'channel 5', code: 'gb' },
  '356': { name: 'bbc one', code: 'gb' },
  '357': { name: 'bbc two', code: 'gb' },
  '358': { name: 'bbc three', code: 'gb' },
  '359': { name: 'bbc four', code: 'gb' },
  '41': { name: 'euro sport 1', code: 'gb' },
  '42': { name: 'euro sport 2', code: 'gb' },
  // US Sports
  '39': { name: 'fox sports 1', code: 'us' },
  '40': { name: 'tennis channel', code: 'us' },
  '44': { name: 'espn', code: 'us' },
  '45': { name: 'espn 2', code: 'us' },
  '51': { name: 'abc', code: 'us' },
  '52': { name: 'cbs', code: 'us' },
  '54': { name: 'fox', code: 'us' },
  '66': { name: 'tudn', code: 'us' },
  '131': { name: 'telemundo', code: 'us' },
  '132': { name: 'univision', code: 'us' },
  '288': { name: 'espn news', code: 'us' },
  '305': { name: 'bbc', code: 'us' },
  '306': { name: 'bet', code: 'us' },
  '308': { name: 'cbs sports network', code: 'us' },
  '309': { name: 'cnbc', code: 'us' },
  '312': { name: 'disney channel', code: 'us' },
  '313': { name: 'discovery channel', code: 'us' },
  '316': { name: 'espn u', code: 'us' },
  '318': { name: 'golf tv', code: 'us' },
  '320': { name: 'hallmark', code: 'us' },
  '321': { name: 'hbo', code: 'us' },
  '322': { name: 'history', code: 'us' },
  '326': { name: 'lifetime', code: 'us' },
  '328': { name: 'national geographic', code: 'us' },
  '330': { name: 'nickelodeon tv', code: 'us' },
  '333': { name: 'showtime', code: 'us' },
  '336': { name: 'tbs', code: 'us' },
  '337': { name: 'tlc', code: 'us' },
  '338': { name: 'tnt', code: 'us' },
  '340': { name: 'travel channel', code: 'us' },
  '343': { name: 'usa network', code: 'us' },
  '345': { name: 'cnn', code: 'us' },
  '346': { name: 'willow cricket', code: 'us' },
  '347': { name: 'fox news', code: 'us' },
  '369': { name: 'fox cricket', code: 'us' },
  '374': { name: 'cinemax', code: 'us' },
  '375': { name: 'espn deportes', code: 'us' },
  '376': { name: 'wwe', code: 'us' },
  '385': { name: 'sec network', code: 'us' },
  '397': { name: 'btn', code: 'us' },
  '399': { name: 'mlb network', code: 'us' },
  '404': { name: 'nba tv', code: 'us' },
  '405': { name: 'nfl network', code: 'us' },
  '425': { name: 'bein sports', code: 'us' },
  '597': { name: 'goltv', code: 'us' },
  '598': { name: 'willow 2 cricket', code: 'us' },
  '123': { name: 'astro grandstand', code: 'us' },
  '124': { name: 'astro football', code: 'us' },
  '125': { name: 'astro premier league', code: 'us' },
  '126': { name: 'astro premier league 2', code: 'us' },
  '370': { name: 'astro cricket', code: 'us' },
  // South Africa
  '56': { name: 'supersport football', code: 'za' },
  '368': { name: 'supersport cricket', code: 'za' },
  '412': { name: 'supersport grandstand', code: 'za' },
  '413': { name: 'supersport psl', code: 'za' },
  '414': { name: 'supersport premier league', code: 'za' },
  '415': { name: 'supersport laliga', code: 'za' },
  '416': { name: 'supersport variety 1', code: 'za' },
  '417': { name: 'supersport variety 2', code: 'za' },
  '418': { name: 'supersport variety 3', code: 'za' },
  '419': { name: 'supersport variety 4', code: 'za' },
  '420': { name: 'supersport action', code: 'za' },
  '421': { name: 'supersport rugby', code: 'za' },
  '422': { name: 'supersport golf', code: 'za' },
  '423': { name: 'supersport tennis', code: 'za' },
  '424': { name: 'supersport motorsport', code: 'za' },
  '572': { name: 'supersport maximo 1', code: 'za' },
  // Poland
  '50': { name: 'polsat sport 2', code: 'pl' },
  '71': { name: 'eleven sports 1', code: 'pl' },
  '72': { name: 'eleven sports 2', code: 'pl' },
  '259': { name: 'canal sport 2', code: 'pl' },
  // France
  '116': { name: 'bein sports 1', code: 'fr' },
  '117': { name: 'bein sports 2', code: 'fr' },
  '118': { name: 'bein sports 3', code: 'fr' },
  '121': { name: 'canal', code: 'fr' },
  '122': { name: 'canal sport', code: 'fr' },
  '494': { name: 'bein sports max 4', code: 'fr' },
  // Germany
  '274': { name: 'sky sport f1', code: 'de' },
  '427': { name: 'dazn 2', code: 'de' },
  // Italy
  '461': { name: 'sky sport uno', code: 'it' },
  '462': { name: 'sky sport arena', code: 'it' },
  // Spain
  '84': { name: 'm laliga', code: 'es' },
  // Brazil
  '81': { name: 'espn', code: 'br' },
  // Portugal
  '380': { name: 'benfica tv', code: 'pt' },
  // Saudi Arabia / Arab
  '92': { name: 'bein sports 2', code: 'sa' },
  // Serbia
  '134': { name: 'arena 1 premium', code: 'rs' },
  // Netherlands
  '393': { name: 'ziggo sport 1', code: 'nl' },
  '398': { name: 'ziggo sport 2', code: 'nl' },
  // Canada
  '406': { name: 'sportsnet ontario', code: 'ca' },
  '408': { name: 'sportsnet east', code: 'ca' },
  '409': { name: 'sportsnet 360', code: 'ca' },
  // Australia
  '491': { name: 'bein sports 1', code: 'au' },
  '492': { name: 'bein sports 2', code: 'au' },
  '493': { name: 'bein sports 3', code: 'au' },
  // New Zealand
  '587': { name: 'sky sport select', code: 'nz' },
  '588': { name: 'sky sport 1', code: 'nz' },
  '589': { name: 'sky sport 2', code: 'nz' },
  '590': { name: 'sky sport 3', code: 'nz' },
  '591': { name: 'sky sport 4', code: 'nz' },
  '592': { name: 'sky sport 5', code: 'nz' },
  '593': { name: 'sky sport 6', code: 'nz' },
  '594': { name: 'sky sport 7', code: 'nz' },
  '595': { name: 'sky sport 8', code: 'nz' },
  '596': { name: 'sky sport 9', code: 'nz' },
  // Uruguay
  '391': { name: 'vtv', code: 'uy' },
  // Greece
  '599': { name: 'nova sports premier league', code: 'gr' },
};

// Channel ID to moveonjoy stream URL mapping
// Extracted from Player 6 (tv-bu1.blogspot.com → moveonjoy.com)
// Format: { channelId: 'https://fl{N}.moveonjoy.com/{STREAM_NAME}/index.m3u8' }
// NO AUTH REQUIRED - direct M3U8 access!
const CHANNEL_TO_MOVEONJOY: Record<string, string> = {
  // Sports - USA
  '11': 'https://fl7.moveonjoy.com/UFC/index.m3u8',
  '19': 'https://fl31.moveonjoy.com/MLB_NETWORK/index.m3u8',
  '39': 'https://fl7.moveonjoy.com/FOX_Sports_1/index.m3u8',
  '45': 'https://fl2.moveonjoy.com/ESPN_2/index.m3u8',
  '90': 'https://fl1.moveonjoy.com/SEC_NETWORK/index.m3u8',
  '91': 'https://fl31.moveonjoy.com/ACC_NETWORK/index.m3u8',
  '92': 'https://fl31.moveonjoy.com/ESPN_U/index.m3u8',
  '93': 'https://fl31.moveonjoy.com/ESPN_NEWS/index.m3u8',
  '94': 'https://fl7.moveonjoy.com/BIG_TEN_NETWORK/index.m3u8',
  '98': 'https://fl31.moveonjoy.com/NBA_TV/index.m3u8',
  '127': 'https://fl31.moveonjoy.com/CBS_SPORTS_NETWORK/index.m3u8',
  '129': 'https://fl31.moveonjoy.com/YES_NETWORK/index.m3u8',
  '146': 'https://fl7.moveonjoy.com/WWE/index.m3u8',
  // Broadcast Networks - USA
  '51': 'https://fl1.moveonjoy.com/AL_BIRMINGHAM_ABC/index.m3u8',
  '52': 'https://fl1.moveonjoy.com/FL_West_Palm_Beach_CBS/index.m3u8',
  '53': 'https://fl61.moveonjoy.com/FL_Tampa_NBC/index.m3u8',
  // Entertainment - USA
  '20': 'https://fl61.moveonjoy.com/MTV/index.m3u8',
  '21': 'https://fl31.moveonjoy.com/SYFY/index.m3u8',
  '303': 'https://fl61.moveonjoy.com/AMC_NETWORK/index.m3u8',
  '304': 'https://fl1.moveonjoy.com/Animal_Planet/index.m3u8',
  '306': 'https://fl1.moveonjoy.com/TRU_TV/index.m3u8',
  '307': 'https://fl7.moveonjoy.com/BRAVO/index.m3u8',
  '310': 'https://fl61.moveonjoy.com/Comedy_Central/index.m3u8',
  '312': 'https://fl31.moveonjoy.com/DISNEY/index.m3u8',
  '313': 'https://fl31.moveonjoy.com/DISCOVERY_FAMILY_CHANNEL/index.m3u8',
  '315': 'https://fl61.moveonjoy.com/E_ENTERTAINMENT_TELEVISION/index.m3u8',
  '317': 'https://fl61.moveonjoy.com/FX/index.m3u8',
  '320': 'https://fl61.moveonjoy.com/HALLMARK_CHANNEL/index.m3u8',
  '321': 'https://fl61.moveonjoy.com/HBO/index.m3u8',
  '328': 'https://fl31.moveonjoy.com/National_Geographic/index.m3u8',
  '333': 'https://fl31.moveonjoy.com/SHOWTIME/index.m3u8',
  '334': 'https://fl31.moveonjoy.com/PARAMOUNT_NETWORK/index.m3u8',
  '337': 'https://fl1.moveonjoy.com/TLC/index.m3u8',
  '339': 'https://fl1.moveonjoy.com/CARTOON_NETWORK/index.m3u8',
  '360': 'https://fl1.moveonjoy.com/BBC_AMERICA/index.m3u8',
};

// ============================================================================
// BACKEND: lovecdn.ru/popcdn.day - Token auth, UNENCRYPTED
// ============================================================================
// Path: popcdn.day/player/{STREAM_NAME} → beautifulpeople.lovecdn.ru
// Token is generated dynamically by popcdn.day
// NO ENCRYPTION - direct M3U8 access with token!
// ============================================================================
const CHANNEL_TO_LOVECDN: Record<string, string> = {
  // Sports - USA
  '44': 'ESPN',
  '45': 'ESPN2',
  '39': 'FOXSPORTS1',
  '146': 'WWE',        // WWE Network
  // Note: ABC, CBS, NBC, FOX, UFC not available on popcdn.day
};

// Channel ID to topembed.pw channel name mapping
// Extracted from DLHD /watch/ pages which use topembed.pw
const CHANNEL_TO_TOPEMBED: Record<string, string> = {
  // USA Sports
  '31': 'TNTSports1[UK]',
  '32': 'TNTSports2[UK]',
  '33': 'TNTSports3[UK]',
  '34': 'TNTSports4[UK]',
  '35': 'SkySportsFootball[UK]',
  '36': 'SkySportsArena[UK]',
  '37': 'SkySportsAction[UK]',
  '38': 'SkySportsMainEvent[UK]',
  '39': 'FOXSports1[USA]',
  '40': 'TennisChannel[USA]',
  '43': 'PDCTV[USA]',
  '44': 'ESPN[USA]',
  '45': 'ESPN2[USA]',
  '46': 'SkySportsTennis[UK]',
  '48': 'CanalSport[Poland]',
  '49': 'SportTV1[Portugal]',
  '51': 'AbcTv[USA]',
  '52': 'CBS[USA]',
  '53': 'NBC[USA]',
  '54': 'Fox[USA]',
  '56': 'SuperSportFootball[SouthAfrica]',
  '57': 'Eurosport1[Poland]',
  '58': 'Eurosport2[Poland]',
  '60': 'SkySportsF1[UK]',
  '61': 'BeinSportsMena1[UK]',
  '65': 'SkySportsCricket[UK]',
  '66': 'TUDN[USA]',
  '70': 'SkySportsGolf[UK]',
  '71': 'ElevenSports1[Poland]',
  '74': 'SportTV2[Portugal]',
  '75': 'CanalPlusSport5[Poland]',
  '81': 'ESPNBrazil[Brazil]',
  '84': 'MLaliga[Spain]',
  '88': 'Premiere1[Brasil]',
  '89': 'Combate[Brazil]',
  '91': 'BeinSports1[Arab]',
  '92': 'BeinSports2[Arab]',
  // beIN Sports
  '93': 'BeinSports3[Arab]',
  '94': 'BeinSports4[Arab]',
  '95': 'BeinSports5[Arab]',
  '96': 'BeinSports6[Arab]',
  '97': 'BeinSports7[Arab]',
  '98': 'BeinSports8[Arab]',
  '99': 'BeinSports9[Arab]',
  '100': 'BeinSportsXtra1',
  // Sky Sports UK (additional)
  '130': 'SkySportsPremierLeague[UK]',
  '449': 'SkySportsMix[UK]',
  '554': 'SkySportsRacing[UK]',
  '576': 'SkySportsNews[UK]',
  // beIN France
  '116': 'BeinSports1[France]',
  '117': 'BeinSports2[France]',
  '118': 'BeinSports3[France]',
  // beIN Turkey
  '62': 'BeinSports1[Turkey]',
  '63': 'BeinSports2[Turkey]',
  '64': 'BeinSports3[Turkey]',
  '67': 'BeinSports4[Turkey]',
  // Canal+ France
  '121': 'CanalPlus[France]',
  '122': 'CanalPlusSport[France]',
  // USA Networks
  '300': 'CW[USA]',
  '308': 'CBSSN[USA]',
  '345': 'CNN[USA]',
  '397': 'BTN[USA]',
  '425': 'BeinSports[USA]',
  // UK Channels
  '354': 'Channel4[UK]',
  '355': 'Channel5[UK]',
  '356': 'BBCOne[UK]',
  '357': 'BBCTwo[UK]',
  '358': 'BBCThree[UK]',
  '359': 'BBCFour[UK]',
  // DAZN
  '230': 'DAZN1[UK]',
  '426': 'DAZN1Bar[Germany]',
  '427': 'DAZN2Bar[Germany]',
  '445': 'DAZN1[Spain]',
  '446': 'DAZN2[Spain]',
  '447': 'DAZN3[Spain]',
  '448': 'DAZN4[Spain]',
  // Poland
  '565': 'TVNHD[Poland]',
  '566': 'CanalPlusPremium[Poland]',
  '567': 'CanalPlusFamily[Poland]',
  '570': 'CanalPlusSeriale[Poland]',
  // USA Regional Sports
  '770': 'MarqueeSportsNetwork[USA]',
  '776': 'ChicagoSportsNetwork[USA]',
  '664': 'ACCNetwork[USA]',
};

// UPDATED January 2026: Added 'wiki', 'hzt', 'x4', and 'dokko1' servers used by topembed.pw
const ALL_SERVER_KEYS = ['wiki', 'hzt', 'x4', 'dokko1', 'zeko', 'wind', 'nfs', 'ddy6', 'chevy', 'top1/cdn'];
const CDN_DOMAIN = 'dvalna.ru';

const HMAC_SECRET = '7f9e2a8b3c5d1e4f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7';
const POW_THRESHOLD = 0x1000;
const MAX_NONCE_ITERATIONS = 100000;

// ============================================================================
// MD5 Implementation for Cloudflare Workers (crypto.subtle doesn't support MD5)
// ============================================================================
function md5(string: string): string {
  function rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift));
  }

  function addUnsigned(x: number, y: number): number {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  function F(x: number, y: number, z: number): number { return (x & y) | ((~x) & z); }
  function G(x: number, y: number, z: number): number { return (x & z) | (y & (~z)); }
  function H(x: number, y: number, z: number): number { return x ^ y ^ z; }
  function I(x: number, y: number, z: number): number { return y ^ (x | (~z)); }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(str: string): number[] {
    const lWordCount: number[] = [];
    const lMessageLength = str.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    
    for (let i = 0; i < lNumberOfWords; i++) lWordCount[i] = 0;
    
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      const lWordIndex = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordCount[lWordIndex] = lWordCount[lWordIndex] | (str.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    const lWordIndex = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordCount[lWordIndex] = lWordCount[lWordIndex] | (0x80 << lBytePosition);
    lWordCount[lNumberOfWords - 2] = lMessageLength << 3;
    lWordCount[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordCount;
  }

  function wordToHex(value: number): string {
    let hex = '';
    for (let i = 0; i <= 3; i++) {
      const byte = (value >>> (i * 8)) & 255;
      hex += ('0' + byte.toString(16)).slice(-2);
    }
    return hex;
  }

  const x = convertToWordArray(string);
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;

  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
}

// ============================================================================
// HMAC-SHA256 using Web Crypto API
// ============================================================================
async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// PoW Computation (WASM-based - January 2026)
// ============================================================================
let wasmInitialized = false;

async function computePoWNonce(resource: string, keyNumber: string, timestamp: number): Promise<bigint | null> {
  try {
    // Initialize WASM if not already done
    if (!wasmInitialized) {
      await initDLHDPoW();
      wasmInitialized = true;
      console.log(`[PoW] WASM initialized: ${getWasmVersion()}`);
    }
    
    // Compute nonce using WASM
    const nonce = computeWasmNonce(resource, keyNumber, timestamp);
    return nonce;
  } catch (error) {
    console.error('[PoW] WASM computation failed:', error);
    return null;
  }
}

// ============================================================================
// Caches
// ============================================================================
const serverKeyCache = new Map<string, { serverKey: string; fetchedAt: number }>();
const SERVER_KEY_CACHE_TTL_MS = 10 * 60 * 1000;

// JWT cache - stores JWT tokens fetched from player page
// Key is the topembed channel name (e.g., 'AbcTv[USA]')
interface JWTCacheEntry {
  jwt: string;
  channelKey: string;  // The 'sub' field from JWT (e.g., 'ustvabc', 'eplayerespn_usa')
  exp: number;
  fetchedAt: number;
}
const jwtCache = new Map<string, JWTCacheEntry>();
const JWT_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (JWT valid for 5)

// Reverse mapping: channel key (from JWT sub) → topembed channel name
// This allows us to find the JWT when we only have the channel key from a key URL
const channelKeyToTopembed = new Map<string, string>();

// DLHD channel ID → dvalna.ru channel key mapping
// This is populated when we successfully fetch JWTs
// Format: { '51': 'ustvabc', '44': 'eplayerespn_usa', ... }
const dlhdIdToChannelKey = new Map<string, string>();

/**
 * Fetch JWT from topembed.pw or hitsplay.fun player page - this is the REAL auth token needed for key requests
 * 
 * UPDATED January 2026: 
 * - epicplayplay.cfd is DEAD! 
 * - topembed.pw uses the same dvalna.ru backend but with different channel naming.
 * - hitsplay.fun provides JWT directly in the page for channels without topembed mapping
 */
async function fetchPlayerJWT(channel: string, logger: any, env?: Env): Promise<string | null> {
  const cacheKey = channel;
  const cached = jwtCache.get(cacheKey);
  
  // Check cache - use if not expired
  if (cached && Date.now() - cached.fetchedAt < JWT_CACHE_TTL_MS) {
    const now = Math.floor(Date.now() / 1000);
    if (cached.exp > now + 300) { // At least 5 min remaining
      logger.info('JWT cache hit', { channel, expiresIn: cached.exp - now });
      return cached.jwt;
    }
  }
  
  logger.info('Fetching fresh JWT', { channel });
  
  // ============================================================================
  // METHOD 1: Try hitsplay.fun first - it provides JWT directly for ALL channels
  // ============================================================================
  try {
    const hitsplayUrl = `https://hitsplay.fun/premiumtv/daddyhd.php?id=${channel}`;
    logger.info('Trying hitsplay.fun for JWT', { channel });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(hitsplayUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://dlhd.link/',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const html = await res.text();
      
      // hitsplay.fun embeds JWT directly in the page
      const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      if (jwtMatch) {
        const jwt = jwtMatch[0];
        
        // Decode payload
        let channelKey = `premium${channel}`;
        let exp = Math.floor(Date.now() / 1000) + 18000;
        
        try {
          const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(payloadB64));
          channelKey = payload.sub || channelKey;
          exp = payload.exp || exp;
          logger.info('JWT from hitsplay.fun', { channelKey, exp, expiresIn: exp - Math.floor(Date.now() / 1000) });
        } catch (e) {
          logger.warn('JWT decode failed, using defaults');
        }
        
        // Cache it
        jwtCache.set(cacheKey, { jwt, channelKey, exp, fetchedAt: Date.now() });
        channelKeyToTopembed.set(channelKey, channel);
        dlhdIdToChannelKey.set(channel, channelKey);
        
        return jwt;
      }
    }
  } catch (e) {
    logger.warn('hitsplay.fun JWT fetch failed', { error: (e as Error).message });
  }
  
  // ============================================================================
  // METHOD 2: Try topembed.pw (original method)
  // ============================================================================
  try {
    // Get topembed channel name from mapping, or try to fetch from DLHD page
    let topembedName = CHANNEL_TO_TOPEMBED[channel];
    
    if (!topembedName) {
      // Try to get the topembed name from DLHD /watch/ page
      logger.info('Channel not in mapping, fetching from DLHD', { channel });
      try {
        const dlhdUrl = `https://dlhd.link/watch/stream-${channel}.php`;
        
        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const dlhdRes = await fetch(dlhdUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            'Referer': 'https://dlhd.link/',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (dlhdRes.ok) {
          const dlhdHtml = await dlhdRes.text();
          const topembedMatch = dlhdHtml.match(/topembed\.pw\/channel\/([^"'\s]+)/);
          if (topembedMatch) {
            topembedName = topembedMatch[1];
            logger.info('Found topembed name from DLHD', { channel, topembedName });
          }
        }
      } catch (e) {
        logger.warn('Failed to fetch topembed name from DLHD', { error: (e as Error).message });
      }
    }
    
    if (!topembedName) {
      logger.warn('No topembed mapping for channel', { channel });
      return null;
    }
    
    // Fetch JWT from topembed.pw
    const playerUrl = `https://${PLAYER_DOMAIN}/channel/${topembedName}`;
    logger.info('Fetching JWT from topembed', { playerUrl });
    
    let html: string | undefined;
    
    // Try RPI proxy first if configured (topembed may block CF IPs)
    if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
      logger.info('Fetching JWT via RPI proxy', { channel });
      const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(playerUrl)}&key=${env.RPI_PROXY_KEY}`;
      const res = await fetch(rpiUrl);
      
      if (!res.ok) {
        logger.warn('RPI proxy JWT fetch failed', { status: res.status });
        // Fall through to direct fetch
      } else {
        html = await res.text();
        logger.info('JWT fetched via RPI', { htmlLength: html.length });
      }
    }
    
    // Direct fetch fallback
    if (!html) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        const res = await fetch(playerUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            'Referer': 'https://dlhd.link/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          logger.warn('Topembed page fetch failed', { status: res.status });
          return null;
        }
        
        html = await res.text();
      } catch (e) {
        logger.warn('Topembed fetch error/timeout', { error: (e as Error).message });
        return null;
      }
    }
    
    // Extract JWT token (eyJ...) - topembed stores it in SESSION_TOKEN variable
    const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (!jwtMatch) {
      logger.warn('No JWT found in topembed page', { channel, htmlLength: html.length, preview: html.substring(0, 200) });
      return null;
    }
    
    const jwt = jwtMatch[0];
    
    // Decode payload to get channel key and expiry
    let channelKey = `premium${channel}`;
    let exp = Math.floor(Date.now() / 1000) + 18000; // Default 5 hours
    
    try {
      const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(payloadB64));
      channelKey = payload.sub || channelKey; // topembed uses different channel keys like 'ustvabc'
      exp = payload.exp || exp;
      logger.info('JWT decoded', { channelKey, exp, expiresIn: exp - Math.floor(Date.now() / 1000) });
    } catch (e) {
      logger.warn('JWT decode failed, using defaults');
    }
    
    // Cache it with the topembed channel name as key
    jwtCache.set(cacheKey, { jwt, channelKey, exp, fetchedAt: Date.now() });
    
    // Also cache by topembed name if different from channel ID
    if (topembedName && topembedName !== channel) {
      jwtCache.set(topembedName, { jwt, channelKey, exp, fetchedAt: Date.now() });
    }
    
    // Store reverse mappings for key proxy lookups
    // channelKey (e.g., 'ustvabc') → topembed name (e.g., 'AbcTv[USA]')
    channelKeyToTopembed.set(channelKey, topembedName || channel);
    // DLHD channel ID (e.g., '51') → channelKey (e.g., 'ustvabc')
    dlhdIdToChannelKey.set(channel, channelKey);
    
    logger.info('JWT cached with mappings', { 
      channel, 
      topembedName, 
      channelKey,
      channelKeyToTopembedSize: channelKeyToTopembed.size,
      dlhdIdToChannelKeySize: dlhdIdToChannelKey.size
    });
    
    return jwt;
  } catch (err) {
    logger.error('JWT fetch error', { error: (err as Error).message });
    return null;
  }
}

async function getServerKey(channelKey: string, logger: any, env?: Env): Promise<string> {
  const cached = serverKeyCache.get(channelKey);
  if (cached && Date.now() - cached.fetchedAt < SERVER_KEY_CACHE_TTL_MS) return cached.serverKey;
  
  const lookupUrl = `https://chevy.${CDN_DOMAIN}/server_lookup?channel_id=${channelKey}`;
  
  try {
    // Try direct fetch first
    const res = await fetch(lookupUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Referer': `https://${PLAYER_DOMAIN}/` },
    });
    if (res.ok) {
      const text = await res.text();
      if (!text.startsWith('<')) {
        const data = JSON.parse(text);
        if (data.server_key) {
          logger.info('Server lookup success (direct)', { channelKey, serverKey: data.server_key });
          serverKeyCache.set(channelKey, { serverKey: data.server_key, fetchedAt: Date.now() });
          return data.server_key;
        }
      } else {
        logger.warn('Server lookup returned HTML (blocked?)', { channelKey });
      }
    } else {
      logger.warn('Server lookup HTTP error', { channelKey, status: res.status });
    }
  } catch (e) {
    logger.warn('Server lookup direct fetch failed', { channelKey, error: (e as Error).message });
  }
  
  // Try RPI proxy if configured
  if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
    try {
      const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(lookupUrl)}&key=${env.RPI_PROXY_KEY}`;
      const rpiRes = await fetch(rpiUrl);
      if (rpiRes.ok) {
        const text = await rpiRes.text();
        if (!text.startsWith('<')) {
          const data = JSON.parse(text);
          if (data.server_key) {
            logger.info('Server lookup success (RPI)', { channelKey, serverKey: data.server_key });
            serverKeyCache.set(channelKey, { serverKey: data.server_key, fetchedAt: Date.now() });
            return data.server_key;
          }
        }
      }
    } catch (e) {
      logger.warn('Server lookup RPI fetch failed', { channelKey, error: (e as Error).message });
    }
  }
  
  logger.warn('Server lookup failed, using default', { channelKey, default: 'zeko' });
  return 'zeko';
}

function constructM3U8Url(serverKey: string, channelKey: string): string {
  // UPDATED January 2026: Added 'wiki', 'hzt', 'x4', and 'dokko1' servers used by topembed.pw
  if (serverKey === 'wiki') return `https://wikinew.${CDN_DOMAIN}/wiki/${channelKey}/mono.css`;
  if (serverKey === 'hzt') return `https://hztnew.${CDN_DOMAIN}/hzt/${channelKey}/mono.css`;
  if (serverKey === 'x4') return `https://x4new.${CDN_DOMAIN}/x4/${channelKey}/mono.css`;
  if (serverKey === 'dokko1') return `https://dokko1new.${CDN_DOMAIN}/dokko1/${channelKey}/mono.css`;
  if (serverKey === 'top1/cdn') return `https://top1.${CDN_DOMAIN}/top1/cdn/${channelKey}/mono.css`;
  return `https://${serverKey}new.${CDN_DOMAIN}/${serverKey}/${channelKey}/mono.css`;
}

// ============================================================================
// BACKEND 2: cdn-live.tv → cdn-live-tv.ru (NO JWT/PoW NEEDED!)
// ============================================================================
// This backend uses simple token-based auth embedded in the player page.
// Much simpler than dvalna.ru which requires JWT + PoW.
// ============================================================================

interface CdnLiveResult {
  success: boolean;
  m3u8Url?: string;
  token?: string;
  error?: string;
}

// Cache for cdn-live tokens (they expire, but we can reuse for a while)
const cdnLiveTokenCache = new Map<string, { token: string; fetchedAt: number }>();
const CDN_LIVE_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Decode the obfuscated JavaScript from cdn-live.tv player page
 * The script uses a custom base conversion cipher
 */
function decodeCdnLiveScript(encodedData: string, charset: string, base: number, delimiterIdx: number, offset: number): string {
  let result = '';
  let i = 0;
  const delimiter = charset[delimiterIdx];
  
  while (i < encodedData.length) {
    let s = '';
    // Read until delimiter
    while (i < encodedData.length && encodedData[i] !== delimiter) {
      s += encodedData[i];
      i++;
    }
    i++; // Skip delimiter
    
    if (!s) continue;
    
    // Replace charset chars with indices
    let numStr = '';
    for (const char of s) {
      const idx = charset.indexOf(char);
      if (idx !== -1) {
        numStr += idx.toString();
      }
    }
    
    // Convert from base to decimal, subtract offset
    const charCode = parseInt(numStr, base) - offset;
    if (charCode > 0 && charCode < 65536) {
      result += String.fromCharCode(charCode);
    }
  }
  
  return result;
}

/**
 * Extract stream URL from cdn-live.tv player page
 */
async function fetchCdnLiveStream(channelName: string, countryCode: string, logger: any): Promise<CdnLiveResult> {
  const cacheKey = `${countryCode}-${channelName}`;
  const cached = cdnLiveTokenCache.get(cacheKey);
  
  // Check cache
  if (cached && Date.now() - cached.fetchedAt < CDN_LIVE_TOKEN_TTL_MS) {
    const m3u8Url = `https://cdn-live-tv.ru/api/v1/channels/${countryCode}-${channelName}/index.m3u8?token=${cached.token}`;
    logger.info('cdn-live cache hit', { channel: channelName, code: countryCode });
    return { success: true, m3u8Url, token: cached.token };
  }
  
  logger.info('Fetching cdn-live.tv stream', { channel: channelName, code: countryCode });
  
  try {
    // Fetch the player page
    const playerUrl = `https://cdn-live.tv/api/v1/channels/player/?name=${encodeURIComponent(channelName)}&code=${countryCode}&user=cdnlivetv&plan=free`;
    
    const res = await fetch(playerUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://dlhd.link/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }
    
    const html = await res.text();
    
    // Method 1: Try to find direct M3U8 URL in the page
    const directM3u8Match = html.match(/https:\/\/(?:edge\.)?cdn-live-tv\.ru\/api\/v1\/channels\/[^"'\s]+\.m3u8\?token=[^"'\s]+/);
    if (directM3u8Match) {
      const m3u8Url = directM3u8Match[0].replace(/&amp;/g, '&');
      const tokenMatch = m3u8Url.match(/token=([^&]+)/);
      if (tokenMatch) {
        cdnLiveTokenCache.set(cacheKey, { token: tokenMatch[1], fetchedAt: Date.now() });
      }
      logger.info('cdn-live direct URL found', { url: m3u8Url.substring(0, 80) });
      return { success: true, m3u8Url };
    }
    
    // Method 2: Try to find playlistUrl in decoded script
    const playlistMatch = html.match(/playlistUrl\s*=\s*['"]([^'"]+)['"]/);
    if (playlistMatch) {
      const m3u8Url = playlistMatch[1];
      const tokenMatch = m3u8Url.match(/token=([^&]+)/);
      if (tokenMatch) {
        cdnLiveTokenCache.set(cacheKey, { token: tokenMatch[1], fetchedAt: Date.now() });
      }
      logger.info('cdn-live playlistUrl found', { url: m3u8Url.substring(0, 80) });
      return { success: true, m3u8Url };
    }
    
    // Method 3: Try to decode obfuscated script
    // Look for eval(function(h,u,n,t,e,r) pattern
    // Format: }("ENCODED",unused,"CHARSET",offset,base,unused))
    // Security: Limit input size to prevent ReDoS attacks
    if (html.length > 500000) {
      logger.warn('cdn-live: HTML too large for regex parsing', { size: html.length });
      return { success: false, error: 'Response too large' };
    }
    
    const evalMatch = html.match(/\}\s*\(\s*"([^"]+)"\s*,\s*\d+\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*\d+\s*\)\s*\)/);
    if (evalMatch) {
      const [, encodedData, charset, offsetStr, baseStr] = evalMatch;
      const base = parseInt(baseStr, 10);
      const offset = parseInt(offsetStr, 10);
      
      // Security: Validate parsed parameters are within reasonable bounds
      if (isNaN(base) || isNaN(offset) || base < 2 || base > 64 || offset < 0 || offset > 65536) {
        logger.warn('cdn-live: invalid decode parameters', { base, offset });
        return { success: false, error: 'Invalid decode parameters' };
      }
      
      // Security: Limit encoded data size
      if (encodedData.length > 100000) {
        logger.warn('cdn-live: encoded data too large', { size: encodedData.length });
        return { success: false, error: 'Encoded data too large' };
      }
      
      logger.info('cdn-live: decoding obfuscated script', { 
        encodedLen: encodedData.length, 
        charset: charset.substring(0, 20), // Don't log full charset
        base, 
        offset 
      });
      // Note: Using 'base' for delimiterIdx parameter - this assumes the delimiter
      // character is at position 'base' in the charset. If decoding fails for some
      // channels, the delimiterIdx may need to be extracted separately.
      const decoded = decodeCdnLiveScript(encodedData, charset, base, base, offset);
      logger.info('cdn-live: decoded script', { decodedLen: decoded.length, preview: decoded.substring(0, 200) });
      
      const decodedM3u8Match = decoded.match(/https:\/\/(?:edge\.)?cdn-live-tv\.ru\/api\/v1\/channels\/[^"'\s]+/);
      if (decodedM3u8Match) {
        const m3u8Url = decodedM3u8Match[0];
        const tokenMatch = m3u8Url.match(/token=([^&]+)/);
        if (tokenMatch) {
          cdnLiveTokenCache.set(cacheKey, { token: tokenMatch[1], fetchedAt: Date.now() });
        }
        logger.info('cdn-live decoded URL found', { url: m3u8Url.substring(0, 80) });
        return { success: true, m3u8Url };
      }
    }
    
    logger.warn('cdn-live: could not extract stream URL', { htmlLength: html.length });
    return { success: false, error: 'Could not extract stream URL from player page' };
    
  } catch (err) {
    logger.error('cdn-live fetch error', { error: (err as Error).message });
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// PLAYER 5 EXTRACTOR: ddyplayer.cfd → cdn-live-tv.ru (HUNTER obfuscation)
// ============================================================================
// Path: DLHD /casting/ → ddyplayer.cfd → cdn-live-tv.ru
// Uses HUNTER obfuscation: eval(function(h,u,n,t,e,r){...})
// ============================================================================

interface Player5Result {
  success: boolean;
  m3u8Url?: string;
  channelName?: string;
  countryCode?: string;
  error?: string;
}

/**
 * Decode HUNTER obfuscation used by ddyplayer.cfd
 */
function decodeHunter(encodedData: string, charset: string, offset: number, delimiterIdx: number): string {
  let result = '';
  const delimiter = charset[delimiterIdx];
  
  for (let i = 0; i < encodedData.length; i++) {
    let s = '';
    while (i < encodedData.length && encodedData[i] !== delimiter) {
      s += encodedData[i];
      i++;
    }
    if (s === '') continue;
    
    // Replace each char with its index in charset
    for (let j = 0; j < charset.length; j++) {
      s = s.split(charset[j]).join(j.toString());
    }
    
    // Convert from base-delimiterIdx to base-10, subtract offset
    const code = parseInt(s, delimiterIdx) - offset;
    if (code > 0 && code < 65536) {
      result += String.fromCharCode(code);
    }
  }
  
  try {
    return decodeURIComponent(escape(result));
  } catch {
    return result;
  }
}

/**
 * Extract HUNTER parameters from HTML
 * Format: }("encodedData",num,"charset",num,num,num))
 */
function extractHunterParams(html: string): { encodedData: string; charset: string; offset: number; delimiterIdx: number } | null {
  const fullPattern = /\}\s*\(\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*\)/;
  const match = html.match(fullPattern);
  
  if (match) {
    return {
      encodedData: match[1],
      charset: match[3],
      offset: parseInt(match[4]),
      delimiterIdx: parseInt(match[5])
    };
  }
  
  return null;
}

/**
 * Extract stream URL from Player 5 (ddyplayer.cfd)
 * This is the REAL Player 5 extractor that fetches dynamically
 */
async function extractPlayer5Stream(channel: string, logger: any): Promise<Player5Result> {
  logger.info('Player 5: Extracting stream', { channel });
  
  try {
    // Step 1: Get DLHD /casting/ page to find ddyplayer iframe
    const dlhdUrl = `https://dlhd.link/casting/stream-${channel}.php`;
    const dlhdRes = await fetch(dlhdUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://dlhd.link/'
      }
    });
    
    if (!dlhdRes.ok) {
      return { success: false, error: `DLHD page returned ${dlhdRes.status}` };
    }
    
    const dlhdHtml = await dlhdRes.text();
    
    // Find ddyplayer.cfd iframe
    const iframeMatch = dlhdHtml.match(/src=["'](https:\/\/ddyplayer\.cfd[^"']+)["']/);
    if (!iframeMatch) {
      return { success: false, error: 'No ddyplayer.cfd iframe found' };
    }
    
    const ddyUrl = iframeMatch[1];
    const urlObj = new URL(ddyUrl);
    const channelName = urlObj.searchParams.get('name');
    const countryCode = urlObj.searchParams.get('code');
    
    logger.info('Player 5: Found ddyplayer', { channelName, countryCode });
    
    // Step 2: Fetch ddyplayer page
    const ddyRes = await fetch(ddyUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://dlhd.link/'
      }
    });
    
    if (!ddyRes.ok) {
      return { success: false, error: `ddyplayer returned ${ddyRes.status}` };
    }
    
    const ddyHtml = await ddyRes.text();
    
    // Step 3: Try to find direct M3U8 URL first
    const directM3u8 = ddyHtml.match(/https:\/\/cdn-live-tv\.ru\/[^"'\s]+\.m3u8[^"'\s]*/);
    if (directM3u8) {
      return {
        success: true,
        m3u8Url: directM3u8[0],
        channelName: channelName || undefined,
        countryCode: countryCode || undefined
      };
    }
    
    // Step 4: Extract HUNTER parameters and decode
    const params = extractHunterParams(ddyHtml);
    if (!params) {
      return { success: false, error: 'No HUNTER params found' };
    }
    
    logger.info('Player 5: Decoding HUNTER', { charset: params.charset.substring(0, 20), offset: params.offset });
    
    const decoded = decodeHunter(params.encodedData, params.charset, params.offset, params.delimiterIdx);
    
    if (decoded.length < 100) {
      return { success: false, error: 'Decoding failed' };
    }
    
    // Step 5: Extract M3U8 URL from decoded content
    const m3u8Match = decoded.match(/https:\/\/cdn-live-tv\.ru\/api\/v1\/channels\/[^"'\s]+\.m3u8\?token=[^"'\s]+/);
    
    if (!m3u8Match) {
      const altMatch = decoded.match(/https:\/\/[^"'\s]*\.m3u8\?token=[^"'\s]+/);
      if (altMatch) {
        return { success: true, m3u8Url: altMatch[0], channelName: channelName || undefined, countryCode: countryCode || undefined };
      }
      return { success: false, error: 'No M3U8 URL in decoded content' };
    }
    
    return {
      success: true,
      m3u8Url: m3u8Match[0],
      channelName: channelName || undefined,
      countryCode: countryCode || undefined
    };
    
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// BACKEND 3: moveonjoy.com (NO AUTH AT ALL!)
// ============================================================================
// This is the simplest backend - direct M3U8 access with no authentication.
// Stream URLs are pre-mapped in CHANNEL_TO_MOVEONJOY
// ============================================================================

interface MoveonjoyResult {
  success: boolean;
  m3u8Url?: string;
  error?: string;
}

/**
 * Get stream from moveonjoy.com (NO AUTH NEEDED!)
 * Uses pre-mapped URLs from CHANNEL_TO_MOVEONJOY
 */
async function fetchMoveonjoyStream(channel: string, logger: any): Promise<MoveonjoyResult> {
  const m3u8Url = CHANNEL_TO_MOVEONJOY[channel];
  
  if (!m3u8Url) {
    return { success: false, error: `No moveonjoy mapping for channel ${channel}` };
  }
  
  logger.info('Trying moveonjoy.com', { channel, url: m3u8Url.substring(0, 60) });
  
  try {
    const res = await fetch(m3u8Url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://tv-bu1.blogspot.com/',
      },
    });
    
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }
    
    const content = await res.text();
    if (content.includes('#EXTM3U') && (content.includes('#EXTINF') || content.includes('#EXT-X-STREAM-INF'))) {
      logger.info('moveonjoy stream found', { channel });
      return { success: true, m3u8Url };
    }
    
    return { success: false, error: 'Invalid M3U8 content' };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// BACKEND 4: lovecdn.ru/popcdn.day (Token auth, UNENCRYPTED)
// ============================================================================
// Path: popcdn.day/player/{STREAM_NAME} → beautifulpeople.lovecdn.ru
// Token is generated dynamically by popcdn.day
// NO ENCRYPTION - direct M3U8 access with token!
// ============================================================================

interface LovecdnResult {
  success: boolean;
  m3u8Url?: string;
  error?: string;
}

/**
 * Get stream from lovecdn.ru via popcdn.day
 * Fetches token dynamically from popcdn.day player page
 */
async function fetchLovecdnStream(channel: string, logger: any): Promise<LovecdnResult> {
  const streamName = CHANNEL_TO_LOVECDN[channel];
  
  if (!streamName) {
    return { success: false, error: `No lovecdn mapping for channel ${channel}` };
  }
  
  logger.info('Trying lovecdn.ru', { channel, streamName });
  
  try {
    // Fetch popcdn.day player page to get token
    const popcdnUrl = `https://popcdn.day/player/${streamName}`;
    const res = await fetch(popcdnUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://lovecdn.ru/',
      },
    });
    
    if (!res.ok) {
      return { success: false, error: `popcdn.day returned ${res.status}` };
    }
    
    const html = await res.text();
    
    if (html.includes('Channel not found')) {
      return { success: false, error: 'Channel not found on popcdn.day' };
    }
    
    // Extract M3U8 URL (escaped in JSON)
    const m3u8Match = html.match(/https?:\\\/\\\/[^"'\s]*lovecdn\.ru[^"'\s]*\.m3u8[^"'\s]*/);
    if (!m3u8Match) {
      return { success: false, error: 'No M3U8 URL found in popcdn.day response' };
    }
    
    // Unescape the URL
    const m3u8Url = m3u8Match[0].replace(/\\\//g, '/');
    
    // Verify the stream works
    const m3u8Res = await fetch(m3u8Url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://popcdn.day/',
      },
    });
    
    if (!m3u8Res.ok) {
      return { success: false, error: `lovecdn.ru returned ${m3u8Res.status}` };
    }
    
    const content = await m3u8Res.text();
    if (content.includes('#EXTM3U')) {
      logger.info('lovecdn stream found', { channel, streamName });
      return { success: true, m3u8Url };
    }
    
    return { success: false, error: 'Invalid M3U8 content from lovecdn.ru' };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}


// ============================================================================
// MAIN HANDLER
// ============================================================================
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const logLevel = (env.LOG_LEVEL || 'debug') as LogLevel;
    const logger = createLogger(request, logLevel);
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    const url = new URL(request.url);
    const path = url.pathname;
    
    logger.info('TV Proxy request', { 
      path, 
      search: url.search,
      channel: url.searchParams.get('channel'),
      fullUrl: request.url 
    });

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders(origin) });
    }
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, origin);
    }

    if (!isAllowedOrigin(origin, referer)) {
      // EXCEPTION: Allow segment requests without strict origin check
      // HLS.js makes XHR requests for segments which may not include proper headers
      // Segments are public data (not auth-protected), so this is safe
      if (path !== '/segment') {
        return jsonResponse({ error: 'Access denied' }, 403, origin);
      }
    }

    try {
      if (path === '/health' || path === '/' && !url.searchParams.has('channel')) {
        return jsonResponse({ status: 'healthy', domain: CDN_DOMAIN, method: 'pow-auth' }, 200, origin);
      }
      if (path === '/key') return handleKeyProxy(url, logger, origin, env);
      if (path === '/segment') return handleSegmentProxy(url, logger, origin, env);
      
      // CRITICAL: When accessed via /tv route from index.ts, url.origin is the media-proxy domain
      // but we need to include /tv in the proxy URLs so they route back to this worker
      // Check if we're being accessed through the /tv route by looking at the original URL
      // The proxyBase should be the full path prefix that routes to this worker
      const proxyBase = `${url.origin}/tv`;
      
      if (path === '/cdnlive') return handleCdnLiveM3U8Proxy(url, logger, origin, proxyBase);

      const channel = url.searchParams.get('channel');
      const skipBackends = url.searchParams.get('skip')?.split(',').filter(Boolean) || [];
      logger.info('Channel param', { channel, hasChannel: !!channel, skipBackends });
      
      if (!channel || !/^\d+$/.test(channel)) {
        return jsonResponse({ 
          error: 'Missing or invalid channel parameter',
          path,
          search: url.search,
          receivedChannel: channel 
        }, 400, origin);
      }
      return handlePlaylistRequest(channel, proxyBase, logger, origin, env, request, skipBackends);
    } catch (error) {
      logger.error('TV Proxy error', error as Error);
      return jsonResponse({ error: 'Proxy error', details: (error as Error).message }, 500, origin);
    }
  },
};

async function handlePlaylistRequest(channel: string, proxyOrigin: string, logger: any, origin: string | null, env?: Env, request?: Request, skipBackends: string[] = []): Promise<Response> {
  const errors: string[] = [];
  let usedBackend = '';

  // ============================================================================
  // MULTI-BACKEND FALLBACK SYSTEM - January 2026
  // Order: dvalna (most channels) → cdnlive → moveonjoy (US only)
  // skipBackends parameter allows client to skip specific backends
  // ============================================================================

  // ============================================================================
  // BACKEND 1: dvalna.ru via topembed.pw (Player 3) - MOST CHANNELS
  // ============================================================================
  if (!skipBackends.includes('dvalna')) {
    logger.info('Trying Backend 1: dvalna.ru', { channel });
  
    let channelKey = `premium${channel}`;
    const jwt = await fetchPlayerJWT(channel, logger, env);
  
    if (jwt) {
      try {
        const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(payloadB64));
        if (payload.sub) {
          channelKey = payload.sub;
          logger.info('Using channel key from JWT', { channelKey, channel });
        }
      } catch (e) {
        logger.warn('Failed to extract channel key from JWT', { error: (e as Error).message });
      }
      
      const channelKeysToTry: string[] = [];
      if (channelKey !== `premium${channel}`) {
        channelKeysToTry.push(channelKey);
      }
      channelKeysToTry.push(`premium${channel}`);
      
      for (const currentChannelKey of channelKeysToTry) {
        let serverKey: string;
        try {
          serverKey = await getServerKey(currentChannelKey, logger, env);
        } catch {
          serverKey = 'zeko';
        }
        
        const serverKeysToTry = [serverKey, ...ALL_SERVER_KEYS.filter(k => k !== serverKey)];

        for (const sk of serverKeysToTry) {
          const m3u8Url = constructM3U8Url(sk, currentChannelKey);
          
          try {
            let content: string;
            let fetchedVia = 'direct';
            
            try {
              const directRes = await fetch(`${m3u8Url}?_t=${Date.now()}`, {
                headers: { 'User-Agent': USER_AGENT, 'Referer': `https://${PLAYER_DOMAIN}/` },
              });
              
              if (!directRes.ok) throw new Error(`HTTP ${directRes.status}`);
              content = await directRes.text();
              
              if (!content.includes('#EXTM3U') && !content.includes('#EXT-X-')) {
                throw new Error(`Not M3U8: ${content.substring(0, 50)}`);
              }
            } catch (directError) {
              if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
                const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(m3u8Url)}&key=${env.RPI_PROXY_KEY}`;
                const rpiRes = await fetch(rpiUrl);
                
                if (!rpiRes.ok) {
                  errors.push(`dvalna/${currentChannelKey}/${sk}: ${(directError as Error).message}`);
                  continue;
                }
                content = await rpiRes.text();
                fetchedVia = 'rpi-proxy';
              } else {
                errors.push(`dvalna/${currentChannelKey}/${sk}: ${(directError as Error).message}`);
                continue;
              }
            }

            if (content.includes('#EXTM3U') || content.includes('#EXT-X-')) {
              const hasSegments = content.includes('#EXTINF') || content.includes('.ts');
              
              if (!hasSegments) {
                errors.push(`dvalna/${currentChannelKey}/${sk}: M3U8 empty (channel offline)`);
                continue;
              }
              
              serverKeyCache.set(currentChannelKey, { serverKey: sk, fetchedAt: Date.now() });
              logger.info('Backend 1 SUCCESS: dvalna.ru', { serverKey: sk, channelKey: currentChannelKey });
              usedBackend = 'dvalna.ru';
              const proxied = rewriteM3U8(content, proxyOrigin, m3u8Url);
              return new Response(proxied, {
                status: 200,
                headers: {
                  'Content-Type': 'application/vnd.apple.mpegurl',
                  ...corsHeaders(origin),
                  'Cache-Control': 'no-store',
                  'X-DLHD-Channel': channel,
                  'X-DLHD-ChannelKey': currentChannelKey,
                  'X-DLHD-Server': sk,
                  'X-DLHD-Backend': 'dvalna.ru',
                  'X-Fetched-Via': fetchedVia,
                },
              });
            }
          } catch (err) {
            errors.push(`dvalna/${currentChannelKey}/${sk}: ${(err as Error).message}`);
          }
        }
      }
    } else {
      logger.warn('JWT fetch failed for dvalna.ru', { channel });
      errors.push(`dvalna.ru: JWT fetch failed`);
    }
  } else {
    logger.info('Skipping Backend 1: dvalna.ru (client requested skip)', { channel });
  }

  // ============================================================================
  // BACKEND 2: cdn-live-tv.ru (Player 5) - Simple token auth
  // ============================================================================
  const cdnLiveMapping = CHANNEL_TO_CDNLIVE[channel];
  if (cdnLiveMapping && !skipBackends.includes('cdnlive')) {
    logger.info('Trying Backend 2: cdn-live-tv.ru', { channel, mapping: cdnLiveMapping });
    
    const cdnResult = await fetchCdnLiveStream(cdnLiveMapping.name, cdnLiveMapping.code, logger);
    
    if (cdnResult.success && cdnResult.m3u8Url) {
      try {
        const m3u8Res = await fetch(cdnResult.m3u8Url, {
          headers: {
            'User-Agent': USER_AGENT,
            'Referer': 'https://cdn-live.tv/',
          },
        });
        
        if (m3u8Res.ok) {
          const content = await m3u8Res.text();
          
          if (content.includes('#EXTM3U') && (content.includes('#EXTINF') || content.includes('.ts'))) {
            logger.info('Backend 2 SUCCESS: cdn-live-tv.ru', { channel });
            usedBackend = 'cdn-live-tv.ru';
            
            const proxied = rewriteCdnLiveM3U8(content, proxyOrigin, cdnResult.m3u8Url);
            return new Response(proxied, {
              status: 200,
              headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                ...corsHeaders(origin),
                'Cache-Control': 'no-store',
                'X-DLHD-Channel': channel,
                'X-DLHD-Backend': 'cdn-live-tv.ru',
              },
            });
          } else {
            errors.push(`cdn-live-tv.ru: M3U8 empty or invalid`);
          }
        } else {
          errors.push(`cdn-live-tv.ru: HTTP ${m3u8Res.status}`);
        }
      } catch (err) {
        errors.push(`cdn-live-tv.ru: ${(err as Error).message}`);
      }
    } else {
      errors.push(`cdn-live-tv.ru: ${cdnResult.error || 'Failed to get stream URL'}`);
    }
  }

  // ============================================================================
  // BACKEND: Player 5 Dynamic Extraction (ddyplayer.cfd → cdn-live-tv.ru)
  // ============================================================================
  logger.info('Trying Backend 2b: Player 5 dynamic extraction', { channel });
  
  const player5Result = await extractPlayer5Stream(channel, logger);
  
  if (player5Result.success && player5Result.m3u8Url) {
    try {
      const m3u8Res = await fetch(player5Result.m3u8Url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': 'https://ddyplayer.cfd/',
        },
      });
      
      if (m3u8Res.ok) {
        const content = await m3u8Res.text();
        
        if (content.includes('#EXTM3U') && (content.includes('#EXTINF') || content.includes('#EXT-X-STREAM-INF') || content.includes('.ts'))) {
          logger.info('Backend 2b SUCCESS: Player 5 dynamic', { channel });
          usedBackend = 'cdn-live-tv.ru (Player 5)';
          
          const proxied = rewriteCdnLiveM3U8(content, proxyOrigin, player5Result.m3u8Url);
          return new Response(proxied, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.apple.mpegurl',
              ...corsHeaders(origin),
              'Cache-Control': 'no-store',
              'X-DLHD-Channel': channel,
              'X-DLHD-Backend': 'cdn-live-tv.ru (Player 5)',
            },
          });
        } else {
          errors.push(`Player 5: M3U8 empty or invalid`);
        }
      } else {
        errors.push(`Player 5: HTTP ${m3u8Res.status}`);
      }
    } catch (err) {
      errors.push(`Player 5: ${(err as Error).message}`);
    }
  } else {
    errors.push(`Player 5: ${player5Result.error || 'Failed to extract stream'}`);
  }

  // ============================================================================
  // BACKEND: lovecdn.ru/popcdn.day - Token auth, UNENCRYPTED
  // ============================================================================
  // Path: popcdn.day/player/{STREAM_NAME} → beautifulpeople.lovecdn.ru
  // NO ENCRYPTION - direct M3U8 access with token!
  // ============================================================================
  const lovecdnStreamName = CHANNEL_TO_LOVECDN[channel];
  if (lovecdnStreamName) {
    logger.info('Trying Backend 2c: lovecdn.ru', { channel, streamName: lovecdnStreamName });
    
    const lovecdnResult = await fetchLovecdnStream(channel, logger);
    
    if (lovecdnResult.success && lovecdnResult.m3u8Url) {
      logger.info('Backend 2c SUCCESS: lovecdn.ru', { channel, url: lovecdnResult.m3u8Url.substring(0, 60) });
      usedBackend = 'lovecdn.ru';
      
      // Fetch and rewrite the M3U8
      try {
        const m3u8Res = await fetch(lovecdnResult.m3u8Url, {
          headers: {
            'User-Agent': USER_AGENT,
            'Referer': 'https://popcdn.day/',
          },
        });
        
        if (m3u8Res.ok) {
          const content = await m3u8Res.text();
          
          if (content.includes('#EXTM3U') && (content.includes('#EXTINF') || content.includes('#EXT-X-STREAM-INF') || content.includes('.ts'))) {
            const proxied = rewriteLovecdnM3U8(content, proxyOrigin, lovecdnResult.m3u8Url);
            return new Response(proxied, {
              status: 200,
              headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                ...corsHeaders(origin),
                'Cache-Control': 'no-store',
                'X-DLHD-Channel': channel,
                'X-DLHD-Backend': 'lovecdn.ru',
              },
            });
          } else {
            errors.push(`lovecdn.ru: M3U8 empty or invalid`);
          }
        } else {
          errors.push(`lovecdn.ru: HTTP ${m3u8Res.status}`);
        }
      } catch (err) {
        errors.push(`lovecdn.ru: ${(err as Error).message}`);
      }
    } else {
      errors.push(`lovecdn.ru: ${lovecdnResult.error || 'Failed to get stream URL'}`);
    }
  }

  // ============================================================================
  // BACKEND 3: moveonjoy.com (Player 6) - NO AUTH AT ALL!
  // ============================================================================
  const moveonjoyUrl = CHANNEL_TO_MOVEONJOY[channel];
  if (moveonjoyUrl && !skipBackends.includes('moveonjoy')) {
    logger.info('Trying Backend 3: moveonjoy.com', { channel, url: moveonjoyUrl.substring(0, 60) });
    
    try {
      const m3u8Res = await fetch(moveonjoyUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': 'https://tv-bu1.blogspot.com/',
        },
      });
      
      if (m3u8Res.ok) {
        const content = await m3u8Res.text();
        
        if (content.includes('#EXTM3U') && (content.includes('#EXTINF') || content.includes('#EXT-X-STREAM-INF') || content.includes('.ts'))) {
          logger.info('Backend 3 SUCCESS: moveonjoy.com', { channel });
          usedBackend = 'moveonjoy.com';
          
          const proxied = rewriteMoveonjoyM3U8(content, proxyOrigin, moveonjoyUrl);
          return new Response(proxied, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.apple.mpegurl',
              ...corsHeaders(origin),
              'Cache-Control': 'no-store',
              'X-DLHD-Channel': channel,
              'X-DLHD-Backend': 'moveonjoy.com',
            },
          });
        } else {
          errors.push(`moveonjoy.com: M3U8 empty or invalid`);
        }
      } else {
        errors.push(`moveonjoy.com: HTTP ${m3u8Res.status}`);
      }
    } catch (err) {
      errors.push(`moveonjoy.com: ${(err as Error).message}`);
    }
  } else if (!moveonjoyUrl) {
    logger.info('No moveonjoy mapping for channel', { channel });
  }

  // ============================================================================
  // ALL BACKENDS FAILED
  // ============================================================================
  const offlineErrors = errors.filter(e => e.includes('offline') || e.includes('empty'));
  const hasOfflineChannel = offlineErrors.length > 0;
  
  if (hasOfflineChannel) {
    return jsonResponse({ 
      error: 'Channel offline', 
      message: 'This channel exists but is not currently streaming.',
      channel,
      offlineOn: offlineErrors.map(e => e.split(':')[0]),
      hint: 'US broadcast channels are often only available during live sports events. Try again later.'
    }, 503, origin);
  }
  
  return jsonResponse({ 
    error: 'All backends failed', 
    channel,
    errors: errors.slice(0, 10),
    backendsTriedCount: 3,
    hint: 'dvalna.ru, cdn-live-tv.ru, and moveonjoy.com all failed'
  }, 502, origin);
}

// ============================================================================
// M3U8 REWRITERS FOR DIFFERENT BACKENDS
// ============================================================================

/**
 * Rewrite M3U8 for cdn-live-tv.ru backend
 * This backend uses token-based auth, segments include the token
 * 
 * CRITICAL: All URLs must be proxied through appropriate endpoints because
 * cdn-live-tv.ru blocks direct browser requests (CORS/geo-blocking)
 * 
 * ROUTING STRATEGY (January 2026 Fix):
 * - .m3u8 manifests → /tv/cdnlive?url=... (through Next.js /tv route)
 * - .ts segments → /segment?url=... (DIRECTLY to worker, bypassing /tv)
 * - Keys (URI=) → /segment?url=... (DIRECTLY to worker, bypassing /tv)
 * 
 * This ensures segments are served from edge worker for performance,
 * while manifests can be processed through Next.js if needed.
 */
function rewriteCdnLiveM3U8(content: string, proxyOrigin: string, m3u8BaseUrl: string): string {
  const baseUrl = new URL(m3u8BaseUrl);
  const basePath = baseUrl.pathname.replace(/\/[^/]*$/, '/');
  const token = baseUrl.searchParams.get('token') || '';
  
  const lines = content.split('\n').map(line => {
    const trimmed = line.trim();
    
    // Handle EXT-X-KEY URI - proxy key URLs DIRECTLY to worker
    if (trimmed.includes('URI="')) {
      return trimmed.replace(/URI="([^"]+)"/, (_, uri: string) => {
        // Skip if already proxied
        if (uri.includes('/segment?url=') || uri.includes('/key?url=')) {
          return `URI="${uri}"`;
        }
        const fullUrl = uri.startsWith('http') ? uri : `${baseUrl.origin}${basePath}${uri}`;
        // Keys go DIRECTLY to worker /segment endpoint (bypassing /tv route)
        const workerOrigin = proxyOrigin.replace(/\/tv$/, '');
        return `URI="${workerOrigin}/segment?url=${encodeURIComponent(fullUrl)}"`;
      });
    }
    
    if (!trimmed || trimmed.startsWith('#')) return line;
    
    // Skip if already proxied
    if (trimmed.includes('/segment?url=') || trimmed.includes('/cdnlive?url=')) return line;
    
    let absoluteUrl: string;
    
    // Make relative URLs absolute
    if (!trimmed.startsWith('http')) {
      absoluteUrl = `${baseUrl.origin}${basePath}${trimmed}`;
    } else {
      absoluteUrl = trimmed;
    }
    
    // Ensure token is included
    if (!absoluteUrl.includes('token=') && token) {
      absoluteUrl += (absoluteUrl.includes('?') ? '&' : '?') + `token=${token}`;
    }
    
    // Route based on file type:
    // CRITICAL FIX: Segments must go DIRECTLY to worker, NOT through /tv route!
    // - .m3u8 files → /tv/cdnlive (through Next.js /tv route for manifest handling)
    // - .ts segments → /segment (DIRECTLY to worker, bypassing Next.js)
    if (absoluteUrl.includes('.m3u8')) {
      // Manifests go through /tv route
      return `${proxyOrigin}/cdnlive?url=${encodeURIComponent(absoluteUrl)}`;
    } else {
      // Segments go DIRECTLY to worker (strip /tv prefix from proxyOrigin)
      const workerOrigin = proxyOrigin.replace(/\/tv$/, '');
      return `${workerOrigin}/segment?url=${encodeURIComponent(absoluteUrl)}`;
    }
  });
  
  return lines.join('\n');
}

/**
 * Handle /cdnlive proxy requests for cdn-live-tv.ru M3U8 files
 * This proxies nested M3U8 playlists (variant/level playlists) and rewrites their URLs
 */
async function handleCdnLiveM3U8Proxy(url: URL, logger: any, origin: string | null, proxyOrigin: string): Promise<Response> {
  const m3u8Url = url.searchParams.get('url');
  if (!m3u8Url) {
    return jsonResponse({ error: 'Missing url parameter' }, 400, origin);
  }

  // SECURITY: Validate URL format before decoding
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(m3u8Url);
  } catch {
    logger.warn('Invalid URL encoding', { url: m3u8Url.substring(0, 50) });
    return jsonResponse({ error: 'Invalid URL encoding' }, 400, origin);
  }

  logger.info('CDN-Live M3U8 proxy', { url: decodedUrl.substring(0, 100) });

  try {
    // SECURITY: Strict domain validation to prevent SSRF
    // Only allow exact CDN-Live domains, not substrings
    const urlObj = new URL(decodedUrl);
    const allowedDomains = [
      'cdn-live-tv.ru',
      'cdn-live-tv.cfd',
      'cdn-live.tv',
      'edge.cdn-live-tv.ru',
    ];
    
    const hostname = urlObj.hostname.toLowerCase();
    const isAllowedDomain = allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    
    if (!isAllowedDomain) {
      logger.warn('CDN-Live domain validation failed', { hostname });
      return jsonResponse({ error: 'Invalid domain' }, 400, origin);
    }
    
    // SECURITY: Only allow HTTPS
    if (urlObj.protocol !== 'https:') {
      return jsonResponse({ error: 'HTTPS required' }, 400, origin);
    }

    // SECURITY: Add timeout to prevent slow-loris attacks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://cdn-live.tv/',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error('CDN-Live upstream error', { status: response.status });
      return jsonResponse({ error: `Upstream error: ${response.status}` }, response.status, origin);
    }

    const content = await response.text();
    
    if (!content.includes('#EXTM3U')) {
      return jsonResponse({ error: 'Invalid M3U8' }, 502, origin);
    }

    const rewritten = rewriteCdnLiveM3U8(content, proxyOrigin, decodedUrl);

    return new Response(rewritten, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store',
        ...corsHeaders(origin),
      },
    });
  } catch (error) {
    logger.error('CDN-Live proxy error', { error: (error as Error).message });
    return jsonResponse({ error: 'Proxy failed', details: (error as Error).message }, 502, origin);
  }
}

/**
 * Rewrite M3U8 for moveonjoy.com backend
 * This backend has no auth, just make URLs absolute
 */
function rewriteMoveonjoyM3U8(content: string, proxyOrigin: string, m3u8BaseUrl: string): string {
  const baseUrl = new URL(m3u8BaseUrl);
  const basePath = baseUrl.pathname.replace(/\/[^/]*$/, '/');
  
  const lines = content.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    
    // Make relative URLs absolute
    if (!trimmed.startsWith('http')) {
      return `${baseUrl.origin}${basePath}${trimmed}`;
    }
    return line;
  });
  
  return lines.join('\n');
}

/**
 * Rewrite M3U8 for lovecdn.ru backend
 * This backend uses token-based auth, segments include the token
 */
function rewriteLovecdnM3U8(content: string, proxyOrigin: string, m3u8BaseUrl: string): string {
  const baseUrl = new URL(m3u8BaseUrl);
  const basePath = baseUrl.pathname.replace(/\/[^/]*$/, '/');
  const token = baseUrl.searchParams.get('token') || '';
  
  const lines = content.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    
    // Make relative URLs absolute
    if (!trimmed.startsWith('http')) {
      let absoluteUrl = `${baseUrl.origin}${basePath}${trimmed}`;
      // Ensure token is included for segments
      if (!absoluteUrl.includes('token=') && token) {
        absoluteUrl += (absoluteUrl.includes('?') ? '&' : '?') + `token=${token}`;
      }
      return absoluteUrl;
    }
    return line;
  });
  
  return lines.join('\n');
}

async function handleKeyProxy(url: URL, logger: any, origin: string | null, env?: Env): Promise<Response> {
  const keyUrlParam = url.searchParams.get('url');
  if (!keyUrlParam) return jsonResponse({ error: 'Missing url parameter' }, 400, origin);

  let keyUrl = decodeURIComponent(keyUrlParam);
  logger.info('Key proxy request', { keyUrl: keyUrl.substring(0, 80) });

  // UPDATED January 2026: Handle both premium{id} and topembed channel keys (like 'ustvabc')
  // Extract channel key and key number from URL
  const keyPathMatch = keyUrl.match(/\/key\/([^/]+)\/(\d+)/);
  if (!keyPathMatch) return jsonResponse({ error: 'Could not extract channel key from URL' }, 400, origin);

  const channelKey = keyPathMatch[1]; // Could be 'premium51', 'ustvabc', 'eplayerespn_usa', etc.
  const keyNumber = keyPathMatch[2];
  
  logger.info('Key request parsed', { channelKey, keyNumber });

  // Strategy to find JWT:
  // 1. Check if we have a cached JWT for this exact channel key
  // 2. If channelKey is premium{id}, try to fetch JWT for that channel ID
  // 3. Use reverse mapping (channelKeyToTopembed) to find the topembed name
  // 4. Search all cached JWTs for matching channelKey
  
  let jwt: string | null = null;
  let jwtSource = 'unknown';
  
  // Method 1: Check reverse mapping (channelKey → topembed name)
  const topembedName = channelKeyToTopembed.get(channelKey);
  if (topembedName) {
    const cached = jwtCache.get(topembedName);
    if (cached && cached.channelKey === channelKey) {
      const now = Math.floor(Date.now() / 1000);
      if (cached.exp > now + 60) { // At least 1 min remaining
        jwt = cached.jwt;
        jwtSource = `reverse-mapping:${topembedName}`;
        logger.info('JWT found via reverse mapping', { channelKey, topembedName });
      }
    }
  }
  
  // Method 2: If channelKey is premium{id}, fetch JWT for that channel
  if (!jwt) {
    const premiumMatch = channelKey.match(/^premium(\d+)$/);
    if (premiumMatch) {
      const channelId = premiumMatch[1];
      logger.info('Trying to fetch JWT for premium channel', { channelId });
      jwt = await fetchPlayerJWT(channelId, logger, env);
      if (jwt) {
        jwtSource = `fetch:premium${channelId}`;
        // Verify the JWT's channelKey matches what we need
        try {
          const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(payloadB64));
          if (payload.sub && payload.sub !== channelKey) {
            logger.warn('JWT channelKey mismatch', { expected: channelKey, got: payload.sub });
            // The JWT is for a different channel key - this is actually correct!
            // The M3U8 uses premium{id} but the JWT uses the real channel key
            // We need to update our key URL to use the JWT's channel key
          }
        } catch (e) {
          logger.warn('Could not verify JWT channelKey');
        }
      }
    }
  }
  
  // Method 3: Search all cached JWTs for matching channelKey
  if (!jwt) {
    for (const [cacheKey, entry] of jwtCache.entries()) {
      if (entry.channelKey === channelKey) {
        const now = Math.floor(Date.now() / 1000);
        if (entry.exp > now + 60) {
          jwt = entry.jwt;
          jwtSource = `cache-search:${cacheKey}`;
          logger.info('JWT found via cache search', { channelKey, cacheKey });
          break;
        }
      }
    }
  }
  
  // Method 4: Try to find DLHD channel ID from channelKey and fetch fresh JWT
  if (!jwt) {
    // Search CHANNEL_TO_TOPEMBED for a channel that might map to this key
    for (const [dlhdId, topembedChannelName] of Object.entries(CHANNEL_TO_TOPEMBED)) {
      // Fetch JWT for this channel and check if it matches
      const testJwt = await fetchPlayerJWT(dlhdId, logger, env);
      if (testJwt) {
        const cached = jwtCache.get(dlhdId);
        if (cached && cached.channelKey === channelKey) {
          jwt = testJwt;
          jwtSource = `discovery:${dlhdId}`;
          logger.info('JWT found via discovery', { channelKey, dlhdId });
          break;
        }
      }
      // Limit discovery attempts to avoid timeout
      if (jwtSource !== 'unknown') break;
    }
  }
  
  if (!jwt) {
    logger.warn('No JWT found for channel key', { channelKey });
    return jsonResponse({ 
      error: 'Failed to fetch JWT for key decryption',
      channelKey,
      keyNumber,
      hint: 'Channel may not be mapped to topembed.pw. Try using moveonjoy or cdn-live-tv backend instead.',
      cachedChannelKeys: Array.from(channelKeyToTopembed.keys()).slice(0, 10)
    }, 502, origin);
  }
  
  logger.info('JWT found', { channelKey, jwtSource });

  // Compute PoW nonce using WASM
  // Use current timestamp (no offset needed with WASM PoW)
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = await computePoWNonce(channelKey, keyNumber, timestamp);
  if (nonce === null) {
    return jsonResponse({ error: 'Failed to compute PoW nonce' }, 500, origin);
  }

  logger.info('Key fetch with WASM PoW', { channelKey, keyNumber, timestamp, nonce: nonce.toString(), jwtSource });

  const newKeyUrl = `https://chevy.${CDN_DOMAIN}/key/${channelKey}/${keyNumber}`;

  try {
    let data: ArrayBuffer;
    let fetchedVia = 'rpi-proxy-v4';
    
    // Use RPI proxy for key fetch - DLHD blocks Cloudflare IPs
    // But now we compute PoW in CF Worker and pass headers to RPI
    if (!env?.RPI_PROXY_URL || !env?.RPI_PROXY_KEY) {
      return jsonResponse({ 
        error: 'RPI proxy not configured', 
        hint: 'Configure RPI_PROXY_URL and RPI_PROXY_KEY for key decryption',
      }, 502, origin);
    }
    
    // Use the new /dlhd-key-v4 endpoint that accepts pre-computed auth headers
    const rpiKeyUrl = new URL(`${env.RPI_PROXY_URL}/dlhd-key-v4`);
    rpiKeyUrl.searchParams.set('url', newKeyUrl);
    rpiKeyUrl.searchParams.set('key', env.RPI_PROXY_KEY);
    rpiKeyUrl.searchParams.set('jwt', jwt);
    rpiKeyUrl.searchParams.set('timestamp', timestamp.toString());
    rpiKeyUrl.searchParams.set('nonce', nonce.toString());
    
    logger.info('Fetching key via RPI proxy v4', { url: rpiKeyUrl.toString().substring(0, 100) });
    
    const rpiRes = await fetch(rpiKeyUrl.toString());
    
    if (!rpiRes.ok) {
      const errText = await rpiRes.text();
      logger.warn('RPI key fetch failed', { status: rpiRes.status, error: errText });
      return jsonResponse({ 
        error: 'Key fetch failed via RPI', 
        rpiStatus: rpiRes.status,
        rpiError: errText.substring(0, 200),
        channelKey,
        keyNumber,
      }, 502, origin);
    }
    
    data = await rpiRes.arrayBuffer();

    if (data.byteLength === 16) {
      const text = new TextDecoder().decode(data);
      // Make sure it's not an error message
      if (!text.startsWith('{') && !text.startsWith('[') && !text.startsWith('E')) {
        logger.info('Key fetched successfully', { size: 16, fetchedVia });
        return new Response(data, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': '16',
            ...corsHeaders(origin),
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Fetched-Via': fetchedVia,
          },
        });
      }
    }

    const text = new TextDecoder().decode(data);
    logger.warn('Invalid key response', { size: data.byteLength, preview: text.substring(0, 100) });
    return jsonResponse({ 
      error: 'Invalid key response', 
      size: data.byteLength,
      preview: text.substring(0, 100),
      channelKey,
      keyNumber,
    }, 502, origin);
  } catch (error) {
    return jsonResponse({ error: 'Key fetch failed', details: (error as Error).message }, 502, origin);
  }
}

// Known DLHD CDN domains that block Cloudflare IPs
const DLHD_DOMAINS = ['dvalna.ru', 'kiko2.ru', 'giokko.ru'];

/**
 * Check if a URL is from a DLHD CDN domain that blocks CF IPs
 */
function isDLHDDomain(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return DLHD_DOMAINS.some(domain => url.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

async function handleSegmentProxy(url: URL, logger: any, origin: string | null, env?: Env): Promise<Response> {
  const segmentUrl = url.searchParams.get('url');
  if (!segmentUrl) return jsonResponse({ error: 'Missing url parameter' }, 400, origin);

  // SECURITY: Strict URL validation to prevent SSRF attacks
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(segmentUrl);
  } catch {
    logger.warn('Invalid URL encoding in segment request');
    return jsonResponse({ error: 'Invalid URL encoding' }, 400, origin);
  }

  // SECURITY: Validate domain whitelist to prevent proxying arbitrary URLs
  const allowedDomains = [
    'dvalna.ru',
    'cdn-live-tv.ru',
    'cdn-live-tv.cfd',
    'cdn-live.tv',
    'edge.cdn-live-tv.ru',
    'edge.cdn-live-tv.cfd',
    'moveonjoy.com',
    'lovecdn.ru',
    'popcdn.day',
    'beautifulpeople.lovecdn.ru',
  ];

  try {
    const urlObj = new URL(decodedUrl);
    const hostname = urlObj.hostname.toLowerCase();
    const isAllowed = allowedDomains.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      logger.warn('SSRF attempt - unauthorized domain', { hostname, origin });
      return jsonResponse({ error: 'Unauthorized domain' }, 403, origin);
    }
  } catch (e) {
    logger.warn('Invalid URL format in segment request', { url: decodedUrl.substring(0, 50) });
    return jsonResponse({ error: 'Invalid URL format' }, 400, origin);
  }

  const isDlhd = isDLHDDomain(decodedUrl);
  
  // Determine correct Referer based on domain
  let referer = `https://${PLAYER_DOMAIN}/`;
  try {
    const urlHost = new URL(decodedUrl).hostname;
    if (urlHost.includes('cdn-live-tv.ru') || urlHost.includes('cdn-live-tv.cfd') || urlHost.includes('cdn-live.tv')) {
      referer = 'https://cdn-live.tv/';
    }
  } catch {}
  
  logger.info('Segment proxy request', { url: decodedUrl.substring(0, 80), isDlhd, referer });

  try {
    let data: ArrayBuffer;
    let fetchedVia = 'direct';
    
    // Always try direct fetch first for segments - they may not be blocked
    // Only fall back to RPI if direct fails
    try {
      const directRes = await fetch(decodedUrl, {
        headers: { 'User-Agent': USER_AGENT, 'Referer': referer },
      });
      
      if (!directRes.ok) {
        logger.warn('Direct segment fetch HTTP error', { 
          status: directRes.status, 
          statusText: directRes.statusText,
          url: decodedUrl.substring(0, 100)
        });
        throw new Error(`HTTP ${directRes.status}`);
      }
      
      data = await directRes.arrayBuffer();
      
      // Check if response is an error - look for JSON/HTML in first bytes
      // Valid TS segments start with 0x47 (sync byte) or fMP4 starts with 'ftyp'/'moof'
      const firstBytes = new Uint8Array(data.slice(0, 8));
      const isValidTS = firstBytes[0] === 0x47; // TS sync byte
      const firstChars = new TextDecoder().decode(firstBytes);
      const isValidFMP4 = firstChars.includes('ftyp') || firstChars.includes('moof') || firstChars.includes('mdat');
      
      if (!isValidTS && !isValidFMP4) {
        // Check if it's an error response
        const preview = new TextDecoder().decode(data.slice(0, 500));
        if (preview.startsWith('{') || preview.startsWith('<') || preview.includes('"error"') || preview.includes('"msg"')) {
          logger.warn('Segment response is error/HTML', { 
            size: data.byteLength, 
            preview: preview.substring(0, 200),
            firstByte: firstBytes[0].toString(16)
          });
          throw new Error(`Invalid segment data: ${preview.substring(0, 100)}`);
        }
        // Log warning but continue - might be valid but unusual format
        logger.warn('Segment has unexpected format', { 
          size: data.byteLength, 
          firstByte: firstBytes[0].toString(16),
          preview: preview.substring(0, 50)
        });
      }
      
      logger.info('Direct segment fetch succeeded', { size: data.byteLength, isTS: isValidTS, isFMP4: isValidFMP4 });
    } catch (directError) {
      // Only use RPI for DLHD domains when direct fails
      if (isDlhd && env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
        logger.warn('Direct segment fetch failed, trying RPI', { error: (directError as Error).message });
        
        const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(decodedUrl)}&key=${env.RPI_PROXY_KEY}`;
        const rpiRes = await fetch(rpiUrl);
        
        if (!rpiRes.ok) {
          const errText = await rpiRes.text();
          logger.warn('RPI segment fetch failed', { status: rpiRes.status, error: errText.substring(0, 100) });
          return jsonResponse({ 
            error: 'Segment fetch failed (both direct and RPI)', 
            directError: (directError as Error).message,
            rpiStatus: rpiRes.status,
          }, 502, origin);
        }
        
        data = await rpiRes.arrayBuffer();
        fetchedVia = 'rpi-proxy';
        logger.info('RPI segment fetch succeeded', { size: data.byteLength });
      } else {
        // Non-DLHD domain or RPI not configured - return direct error
        return jsonResponse({ 
          error: 'Segment fetch failed', 
          details: (directError as Error).message,
        }, 502, origin);
      }
    }

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp2t',
        ...corsHeaders(origin),
        'Cache-Control': 'public, max-age=300',
        'X-Fetched-Via': fetchedVia,
      },
    });
  } catch (error) {
    logger.error('Segment proxy error', { error: (error as Error).message });
    return jsonResponse({ error: 'Segment fetch failed', details: (error as Error).message }, 502, origin);
  }
}

function rewriteM3U8(content: string, proxyOrigin: string, m3u8BaseUrl: string): string {
  let modified = content;

  // Rewrite key URLs - keys MUST be proxied (require PoW auth)
  // Key URLs can be on kiko2.ru, dvalna.ru, or giokko.ru domains
  // Channel keys can be premium{id} OR named keys like eplayerespn_usa, ustvabc, etc.
  modified = modified.replace(/URI="([^"]+)"/g, (_, originalKeyUrl) => {
    // Skip if already proxied through our worker
    if (originalKeyUrl.includes('/key?url=') || originalKeyUrl.includes('/segment?url=')) {
      return `URI="${originalKeyUrl}"`;
    }
    
    let absoluteKeyUrl = originalKeyUrl;
    if (!absoluteKeyUrl.startsWith('http')) {
      const base = new URL(m3u8BaseUrl);
      absoluteKeyUrl = new URL(originalKeyUrl, base.origin + base.pathname.replace(/\/[^/]*$/, '/')).toString();
    }
    
    // Match key URLs with any channel key format (premium{id} or named like eplayerespn_usa)
    const keyPathMatch = absoluteKeyUrl.match(/\/key\/([^/]+)\/(\d+)/);
    if (keyPathMatch) {
      // Normalize to chevy.dvalna.ru for our proxy
      absoluteKeyUrl = `https://chevy.${CDN_DOMAIN}/key/${keyPathMatch[1]}/${keyPathMatch[2]}`;
    }
    // proxyOrigin already contains /tv, so just append /key (not /tv/key)
    return `URI="${proxyOrigin}/key?url=${encodeURIComponent(absoluteKeyUrl)}"`;
  });

  modified = modified.replace(/\n?#EXT-X-ENDLIST\s*$/m, '');

  // Fix: DLHD now splits long segment URLs across multiple lines
  // Join lines that are continuations of URLs (don't start with # or http)
  const rawLines = modified.split('\n');
  const joinedLines: string[] = [];
  let currentLine = '';
  
  for (const line of rawLines) {
    const trimmed = line.trim();
    
    // If line starts with # or is empty, flush current and add this line
    if (!trimmed || trimmed.startsWith('#')) {
      if (currentLine) {
        joinedLines.push(currentLine);
        currentLine = '';
      }
      joinedLines.push(line);
    }
    // If line starts with http, it's a new URL
    else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (currentLine) {
        joinedLines.push(currentLine);
      }
      currentLine = trimmed;
    }
    // Otherwise it's a continuation of the previous URL
    else {
      currentLine += trimmed;
    }
  }
  
  // Don't forget the last line
  if (currentLine) {
    joinedLines.push(currentLine);
  }

  // DON'T proxy segment URLs - let browser fetch directly from CDN
  // This is MUCH faster than going through CF Worker -> RPI Proxy
  // Segments don't require authentication, only keys do
  const lines = joinedLines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    // Keep segment URLs as-is (direct to CDN)
    return line;
  });

  return lines.join('\n');
}

function isAllowedOrigin(origin: string | null, referer: string | null): boolean {
  // SECURITY FIX: Do NOT allow requests without origin/referer!
  // Previous assumption that "media players don't send headers" is FALSE and exploitable.
  // Modern HLS.js and video players DO send Referer headers.
  // Attackers can trivially strip headers using curl/wget/scripts.
  // 
  // If you need to support legacy players, use signed tokens instead (see anti-leech-proxy.ts)
  if (!origin && !referer) {
    // TEMPORARY: Log these requests to identify legitimate vs malicious traffic
    console.warn('[SECURITY] Request without Origin/Referer - potential leech attempt');
    return false; // DENY by default
  }
  
  const check = (o: string) => ALLOWED_ORIGINS.some(a => {
    if (a.includes('localhost')) return o.includes('localhost');
    // Handle domain suffix patterns (e.g., '.pages.dev', '.workers.dev', '.vercel.app')
    if (a.startsWith('.')) {
      try {
        const originHost = new URL(o).hostname;
        return originHost.endsWith(a);
      } catch {
        return false;
      }
    }
    try {
      const allowedHost = new URL(a).hostname;
      const originHost = new URL(o).hostname;
      return originHost === allowedHost || originHost.endsWith(`.${allowedHost}`);
    } catch {
      return false;
    }
  });
  if (origin && check(origin)) return true;
  if (referer) try { return check(new URL(referer).origin); } catch {}
  
  // SECURITY: Do NOT allow all origins - this defeats anti-leech protection
  // If origin/referer is provided but doesn't match, DENY access
  return false;
}

function corsHeaders(origin?: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
  };
}

function jsonResponse(data: object, status: number, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}
