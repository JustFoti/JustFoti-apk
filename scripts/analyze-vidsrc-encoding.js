// Analyze VidSrc's new encoding format
require('dotenv').config({ path: '.env.local' });

async function analyzeVidSrc() {
  console.log('Analyzing VidSrc encoding...\n');
  
  const TMDB_ID = '550'; // Fight Club
  
  // Step 1: Fetch embed page
  const embedUrl = `https://vidsrc-embed.ru/embed/movie/${TMDB_ID}`;
  console.log('1. Fetching embed:', embedUrl);
  
  const embedRes = await fetch(embedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const embedHtml = await embedRes.text();
  console.log('   Status:', embedRes.status);
  
  // Extract RCP iframe
  const iframeMatch = embedHtml.match(/<iframe[^>]*src=["']([^"']+cloudnestra\.com\/rcp\/([^"']+))["']/i);
  if (!iframeMatch) {
    console.log('   No RCP iframe found');
    return;
  }
  
  const rcpPath = iframeMatch[2];
  console.log('   RCP path:', rcpPath.substring(0, 50) + '...');
  
  // Step 2: Fetch RCP page
  const rcpUrl = `https://cloudnestra.com/rcp/${rcpPath}`;
  console.log('\n2. Fetching RCP:', rcpUrl.substring(0, 60) + '...');
  
  const rcpRes = await fetch(rcpUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://vidsrc-embed.ru/'
    }
  });
  const rcpHtml = await rcpRes.text();
  console.log('   Status:', rcpRes.status);
  console.log('   Length:', rcpHtml.length);
  
  // Check for Turnstile
  if (rcpHtml.includes('turnstile') || rcpHtml.includes('cf-turnstile')) {
    console.log('   ⚠️ Turnstile detected!');
  }
  
  // Extract prorcp/srcrcp URL
  const patterns = [
    /src:\s*['"]\/prorcp\/([^'"]+)['"]/i,
    /src:\s*['"]\/srcrcp\/([^'"]+)['"]/i,
    /['"]\/prorcp\/([A-Za-z0-9+\/=\-_]+)['"]/i,
    /['"]\/srcrcp\/([A-Za-z0-9+\/=\-_]+)['"]/i,
  ];
  
  let prorcpPath = null;
  let endpointType = 'prorcp';
  
  for (const pattern of patterns) {
    const match = rcpHtml.match(pattern);
    if (match) {
      prorcpPath = match[1];
      endpointType = pattern.source.includes('srcrcp') ? 'srcrcp' : 'prorcp';
      console.log(`   Found ${endpointType}:`, prorcpPath.substring(0, 50) + '...');
      break;
    }
  }
  
  if (!prorcpPath) {
    console.log('   No prorcp/srcrcp found');
    console.log('   HTML preview:', rcpHtml.substring(0, 1000));
    return;
  }
  
  // Step 3: Fetch PRORCP page
  const prorcpUrl = `https://cloudnestra.com/${endpointType}/${prorcpPath}`;
  console.log(`\n3. Fetching ${endpointType.toUpperCase()}:`, prorcpUrl.substring(0, 60) + '...');
  
  const prorcpRes = await fetch(prorcpUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://cloudnestra.com/'
    }
  });
  const prorcpHtml = await prorcpRes.text();
  console.log('   Status:', prorcpRes.status);
  console.log('   Length:', prorcpHtml.length);
  
  // Step 4: Extract encoded content
  console.log('\n4. Extracting encoded content...');
  
  // Look for div with encoded content
  const divPattern = /<div[^>]+id=["']([^"']+)["'][^>]*>([^<]+)<\/div>/gi;
  let match;
  const divs = [];
  
  while ((match = divPattern.exec(prorcpHtml)) !== null) {
    const id = match[1];
    const content = match[2].trim();
    if (content.length > 50 && !content.includes(' ')) {
      divs.push({ id, content, length: content.length });
    }
  }
  
  console.log('   Found divs with encoded content:', divs.length);
  
  for (const div of divs) {
    console.log(`\n   DIV ID: ${div.id}`);
    console.log(`   Length: ${div.length}`);
    console.log(`   Preview: ${div.content.substring(0, 100)}...`);
    console.log(`   End: ...${div.content.substring(div.content.length - 50)}`);
    
    // Analyze the encoding
    analyzeEncoding(div.id, div.content);
  }
  
  // Step 5: Look for decoder script
  console.log('\n5. Looking for decoder script...');
  
  const scriptMatches = prorcpHtml.match(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi) || [];
  console.log('   External scripts:', scriptMatches.length);
  scriptMatches.forEach(s => console.log('     ', s));
  
  // Look for inline decoder
  const inlineScripts = prorcpHtml.match(/<script[^>]*>([^<]{500,})<\/script>/g) || [];
  console.log('   Inline scripts:', inlineScripts.length);
  
  for (let i = 0; i < inlineScripts.length; i++) {
    const script = inlineScripts[i];
    console.log(`\n   Script ${i + 1} preview:`);
    console.log('   ', script.substring(0, 300).replace(/<\/?script[^>]*>/g, ''));
    
    // Look for decode patterns
    if (script.includes('atob') || script.includes('btoa') || script.includes('charCodeAt')) {
      console.log('   ⚠️ Contains decode functions!');
    }
  }
}

