#!/usr/bin/env bun
/**
 * Find where the URL is decoded from the protobuf response
 */

import * as fs from 'fs';

const code = fs.readFileSync('captured-script-11.js', 'utf-8');

// The nt function calls n(t) where t contains the protobuf data
// Let's find where nt is called with a callback that processes the URL

// Search for patterns like: nt(url, headers, data, encoder, statusCb, dataCb, errorCb, finallyCb)
// The dataCb (6th parameter) receives the decoded protobuf

// Search for function calls that look like they're setting up a stream
const streamSetupPattern = /nt\s*\([^)]*\/fetch[^)]*\)/g;
const streamSetupMatches = code.match(streamSetupPattern);
if (streamSetupMatches) {
  console.log('=== nt() calls with /fetch ===');
  streamSetupMatches.forEach(m => console.log(m));
}

// Search for where the URL is constructed
// The URL format is: https://lb{N}.strmd.top/secure/{token}/{source}/stream/{id}/{streamNo}/playlist.m3u8
const urlConstructPattern = /lb\d*\.strmd\.top/g;
const urlConstructMatches = code.match(urlConstructPattern);
if (urlConstructMatches) {
  console.log('\n=== lb.strmd.top references ===');
  urlConstructMatches.forEach(m => console.log(m));
}

// Search for template literals that construct URLs
const templateUrlPattern = /`[^`]*\$\{[^}]*\}[^`]*strmd[^`]*`/g;
const templateUrlMatches = code.match(templateUrlPattern);
if (templateUrlMatches) {
  console.log('\n=== Template URL construction ===');
  templateUrlMatches.forEach(m => console.log(m));
}

// Search for string concatenation that builds URLs
const concatUrlPattern = /["']https:\/\/lb["']\s*\+/g;
const concatUrlMatches = code.match(concatUrlPattern);
if (concatUrlMatches) {
  console.log('\n=== URL concatenation ===');
  concatUrlMatches.forEach(m => console.log(m));
}

// The key might be in how the protobuf data is processed
// Search for where .data is accessed after protobuf parsing
const dataAccessPattern = /\.data[^;]*strmd|\.data[^;]*m3u8|\.data[^;]*secure/g;
const dataAccessMatches = code.match(dataAccessPattern);
if (dataAccessMatches) {
  console.log('\n=== .data access with URL keywords ===');
  dataAccessMatches.forEach(m => console.log(m));
}

// Search for the setStream function which likely sets up the player
const setStreamIdx = code.indexOf('window.setStream');
if (setStreamIdx !== -1) {
  console.log('\n=== window.setStream context ===');
  console.log(code.substring(setStreamIdx, setStreamIdx + 2000));
}

// Search for jwplayer setup
const jwplayerSetupPattern = /jwplayer\s*\([^)]*\)\s*\.setup\s*\([^)]*\)/g;
const jwplayerSetupMatches = code.match(jwplayerSetupPattern);
if (jwplayerSetupMatches) {
  console.log('\n=== jwplayer setup ===');
  jwplayerSetupMatches.forEach(m => console.log(m.substring(0, 200)));
}

// The URL might be set via a file property
const fileSetPattern = /file\s*:\s*[^,}]+/g;
const fileSetMatches = code.match(fileSetPattern);
if (fileSetMatches) {
  console.log('\n=== file property settings (first 20) ===');
  fileSetMatches.slice(0, 20).forEach(m => console.log(m.substring(0, 100)));
}

// Search for where the response data is used
// After nt() calls n(t), the callback might decode t.data
const callbackPattern = /\(\s*\w+\s*\)\s*=>\s*\{[^}]*\.data[^}]*\}/g;
const callbackMatches = code.match(callbackPattern);
if (callbackMatches) {
  console.log('\n=== Callbacks accessing .data ===');
  callbackMatches.slice(0, 10).forEach(m => console.log(m.substring(0, 300)));
}

// The decoding might use the WHAT header
// But the nt function doesn't capture the WHAT header!
// Let me check if there's another fetch that does

// Search for fetch with headers.get
const fetchHeadersPattern = /fetch[^}]*headers\.get/g;
const fetchHeadersMatches = code.match(fetchHeadersPattern);
if (fetchHeadersMatches) {
  console.log('\n=== fetch with headers.get ===');
  fetchHeadersMatches.slice(0, 5).forEach(m => console.log(m.substring(0, 300)));
}

// The WHAT header might be captured in a different way
// Search for response.headers
const responseHeadersPattern = /response\.headers/g;
const responseHeadersMatches = code.match(responseHeadersPattern);
if (responseHeadersMatches) {
  console.log('\n=== response.headers references ===');
  console.log(`Found ${responseHeadersMatches.length} occurrences`);
}

// Let me search for the actual decoding logic
// It might be in a separate function that takes the encoded data and WHAT header
const decodeWithKeyPattern = /function\s*\w*\s*\([^)]*key[^)]*\)[^{]*\{[^}]*charCodeAt[^}]*\}/gi;
const decodeWithKeyMatches = code.match(decodeWithKeyPattern);
if (decodeWithKeyMatches) {
  console.log('\n=== Decode functions with key parameter ===');
  decodeWithKeyMatches.forEach(m => console.log(m));
}
