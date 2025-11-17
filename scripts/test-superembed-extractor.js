/**
 * Test Superembed Extractor
 * 
 * Tests the superembed extraction flow on vidsrc-embed.ru
 */

const https = require('https');

// Test cases
const TEST_CASES = [
  {
    name: 'Fight Club (Movie)',
    tmdbId: '550',
    type: 'movie'
  },
  {
    name: 'Better Call Saul S06E02 (TV)',
    tmdbId: '60059',
    type: 'tv',
    season: 6,
    episode: 2
  }
];

/**
 * Fetch a page with proper headers
 */
function fetchPage(url, referer = 'https://vidsrc-embed.ru/') {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': referer,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Extract superembed hash from embed page
 */
function extractSuperembedHash(html) {
  // Pattern: <div class="server" data-hash="HASH">Superembed</div>
  const match = html.match(/data-hash="([^"]+)"[^>]*>[^<]*Superembed/i);
  return match ? match[1] : null;
}

/**
 * Extract prorcp URL from RCP page
 */
function extractProRcpUrl(html) {
  const match = html.match(/\/prorcp\/([A-Za-z0-9+\/=\-_]+)/);
  return match ? `https://cloudnestra.com/prorcp/${match[1]}` : null;
}

/**
 * Extract hidden div from ProRCP page
 */
function extractHiddenDiv(html) {
  const match = html.match(/<div[^>]+id="([^"]+)"[^>]+style="display:none;">([^<]+)<\/div>/);
  return match ? { divId: match[1], encoded: match[2] } : null;
}

/**
 * Test superembed extraction for a single case
 */
async function testSuperembedExtraction(testCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${testCase.name}`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    // Step 1: Build embed URL
    let embedUrl = `https://vidsrc-embed.ru/embed/${testCase.type}/${testCase.tmdbId}`;
    if (testCase.type === 'tv' && testCase.season && testCase.episode) {
      embedUrl += `/${testCase.season}/${testCase.episode}`;
    }
    
    console.log('Step 1: Fetching embed page');
    console.log('URL:', embedUrl);
    
    const embedPage = await fetchPage(embedUrl);
    console.log('✓ Embed page fetched:', embedPage.length, 'bytes');
    
    // Save to file for inspection
    const fs = require('fs');
    fs.writeFileSync('superembed-embed-page.html', embedPage);
    console.log('✓ Saved to superembed-embed-page.html');
    
    // Step 2: Extract superembed hash
    console.log('\nStep 2: Extracting superembed hash');
    const hash = extractSuperembedHash(embedPage);
    
    if (!hash) {
      console.log('✗ No superembed hash found');
      
      // Debug: Show all server hashes
      const allHashes = embedPage.match(/data-hash="([^"]+)"/g);
      if (allHashes) {
        console.log('\nAvailable server hashes:');
        allHashes.forEach(h => console.log('  -', h));
      }
      
      // Check if Superembed server exists
      if (embedPage.includes('Superembed')) {
        console.log('\n⚠ Superembed server found in HTML but hash extraction failed');
        const context = embedPage.match(/(.{100}Superembed.{100})/);
        if (context) {
          console.log('Context:', context[0]);
        }
      } else {
        console.log('\n⚠ Superembed server not available for this content');
      }
      
      return;
    }
    
    console.log('✓ Superembed hash:', hash.substring(0, 50) + '...');
    
    // Step 3: Get RCP page
    console.log('\nStep 3: Fetching RCP page');
    const rcpUrl = `https://cloudnestra.com/rcp/${hash}`;
    console.log('URL:', rcpUrl);
    
    const rcpPage = await fetchPage(rcpUrl, embedUrl);
    console.log('✓ RCP page fetched:', rcpPage.length, 'bytes');
    
    // Step 4: Extract ProRCP URL
    console.log('\nStep 4: Extracting ProRCP URL');
    const proRcpUrl = extractProRcpUrl(rcpPage);
    
    if (!proRcpUrl) {
      console.log('✗ No ProRCP URL found with /prorcp/ pattern');
      
      // Try alternative patterns
      console.log('\nSearching for alternative patterns...');
      
      // Look for any cloudnestra URLs
      const cloudnestraUrls = rcpPage.match(/https?:\/\/[^"'\s]*cloudnestra[^"'\s]*/g);
      if (cloudnestraUrls) {
        console.log('Found cloudnestra URLs:', cloudnestraUrls);
      }
      
      // Look for iframe src
      const iframeSrc = rcpPage.match(/<iframe[^>]+src=["']([^"']+)["']/);
      if (iframeSrc) {
        console.log('Found iframe src:', iframeSrc[1]);
      }
      
      // Look for any base64 encoded content
      const base64Match = rcpPage.match(/atob\(['"]([^'"]+)['"]\)/);
      if (base64Match) {
        console.log('Found atob call with:', base64Match[1].substring(0, 100) + '...');
        try {
          const decoded = Buffer.from(base64Match[1], 'base64').toString('utf-8');
          console.log('Decoded:', decoded);
        } catch (e) {
          console.log('Failed to decode');
        }
      }
      
      console.log('\nRCP page content (full):');
      console.log(rcpPage);
      return;
    }
    
    console.log('✓ ProRCP URL:', proRcpUrl);
    
    // Step 5: Get ProRCP page
    console.log('\nStep 5: Fetching ProRCP page');
    const proRcpPage = await fetchPage(proRcpUrl, embedUrl);
    console.log('✓ ProRCP page fetched:', proRcpPage.length, 'bytes');
    
    // Step 6: Extract hidden div
    console.log('\nStep 6: Extracting hidden div');
    const hiddenDiv = extractHiddenDiv(proRcpPage);
    
    if (!hiddenDiv) {
      console.log('✗ No hidden div found');
      return;
    }
    
    console.log('✓ Hidden div ID:', hiddenDiv.divId);
    console.log('✓ Encoded content:', hiddenDiv.encoded.substring(0, 100) + '...');
    console.log('✓ Encoded length:', hiddenDiv.encoded.length);
    
    console.log('\n' + '='.repeat(80));
    console.log('SUCCESS: All extraction steps completed!');
    console.log('='.repeat(80));
    console.log('\nNext step: Decode the hidden div content using the decoder');
    console.log('Div ID:', hiddenDiv.divId);
    console.log('Encoded:', hiddenDiv.encoded);
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('Superembed Extractor Test Suite');
  console.log('================================\n');
  
  for (const testCase of TEST_CASES) {
    await testSuperembedExtraction(testCase);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n\nAll tests completed!');
}

// Run tests
main().catch(console.error);
