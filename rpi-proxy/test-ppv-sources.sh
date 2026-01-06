#!/bin/bash
# Test PPV stream sources to see what's blocked vs accessible

echo "=== Test 1: poocloud.in m3u8 (IPv4 forced) ==="
curl -4 -s -o /dev/null -w "Status: %{http_code}\n" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  -H "Referer: https://modistreams.org/" \
  -H "Origin: https://modistreams.org" \
  "https://gg.poocloud.in/familyguy/index.m3u8"

echo ""
echo "=== Test 2: Get m3u8 content to find segment URLs ==="
M3U8=$(curl -4 -s \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  -H "Referer: https://modistreams.org/" \
  -H "Origin: https://modistreams.org" \
  "https://gg.poocloud.in/familyguy/index.m3u8" 2>/dev/null)

echo "M3U8 content (first 500 chars):"
echo "$M3U8" | head -20

echo ""
echo "=== Test 3: Extract and test segment URLs ==="
# Find first segment URL in the m3u8
SEGMENT_URL=$(echo "$M3U8" | grep -v "^#" | grep -v "^$" | head -1)
echo "First segment URL: $SEGMENT_URL"

if [[ "$SEGMENT_URL" == http* ]]; then
  echo ""
  echo "Testing segment directly..."
  curl -s -o /dev/null -w "Status: %{http_code}, Size: %{size_download}\n" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
    -H "Referer: https://modistreams.org/" \
    "$SEGMENT_URL"
fi

echo ""
echo "=== Test 4: Test vidsaver.io directly (if segments are there) ==="
# Try a known vidsaver pattern
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://vidsaver.io/" 2>/dev/null || echo "vidsaver.io not directly accessible"

echo ""
echo "=== Test 5: Check modistreams.org embed page ==="
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://modistreams.org/"

echo ""
echo "=== Test 6: DNS lookup for poocloud.in ==="
echo "IPv4:"
dig +short A gg.poocloud.in
echo "IPv6:"
dig +short AAAA gg.poocloud.in

echo ""
echo "=== Test 7: Check if ban is IP-based or cookie-based ==="
echo "Testing with no cookies, fresh connection..."
curl -4 -s -o /dev/null -w "Status: %{http_code}\n" \
  --no-keepalive \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  -H "Referer: https://modistreams.org/" \
  -H "Origin: https://modistreams.org" \
  "https://gg.poocloud.in/southpark/index.m3u8"
