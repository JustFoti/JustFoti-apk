#!/usr/bin/env bun
/**
 * Find where the WHAT header is used for decoding
 */

import * as fs from 'fs';

const code = fs.readFileSync('captured-script-11.js', 'utf-8');

// The nt function handles the fetch response
// Let's find where the response data is decoded
const ntFuncIdx = code.indexOf('function nt(e,t,s,r,i,n,o,a)');
if (ntFuncIdx !== -1) {
  console.log('=== nt function ===');
  // Find the end of the function
  let depth = 0;
  let end = ntFuncIdx;
  for (let i = ntFuncIdx; i < code.length; i++) {
    if (code[i] === '{') depth++;
    if (code[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  console.log(code.substring(ntFuncIdx, end));
}

// Search for where the response is processed after fetch
// The pattern is: fetch().then(response => response.arrayBuffer()).then(buffer => decode(buffer))
const fetchThenPattern = /fetch\s*\([^)]*\)[^}]*\.then[^}]*arrayBuffer[^}]*\.then[^}]*/g;
const fetchMatches = code.match(fetchThenPattern);
if (fetchMatches) {
  console.log('\n=== fetch().then().arrayBuffer().then() patterns ===');
  fetchMatches.slice(0, 3).forEach(m => console.log(m.substring(0, 500)));
}

// Search for Oe class (protobuf reader)
const oeClassIdx = code.indexOf('class Oe');
if (oeClassIdx !== -1) {
  console.log('\n=== Oe class (protobuf reader) ===');
  let depth = 0;
  let end = oeClassIdx;
  for (let i = oeClassIdx; i < code.length; i++) {
    if (code[i] === '{') depth++;
    if (code[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  console.log(code.substring(oeClassIdx, Math.min(end, oeClassIdx + 2000)));
}

// Search for He object (protobuf field handlers)
const heObjIdx = code.indexOf('He={');
if (heObjIdx !== -1) {
  console.log('\n=== He object ===');
  console.log(code.substring(heObjIdx, heObjIdx + 500));
}

// The key insight: the response from /fetch is protobuf encoded
// The protobuf contains the encoded URL
// The URL is then decoded using some algorithm
// Let's find where the decoded URL is used

// Search for where the m3u8 URL is set
const m3u8SetPattern = /file\s*[:=]\s*["'`][^"'`]*m3u8/g;
const m3u8Matches = code.match(m3u8SetPattern);
if (m3u8Matches) {
  console.log('\n=== m3u8 file setting ===');
  m3u8Matches.slice(0, 5).forEach(m => console.log(m));
}

// Search for setStream function
const setStreamPattern = /setStream\s*[=:]\s*(?:function|\([^)]*\)\s*=>)[^}]*\}/g;
const setStreamMatches = code.match(setStreamPattern);
if (setStreamMatches) {
  console.log('\n=== setStream function ===');
  setStreamMatches.slice(0, 3).forEach(m => console.log(m.substring(0, 500)));
}

// The decoding might happen in a callback passed to nt()
// Let's search for calls to nt()
const ntCallPattern = /nt\s*\([^)]*,[^)]*,[^)]*,[^)]*,[^)]*,[^)]*\)/g;
const ntCallMatches = code.match(ntCallPattern);
if (ntCallMatches) {
  console.log('\n=== nt() calls ===');
  ntCallMatches.slice(0, 5).forEach(m => console.log(m));
}

// Search for where the WHAT header might be used
// It could be in a response handler
const responseHeaderPattern = /response\.headers\.get\s*\(\s*["']what["']\)/gi;
const responseHeaderMatches = code.match(responseHeaderPattern);
if (responseHeaderMatches) {
  console.log('\n=== response.headers.get("what") ===');
  responseHeaderMatches.forEach(m => console.log(m));
}

// The WHAT header might be accessed differently
// Search for any "what" string
const whatStringPattern = /["']what["']/gi;
const whatStringMatches = code.match(whatStringPattern);
if (whatStringMatches) {
  console.log('\n=== "what" strings ===');
  console.log(`Found ${whatStringMatches.length} occurrences`);
}
