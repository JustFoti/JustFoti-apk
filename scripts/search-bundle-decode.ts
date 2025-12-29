#!/usr/bin/env bun
/**
 * Search the bundle for the decoding logic
 */

import * as fs from 'fs';

const code = fs.readFileSync('captured-script-11.js', 'utf-8');

console.log('Bundle size:', code.length);

// Search for setStream function
const setStreamMatch = code.match(/setStream\s*[=:]\s*function[^{]*\{[^}]*\}/g);
if (setStreamMatch) {
  console.log('\n=== setStream function ===');
  setStreamMatch.forEach(m => console.log(m.substring(0, 500)));
}

// Search for fetch with /fetch endpoint
const fetchMatch = code.match(/.{0,200}\/fetch.{0,200}/g);
if (fetchMatch) {
  console.log('\n=== /fetch references ===');
  fetchMatch.slice(0, 5).forEach(m => console.log(m));
}

// Search for protobuf-related code
const protoMatch = code.match(/.{0,100}protobuf.{0,100}/gi);
if (protoMatch) {
  console.log('\n=== protobuf references ===');
  protoMatch.slice(0, 5).forEach(m => console.log(m));
}

// Search for XOR operations with charCodeAt
const xorMatch = code.match(/charCodeAt[^;]*\^[^;]*/g);
if (xorMatch) {
  console.log('\n=== charCodeAt XOR operations ===');
  xorMatch.slice(0, 10).forEach(m => console.log(m));
}

// Search for String.fromCharCode in loops
const fromCharCodeMatch = code.match(/for[^{]*\{[^}]*fromCharCode[^}]*\}/g);
if (fromCharCodeMatch) {
  console.log('\n=== fromCharCode in loops ===');
  fromCharCodeMatch.slice(0, 5).forEach(m => console.log(m));
}

// Search for "what" header handling
const whatMatch = code.match(/.{0,100}["']what["'].{0,100}/gi);
if (whatMatch) {
  console.log('\n=== "what" references ===');
  whatMatch.slice(0, 5).forEach(m => console.log(m));
}

// Search for strmd.top
const strmdMatch = code.match(/.{0,100}strmd\.top.{0,100}/g);
if (strmdMatch) {
  console.log('\n=== strmd.top references ===');
  strmdMatch.slice(0, 5).forEach(m => console.log(m));
}

// Search for secure path
const secureMatch = code.match(/.{0,100}\/secure\/.{0,100}/g);
if (secureMatch) {
  console.log('\n=== /secure/ references ===');
  secureMatch.slice(0, 5).forEach(m => console.log(m));
}

// Search for playlist.m3u8
const m3u8Match = code.match(/.{0,100}playlist\.m3u8.{0,100}/g);
if (m3u8Match) {
  console.log('\n=== playlist.m3u8 references ===');
  m3u8Match.slice(0, 5).forEach(m => console.log(m));
}

// Search for decode/decrypt functions
const decodeMatch = code.match(/function\s+\w*decode\w*\s*\([^)]*\)\s*\{[^}]*\}/gi);
if (decodeMatch) {
  console.log('\n=== decode functions ===');
  decodeMatch.slice(0, 5).forEach(m => console.log(m));
}

// Search for the nt function (from earlier analysis)
const ntMatch = code.match(/nt\s*=\s*function[^{]*\{[\s\S]{0,500}\}/g);
if (ntMatch) {
  console.log('\n=== nt function ===');
  ntMatch.slice(0, 2).forEach(m => console.log(m.substring(0, 500)));
}
