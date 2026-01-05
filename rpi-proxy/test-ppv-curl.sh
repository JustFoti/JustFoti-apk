#!/bin/bash
# Test PPV stream fetch using curl with impersonation

echo "=== Test 1: Basic curl ==="
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: */*" \
  -H "Referer: https://modistreams.org/" \
  -H "Origin: https://modistreams.org" \
  "https://gg.poocloud.in/familyguy/index.m3u8"

echo ""
echo "=== Test 2: curl with --compressed ==="
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  --compressed \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: */*" \
  -H "Accept-Encoding: gzip, deflate, br" \
  -H "Referer: https://modistreams.org/" \
  -H "Origin: https://modistreams.org" \
  "https://gg.poocloud.in/familyguy/index.m3u8"

echo ""
echo "=== Test 3: curl with HTTP/2 ==="
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  --http2 \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: */*" \
  -H "Referer: https://modistreams.org/" \
  -H "Origin: https://modistreams.org" \
  "https://gg.poocloud.in/familyguy/index.m3u8"

echo ""
echo "=== Test 4: Full browser-like headers ==="
STATUS=$(curl -s -w "%{http_code}" -o /tmp/ppv_test.txt \
  --http2 \
  --compressed \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: */*" \
  -H "Accept-Language: en-US,en;q=0.9" \
  -H "Accept-Encoding: gzip, deflate, br" \
  -H "Referer: https://modistreams.org/" \
  -H "Origin: https://modistreams.org" \
  -H "Sec-Fetch-Dest: empty" \
  -H "Sec-Fetch-Mode: cors" \
  -H "Sec-Fetch-Site: cross-site" \
  -H "sec-ch-ua: \"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"" \
  -H "sec-ch-ua-mobile: ?0" \
  -H "sec-ch-ua-platform: \"Windows\"" \
  "https://gg.poocloud.in/familyguy/index.m3u8")
echo "Status: $STATUS"
if [ "$STATUS" = "200" ]; then
  echo "Content preview:"
  head -5 /tmp/ppv_test.txt
fi
