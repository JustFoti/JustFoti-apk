#!/usr/bin/env bun
/**
 * Capture blob URL scripts which likely contain the decoding logic
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function captureBlobScripts() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  // Enable CDP
  const client = await page.createCDPSession();
  await client.send('Debugger.enable');
  
  const blobScripts: string[] = [];
  
  // Capture blob scripts
  client.on('Debugger.scriptParsed', async (params) => {
    const { scriptId, url } = params;
    
    if (url.startsWith('blob:')) {
      try {
        const { scriptSource } = await client.send('Debugger.getScriptSource', { scriptId });
        
        if (scriptSource && scriptSource.length > 100) {
          console.log(`\n*** BLOB SCRIPT: ${url} (${scriptSource.length} chars)`);
          blobScripts.push(scriptSource);
          
          // Save the script
          const filename = `blob-script-${scriptId}.js`;
          fs.writeFileSync(filename, scriptSource);
          console.log(`Saved to ${filename}`);
          
          // Check for relevant patterns
          if (scriptSource.includes('what') || 
              scriptSource.includes('fetch') ||
              scriptSource.includes('charCodeAt') ||
              scriptSource.includes('strmd')) {
            console.log('*** CONTAINS RELEVANT PATTERNS ***');
            
            // Print the script if it's small enough
            if (scriptSource.length < 5000) {
              console.log('\n--- Script content ---');
              console.log(scriptSource);
              console.log('--- End script ---\n');
            } else {
              // Search for specific patterns
              const patterns = [
                /function\s+\w*\s*\([^)]*\)\s*\{[^}]*charCodeAt[^}]*\^[^}]*\}/g,
                /\.what/gi,
                /headers\.get\s*\(\s*["']what["']\)/gi,
                /for\s*\([^)]*\)\s*\{[^}]*\^[^}]*\}/g,
              ];
              
              for (const pattern of patterns) {
                const matches = scriptSource.match(pattern);
                if (matches) {
                  console.log(`\nPattern ${pattern}:`);
                  matches.slice(0, 3).forEach(m => console.log(`  ${m.substring(0, 200)}`));
                }
              }
            }
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
  });
  
  const embedUrl = `https://embedsports.top/embed/${source}/${id}/${streamNo}`;
  console.log('Loading:', embedUrl);
  
  try {
    await page.goto(embedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    
    // Wait for scripts to load
    await new Promise(r => setTimeout(r, 8000));
    
    console.log(`\n=== Captured ${blobScripts.length} blob scripts ===`);
    
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
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
}

captureBlobScripts().catch(console.error);
