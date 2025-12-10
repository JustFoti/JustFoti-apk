#!/usr/bin/env node
/**
 * Test stream using curl through RPi proxy
 * Maybe the issue is with how Node.js makes the request
 */

const { execSync } = require('child_process');

const STREAM_URL = 'http://skunkytv.live:80/play/live.php?mac=00:1A:79:00:00:0C&stream=987841&extension=ts&play_token=test';
const MAC = '00:1A:79:00:00:0C';

// Build curl command that mimics STB
const curlCmd = `curl -v -s --max-time 10 \
  -H "User-Agent: Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3" \
  -H "X-User-Agent: Model: MAG250; Link: WiFi" \
  -H "Accept: */*" \
  -H "Cookie: mac=${encodeURIComponent(MAC)}; stb_lang=en; timezone=GMT" \
  "${STREAM_URL}" 2>&1 | head -50`;

console.log('Testing stream with curl (from this machine - datacenter):\n');
console.log('Command:', curlCmd.substring(0, 200) + '...\n');

try {
  const output = execSync(curlCmd, { encoding: 'utf8', shell: true });
  console.log(output);
} catch (e) {
  console.log('Curl output:', e.stdout || e.message);
}
