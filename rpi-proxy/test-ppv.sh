#!/bin/bash
# Test PPV stream fetch using curl

echo "Testing PPV stream with curl..."
curl -v \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: */*" \
  -H "Accept-Language: en-US,en;q=0.9" \
  -H "Referer: https://modistreams.org/" \
  -H "Origin: https://modistreams.org" \
  "https://gg.poocloud.in/familyguy/index.m3u8" 2>&1 | head -100
