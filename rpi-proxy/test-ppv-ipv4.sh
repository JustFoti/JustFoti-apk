#!/bin/bash
echo "=== Force IPv4 test ==="
curl -4 -s -o /dev/null -w "Status: %{http_code} from %{remote_ip}\n" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: */*" \
  -H "Referer: https://modistreams.org/" \
  -H "Origin: https://modistreams.org" \
  "https://gg.poocloud.in/familyguy/index.m3u8"

echo ""
echo "=== If 200, get content ==="
curl -4 -s \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: */*" \
  -H "Referer: https://modistreams.org/" \
  -H "Origin: https://modistreams.org" \
  "https://gg.poocloud.in/familyguy/index.m3u8" | head -10
