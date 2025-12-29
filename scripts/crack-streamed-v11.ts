#!/usr/bin/env bun
/**
 * The inline script shows: btoa(`embedme-${split[2]}-${split[3]}-${split[4]}%7C%5B8%5D`)
 * This creates a channel ID from the URL path
 * 
 * Let's fetch the full embed page and analyze all the JavaScript
 */

const EMBED_BASE = 'https://embedsports.top';

async function fetchAndAnalyze() {
  const source = 'golf';
  const id = '18634';
  const streamNo = '1';
  
  // Fetch the embed page
  const embedUrl = `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`;
  console.log('Fetching:', embedUrl);
  
  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  
  const html = await response.text();
  
  // Extract all inline scripts
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let match;
  let scriptNum = 0;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const script = match[1].trim();
    if (script.length > 50) {
      scriptNum++;
      console.log(`\n=== Script ${scriptNum} (${script.length} chars) ===`);
      console.log(script);
    }
  }
  
  // Look for the bundle.js
  const bundleMatch = html.match(/src="([^"]*bundle[^"]*\.js[^"]*)"/);
  if (bundleMatch) {
    console.log('\n\n=== Bundle JS URL ===');
    console.log(bundleMatch[1]);
    
    // Fetch the bundle
    const bundleUrl = bundleMatch[1].startsWith('http') 
      ? bundleMatch[1] 
      : `${EMBED_BASE}${bundleMatch[1]}`;
    
    console.log('Fetching bundle:', bundleUrl);
    
    const bundleResponse = await fetch(bundleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const bundleCode = await bundleResponse.text();
    console.log('Bundle size:', bundleCode.length);
    
    // Search for decoding-related patterns
    const patterns = [
      /function\s+\w+\s*\([^)]*\)\s*\{[^}]*xor[^}]*\}/gi,
      /\.what/gi,
      /headers\.get/gi,
      /fetch\s*\([^)]*\/fetch/gi,
      /strmd\.top/gi,
      /playlist\.m3u8/gi,
      /secure/gi,
      /decode/gi,
      /charCodeAt/gi,
      /fromCharCode/gi,
      /String\.fromCharCode/gi,
    ];
    
    console.log('\n--- Pattern search in bundle ---');
    for (const pattern of patterns) {
      const matches = bundleCode.match(pattern);
      if (matches) {
        console.log(`${pattern}: ${matches.length} matches`);
        if (matches.length <= 5) {
          matches.forEach(m => console.log(`  ${m.substring(0, 100)}`));
        }
      }
    }
    
    // Look for the fetch handler
    const fetchHandlerMatch = bundleCode.match(/fetch\s*\([^)]*\)[^}]*\.then[^}]*headers[^}]*what/gi);
    if (fetchHandlerMatch) {
      console.log('\n--- Fetch handler with WHAT header ---');
      fetchHandlerMatch.forEach(m => console.log(m.substring(0, 500)));
    }
    
    // Look for XOR operations
    const xorMatch = bundleCode.match(/\^[^;]{0,50}/g);
    if (xorMatch) {
      console.log('\n--- XOR operations (first 20) ---');
      const uniqueXor = [...new Set(xorMatch)].slice(0, 20);
      uniqueXor.forEach(m => console.log(`  ${m}`));
    }
    
    // Look for charCodeAt usage
    const charCodeMatch = bundleCode.match(/\.charCodeAt\s*\([^)]*\)/g);
    if (charCodeMatch) {
      console.log('\n--- charCodeAt usage (first 10) ---');
      const uniqueCharCode = [...new Set(charCodeMatch)].slice(0, 10);
      uniqueCharCode.forEach(m => console.log(`  ${m}`));
    }
    
    // Look for String.fromCharCode
    const fromCharCodeMatch = bundleCode.match(/String\.fromCharCode[^;]{0,100}/g);
    if (fromCharCodeMatch) {
      console.log('\n--- String.fromCharCode usage (first 10) ---');
      const uniqueFromCharCode = [...new Set(fromCharCodeMatch)].slice(0, 10);
      uniqueFromCharCode.forEach(m => console.log(`  ${m}`));
    }
    
    // Look for the specific decoding function
    // Search for patterns like: for(let i=0;i<...;i++){...charCodeAt...^...}
    const loopXorMatch = bundleCode.match(/for\s*\([^)]*\)\s*\{[^}]*charCodeAt[^}]*\^[^}]*\}/g);
    if (loopXorMatch) {
      console.log('\n--- Loop with XOR and charCodeAt ---');
      loopXorMatch.forEach(m => console.log(m));
    }
    
    // Search for the response handler
    const responseMatch = bundleCode.match(/response[^}]*text\(\)[^}]*\.then[^}]*/gi);
    if (responseMatch) {
      console.log('\n--- Response text handlers ---');
      responseMatch.slice(0, 5).forEach(m => console.log(m.substring(0, 200)));
    }
    
    // Look for any function that takes a string and returns a string with XOR
    const decodeFunc = bundleCode.match(/function\s*\w*\s*\(\s*\w+\s*,\s*\w+\s*\)[^{]*\{[^}]*for[^}]*charCodeAt[^}]*\^[^}]*fromCharCode[^}]*\}/g);
    if (decodeFunc) {
      console.log('\n--- Potential decode functions ---');
      decodeFunc.forEach(m => console.log(m));
    }
    
    // Search around "what" keyword
    const whatContext = bundleCode.match(/.{0,200}what.{0,200}/gi);
    if (whatContext) {
      console.log('\n--- Context around "what" (first 5) ---');
      whatContext.slice(0, 5).forEach((m, i) => {
        console.log(`\n[${i + 1}]`, m);
      });
    }
  }
}

fetchAndAnalyze().catch(console.error);
