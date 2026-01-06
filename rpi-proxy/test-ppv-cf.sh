#!/bin/bash
# Test if CF worker can still access poocloud.in

echo "=== Test via CF Worker ==="
curl -s "https://media-proxy.vynx.workers.dev/ppv/test" | jq .

echo ""
echo "=== Test stream endpoint via CF Worker ==="
curl -s "https://media-proxy.vynx.workers.dev/ppv/stream?url=https%3A%2F%2Fgg.poocloud.in%2Ffamilyguy%2Findex.m3u8" | head -20
