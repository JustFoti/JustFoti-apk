#!/usr/bin/env bun
/**
 * Find the st function and understand how the key is derived
 */

import * as fs from 'fs';

const code = fs.readFileSync('captured-script-11.js', 'utf-8');

// Find the st function definition
const stFuncPattern = /function\s+st\s*\([^)]*\)\s*\{[^}]*\}/;
const stMatch = code.match(stFuncPattern);
if (stMatch) {
  console.log('=== st function ===');
  console.log(stMatch[0]);
}

// Find the rt function (which st calls)
const rtFuncPattern = /function\s+rt\s*\(\s*\)\s*\{[^}]*\}/;
const rtMatch = code.match(rtFuncPattern);
if (rtMatch) {
  console.log('\n=== rt function ===');
  console.log(rtMatch[0]);
}

// Find the array that rt returns
const rtArrayPattern = /const\s+e\s*=\s*\[[^\]]+\]/;
const rtArrayMatch = code.match(rtArrayPattern);
if (rtArrayMatch) {
  console.log('\n=== rt array ===');
  console.log(rtArrayMatch[0]);
}

// Find the context around st(8,-826)
const stCallIdx = code.indexOf('st(8,-826)');
if (stCallIdx !== -1) {
  console.log('\n=== Context around st(8,-826) ===');
  console.log(code.substring(Math.max(0, stCallIdx - 200), stCallIdx + 200));
}

// The rt function returns an array of strings
// Let's find all the strings in the array
const stringsPattern = /"[^"]+"/g;
const rtIdx = code.indexOf('function rt()');
if (rtIdx !== -1) {
  const rtEnd = code.indexOf('}', rtIdx + 100);
  const rtCode = code.substring(rtIdx, rtEnd + 1);
  console.log('\n=== rt function full ===');
  console.log(rtCode);
  
  // Extract strings
  const strings = rtCode.match(stringsPattern);
  if (strings) {
    console.log('\n=== Strings in rt ===');
    strings.forEach((s, i) => console.log(`  [${i}] ${s}`));
  }
}

// The array in rt() contains obfuscated strings
// Let's look for the actual array definition
const arrayDefPattern = /\["[^\]]+"\]/g;
const arrayMatches = code.match(arrayDefPattern);
if (arrayMatches) {
  console.log('\n=== Array definitions (first 10) ===');
  arrayMatches.slice(0, 10).forEach((m, i) => console.log(`  [${i}] ${m.substring(0, 200)}`));
}

// Find the specific array used by rt
const rtArrayIdx = code.indexOf('return(rt=function(){return e})()');
if (rtArrayIdx !== -1) {
  // Go back to find the array definition
  const searchStart = Math.max(0, rtArrayIdx - 2000);
  const searchCode = code.substring(searchStart, rtArrayIdx);
  
  // Find the last array definition before this
  const lastArrayMatch = searchCode.match(/const\s+e\s*=\s*\[[^\]]+\]/g);
  if (lastArrayMatch) {
    console.log('\n=== Array before rt return ===');
    console.log(lastArrayMatch[lastArrayMatch.length - 1]);
  }
}

// Let's look at the entire rt function context
const rtContextIdx = code.indexOf('function rt(){');
if (rtContextIdx !== -1) {
  console.log('\n=== rt function context ===');
  console.log(code.substring(rtContextIdx, rtContextIdx + 1500));
}
