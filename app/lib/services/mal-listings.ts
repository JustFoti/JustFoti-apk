/**
 * MAL Listings Service
 * Fetches anime listings from Jikan API (unofficial MAL API)
 * With server-side caching for performance
 */

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

// Server-side cache for MAL listings
const listingsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

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
  return fetch(url, { next: { revalidate: 3600 } }); // Next.js cache for 1 hour
}

export interface MALAnimeListItem {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: string;
  episodes: number | null;
  status: string;
  airing: boolean;
  score: number | null;
  members: number | null;
  rank: number | null;
  popularity: number | null;
  synopsis: string | null;
  year: number | null;
  season: string | null;
  images: {
    jpg: { image_url: string; large_image_url: string };
    webp: { image_url: string; large_image_url: string };
  };
  genres: Array<{ mal_id: number; name: string }>;
  studios: Array<{ mal_id: number; name: string }>;
}

export interface MALListingResponse {
  items: MALAnimeListItem[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
    items: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

function getCached<T>(key: string): T | null {
  const cached = listingsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: any): void {
  listingsCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Get top anime (by score)
 */
export async function getTopAnime(page: number = 1, limit: number = 25): Promise<MALListingResponse> {
  const cacheKey = `top-anime-${page}-${limit}`;
  const cached = getCached<MALListingResponse>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${JIKAN_BASE_URL}/top/anime?page=${page}&limit=${limit}&filter=bypopularity`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error('[MAL] Top anime fetch failed:', response.status);
      return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
    }
    
    const data = await response.json();
    const result: MALListingResponse = {
      items: data.data || [],
      pagination: data.pagination || { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } },
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[MAL] Top anime error:', error);
    return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
  }
}

/**
 * Get currently airing anime
 */
export async function getAiringAnime(page: number = 1, limit: number = 25): Promise<MALListingResponse> {
  const cacheKey = `airing-anime-${page}-${limit}`;
  const cached = getCached<MALListingResponse>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${JIKAN_BASE_URL}/seasons/now?page=${page}&limit=${limit}`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error('[MAL] Airing anime fetch failed:', response.status);
      return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
    }
    
    const data = await response.json();
    const result: MALListingResponse = {
      items: data.data || [],
      pagination: data.pagination || { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } },
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[MAL] Airing anime error:', error);
    return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
  }
}

/**
 * Get upcoming anime
 */
export async function getUpcomingAnime(page: number = 1, limit: number = 25): Promise<MALListingResponse> {
  const cacheKey = `upcoming-anime-${page}-${limit}`;
  const cached = getCached<MALListingResponse>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${JIKAN_BASE_URL}/seasons/upcoming?page=${page}&limit=${limit}`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error('[MAL] Upcoming anime fetch failed:', response.status);
      return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
    }
    
    const data = await response.json();
    const result: MALListingResponse = {
      items: data.data || [],
      pagination: data.pagination || { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } },
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[MAL] Upcoming anime error:', error);
    return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
  }
}

/**
 * Get popular anime (by members)
 */
export async function getPopularAnime(page: number = 1, limit: number = 25): Promise<MALListingResponse> {
  const cacheKey = `popular-anime-${page}-${limit}`;
  const cached = getCached<MALListingResponse>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${JIKAN_BASE_URL}/top/anime?page=${page}&limit=${limit}&filter=bypopularity`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error('[MAL] Popular anime fetch failed:', response.status);
      return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
    }
    
    const data = await response.json();
    const result: MALListingResponse = {
      items: data.data || [],
      pagination: data.pagination || { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } },
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[MAL] Popular anime error:', error);
    return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
  }
}

/**
 * Get anime by genre
 * Genre IDs: 1=Action, 2=Adventure, 4=Comedy, 8=Drama, 10=Fantasy, 22=Romance, 24=Sci-Fi, 36=Slice of Life
 */
export async function getAnimeByGenre(genreId: number, page: number = 1, limit: number = 25): Promise<MALListingResponse> {
  const cacheKey = `genre-anime-${genreId}-${page}-${limit}`;
  const cached = getCached<MALListingResponse>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${JIKAN_BASE_URL}/anime?genres=${genreId}&page=${page}&limit=${limit}&order_by=members&sort=desc`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error('[MAL] Genre anime fetch failed:', response.status);
      return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
    }
    
    const data = await response.json();
    const result: MALListingResponse = {
      items: data.data || [],
      pagination: data.pagination || { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } },
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[MAL] Genre anime error:', error);
    return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
  }
}

/**
 * Get anime movies
 */
export async function getAnimeMovies(page: number = 1, limit: number = 25): Promise<MALListingResponse> {
  const cacheKey = `movies-anime-${page}-${limit}`;
  const cached = getCached<MALListingResponse>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${JIKAN_BASE_URL}/anime?type=movie&page=${page}&limit=${limit}&order_by=members&sort=desc`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error('[MAL] Movies anime fetch failed:', response.status);
      return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
    }
    
    const data = await response.json();
    const result: MALListingResponse = {
      items: data.data || [],
      pagination: data.pagination || { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } },
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[MAL] Movies anime error:', error);
    return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
  }
}

/**
 * Search anime
 */
export async function searchAnime(query: string, page: number = 1, limit: number = 25): Promise<MALListingResponse> {
  const cacheKey = `search-anime-${query}-${page}-${limit}`;
  const cached = getCached<MALListingResponse>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}&order_by=members&sort=desc`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error('[MAL] Search anime fetch failed:', response.status);
      return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
    }
    
    const data = await response.json();
    const result: MALListingResponse = {
      items: data.data || [],
      pagination: data.pagination || { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } },
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[MAL] Search anime error:', error);
    return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
  }
}

/**
 * Get top rated anime (by score)
 */
export async function getTopRatedAnime(page: number = 1, limit: number = 25): Promise<MALListingResponse> {
  const cacheKey = `toprated-anime-${page}-${limit}`;
  const cached = getCached<MALListingResponse>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${JIKAN_BASE_URL}/top/anime?page=${page}&limit=${limit}&filter=airing`;
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      // Fallback to regular top
      const fallbackUrl = `${JIKAN_BASE_URL}/top/anime?page=${page}&limit=${limit}`;
      const fallbackResponse = await rateLimitedFetch(fallbackUrl);
      if (!fallbackResponse.ok) {
        return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
      }
      const fallbackData = await fallbackResponse.json();
      const result: MALListingResponse = {
        items: fallbackData.data || [],
        pagination: fallbackData.pagination || { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } },
      };
      setCache(cacheKey, result);
      return result;
    }
    
    const data = await response.json();
    const result: MALListingResponse = {
      items: data.data || [],
      pagination: data.pagination || { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } },
    };
    
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[MAL] Top rated anime error:', error);
    return { items: [], pagination: { last_visible_page: 1, has_next_page: false, current_page: page, items: { count: 0, total: 0, per_page: limit } } };
  }
}

// MAL Genre IDs
export const MAL_GENRES = {
  ACTION: 1,
  ADVENTURE: 2,
  COMEDY: 4,
  DRAMA: 8,
  FANTASY: 10,
  HORROR: 14,
  MYSTERY: 7,
  ROMANCE: 22,
  SCI_FI: 24,
  SLICE_OF_LIFE: 36,
  SPORTS: 30,
  SUPERNATURAL: 37,
  THRILLER: 41,
};

export const malListingsService = {
  getTopAnime,
  getAiringAnime,
  getUpcomingAnime,
  getPopularAnime,
  getAnimeByGenre,
  getAnimeMovies,
  searchAnime,
  getTopRatedAnime,
  MAL_GENRES,
};
