// Analyze 1movies page structure
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function analyze() {
  console.log('Analyzing 1movies page structure...\n');
  
  // Fetch the page
  const pageResponse = await fetch(`${BASE_URL}/movie/550`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });
  
  const html = await pageResponse.text();
  
  // Extract __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (!nextDataMatch) {
    console.log('Could not find __NEXT_DATA__');
    return;
  }
  
  const nextData = JSON.parse(nextDataMatch[1]);
  console.log('__NEXT_DATA__ structure:');
  console.log('  buildId:', nextData.buildId);
  console.log('  page:', nextData.page);
  console.log('  props.pageProps keys:', Object.keys(nextData.props?.pageProps || {}));
  
  const pageProps = nextData.props?.pageProps;
  if (pageProps) {
    console.log('\npageProps details:');
    for (const [key, value] of Object.entries(pageProps)) {
      if (typeof value === 'string') {
        console.log(`  ${key}: "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
      } else if (typeof value === 'object' && value !== null) {
        console.log(`  ${key}: [object with keys: ${Object.keys(value).join(', ')}]`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
  }
  
  // Check for any API endpoints in the HTML
  console.log('\nLooking for API endpoints in HTML...');
  const apiMatches = html.match(/https?:\/\/[^"'\s]*api[^"'\s]*/gi) || [];
  if (apiMatches.length > 0) {
    console.log('Found API URLs:');
    [...new Set(apiMatches)].forEach(url => console.log('  ', url));
  }
  
  // Check for fetch calls in inline scripts
  console.log('\nLooking for inline scripts with fetch...');
  const inlineScripts = html.match(/<script[^>]*>([^<]*fetch[^<]*)<\/script>/gi) || [];
  console.log('Found', inlineScripts.length, 'inline scripts with fetch');
  
  // Look for the buildManifest to find all chunks
  console.log('\nChecking buildManifest...');
  const buildManifestMatch = html.match(/_buildManifest\.js[^"']*/);
  if (buildManifestMatch) {
    const manifestUrl = `${BASE_URL}/_next/static/${nextData.buildId}/_buildManifest.js`;
    console.log('Manifest URL:', manifestUrl);
    
    const manifestResponse = await fetch(manifestUrl);
    const manifestJs = await manifestResponse.text();
    
    // Extract chunk names
    const chunks = manifestJs.match(/[a-f0-9]{20,}\.js/g) || [];
    console.log('Found', chunks.length, 'chunks');
    
    // Look for movie-related chunks
    const movieChunks = manifestJs.match(/movie[^"'\s]*/gi) || [];
    console.log('Movie-related chunks:', movieChunks);
  }
}

analyze().catch(console.error);
