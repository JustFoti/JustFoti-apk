// OpenNext configuration for Cloudflare Pages deployment
// See: https://opennext.js.org/cloudflare

import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  default: {
    // Use Cloudflare's edge runtime
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      // Use Cloudflare's cache API
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },

  // External modules for edge runtime
  edgeExternals: ["node:crypto"],

  // Middleware configuration
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },

  // Dangerous options (use with caution)
  dangerous: {
    // Disable tag cache revalidation (not supported on Cloudflare)
    disableTagCache: true,
    // Disable incremental cache (use Cloudflare KV instead if needed)
    disableIncrementalCache: true,
  },
};

export default config;
