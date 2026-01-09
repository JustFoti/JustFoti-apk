// Use Puppeteer to intercept 1movies API request
require('dotenv').config({ path: '.env.local' });
const puppeteer = require('puppeteer');

async function intercept1movies() {
  console.log('Intercepting 1movies API with Puppeteer...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set up request interception
  await page.setRequestInterception(true);
  
  const apiRequests = [];
  
  page.on('request', request => {
    const url = request.url();
    
    // Log API-like requests
    if (url.includes('111movies.com') && !url.includes('.js') && !url.includes('.css') && !url.includes('.png') && !url.includes('.jpg')) {
      if (!url.includes('_next/static') && !url.includes('favicon')) {
        console.log('Request:', url.substring(0, 150));
        apiRequests.push({
          url,
          method: request.method(),
          headers: request.headers(),
        });
      }
    }
    
    request.continue();
  });
  
  page.on('response', async response => {
    const url = response.url();
    
    // Log API responses
    if (url.includes('111movies.com') && !url.includes('.js') && !url.includes('.css') && !url.includes('.png') && !url.includes('.jpg')) {
      if (!url.includes('_next/static') && !url.includes('favicon') && !url.includes('/movie/550')) {
        console.log('Response:', response.status(), url.substring(0, 150));
        
        if (response.status() === 200) {
          try {
            const text = await response.text();
            if (text.length < 5000) {
              console.log('  Body:', text.substring(0, 500));
            } else {
              console.log('  Body length:', text.length);
            }
          } catch (e) {
            // Ignore
          }
        }
      }
    }
  });
  
  console.log('Navigating to 1movies...');
  
  try {
    await page.goto('https://111movies.com/movie/550', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log('\nPage loaded. Waiting for API calls...');
    
    // Wait a bit for any delayed API calls
    await new Promise(r => setTimeout(r, 5000));
    
    // Try to trigger the video player
    console.log('\nTrying to click play button...');
    
    try {
      // Look for play button or video element
      await page.waitForSelector('button, .play-button, [class*="play"], video', { timeout: 5000 });
      
      // Click any play-like button
      const playButton = await page.$('button, .play-button, [class*="play"]');
      if (playButton) {
        await playButton.click();
        console.log('Clicked play button');
        
        // Wait for API call
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch (e) {
      console.log('No play button found or click failed');
    }
    
    console.log('\n=== Captured API Requests ===');
    for (const req of apiRequests) {
      console.log('\nURL:', req.url);
      console.log('Method:', req.method);
      
      // Extract the hash from the URL
      const urlParts = req.url.split('/');
      if (urlParts.length > 4) {
        console.log('Potential hash:', urlParts[3]);
      }
    }
    
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
  console.log('\nBrowser closed.');
}

intercept1movies().catch(console.error);
