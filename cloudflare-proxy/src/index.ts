/**
 * Combined Stream & TV Proxy Cloudflare Worker
 * 
 * Routes:
 *   /stream/*  - Stream proxy for 2embed/HLS streams
 *   /tv/*      - TV proxy for DLHD live streams
 *   /decode    - Isolated decoder sandbox for untrusted scripts
 * 
 * Deploy: wrangler deploy
 */

import streamProxy from './stream-proxy';
import tvProxy from './tv-proxy';
import decoderSandbox from './decoder-sandbox';

export interface Env {
  API_KEY?: string;
  RPI_PROXY_URL?: string;
  RPI_PROXY_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route to stream proxy
    if (path.startsWith('/stream')) {
      // Rewrite URL to remove /stream prefix
      const newUrl = new URL(request.url);
      newUrl.pathname = path.replace(/^\/stream/, '') || '/';
      const newRequest = new Request(newUrl.toString(), request);
      return streamProxy.fetch(newRequest, env);
    }

    // Route to TV proxy
    if (path.startsWith('/tv')) {
      // Rewrite URL to remove /tv prefix
      const newUrl = new URL(request.url);
      newUrl.pathname = path.replace(/^\/tv/, '') || '/';
      const newRequest = new Request(newUrl.toString(), request);
      return tvProxy.fetch(newRequest, env);
    }

    // Route to decoder sandbox (isolated script execution)
    if (path === '/decode' || path === '/decode/') {
      return decoderSandbox.fetch(request, env);
    }

    // Root - show usage
    return new Response(JSON.stringify({
      name: 'Cloudflare Stream & TV Proxy',
      routes: {
        stream: {
          path: '/stream/',
          description: 'HLS stream proxy for 2embed',
          usage: '/stream/?url=<encoded_url>&source=2embed&referer=<encoded_referer>',
        },
        tv: {
          path: '/tv/',
          description: 'DLHD live TV proxy',
          usage: '/tv/?channel=<id>',
          subRoutes: {
            key: '/tv/key?url=<encoded_url>',
            segment: '/tv/segment?url=<encoded_url>',
          },
        },
        decode: {
          path: '/decode',
          description: 'Isolated decoder sandbox for untrusted scripts',
          method: 'POST',
          body: '{ script: string, divId: string, encodedContent: string }',
          security: 'V8 isolate separation, pattern validation, URL allowlist',
        },
      },
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
