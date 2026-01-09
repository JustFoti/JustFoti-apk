// Trace the actual decode flow in VidSrc
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function traceVidSrc() {
  console.log('Tracing VidSrc decode flow...\n');
  
  const TMDB_ID = '550';
  
  // Step 1: Get the PRORCP page with the encoded content
  const embedUrl = `https://vidsrc-embed.ru/embed/movie/${TMDB_ID}`;
  const embedRes = await fetch(embedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const embedHtml = await embedRes.text();
  
  const iframeMatch = embedHtml.match(/<iframe[^>]*src=["']([^"']+cloudnestra\.com\/rcp\/([^"']+))["']/i);
  const rcpPath = iframeMatch[2];
  
  const rcpUrl = `https://cloudnestra.com/rcp/${rcpPath}`;
  const rcpRes = await fetch(rcpUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://vidsrc-embed.ru/'
    }
  });
  const rcpHtml = await rcpRes.text();
  
  // Extract prorcp path
  const prorcpMatch = rcpHtml.match(/['"]\/prorcp\/([^'"]+)['"]/i) || rcpHtml.match(/['"]\/srcrcp\/([^'"]+)['"]/i);
  const prorcpPath = prorcpMatch[1];
  const endpointType = rcpHtml.includes('/srcrcp/') ? 'srcrcp' : 'prorcp';
  
  const prorcpUrl = `https://cloudnestra.com/${endpointType}/${prorcpPath}`;
  const prorcpRes = await fetch(prorcpUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://cloudnestra.com/'
    }
  });
  const prorcpHtml = await prorcpRes.text();
  
  console.log('PRORCP page length:', prorcpHtml.length);
  
  // Save the full page for analysis
  fs.writeFileSync('vidsrc-prorcp-page.html', prorcpHtml);
  console.log('Saved to vidsrc-prorcp-page.html\n');
  
  // Extract the div with encoded content
  const divMatch = prorcpHtml.match(/<div[^>]+id=["']([^"']+)["'][^>]*>([^<]+)<\/div>/i);
  if (divMatch) {
    const divId = divMatch[1];
    const content = divMatch[2].trim();
    console.log('Div ID:', divId);
    console.log('Content length:', content.length);
    console.log('Content preview:', content.substring(0, 100));
  }
  
  // Look for inline scripts that might decode the content
  console.log('\n=== Analyzing inline scripts ===');
  
  const scriptMatches = prorcpHtml.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  console.log('Total scripts:', scriptMatches.length);
  
  for (let i = 0; i < scriptMatches.length; i++) {
    const script = scriptMatches[i];
    const content = script.replace(/<\/?script[^>]*>/gi, '').trim();
    
    if (content.length > 100 && content.length < 50000) {
      console.log(`\nScript ${i + 1} (${content.length} chars):`);
      
      // Check for decode patterns
      if (content.includes('getElementById')) {
        console.log('  - Contains getElementById');
      }
      if (content.includes('innerHTML')) {
        console.log('  - Contains innerHTML');
      }
      if (content.includes('charCodeAt')) {
        console.log('  - Contains charCodeAt');
      }
      if (content.includes('fromCharCode')) {
        console.log('  - Contains fromCharCode');
      }
      if (content.includes('parseInt')) {
        console.log('  - Contains parseInt');
      }
      if (content.includes('file')) {
        console.log('  - Contains "file"');
      }
      if (content.includes('source')) {
        console.log('  - Contains "source"');
      }
      
      // If it looks like a decoder, save it
      if (content.includes('getElementById') && (content.includes('charCodeAt') || content.includes('parseInt'))) {
        fs.writeFileSync(`vidsrc-decoder-script-${i}.js`, content);
        console.log(`  ✓ Saved to vidsrc-decoder-script-${i}.js`);
      }
      
      // Show preview
      console.log('  Preview:', content.substring(0, 200).replace(/\s+/g, ' '));
    }
  }
  
  // Look for the specific decoder script
  console.log('\n=== Looking for decoder in external scripts ===');
  
  const externalScripts = prorcpHtml.match(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
  console.log('External scripts:', externalScripts.length);
  
  for (const scriptTag of externalScripts) {
    const srcMatch = scriptTag.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      const src = srcMatch[1];
      console.log('  -', src);
      
      // Fetch scripts that might contain the decoder
      if (src.includes('pjs') || src.includes('decode') || src.includes('f59d6')) {
        console.log('    Fetching...');
        try {
          const scriptUrl = src.startsWith('http') ? src : `https://cloudnestra.com${src}`;
          const scriptRes = await fetch(scriptUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://cloudnestra.com/'
            }
          });
          const scriptContent = await scriptRes.text();
          console.log('    Size:', scriptContent.length);
          
          // Check for decode patterns
          if (scriptContent.includes('getElementById') && scriptContent.includes('innerHTML')) {
            console.log('    ✓ Contains decode patterns!');
            fs.writeFileSync(`vidsrc-external-${src.split('/').pop()}`, scriptContent);
            console.log(`    Saved to vidsrc-external-${src.split('/').pop()}`);
            
            // Look for the actual decode function
            const decodeMatch = scriptContent.match(/function\s+\w+\s*\([^)]*\)\s*\{[^}]*getElementById[^}]*innerHTML[^}]*\}/g);
            if (decodeMatch) {
              console.log('    Decode function:', decodeMatch[0].substring(0, 200));
            }
          }
        } catch (e) {
          console.log('    Error:', e.message);
        }
      }
    }
  }
  
  // Look for the PlayerJS initialization
  console.log('\n=== Looking for PlayerJS init ===');
  
  const playerjsInit = prorcpHtml.match(/new\s+Playerjs\s*\(\s*\{[\s\S]*?\}\s*\)/);
  if (playerjsInit) {
    console.log('PlayerJS init found:');
    console.log(playerjsInit[0].substring(0, 500));
    
    // Extract the file parameter
    const fileMatch = playerjsInit[0].match(/file\s*:\s*["']([^"']+)["']/);
    if (fileMatch) {
      console.log('\nFile parameter:', fileMatch[1].substring(0, 100));
    }
  }
}

traceVidSrc().catch(console.error);