function analyzeEncoding(divId, content) {
  console.log('\n   === Encoding Analysis ===');
  
  // Check character distribution
  const chars = {};
  for (const c of content) {
    chars[c] = (chars[c] || 0) + 1;
  }
  
  const uniqueChars = Object.keys(chars).sort();
  console.log(`   Unique chars (${uniqueChars.length}):`, uniqueChars.join(''));
  
  // Check if it's hex-like
  const hexChars = content.replace(/[^0-9a-fA-F]/g, '');
  console.log(`   Hex chars: ${hexChars.length}/${content.length} (${(hexChars.length/content.length*100).toFixed(1)}%)`);
  
  // Check for colons (separator)
  const colonCount = (content.match(/:/g) || []).length;
  console.log(`   Colons: ${colonCount}`);
  
  // Check if it starts with known patterns
  if (content.startsWith('eqqmp://')) {
    console.log('   Pattern: ROT3 encoded URL');
  } else if (content.startsWith('#0') || content.startsWith('#1')) {
    console.log('   Pattern: PlayerJS format');
  } else if (content.startsWith('==') || content.startsWith('=')) {
    console.log('   Pattern: Reversed Base64');
  }
  
  // Try different decode methods
  console.log('\n   === Decode Attempts ===');
  
  // Try 1: Reverse + subtract 1 + hex decode
  try {
    const reversed = content.split('').reverse().join('');
    let adjusted = '';
    for (let i = 0; i < reversed.length; i++) {
      adjusted += String.fromCharCode(reversed.charCodeAt(i) - 1);
    }
    const hexClean = adjusted.replace(/[^0-9a-fA-F]/g, '');
    let decoded = '';
    for (let i = 0; i < hexClean.length; i += 2) {
      const code = parseInt(hexClean.substring(i, i + 2), 16);
      if (code > 0 && code < 128) decoded += String.fromCharCode(code);
    }
    if (decoded.includes('http')) {
      console.log('   ✓ Method 1 (reverse+sub1+hex):', decoded.substring(0, 100));
    } else {
      console.log('   ✗ Method 1 (reverse+sub1+hex): No URL found');
    }
  } catch (e) {
    console.log('   ✗ Method 1 failed:', e.message);
  }
  
  // Try 2: Direct hex decode
  try {
    const hexClean = content.replace(/[^0-9a-fA-F]/g, '');
    let decoded = '';
    for (let i = 0; i < hexClean.length; i += 2) {
      const code = parseInt(hexClean.substring(i, i + 2), 16);
      if (code > 0 && code < 128) decoded += String.fromCharCode(code);
    }
    if (decoded.includes('http')) {
      console.log('   ✓ Method 2 (direct hex):', decoded.substring(0, 100));
    } else {
      console.log('   ✗ Method 2 (direct hex): No URL found');
    }
  } catch (e) {
    console.log('   ✗ Method 2 failed:', e.message);
  }
  
  // Try 3: Base64 decode
  try {
    const decoded = Buffer.from(content, 'base64').toString('utf8');
    if (decoded.includes('http')) {
      console.log('   ✓ Method 3 (base64):', decoded.substring(0, 100));
    } else {
      console.log('   ✗ Method 3 (base64): No URL found');
    }
  } catch (e) {
    console.log('   ✗ Method 3 failed:', e.message);
  }
  
  // Try 4: URL-safe base64
  try {
    let b64 = content.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    if (decoded.includes('http')) {
      console.log('   ✓ Method 4 (url-safe base64):', decoded.substring(0, 100));
    } else {
      console.log('   ✗ Method 4 (url-safe base64): No URL found');
    }
  } catch (e) {
    console.log('   ✗ Method 4 failed:', e.message);
  }
  
  // Try 5: Reverse then base64
  try {
    const reversed = content.split('').reverse().join('');
    let b64 = reversed.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    if (decoded.includes('http')) {
      console.log('   ✓ Method 5 (reverse+base64):', decoded.substring(0, 100));
    } else {
      console.log('   ✗ Method 5 (reverse+base64): No URL found');
    }
  } catch (e) {
    console.log('   ✗ Method 5 failed:', e.message);
  }
  
  // Try 6: XOR with common keys
  const xorKeys = [1, 2, 3, 5, 7, 13, 42, 69, 127, 255];
  for (const key of xorKeys) {
    try {
      let decoded = '';
      for (let i = 0; i < content.length; i++) {
        decoded += String.fromCharCode(content.charCodeAt(i) ^ key);
      }
      if (decoded.includes('http')) {
        console.log(`   ✓ Method 6 (XOR ${key}):`, decoded.substring(0, 100));
        break;
      }
    } catch (e) {}
  }
  
  // Try 7: Caesar cipher with different shifts
  for (let shift = 1; shift <= 25; shift++) {
    let decoded = '';
    for (let i = 0; i < content.length; i++) {
      const c = content.charCodeAt(i);
      if (c >= 97 && c <= 122) {
        decoded += String.fromCharCode(((c - 97 + shift) % 26) + 97);
      } else if (c >= 65 && c <= 90) {
        decoded += String.fromCharCode(((c - 65 + shift) % 26) + 65);
      } else {
        decoded += content[i];
      }
    }
    if (decoded.includes('https://')) {
      console.log(`   ✓ Method 7 (Caesar +${shift}):`, decoded.substring(0, 100));
      break;
    }
  }
}

analyzeVidSrc().catch(console.error);
