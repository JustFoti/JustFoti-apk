#!/usr/bin/env bun
/**
 * Fetch the embed page and extract all JavaScript to find the decoding function
 */

const EMBED_BASE = 'https://embedsports.top';

async function fetchEmbedPage() {
  const source = 'alpha';
  const id = 'nba-tv-1';
  const streamNo = '1';
  
  const embedUrl = `${EMBED_BASE}/embed/${source}/${id}/${streamNo}`;
  console.log('Fetching:', embedUrl);
  
  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html',
    },
  });
  
  const html = await response.text();
  console.log('HTML length:', html.length);
  
  // Extract all script tags
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptNum = 0;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const script = match[1].trim();
    if (script.length > 100) {
      scriptNum++;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`INLINE SCRIPT ${scriptNum} (${script.length} chars)`);
      console.log('='.repeat(60));
      console.log(script.substring(0, 2000));
      if (script.length > 2000) {
        console.log('... [truncated]');
      }
    }
  }
  
  // Extract external script URLs
  const srcRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const scriptUrls: string[] = [];
  
  while ((match = srcRegex.exec(html)) !== null) {
    scriptUrls.push(match[1]);
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('EXTERNAL SCRIPTS');
  console.log('='.repeat(60));
  
  for (const url of scriptUrls) {
    console.log(`  - ${url}`);
  }
  
  // Fetch and analyze the main bundle
  for (const url of scriptUrls) {
    if (url.includes('bundle') || url.includes('main') || url.includes('app')) {
      const fullUrl = url.startsWith('http') ? url : `${EMBED_BASE}${url}`;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`FETCHING: ${fullUrl}`);
      console.log('='.repeat(60));
      
      try {
        const scriptResponse = await fetch(fullUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        const code = await scriptResponse.text();
        console.log('Code length:', code.length);
        
        // Search for decoding-related patterns
        const patterns = [
          { name: 'fetch call', regex: /fetch\s*\([^)]*\/fetch[^)]*\)/g },
          { name: 'what header', regex: /\.what|headers\.get\s*\(\s*["']what["']\)/gi },
          { name: 'charCodeAt XOR', regex: /charCodeAt[^;]*\^/g },
          { name: 'fromCharCode', regex: /String\.fromCharCode[^;]{0,100}/g },
          { name: 'decode function', regex: /function\s+\w*decode\w*\s*\(/gi },
          { name: 'XOR loop', regex: /for[^{]*\{[^}]*\^[^}]*\}/g },
          { name: 'strmd.top', regex: /strmd\.top/g },
          { name: 'secure path', regex: /\/secure\//g },
          { name: 'playlist.m3u8', regex: /playlist\.m3u8/g },
        ];
        
        console.log('\nPattern search:');
        for (const { name, regex } of patterns) {
          const matches = code.match(regex);
          if (matches) {
            console.log(`  ${name}: ${matches.length} matches`);
            if (matches.length <= 3) {
              matches.forEach(m => console.log(`    ${m.substring(0, 100)}`));
            }
          }
        }
        
        // Look for the response handler
        const responseHandlerMatch = code.match(/\.then\s*\(\s*(?:function\s*\(\s*\w+\s*\)|(\w+)\s*=>)[^}]*headers[^}]*what/gi);
        if (responseHandlerMatch) {
          console.log('\nResponse handler with WHAT:');
          responseHandlerMatch.forEach(m => console.log(m.substring(0, 300)));
        }
        
        // Look for XOR operations near "what"
        const whatContext = code.match(/.{0,300}what.{0,300}/gi);
        if (whatContext) {
          console.log('\nContext around "what" (first 3):');
          whatContext.slice(0, 3).forEach((m, i) => {
            console.log(`\n[${i + 1}]`, m);
          });
        }
        
        // Look for the actual decoding logic
        // The pattern is likely: for (let i = 0; i < data.length; i++) { result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length)); }
        const decodingPattern = code.match(/for\s*\([^)]*\)\s*\{[^}]*charCodeAt[^}]*\^[^}]*fromCharCode[^}]*\}/g);
        if (decodingPattern) {
          console.log('\nDecoding pattern found:');
          decodingPattern.forEach(m => console.log(m));
        }
        
        // Save the bundle for manual analysis
        const filename = `embed-bundle-${Date.now()}.js`;
        await Bun.write(filename, code);
        console.log(`\nSaved bundle to ${filename}`);
        
      } catch (error: any) {
        console.log('Error fetching script:', error.message);
      }
    }
  }
}

fetchEmbedPage().catch(console.error);
