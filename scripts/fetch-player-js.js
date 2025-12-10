#!/usr/bin/env node
const https = require('https');
const fs = require('fs');

// Fetch the player page
const url = 'https://epicplayplay.cfd/premiumtv/daddyhd.php?id=51';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let html = '';
  res.on('data', c => html += c);
  res.on('end', () => {
    fs.writeFileSync('dlhd-player-page.html', html);
    console.log('Saved player page HTML');
    
    // Extract all script tags
    const scripts = [];
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      if (match[1].trim()) {
        scripts.push(match[1]);
      }
    }
    
    // Extract external script URLs
    const srcRegex = /<script[^>]+src=["']([^"']+)["']/gi;
    const externalScripts = [];
    while ((match = srcRegex.exec(html)) !== null) {
      externalScripts.push(match[1]);
    }
    
    console.log(`\nFound ${scripts.length} inline scripts`);
    console.log(`Found ${externalScripts.length} external scripts:`);
    externalScripts.forEach(s => console.log('  ' + s));
    
    // Save inline scripts
    scripts.forEach((s, i) => {
      fs.writeFileSync(`dlhd-inline-script-${i}.js`, s);
      console.log(`\nInline script ${i}: ${s.length} chars`);
      console.log(s.substring(0, 200) + '...');
    });
  });
}).on('error', console.error);
