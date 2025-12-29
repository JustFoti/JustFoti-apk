#!/usr/bin/env bun
/**
 * Find the context around the XOR decoding loop
 */

import * as fs from 'fs';

const code = fs.readFileSync('captured-script-11.js', 'utf-8');

// Find the XOR loop
const xorLoopPattern = /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*e\.length\s*;\s*i\s*\+\+\s*\)\s*\{\s*const\s+n\s*=\s*e\.charCodeAt\s*\(\s*i\s*\)\s*\^\s*t\.charCodeAt\s*\(\s*i\s*%\s*r\s*\)\s*;\s*s\s*\+\=\s*String\.fromCharCode\s*\(\s*n\s*\)\s*\}/;

const match = code.match(xorLoopPattern);
if (match) {
  const idx = code.indexOf(match[0]);
  console.log('Found XOR loop at index:', idx);
  
  // Get surrounding context (500 chars before and after)
  const start = Math.max(0, idx - 1000);
  const end = Math.min(code.length, idx + match[0].length + 1000);
  
  console.log('\n=== Context around XOR loop ===');
  console.log(code.substring(start, end));
}

// Also search for the function that contains this loop
const funcPattern = /function\s*\w*\s*\([^)]*\)\s*\{[^}]*for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*e\.length\s*;\s*i\s*\+\+\s*\)\s*\{\s*const\s+n\s*=\s*e\.charCodeAt\s*\(\s*i\s*\)\s*\^\s*t\.charCodeAt\s*\(\s*i\s*%\s*r\s*\)\s*;\s*s\s*\+\=\s*String\.fromCharCode\s*\(\s*n\s*\)\s*\}[^}]*\}/;

const funcMatch = code.match(funcPattern);
if (funcMatch) {
  console.log('\n=== Function containing XOR loop ===');
  console.log(funcMatch[0]);
}

// Search for where this function is called
// The function likely takes (encoded, key) as parameters
const callPattern = /\w+\s*\(\s*[^,]+\s*,\s*[^)]+\s*\)/g;

// Search for "what" header usage
const whatPattern = /.{0,300}headers\.get.{0,300}/gi;
const whatMatches = code.match(whatPattern);
if (whatMatches) {
  console.log('\n=== headers.get usage ===');
  whatMatches.slice(0, 5).forEach(m => console.log(m));
}

// Search for response handling after fetch
const responsePattern = /\.then\s*\(\s*(?:function\s*\(\s*\w+\s*\)|(\w+)\s*=>)[^}]*arrayBuffer[^}]*/gi;
const responseMatches = code.match(responsePattern);
if (responseMatches) {
  console.log('\n=== Response handling with arrayBuffer ===');
  responseMatches.slice(0, 3).forEach(m => console.log(m.substring(0, 500)));
}

// Search for the setStream function
const setStreamIdx = code.indexOf('setStream');
if (setStreamIdx !== -1) {
  console.log('\n=== setStream context ===');
  console.log(code.substring(Math.max(0, setStreamIdx - 500), setStreamIdx + 2000));
}
