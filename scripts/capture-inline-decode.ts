#!/usr/bin/env bun
/**
 * Capture the inline script that contains the decode logic
 */

import puppeteer from 'puppeteer';

async function captureInlineDecode() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  // Capture all scripts
  const scripts: string[] = [];
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.endsWith('.js') || response.headers()['content-type']?.includes('javascript')) {
      try {
        const text = await response.text();
        if (text.includes('setStream') || text.includes('strmd.top') || text.includes('playlist.m3u8')) {
          scripts.push(`// URL: ${url}\n${text.substring(0, 5000)}`);
        }
      } catch (e) {}
    }
  });
  
  const embedUrl = `https://embedsports.top/embed/${source}/${id}/${streamNo}`;
  console.log('Loading:', embedUrl);
  
  await page.goto(embedUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  
  // Get the page HTML and extract inline scripts
  const html = await page.content();
  
  // Extract inline scripts
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptNum = 0;
  
  console.log('\n=== Inline Scripts ===\n');
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const script = match[1].trim();
    if (script.length > 100) {
      scriptNum++;
      
      // Check if this script contains decode-related code
      if (script.includes('setStream') || 
          script.includes('strmd') || 
          script.includes('playlist') ||
          script.includes('XOR') ||
          script.includes('decode') ||
          script.includes('charCodeAt')) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`INLINE SCRIPT ${scriptNum} (${script.length} chars) - RELEVANT`);
        console.log('='.repeat(60));
        console.log(script.substring(0, 3000));
        if (script.length > 3000) {
          console.log('\n... (truncated)');
        }
      }
    }
  }
  
  // Get the setStream function
  const setStreamFunc = await page.evaluate(() => {
    // @ts-ignore
    if (typeof window.setStream === 'function') {
      // @ts-ignore
      return window.setStream.toString();
    }
    return null;
  });
  
  if (setStreamFunc) {
    console.log('\n' + '='.repeat(60));
    console.log('window.setStream FUNCTION');
    console.log('='.repeat(60));
    console.log(setStreamFunc);
  }
  
  // Get the final URL
  const fileUrl = await page.evaluate(() => {
    // @ts-ignore
    if (typeof jwplayer !== 'undefined') {
      // @ts-ignore
      const player = jwplayer();
      const playlist = player.getPlaylist?.();
      if (playlist?.[0]) {
        return playlist[0].file;
      }
    }
    return null;
  });
  
  console.log('\n=== Final m3u8 URL ===');
  console.log(fileUrl);
  
  // Print captured external scripts
  if (scripts.length > 0) {
    console.log('\n=== External Scripts with Relevant Code ===');
    for (const script of scripts) {
      console.log(script.substring(0, 2000));
      console.log('\n---\n');
    }
  }
  
  await browser.close();
}

captureInlineDecode().catch(console.error);
