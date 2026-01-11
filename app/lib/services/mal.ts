/**
 * MyAnimeList (MAL) API Service
 * Fetches anime data from Jikan API (unofficial MAL API)
 * Used to get accurate season/episode information for anime
 */

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

// Rate limiting: Jikan has a 3 requests/second limit
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 350; // ms between requests

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  return fetch(url);
}

export interface MALAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: string; // TV, Movie, OVA, etc.
  episodes: number | null;
  status: string;
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  synopsis: string | null;
  season: string | null;
  year: number | null;
  images: {
    jpg: { image_url: string; large_image_url: string };
    webp: { image_url: string; large_image_url: string };
  };
  aired: {
    from: string | null;
    to: string | null;
    string: string;
  };
  genres: Array<{ mal_id: number; name: string }>;
  studios: Array<{ mal_id: number; name: string }>;
}

export interface MALRelation {
  relation: string;
  entry: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
}

export interface MALSearchResult {
  mal_id: number;
  title: string;
  title_english: string | null;
  type: string;
  episodes: number | null;
  score: number | null;
  images: {
    jpg: { image_url: string; large_image_url: string };
  };
}

export interface MALSeason {
  malId: number;
  title: string;
  titleEnglish: string | null;
  episodes: number | null;
  score: number | null;
  members: number | null;
  type: string;
  status: string;
  aired: string;
  synopsis: string | null;
  imageUrl: string;
  seasonOrder: number; // Order in the series (1, 2, 3...)
}

export interface MALAnimeDetails {
  mainEntry: MALAnime;
  allSeasons: MALSeason[];
  totalEpisodes: number;
}

/**
 * Search for anime on MAL by title
 */
export async function searchMALAnime(query: string, limit: number = 10): Promise<MALSearchResult[]> {
  try {
    const url = `${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=${limit}&order_by=members&sort=desc`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error('[MAL] Search failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[MAL] Search error:', error);
    return [];
  }
}

/**
 * Get anime details by MAL ID
 */
