#!/bin/bash
# Test PPV proxy chain

echo "=== 1. CF Worker PPV Health Check ==="
curl -s "https://media-proxy.vynx.workers.dev/ppv/health" | jq .

echo ""
echo "=== 2. Test PPV Stream via CF Worker ==="
curl -s -w "\nHTTP Status: %{http_code}\n" \
  "https://media-proxy.vynx.workers.dev/ppv/stream?url=https%3A%2F%2Fgg.poocloud.in%2Ffamilyguy%2Findex.m3u8" \
  | head -30

echo ""
echo "=== 3. Direct Hetzner Test ==="
# Replace with your actual Hetzner URL and key
HETZNER_URL="YOUR_HETZNER_URL"
HETZNER_KEY="YOUR_HETZNER_KEY"
curl -s -w "\nHTTP Status: %{http_code}\n" \
  "${HETZNER_URL}/ppv?url=https%3A%2F%2Fgg.poocloud.in%2Ffamilyguy%2Findex.m3u8&key=${HETZNER_KEY}" \
  | head -30
