// Find the actual encoding logic in 1movies
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://111movies.com';

async function findEncoding() {
  console.log('Finding 1movies encoding logic...\n');
  
  // Fetch the page
  const pageRes = await fetch(`${BASE_URL}/movie/550`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await pageRes.text();
  
  // Get all JS files
  const jsFiles = [];
  const matches = html.match(/_next\/static\/[^"]+\.js/g) || [];
  matches.forEach(m => jsFiles.push(`${BASE_URL}/${m}`));
  
  console.log('Found', jsFiles.length, 'JS files\n');
  
  // Search each file for encoding patterns
  for (const url of jsFiles) {
    try {
      const res = await fetch(url);
      const js = await res.text();
      const filename = url.split('/').pop();
      
      // Look for the specific patterns from our current implementation:
      // 1. AES key (Uint8Array with specific values)
      // 2. XOR key
      // 3. Shuffled alphabet
      // 4. The /sr endpoint
      
      let found = false;
      const findings = [];
      
      // Check for Uint8Array with numbers (encryption keys)
      const uint8Pattern = /new\s+Uint8Array\s*\(\s*\[[\d,\s]+\]\s*\)/g;
      const uint8Matches = js.match(uint8Pattern) || [];
      if (uint8Matches.length > 0) {
        findings.push(`Uint8Array: ${uint8Matches.length} found`);
        uint8Matches.forEach(m => {
          // Extract the numbers
          const nums = m.match(/\d+/g);
          if (nums && nums.length >= 16) {
            findings.push(`  Key candidate (${nums.length} bytes): [${nums.slice(0, 8).join(',')}...]`);
          }
        });
        found = true;
      }
      
      // Check for shuffled alphabet (64 char string with mixed case + numbers)
      const alphabetPattern = /["'`]([A-Za-z0-9_-]{60,70})["'`]/g;
      let alphabetMatch;
      while ((alphabetMatch = alphabetPattern.exec(js)) !== null) {
        const str = alphabetMatch[1];
        // Check if it looks like a shuffled base64 alphabet
        const hasLower = /[a-z]/.test(str);
        const hasUpper = /[A-Z]/.test(str);
        const hasDigit = /[0-9]/.test(str);
        if (hasLower && hasUpper && hasDigit) {
          findings.push(`Shuffled alphabet: "${str}"`);
          found = true;
        }
      }
      
      // Check for the API hash pattern (64 hex chars)
      const hashPattern = /["'`]([a-f0-9]{64})["'`]/g;
      let hashMatch;
      while ((hashMatch = hashPattern.exec(js)) !== null) {
        findings.push(`API hash candidate: ${hashMatch[1]}`);
        found = true;
      }
      
      // Check for crypto.subtle usage
      if (js.includes('crypto.subtle') || js.includes('subtle.encrypt')) {
        findings.push('Uses Web Crypto API');
        
        // Look for the algorithm
        if (js.includes('AES-CBC')) findings.push('  Algorithm: AES-CBC');
        if (js.includes('AES-GCM')) findings.push('  Algorithm: AES-GCM');
        found = true;
      }
      
      // Check for the encoding function pattern
      // Our current code does: AES encrypt → hex → XOR → UTF-8 → Base64 → char substitution
      if (js.includes('charCodeAt') && js.includes('fromCharCode')) {
        // Look for XOR pattern near charCodeAt
        const charCodeIndex = js.indexOf('charCodeAt');
        const context = js.substring(Math.max(0, charCodeIndex - 200), charCodeIndex + 200);
        if (context.includes('^')) {
          findings.push('XOR with charCodeAt (encoding pattern)');
          found = true;
        }
      }
      
      // Check for the /sr endpoint
      if (js.includes('/sr"') || js.includes("/sr'") || js.includes('/sr`')) {
        findings.push('Contains /sr endpoint');
        
        // Get context
        const srIndex = js.indexOf('/sr');
        const context = js.substring(Math.max(0, srIndex - 100), srIndex + 50);
        findings.push(`  Context: ${context.replace(/\s+/g, ' ').substring(0, 80)}`);
        found = true;
      }
      
      // Check for fetch with dynamic URL building
      const fetchPattern = /fetch\s*\(\s*["'`][^"'`]*\$\{[^}]+\}[^"'`]*["'`]/g;
      const fetchMatches = js.match(fetchPattern) || [];
      if (fetchMatches.length > 0) {
        findings.push('Dynamic fetch URLs:');
        fetchMatches.forEach(m => findings.push(`  ${m.substring(0, 80)}`));
        found = true;
      }
      
      if (found) {
        console.log(`\n[${filename}]`);
        findings.forEach(f => console.log('  ', f));
      }
      
    } catch (e) {
      // Skip
    }
  }
  
  // Also check the main page for inline scripts
  console.log('\n\n=== Checking inline scripts ===\n');
  
  const inlineScripts = html.match(/<script[^>]*>([^<]{500,})<\/script>/g) || [];
  console.log('Found', inlineScripts.length, 'substantial inline scripts');
  
  for (let i = 0; i < inlineScripts.length; i++) {
    const script = inlineScripts[i];
    
    // Check for encoding patterns
    if (script.includes('Uint8Array') || script.includes('charCodeAt') || script.includes('crypto')) {
      console.log(`\nInline script ${i + 1} has encoding patterns:`);
      console.log(script.substring(0, 500).replace(/\s+/g, ' '));
    }
  }
}

findEncoding().catch(console.error);
