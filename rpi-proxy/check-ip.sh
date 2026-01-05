#!/bin/bash
echo "=== External IPv4 ==="
curl -4 -s https://api.ipify.org
echo ""

echo "=== External IPv6 ==="
curl -6 -s https://api64.ipify.org 2>/dev/null || echo "No IPv6"
echo ""

echo "=== What IP does poocloud see? ==="
curl -s -o /dev/null -w "HTTP %{http_code} from %{remote_ip}\n" \
  -H "User-Agent: Mozilla/5.0" \
  "https://gg.poocloud.in/familyguy/index.m3u8"
