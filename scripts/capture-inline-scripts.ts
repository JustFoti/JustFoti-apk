#!/usr/bin/env bun
/**
 * Capture inline scripts from the embed page
 */

import puppeteer from 'puppeteer';

async function captureInlineScripts() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  const embedUrl = `https://embedsports.top/embed/${source}/${id}/${streamNo}`;
  console.log('Loading:', embedUrl);
  
  const response = await page.goto(embedUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  
  // Get the page HTML
  const html = await page.content();
  
  // Extract all inline scripts
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptNum = 0;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const script = match[1].trim();
    if (script.length > 50) {
      scriptNum++;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`INLINE SCRIPT ${scriptNum} (${script.length} chars)`);
      console.log('='.repeat(60));
      console.log(script);
    }
  }
  
  // Wait for the page to fully load and execute scripts
  await new Promise(r => setTimeout(r, 5000));
  
  // Get the setStream function if it exists
  const setStreamFunc = await page.evaluate(() => {
    // @ts-ignore
    if (typeof window.setStream === 'function') {
      // @ts-ignore
      return window.setStream.toString();
    }
    return null;
  });
  
  if (setStreamFunc) {
    console.log('\n=== window.setStream function ===');
    console.log(setStreamFunc);
  }
  
  // Get the final URL
  const fileUrl = await page.evaluate(() => {
    // @ts-ignore
    if (typeof jwplayer !== 'undefined') {
      // @ts-ignore
      const player = jwplayer();
      const playlist = player.getPlaylist?.();
      if (playlist && playlist[0]) {
        return playlist[0].file;
      }
    }
    return null;
  });
  
  console.log('\n=== Final m3u8 URL ===');
  console.log(fileUrl);
  
  await browser.close();
}

captureInlineScripts().catch(console.error);
