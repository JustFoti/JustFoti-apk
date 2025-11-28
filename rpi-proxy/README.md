# Raspberry Pi CORS Proxy

A lightweight proxy server that runs on your Raspberry Pi, allowing your Vercel backend to make requests through your residential IP.

## Setup

### 1. Install on Raspberry Pi

```bash
# Copy the rpi-proxy folder to your Pi
scp -r rpi-proxy pi@raspberrypi.local:~/

# SSH into your Pi
ssh pi@raspberrypi.local

# Install dependencies (none needed - pure Node.js)
cd rpi-proxy
```

### 2. Set your API key

```bash
# Create a strong random key
export API_KEY=$(openssl rand -hex 32)
echo "Your API key: $API_KEY"

# Or set a custom one
export API_KEY="your-secret-key-here"
```

### 3. Run the server

```bash
# Start the server
node server.js

# Or run in background with PM2
npm install -g pm2
pm2 start server.js --name rpi-proxy
pm2 save
pm2 startup  # Auto-start on boot
```

### 4. Expose to the internet (choose one)

#### Option A: Cloudflare Tunnel (Recommended - Free & Secure)

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Quick tunnel (temporary URL)
cloudflared tunnel --url localhost:3001

# Or create a permanent tunnel
cloudflared tunnel login
cloudflared tunnel create rpi-proxy
cloudflared tunnel route dns rpi-proxy proxy.yourdomain.com
cloudflared tunnel run rpi-proxy
```

#### Option B: ngrok

```bash
# Install ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Run
ngrok http 3001
```

### 5. Configure Vercel

Add these environment variables to your Vercel project:

```
RPI_PROXY_URL=https://your-tunnel-url.trycloudflare.com
RPI_PROXY_KEY=your-api-key-here
```

## Usage

From your Vercel backend:

```typescript
const RPI_PROXY_URL = process.env.RPI_PROXY_URL;
const RPI_PROXY_KEY = process.env.RPI_PROXY_KEY;

async function fetchViaRpiProxy(url: string): Promise<Response> {
  const proxyUrl = `${RPI_PROXY_URL}/proxy?url=${encodeURIComponent(url)}`;
  return fetch(proxyUrl, {
    headers: { 'X-API-Key': RPI_PROXY_KEY }
  });
}
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /proxy?url=<encoded_url>` | Proxy a request through the Pi |
| `GET /health` | Health check |

## Security

- API key authentication required for all proxy requests
- Rate limiting: 100 requests/minute per IP
- Only GET requests allowed
- No request body forwarding (safe for read-only proxying)

## Systemd Service (Alternative to PM2)

Create `/etc/systemd/system/rpi-proxy.service`:

```ini
[Unit]
Description=RPI CORS Proxy
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/rpi-proxy
Environment=API_KEY=your-secret-key
Environment=PORT=3001
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable rpi-proxy
sudo systemctl start rpi-proxy
```
