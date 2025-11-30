/**
 * Geolocation Utility
 * Get location from IP address using Vercel/Cloudflare headers
 */

export interface LocationData {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude?: string;
  longitude?: string;
}

/**
 * Get location from request headers (Vercel/Cloudflare)
 * Vercel automatically provides geo headers on Edge/Serverless functions
 */
export function getLocationFromHeaders(request: Request): LocationData {
  // Try Vercel headers first (automatically set by Vercel Edge Network)
  const vercelCountry = request.headers.get('x-vercel-ip-country');
  const vercelRegion = request.headers.get('x-vercel-ip-country-region');
  const vercelCity = request.headers.get('x-vercel-ip-city');
  const vercelLatitude = request.headers.get('x-vercel-ip-latitude');
  const vercelLongitude = request.headers.get('x-vercel-ip-longitude');
  
  if (vercelCountry && vercelCountry !== 'XX') {
    return {
      country: getCountryName(vercelCountry),
      countryCode: vercelCountry,
      region: vercelRegion ? decodeHeader(vercelRegion) : 'Unknown',
      city: vercelCity ? decodeHeader(vercelCity) : 'Unknown',
      latitude: vercelLatitude || undefined,
      longitude: vercelLongitude || undefined,
    };
  }
  
  // Try Cloudflare headers
  const cfCountry = request.headers.get('cf-ipcountry');
  const cfCity = request.headers.get('cf-ipcity');
  const cfRegion = request.headers.get('cf-region');
  const cfLatitude = request.headers.get('cf-iplatitude');
  const cfLongitude = request.headers.get('cf-iplongitude');
  
  if (cfCountry && cfCountry !== 'XX') {
    return {
      country: getCountryName(cfCountry),
      countryCode: cfCountry,
      region: cfRegion ? decodeHeader(cfRegion) : 'Unknown',
      city: cfCity ? decodeHeader(cfCity) : 'Unknown',
      latitude: cfLatitude || undefined,
      longitude: cfLongitude || undefined,
    };
  }
  
  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return {
      country: 'Local Development',
      countryCode: 'Local',
      region: 'Development',
      city: 'Localhost',
    };
  }
  
  return {
    country: 'Unknown',
    countryCode: 'Unknown',
    region: 'Unknown',
    city: 'Unknown',
  };
}

/**
 * Format location as string
 */
export function formatLocation(location: LocationData): string {
  const parts = [];
  
  if (location.city) parts.push(location.city);
  if (location.region) parts.push(location.region);
  if (location.country) parts.push(location.country);
  
  return parts.length > 0 ? parts.join(', ') : 'Unknown';
}

/**
 * Decode URL-encoded header value
 */
function decodeHeader(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (e) {
    return value;
  }
}

/**
 * Get country flag emoji
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode === 'Unknown' || countryCode === 'Local') {
    return '🌍';
  }
  
  // Convert country code to flag emoji
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
}
