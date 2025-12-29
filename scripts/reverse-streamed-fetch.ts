#!/usr/bin/env bun
/**
 * Analyze the /fetch endpoint that provides the stream token
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testFetchEndpoint() {
  console.log('=== Testing /fetch endpoint ===');
  
  const source = 'charlie';
  const id = 'final-1629472869';
  const streamNo = '1';
  
  // The embed URL is /embed/{source}/{id}/{streamNo}
  // The fetch endpoint might need similar params
  
  const endpoints = [
    // POST to /fetch
    { url: 'https://embedsports.top/fetch', method: 'POST', body: { source, id, streamNo } },
    { url: 'https://embedsports.top/fetch', method: 'POST', body: JSON.stringify({ source, id, streamNo }) },
    
    // GET with params
    { url: `https://embedsports.top/fetch?source=${source}&id=${id}&streamNo=${streamNo}`, method: 'GET' },
    { url: `https://embedsports.top/fetch/${source}/${id}/${streamNo}`, method: 'GET' },
    
    // Other variations
    { url: 'https://embedsports.top/api/fetch', method: 'POST', body: { source, id, streamNo } },
    { url: `https://embedsports.top/stream/${source}/${id}/${streamNo}`, method: 'GET' },
  ];
  
  for (const { url, method, body } of endpoints) {
    try {
      const options: RequestInit = {
        method,
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': `https://embedsports.top/embed/${source}/${id}/${streamNo}`,
          'Origin': 'https://embedsports.top',
          'Content-Type': 'application/json',
        },
      };
      
      if (body) {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
      
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';
      
      console.log(`\n${method} ${url.substring(0, 60)}...`);
      console.log(`Status: ${res.status} [${contentType.split(';')[0]}]`);
      
      if (res.ok || res.status < 500) {
        const text = await res.text();
        console.log('Response:', text.substring(0, 300));
        
        // Check if it contains a token or URL
        if (text.includes('strmd.top') || text.includes('secure')) {
          console.log('  ^ Contains stream URL!');
        }
      }
    } catch (e: any) {
      console.log(`ERR ${method} ${url.substring(0, 60)}... - ${e.message?.substring(0, 50)}`);
    }
  }
}

async function analyzeWithPuppeteer() {
  console.log('\n\n=== Capturing /fetch request with Puppeteer ===');
  
  const puppeteer = await import('puppeteer');
  
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capture the /fetch request details
  let fetchRequest: any = null;
  let fetchResponse: any = null;
  
  await page.setRequestInterception(true);
  
  page.on('request', (request) => {
    const url = request.url();
    
    if (url.includes('/fetch')) {
      fetchRequest = {
        url: url,
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
      };
      console.log('\n=== /fetch REQUEST ===');
      console.log('URL:', url);
      console.log('Method:', request.method());
      console.log('Headers:', JSON.stringify(request.headers(), null, 2));
      console.log('PostData:', request.postData());
    }
    
    request.continue();
  });
  
  page.on('response', async (response) => {
    const url = response.url();
    
    if (url.includes('/fetch')) {
      console.log('\n=== /fetch RESPONSE ===');
      console.log('Status:', response.status());
      console.log('Headers:', JSON.stringify(response.headers(), null, 2));
      
      try {
        const text = await response.text();
        console.log('Body:', text);
        fetchResponse = text;
        
        // Try to parse as JSON
        try {
          const json = JSON.parse(text);
          console.log('Parsed JSON:', JSON.stringify(json, null, 2));
        } catch {}
      } catch {}
    }
  });
  
  const embedUrl = 'https://embedsports.top/embed/charlie/final-1629472869/1';
  
  try {
    await page.goto(embedUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await new Promise(r => setTimeout(r, 5000));
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
  
  return { fetchRequest, fetchResponse };
}

// Run
testFetchEndpoint()
  .then(() => analyzeWithPuppeteer())
  .catch(console.error);