export async function getMALAnimeById(malId: number): Promise<MALAnime | null> {
  try {
    const url = `${JIKAN_BASE_URL}/anime/${malId}/full`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error('[MAL] Get anime failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('[MAL] Get anime error:', error);
    return null;
  }
}

/**
 * Get anime relations (sequels, prequels, etc.)
 */
export async function getMALAnimeRelations(malId: number): Promise<MALRelation[]> {
  try {
    const url = `${JIKAN_BASE_URL}/anime/${malId}/relations`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error('[MAL] Get relations failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[MAL] Get relations error:', error);
    return [];
  }
}

// Known title mappings from TMDB to MAL search terms
const TITLE_MAPPINGS: Record<string, string> = {
  'thousand-year blood war': 'Sennen Kessen',
  'attack on titan': 'Shingeki no Kyojin',
  'demon slayer': 'Kimetsu no Yaiba',
  'my hero academia': 'Boku no Hero Academia',
  'jujutsu kaisen': 'Jujutsu Kaisen',
  'spy x family': 'Spy x Family',
  'chainsaw man': 'Chainsaw Man',
  'one punch man': 'One Punch Man',
};

// Special cases where TMDB has one series but MAL has separate entries per season
// These need manual mapping since MAL doesn't link them as sequels
// NOTE: For ongoing seasons, set episodes to a high number (e.g., 24) as placeholder
const TMDB_TO_MAL_SEASON_MAPPING: Record<number, { seasons: Array<{ malId: number; episodes: number; title: string }> }> = {
  95479: { // Jujutsu Kaisen TMDB ID
    seasons: [
      { malId: 40748, episodes: 24, title: 'Jujutsu Kaisen' },
      { malId: 51009, episodes: 23, title: 'Jujutsu Kaisen 2nd Season' },
      { malId: 57658, episodes: 24, title: 'Jujutsu Kaisen: The Culling Game' } // Season 3 - ongoing, episode count TBD
    ]
  },
  203624: { // Solo Leveling TMDB ID
    seasons: [
      { malId: 52299, episodes: 12, title: 'Solo Leveling' },
      { malId: 58567, episodes: 13, title: 'Solo Leveling Season 2: Arise from the Shadow' }
    ]
  }
};

/**
 * Find the best MAL match for a TMDB anime
 */
export async function findMALMatch(
  tmdbTitle: string,
  _tmdbYear?: number, // Reserved for future year-based filtering
  tmdbType?: 'movie' | 'tv'
): Promise<MALAnime | null> {
  console.log(`[MAL] Finding match for: "${tmdbTitle}"`);
  
  // Clean up title for search - but keep important keywords like "Thousand-Year Blood War"
  let cleanTitle = tmdbTitle
    .replace(/\s*\(.*?\)\s*/g, '') // Remove parenthetical info
    .replace(/\s*-\s*Season\s*\d+/gi, '') // Remove "- Season X"
    .replace(/\s*Season\s*\d+/gi, '') // Remove "Season X"
    .trim();
  
  // Check for known title mappings
  const titleLower = cleanTitle.toLowerCase();
  for (const [englishTerm, japaneseTerm] of Object.entries(TITLE_MAPPINGS)) {
    if (titleLower.includes(englishTerm)) {
      // Replace the English term with Japanese term for better MAL search
      const baseName = cleanTitle.split(':')[0].trim(); // Get "Bleach" from "Bleach: Thousand-Year Blood War"
      cleanTitle = `${baseName} ${japaneseTerm}`;
      console.log(`[MAL] Applied title mapping: "${englishTerm}" -> "${japaneseTerm}"`);
      break;
    }
  }
  
  console.log(`[MAL] Search query: "${cleanTitle}"`);
  
  const results = await searchMALAnime(cleanTitle, 25);
  console.log(`[MAL] Search returned ${results.length} results`);
  
  if (results.length === 0) {
    // Try with original title
    const originalResults = await searchMALAnime(tmdbTitle, 10);
    if (originalResults.length === 0) return null;
    
    // Return best match by members
    const anime = await getMALAnimeById(originalResults[0].mal_id);
    return anime;
  }
  
  // Score each result
  const scoredResults = results.map(result => {
    let score = 0;
    
    // Title match
    const titleLower = cleanTitle.toLowerCase();
    const resultTitleLower = result.title.toLowerCase();
    const resultEnglishLower = result.title_english?.toLowerCase() || '';
    
    // Exact match
    if (resultTitleLower === titleLower || resultEnglishLower === titleLower) {
      score += 100;
    } 
    // Check if search title contains result title or vice versa
    else if (resultTitleLower.includes(titleLower) || resultEnglishLower.includes(titleLower)) {
      score += 50;
    } else if (titleLower.includes(resultTitleLower) || (resultEnglishLower && titleLower.includes(resultEnglishLower))) {
      score += 30;
    }
    
    // Special handling for specific keywords that should match
    // e.g., "Thousand-Year Blood War" should strongly prefer entries with that phrase
    const keywords = ['thousand-year', 'blood war', 'sennen kessen', 'tybw'];
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        if (resultTitleLower.includes(keyword) || resultEnglishLower.includes(keyword)) {
          score += 50; // Strong bonus for matching important keywords
        } else {
          score -= 30; // Penalty for NOT having the keyword when we're searching for it
        }
      }
    }
    
    // Type match
    if (tmdbType === 'movie' && result.type === 'Movie') {
      score += 20;
    } else if (tmdbType === 'tv' && result.type === 'TV') {
      score += 20;
    }
    
    // Popularity bonus (more members = more likely correct)
    score += Math.min(result.score || 0, 10);
    
    return { result, score };
  });
  
  // Sort by score and get best match
  scoredResults.sort((a, b) => b.score - a.score);
  
  // Log top 5 results for debugging
  console.log('[MAL] Top 5 scored results:', scoredResults.slice(0, 5).map(r => ({
    title: r.result.title,
    english: r.result.title_english,
    score: r.score,
    malId: r.result.mal_id
  })));
  
  if (scoredResults.length > 0 && scoredResults[0].score > 20) {
    const anime = await getMALAnimeById(scoredResults[0].result.mal_id);
    console.log(`[MAL] Best match: ${anime?.title} (${anime?.mal_id})`);
    return anime;
  }
  
  return null;
}

/**
 * Recursively collect all sequel IDs following the chain
 * e.g., Part 1 → Part 2 → Part 3
 * 
 * IMPORTANT: Only follow SEQUEL relations, not PREQUEL
 * This prevents including the original series when searching for a specific season
 * e.g., Bleach TYBW should not include original Bleach (366 eps)
 */
