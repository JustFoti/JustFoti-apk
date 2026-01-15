const fs = require('fs');

const html = fs.readFileSync('test-player.html', 'utf-8');

console.log('HTML length:', html.length);
console.log('Contains eval:', html.includes('eval('));

// Try different patterns
const patterns = [
  /eval\(function\(h,u,n,t,e,r\)\{[^}]+\}\("([^"]+)",(\d+),"([^"]+)",(\d+),(\d+),(\d+)\)\)/,
  /eval\(function\(h,u,n,t,e,r\)\{[\s\S]+?\}\("([^"]+)",(\d+),"([^"]+)",(\d+),(\d+),(\d+)\)\)/,
  /eval\(function\(h,u,n,t,e,r\)\{.+?\}\("([^"]+)",(\d+),"([^"]+)",(\d+),(\d+),(\d+)\)\)/s,
];

for (let i = 0; i < patterns.length; i++) {
  console.log(`\nTrying pattern ${i + 1}...`);
  const match = html.match(patterns[i]);
  if (match) {
    console.log('✓ MATCH FOUND!');
    console.log('Encoded data length:', match[1].length);
    console.log('U:', match[2]);
    console.log('Charset:', match[3]);
    console.log('Base:', match[4]);
    console.log('E:', match[5]);
    console.log('Offset:', match[6]);
    break;
  } else {
    console.log('✗ No match');
  }
}

// Try to find just the eval call
const evalIndex = html.indexOf('eval(function(h,u,n,t,e,r)');
if (evalIndex !== -1) {
  console.log('\n=== Found eval at index:', evalIndex);
  console.log('Context:', html.substring(evalIndex, evalIndex + 200));
}
