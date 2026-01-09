// Capture 1movies pageData and encoded URL for comparison
const { chromium } = require('playwright');

async function capture() {
  console.log('=== Capturing 1movies Data ===\n');
  
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
  
  console.log('=== PageData ===');
  console.log('Value:', capturedPageData);
  console.log('Length:', capturedPageData?.length);
  
  console.log('\n=== Encoded ===');
  console.log('Value:', capturedEncoded);
  console.log('Length:', capturedEncoded?.length);
  
  console.log('\n=== Analysis ===');
  console.log('Ratio (encoded/pageData):', capturedEncoded?.length / capturedPageData?.length);
  
  // Save to file for analysis
  const fs = require('fs');
  fs.writeFileSync('1movies-captured-data.json', JSON.stringify({
    pageData: capturedPageData,
    encoded: capturedEncoded
  }, null, 2));
  console.log('\nSaved to 1movies-captured-data.json');
}

capture().catch(console.error);
