#!/usr/bin/env node
/**
 * Use Puppeteer to load the DLHD page and see the server selector
 */

const puppeteer = require('puppeteer');

async function main() {
  const channelId = process.argv[2] || '303';
  
  console.log(`Loading DLHD channel ${channelId}...`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Log all network requests
  page.on('request', req => {
    const url = req.url();
    if (url.includes('server') || url.includes('lookup') || url.includes('stream')) {
      console.log('[REQ]', url);
    }
  });
  
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('server_lookup') || url.includes('servers')) {
      console.log('[RES]', url, res.status());
      try {
        const text = await res.text();
        console.log('[BODY]', text.substring(0, 500));
      } catch {}
    }
  });
  
  // Go to a specific channel page on DLHD
  await page.goto(`https://dlhd.dad/stream/stream-${channelId}.php`, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  // Wait for page to fully load
  await new Promise(r => setTimeout(r, 8000));
  
  // Look for ALL clickable elements and links
  const buttons = await page.evaluate(() => {
    const results = [];
    
    // Get all links
    document.querySelectorAll('a').forEach(el => {
      const href = el.href || '';
      const text = el.textContent?.trim() || '';
      if (href && (href.includes('stream') || href.includes('server') || href.includes('channel'))) {
        results.push({
          tag: 'A',
          text: text.substring(0, 100),
          href: href
        });
      }
    });
    
    // Get all buttons
    document.querySelectorAll('button').forEach(el => {
      results.push({
        tag: 'BUTTON',
        text: (el.textContent || '').trim().substring(0, 50),
        class: el.className
      });
    });
    
    // Look for iframes
    document.querySelectorAll('iframe').forEach(iframe => {
      results.push({
        tag: 'IFRAME',
        src: iframe.src || iframe.getAttribute('data-src') || ''
      });
    });
    
    // Look for any element with "server" in text
    const allText = document.body.innerText;
    if (allText.toLowerCase().includes('server')) {
      results.push({tag: 'TEXT', note: 'Page contains "server" text'});
    }
    
    return results;
  });
  
  console.log('\n=== Found elements ===');
  buttons.forEach(b => console.log(JSON.stringify(b)));
  
  // Take a screenshot
  await page.screenshot({ path: 'dlhd-screenshot.png', fullPage: true });
  console.log('\nScreenshot saved to dlhd-screenshot.png');
  
  // Get page HTML
  const html = await page.content();
  console.log('\n=== Page HTML (first 2000 chars) ===');
  console.log(html.substring(0, 2000));
  
  await browser.close();
}

main().catch(console.error);
