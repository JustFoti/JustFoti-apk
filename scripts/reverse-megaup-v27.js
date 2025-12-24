#!/usr/bin/env node
/**
 * Reverse engineer MegaUp encryption - v27
 * 
 * New approach: Build a 2D lookup table [position][plaintext] -> keystream
 * This will tell us exactly what the cipher does.
 */

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testDecryption(encrypted, agent) {
  const response = await fetch('https://enc-dec.app/api/dec-mega', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: encrypted, agent }),
  });
  return await response.json();
}

async function main() {
  // Get multiple samples to build the lookup table
  const videoIds = [
    'jIrrLzj-WS2JcOLzF79O5xvpCQ',
    'k5OoeWapWS2JcOLzF79O5xvpCQ',
  ];
  const baseUrl = 'https://megaup22.online';
  
  const samples = [];
  
  for (const videoId of videoIds) {
    const mediaResponse = await fetch(`${baseUrl}/media/${videoId}`, {
      headers: { 'User-Agent': ua, 'Referer': `${baseUrl}/e/${videoId}` },
    });
    const mediaData = await mediaResponse.json();
    const encrypted = mediaData.result;
    
    const encBytes = Buffer.from(encrypted.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    
    const decResult = await testDecryption(encrypted, ua);
    const decrypted = typeof decResult.result === 'string' ? decResult.result : JSON.stringify(decResult.result);
    const decBytes = Buffer.from(decrypted, 'utf8');
    
    samples.push({ encBytes, decBytes, decrypted });
  }
  
  // Build lookup table: table[pos][pt] = ks
  // But we need to account for state - let's track the full history
  
  console.log('=== Building position-based lookup ===\n');
  
  // For each position, collect all (plaintext, keystream) pairs
  // along with the history of plaintext up to that point
  
  const positionData = {};
  
  for (const sample of samples) {
    for (let i = 0; i < sample.decBytes.length; i++) {
      const pt = sample.decBytes[i];
      const ks = sample.encBytes[i] ^ pt;
      const history = sample.decBytes.slice(0, i).toString('hex');
      
      if (!positionData[i]) {
        positionData[i] = [];
      }
      positionData[i].push({ pt, ks, history });
    }
  }
  
  // Analyze each position
  console.log('Positions where same plaintext gives different keystream:');
  
  for (let pos = 0; pos < 100; pos++) {
    if (!positionData[pos]) continue;
    
    const data = positionData[pos];
    
    // Group by plaintext
    const byPt = {};
    for (const d of data) {
      if (!byPt[d.pt]) byPt[d.pt] = [];
      byPt[d.pt].push(d);
    }
    
    // Check for conflicts
    for (const [pt, entries] of Object.entries(byPt)) {
      if (entries.length > 1) {
        const ksValues = [...new Set(entries.map(e => e.ks))];
        if (ksValues.length > 1) {
          console.log(`\nPos ${pos}, pt=0x${parseInt(pt).toString(16)}:`);
          for (const e of entries) {
            console.log(`  ks=0x${e.ks.toString(16)}, history_hash=${hashHistory(e.history)}`);
          }
        }
      }
    }
  }
  
  // Now let's try to find what aspect of history affects the keystream
  console.log('\n\n=== Analyzing history dependency ===');
  
  // For the first conflict position, analyze what's different in the histories
  const firstConflictPos = 118; // From earlier analysis
  
  if (positionData[firstConflictPos]) {
    const data = positionData[firstConflictPos];
    
    // Group by plaintext
    const byPt = {};
    for (const d of data) {
      if (!byPt[d.pt]) byPt[d.pt] = [];
      byPt[d.pt].push(d);
    }
    
    for (const [pt, entries] of Object.entries(byPt)) {
      if (entries.length > 1) {
        const ksValues = [...new Set(entries.map(e => e.ks))];
        if (ksValues.length > 1) {
          console.log(`\nAnalyzing pos ${firstConflictPos}, pt=0x${parseInt(pt).toString(16)}:`);
          
          // Compare histories
          const histories = entries.map(e => Buffer.from(e.history, 'hex'));
          
          // Find where histories differ
          let firstDiff = -1;
          for (let i = 0; i < Math.min(histories[0].length, histories[1].length); i++) {
            if (histories[0][i] !== histories[1][i]) {
              firstDiff = i;
              break;
            }
          }
          console.log(`Histories first differ at position: ${firstDiff}`);
          
          // Calculate various state metrics
          for (let idx = 0; idx < entries.length; idx++) {
            const h = histories[idx];
            const sum = h.reduce((a, b) => (a + b) & 0xFF, 0);
            const xor = h.reduce((a, b) => a ^ b, 0);
            const lastN = h.slice(-10);
            console.log(`  Entry ${idx}: ks=0x${entries[idx].ks.toString(16)}, sum=0x${sum.toString(16)}, xor=0x${xor.toString(16)}, last10=${lastN.toString('hex')}`);
          }
        }
      }
    }
  }
  
  // Let's try a different model: the keystream depends on a rolling window of plaintext
  console.log('\n\n=== Testing rolling window model ===');
  
  for (let windowSize = 1; windowSize <= 16; windowSize++) {
    // Model: ks[i] = f(pt[i], pt[i-1], ..., pt[i-windowSize+1])
    // We'll use a hash of the window as the state
    
    const stateMap = {};
    let conflicts = 0;
    let entries = 0;
    
    for (const sample of samples) {
      for (let i = 0; i < sample.decBytes.length; i++) {
        const pt = sample.decBytes[i];
        const ks = sample.encBytes[i] ^ pt;
        
        // Build window state
        const window = [];
        for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
          window.push(sample.decBytes[j]);
        }
        const state = window.join(',');
        
        if (!(state in stateMap)) {
          stateMap[state] = ks;
          entries++;
        } else if (stateMap[state] !== ks) {
          conflicts++;
        }
      }
    }
    
    console.log(`Window size ${windowSize}: ${conflicts} conflicts, ${entries} entries`);
    
    if (conflicts === 0) {
      console.log(`*** FOUND: Window size ${windowSize} has no conflicts! ***`);
      break;
    }
  }
}

function hashHistory(historyHex) {
  if (!historyHex) return '(empty)';
  const bytes = Buffer.from(historyHex, 'hex');
  const sum = bytes.reduce((a, b) => (a + b) & 0xFF, 0);
  return `sum=${sum.toString(16)},len=${bytes.length}`;
}

main().catch(console.error);
