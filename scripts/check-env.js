#!/usr/bin/env node

/**
 * Environment Configuration Checker
 * Verifies that all required environment variables are set
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking environment configuration...\n');

// Check for .env files
const envFiles = ['.env', '.env.local', '.env.development.local'];
const foundEnvFiles = envFiles.filter(file => 
  fs.existsSync(path.join(process.cwd(), file))
);

if (foundEnvFiles.length === 0) {
  console.error('❌ No environment files found!');
  console.log('\n📝 To fix this:');
  console.log('1. Copy .env.example to .env.local');
  console.log('2. Add your TMDB API key to .env.local');
  console.log('3. Get your API key from: https://www.themoviedb.org/settings/api\n');
  process.exit(1);
}

console.log('✅ Found environment files:', foundEnvFiles.join(', '));

// Check for TMDB API key
const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;

if (!apiKey) {
  console.error('\n❌ NEXT_PUBLIC_TMDB_API_KEY is not set!');
  console.log('\n📝 To fix this:');
  console.log('1. Open your .env.local file');
  console.log('2. Add: NEXT_PUBLIC_TMDB_API_KEY=your_actual_key_here');
  console.log('3. Get your API key from: https://www.themoviedb.org/settings/api');
  console.log('4. Restart your development server\n');
  process.exit(1);
}

if (apiKey === 'your_tmdb_api_key_here') {
  console.error('\n❌ TMDB API key is still set to placeholder value!');
  console.log('\n📝 To fix this:');
  console.log('1. Get your actual API key from: https://www.themoviedb.org/settings/api');
  console.log('2. Replace the placeholder in .env.local with your real key');
  console.log('3. Restart your development server\n');
  process.exit(1);
}

console.log('✅ NEXT_PUBLIC_TMDB_API_KEY is configured');
console.log(`   Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);

// Test TMDB API connection
console.log('\n🌐 Testing TMDB API connection...');

const https = require('https');

const testUrl = `https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}`;

https.get(testUrl, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ TMDB API connection successful!');
    console.log('\n🎉 All checks passed! Your app should work correctly.\n');
    process.exit(0);
  } else if (res.statusCode === 401) {
    console.error('❌ TMDB API authentication failed!');
    console.log('\n📝 Your API key appears to be invalid.');
    console.log('1. Double-check your API key at: https://www.themoviedb.org/settings/api');
    console.log('2. Make sure you copied the entire key');
    console.log('3. Update .env.local with the correct key\n');
    process.exit(1);
  } else {
    console.error(`❌ TMDB API returned status code: ${res.statusCode}`);
    console.log('\n📝 There may be an issue with the TMDB service.');
    console.log('Try again in a few minutes.\n');
    process.exit(1);
  }
}).on('error', (err) => {
  console.error('❌ Network error:', err.message);
  console.log('\n📝 Check your internet connection and try again.\n');
  process.exit(1);
});
