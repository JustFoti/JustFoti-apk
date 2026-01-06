#!/bin/bash
# Test if Hetzner VPS can access poocloud.in (PPV.to streams)
# Run this directly on your Hetzner VPS

echo "=== Testing poocloud.in from Hetzner VPS ==="
echo ""

echo "1. Your external IP:"
curl -s https://api.ipify.org
echo ""
echo ""

echo "2. Testing poocloud.in m3u8 (IPv4):"
curl -4 -s -o /dev/null -w "Status: %{http_code}\n" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  -H "Referer: https://modistreams.org/" \
  -H "Origin: https://modistreams.org" \
  "https://gg.poocloud.in/familyguy/index.m3u8"

echo ""
echo "3. Getting m3u8 content:"
curl -4 -s \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  -H "Referer: https://modistreams.org/" \
  -H "Origin: https://modistreams.org" \
  "https://gg.poocloud.in/familyguy/index.m3u8" | head -20

echo ""
echo "4. Testing modistreams.org:"
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://modistreams.org/"

echo ""
echo "=== Done ==="
echo "If status 200 = Hetzner works for PPV"
echo "If status 403/1006 = Hetzner is also banned"
