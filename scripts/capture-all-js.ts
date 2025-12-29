#!/usr/bin/env bun
/**
 * Capture ALL JavaScript code including dynamically created blobs
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function captureAllJS() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  // Enable CDP for script debugging
  const client = await page.createCDPSession();
  await client.send('Debugger.enable');
  await client.send('Runtime.enable');
  
  const scripts: Map<string, string> = new Map();
  
  // Capture all scripts via CDP
  client.on('Debugger.scriptParsed', async (params) => {
    const { scriptId, url, sourceMapURL } = params;
    
    // Get the script source
    try {
      const { scriptSource } = await client.send('Debugger.getScriptSource', { scriptId });
      
      if (scriptSource && scriptSource.length > 100) {
        const key = url || `script-${scriptId}`;
        scripts.set(key, scriptSource);
        
        // Check if this script contains the decoding logic
        if (scriptSource.includes('what') || 
            scriptSource.includes('fetch') && scriptSource.includes('charCodeAt') ||
            scriptSource.includes('strmd.top')) {
          console.log(`\n*** INTERESTING SCRIPT: ${key} (${scriptSource.length} chars)`);
          
          // Save this script
          const filename = `captured-script-${scriptId}.js`;
          fs.writeFileSync(filename, scriptSource);
          console.log(`Saved to ${filename}`);
          
          // Search for relevant patterns
          const patterns = [
            { name: 'what header', regex: /what/gi },
            { name: 'charCodeAt', regex: /charCodeAt/g },
            { name: 'fromCharCode', regex: /fromCharCode/g },
            { name: 'XOR', regex: /\^/g },
            { name: 'strmd.top', regex: /strmd\.top/g },
            { name: 'fetch', regex: /\/fetch/g },
          ];
          
          for (const { name, regex } of patterns) {
            const matches = scriptSource.match(regex);
            if (matches) {
              console.log(`  ${name}: ${matches.length} matches`);
            }
          }
        }
      }
    } catch (e) {
      // Ignore errors for built-in scripts
    }
  });
  
  const embedUrl = `https://embedsports.top/embed/${source}/${id}/${streamNo}`;
  console.log('Loading:', embedUrl);
  
  await page.goto(embedUrl, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  
  // Wait for stream to initialize
  await new Promise(r => setTimeout(r, 8000));
  
  console.log(`\n=== Captured ${scripts.size} scripts ===`);
  
  // List all scripts
  for (const [url, source] of scripts) {
    if (source.length > 500) {
      console.log(`  ${url.substring(0, 80)}: ${source.length} chars`);
    }
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

captureAllJS().catch(console.error);
