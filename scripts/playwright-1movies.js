// Use Playwright to intercept 1movies API request
const { chromium } = require('playwright');

async function intercept1movies() {
  console.log('=== Intercepting 1movies API with Playwright ===\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // Capture all requests
  const apiRequests = [];
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('111movies.com') && !url.includes('.js') && !url.includes('.css') && !url.includes('.png') && !url.includes('.ico')) {
      if (!url.includes('_next/static') && !url.includes('favicon')) {
        console.log('REQUEST:', request.method(), url.substring(0, 150));
        apiRequests.push({
          url,
          method: request.method(),
          headers: request.headers(),
        });
      }
    }
  });
  
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('111movies.com') && !url.includes('.js') && !url.includes('.css') && !url.includes('.png') && !url.includes('.ico')) {
      if (!url.includes('_next/static') && !url.includes('favicon') && !url.includes('/movie/550')) {
        console.log('RESPONSE:', response.status(), url.substring(0, 150));
        
        if (response.status() === 200) {
          try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('json') || url.includes('/sr') || url.includes('/ar')) {
              const body = await response.text();
              console.log('  Body:', body.substring(0, 300));
            }
          } catch (e) {
            // Ignore
          }
        }
      }
    }
  });
  
  console.log('Navigating to 1movies movie page...');
  
  try {
    await page.goto('https://111movies.com/movie/550', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('\nPage loaded. Waiting for API calls...');
    
    // Wait for any delayed API calls
    await page.waitForTimeout(5000);
    
    console.log('\n=== Captured API Requests ===');
    for (const req of apiRequests) {
      if (req.url.includes('/sr') || req.url.includes('/ar') || req.url.length > 100) {
        console.log('\nURL:', req.url);
        console.log('Method:', req.method);
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        
        // Extract the hash from the URL
        const urlPath = new URL(req.url).pathname;
        console.log('Path:', urlPath);
      }
    }
    
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
  console.log('\nBrowser closed.');
}

intercept1movies().catch(console.error);
