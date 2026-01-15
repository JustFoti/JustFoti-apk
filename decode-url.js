const url = 'eqqmp7,,`ak*ifsb*qs+or,^mf,s.,`e^kkbip,rp*bpmk,fkabu+j0r5<qlhbk:5a.__-/0b.25`4.1c--_6c`.^a3/b_```0.a_/13_0b6_a11a2.-_0/2^_-^6./`+.4352.-415+0/1^1..4__466.03a2-/_-0c6/----00+2c/32b`6``_354^.166/`-a-a.30./4-+365/0`^20c-4b0`_b10//3/`a3bcc`/5+362`--62^^3b/3_6';

let decoded = '';
for (let c of url) {
  const code = c.charCodeAt(0);
  
  // Special character mappings (these don't shift)
  if (c === '7') decoded += ':';
  else if (c === ',') decoded += '/';
  else if (c === '*') decoded += '-';
  else if (c === '+') decoded += '.';
  else if (c === '<') decoded += '?';
  else if (c === '>') decoded += '&';
  // All other printable ASCII: shift +3
  else if (code >= 33 && code <= 126) decoded += String.fromCharCode(code + 3);
  else decoded += c;
}

console.log('Obfuscated:', url.substring(0, 80) + '...');
console.log('Decoded:   ', decoded);

// Check for honeypot
if (decoded.toLowerCase().includes('flyx.m3u8')) {
  console.log('\n⚠️  HONEYPOT DETECTED - This URL would be BLOCKED by our protection!');
} else {
  console.log('\n✓ Valid URL - Safe to use');
}