async function collectSequelChain(
  startId: number,
  collected: Set<number>,
  maxDepth: number = 10
): Promise<void> {
  if (maxDepth <= 0 || collected.has(startId)) return;
  
  collected.add(startId);
  
  try {
    const relations = await getMALAnimeRelations(startId);
    
    for (const relation of relations) {
      // ONLY follow SEQUEL relations to get subsequent parts
      // Do NOT follow PREQUEL to avoid including the original series
      if (relation.relation === 'Sequel') {
        for (const entry of relation.entry) {
          if (entry.type === 'anime' && !collected.has(entry.mal_id)) {
            console.log(`[MAL] Following ${relation.relation}: ${entry.name} (${entry.mal_id})`);
            await collectSequelChain(entry.mal_id, collected, maxDepth - 1);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[MAL] Error collecting sequel chain for ${startId}:`, error);
  }
}

/**
 * Get all seasons/entries for an anime series
 * This handles cases like Bleach TYBW where MAL has multiple entries
 * Recursively follows sequel/prequel chains to find all parts
 */
export async function getMALSeriesSeasons(malId: number): Promise<MALAnimeDetails | null> {
  try {
    // Get the main anime entry
    const mainAnime = await getMALAnimeById(malId);
    if (!mainAnime) return null;
    
    console.log(`[MAL] Getting series seasons for: ${mainAnime.title} (${malId})`);
    
    // Recursively collect all related anime IDs following sequel/prequel chains
    const relatedIds = new Set<number>();
    await collectSequelChain(malId, relatedIds);
    
    console.log(`[MAL] Found ${relatedIds.size} related entries:`, Array.from(relatedIds));
    
    // Fetch details for all related anime SEQUENTIALLY to respect rate limits
    // Using Promise.all would bypass rate limiting and cause requests to fail
    const allAnime: MALAnime[] = [];
    for (const id of relatedIds) {
      const anime = await getMALAnimeById(id);
      if (anime) {
        allAnime.push(anime);
        console.log(`[MAL] Fetched: ${anime.title} (${anime.episodes} eps)`);
      } else {
        console.log(`[MAL] Failed to fetch MAL ID: ${id}`);
      }
    }
    
    console.log(`[MAL] Fetched ${allAnime.length} anime details out of ${relatedIds.size}`);
    
    // Filter to only TV series and ONA, sort by air date
    const tvSeries = allAnime
      .filter(a => a.type === 'TV' || a.type === 'ONA')
      .sort((a, b) => {
        const dateA = a.aired.from ? new Date(a.aired.from).getTime() : 0;
        const dateB = b.aired.from ? new Date(b.aired.from).getTime() : 0;
        return dateA - dateB;
      });
    
    console.log(`[MAL] Filtered to ${tvSeries.length} TV/ONA series:`, tvSeries.map(a => ({
      title: a.title,
      episodes: a.episodes,
      aired: a.aired.from
    })));
    
    // For Bleach TYBW specifically, we need to filter to only the TYBW entries
    // Check if the main anime title contains specific keywords
    const mainTitleLower = mainAnime.title.toLowerCase();
    const isTYBW = mainTitleLower.includes('sennen kessen') || mainTitleLower.includes('thousand-year');
    
    let filteredSeries = tvSeries;
    if (isTYBW) {
      // Filter to only TYBW entries (they all have "Sennen Kessen" in the title)
      // Also filter out entries with null episodes (not yet aired)
      filteredSeries = tvSeries.filter(a => 
        (a.title.toLowerCase().includes('sennen kessen') || 
         a.title.toLowerCase().includes('thousand-year')) &&
        a.episodes !== null && a.episodes > 0
      );
      console.log(`[MAL] Filtered to TYBW entries only: ${filteredSeries.length}`);
    } else {
      // For non-TYBW anime, still filter out entries with null episodes
      filteredSeries = tvSeries.filter(a => a.episodes !== null && a.episodes > 0);
    }
    
    // Convert to MALSeason format
    const seasons: MALSeason[] = filteredSeries.map((anime, index) => ({
      malId: anime.mal_id,
      title: anime.title,
      titleEnglish: anime.title_english,
      episodes: anime.episodes,
      score: anime.score,
      members: anime.members,
      type: anime.type,
      status: anime.status,
      aired: anime.aired.string,
      synopsis: anime.synopsis,
      imageUrl: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
      seasonOrder: index + 1,
    }));
    
    // Calculate total episodes
    const totalEpisodes = seasons.reduce((sum, s) => sum + (s.episodes || 0), 0);
    
    console.log(`[MAL] Final result: ${seasons.length} seasons, ${totalEpisodes} total episodes`);
    
    return {
      mainEntry: mainAnime,
      allSeasons: seasons,
      totalEpisodes,
    };
  } catch (error) {
    console.error('[MAL] Get series seasons error:', error);
    return null;
  }
}

/**
 * Get MAL data for TMDB anime with special season mapping
 * Handles cases like Jujutsu Kaisen where TMDB has one series but MAL has separate entries
 */
export async function getMALDataForTMDBAnimeWithSeasonMapping(
  tmdbId: number,
  tmdbTitle: string
): Promise<MALAnimeDetails | null> {
  // Check if this TMDB ID has special season mapping
  const seasonMapping = TMDB_TO_MAL_SEASON_MAPPING[tmdbId];
  if (!seasonMapping) {
    // Fall back to normal MAL search
    return getMALDataForTMDBAnime(tmdbTitle);
  }

  console.log(`[MAL] Using special season mapping for TMDB ID ${tmdbId}: ${seasonMapping.seasons.length} MAL entries`);

  try {
    // Fetch details for all MAL entries SEQUENTIALLY to respect rate limits
    const allAnime: MALAnime[] = [];
    for (const season of seasonMapping.seasons) {
      const anime = await getMALAnimeById(season.malId);
      if (anime) {
        allAnime.push(anime);
        console.log(`[MAL] Fetched: ${anime.title} (${anime.episodes} eps, MAL ID: ${anime.mal_id})`);
      } else {
        console.log(`[MAL] Failed to fetch MAL ID: ${season.malId}`);
      }
    }

    if (allAnime.length === 0) {
      console.log('[MAL] No anime data fetched from season mapping');
      return null;
    }

    // Use the first entry as the main entry
    const mainAnime = allAnime[0];

    // Convert to MALSeason format
    // IMPORTANT: Use episode count from our mapping if MAL returns null (for ongoing series)
    const seasons: MALSeason[] = allAnime.map((anime, index) => {
      // Get the episode count from our mapping as fallback for ongoing series
      const mappingEpisodes = seasonMapping.seasons[index]?.episodes || 0;
      const episodeCount = anime.episodes || mappingEpisodes;
      
      return {
        malId: anime.mal_id,
        title: anime.title,
        titleEnglish: anime.title_english,
        episodes: episodeCount,
        score: anime.score,
        members: anime.members,
        type: anime.type,
        status: anime.status,
        aired: anime.aired.string,
        synopsis: anime.synopsis,
        imageUrl: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
        seasonOrder: index + 1,
      };
    });

    // Calculate total episodes
    const totalEpisodes = seasons.reduce((sum, s) => sum + (s.episodes || 0), 0);

    console.log(`[MAL] Season mapping result: ${seasons.length} seasons, ${totalEpisodes} total episodes`);

    return {
      mainEntry: mainAnime,
      allSeasons: seasons,
      totalEpisodes,
    };
  } catch (error) {
    console.error('[MAL] Error in season mapping:', error);
    return null;
  }
}

/**
 * Search and get full series info for a TMDB anime
 */
export async function getMALDataForTMDBAnime(
  tmdbTitle: string,
  tmdbYear?: number,
  tmdbType?: 'movie' | 'tv'
): Promise<MALAnimeDetails | null> {
  // Find the MAL match
  const match = await findMALMatch(tmdbTitle, tmdbYear, tmdbType);
  if (!match) return null;
  
  // Get all seasons for the series
  return getMALSeriesSeasons(match.mal_id);
}

export const malService = {
  search: searchMALAnime,
  getById: getMALAnimeById,
  getRelations: getMALAnimeRelations,
  findMatch: findMALMatch,
  getSeriesSeasons: getMALSeriesSeasons,
  getDataForTMDB: getMALDataForTMDBAnime,
  getDataForTMDBWithSeasonMapping: getMALDataForTMDBAnimeWithSeasonMapping,
};
