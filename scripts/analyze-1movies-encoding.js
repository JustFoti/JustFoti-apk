// Analyze the actual 1movies encoding by looking at the browser output
const { chromium } = require('playwright');

async function analyze() {
  console.log('=== Analyzing 1movies Encoding ===\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  let capturedPageData = null;
  let capturedEncoded = null;
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/ar/') && url.includes('/sr')) {
      const match = url.match(/\/ar\/([^/]+)\/sr/);
      if (match) {
        capturedEncoded = match[1];
      }
    }
  });
  
  await page.goto('https://111movies.com/movie/550', { waitUntil: 'networkidle', timeout: 60000 });
  
  capturedPageData = await page.evaluate(() => {
    const script = document.getElementById('__NEXT_DATA__');
    if (script) {
      const data = JSON.parse(script.textContent);
      return data.props?.pageProps?.data;
    }
    return null;
  });
  
  await page.waitForTimeout(5000);
  await browser.close();
  
  console.log('PageData:', capturedPageData);
  console.log('PageData length:', capturedPageData?.length);
  console.log('\nEncoded:', capturedEncoded);
  console.log('Encoded length:', capturedEncoded?.length);
  
  // Analyze character frequency in encoded
  console.log('\n=== Character Analysis ===');
  
  const charFreq = {};
  for (const c of capturedEncoded || '') {
    charFreq[c] = (charFreq[c] || 0) + 1;
  }
  
  const sortedChars = Object.entries(charFreq).sort((a, b) => b[1] - a[1]);
  console.log('Top 20 chars in encoded:', sortedChars.slice(0, 20));
  
  // Check unique chars
  const uniqueChars = new Set(capturedEncoded || '');
  console.log('Unique chars:', [...uniqueChars].sort().join(''));
  console.log('Unique char count:', uniqueChars.size);
  
  // Check if it looks like base64
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const nonBase64 = [...uniqueChars].filter(c => !base64Chars.includes(c));
  console.log('Non-base64url chars:', nonBase64);
  
  // Analyze pageData
  console.log('\n=== PageData Analysis ===');
  const pageDataChars = new Set(capturedPageData || '');
  console.log('PageData unique chars:', [...pageDataChars].sort().join(''));
  
  // The pageData looks like it's already encoded!
  // Let's check if it's base64url
  const pageDataNonBase64 = [...pageDataChars].filter(c => !base64Chars.includes(c));
  console.log('PageData non-base64url chars:', pageDataNonBase64);
  
  // Try to decode pageData as base64
  if (pageDataNonBase64.length === 0) {
    console.log('\nPageData appears to be base64url encoded!');
    try {
      const decoded = Buffer.from(capturedPageData.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      console.log('Decoded pageData (first 100 bytes):', decoded.slice(0, 100));
      console.log('Decoded as string:', decoded.toString('utf8').substring(0, 100));
    } catch (e) {
      console.log('Failed to decode:', e.message);
    }
  }
  
  // Check the ratio
  console.log('\n=== Ratio Analysis ===');
  console.log('Encoded/PageData ratio:', (capturedEncoded?.length || 0) / (capturedPageData?.length || 1));
  
  // The encoded is about 5x the pageData length
  // This suggests multiple layers of encoding
}

analyze().catch(console.error);
