const fs = require('fs');
const code = fs.readFileSync('1movies-860-chunk.js', 'utf8');

// Look for while(!![])
const whileIdx = code.indexOf('while(!![])');
if (whileIdx > 0) {
  console.log('while(!![]) found at:', whileIdx);
  console.log('Context:', code.substring(whileIdx, whileIdx + 800));
}

// Look for push(shift pattern
const pushShiftMatch = code.match(/push\s*\(\s*\w+\s*\.\s*shift\s*\(\s*\)\s*\)/);
if (pushShiftMatch) {
  console.log('push(shift()) found:', pushShiftMatch[0]);
  const idx = code.indexOf(pushShiftMatch[0]);
  console.log('Context:', code.substring(Math.max(0, idx - 300), idx + 100));
}
