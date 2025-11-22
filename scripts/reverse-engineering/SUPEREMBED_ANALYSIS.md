# Superembed Reverse Engineering Analysis

## Overview
We attempted to reverse engineer the Superembed video source extraction process. The flow involves multiple redirects and obfuscated scripts designed to prevent automated extraction.

## Flow Analysis
1.  **Embed Page**: `vidsrc-embed.ru/embed/{type}/{id}`
    *   Extracts a `data-hash`.
2.  **RCP Page**: `cloudnestra.com/rcp/{hash}`
    *   Contains an iframe pointing to `srcrcp`.
3.  **SRCRCP Page**: `cloudnestra.com/srcrcp/{base64_id}`
    *   Contains a "Play" button.
    *   Clicking the button loads a `prorcp` iframe.
4.  **PRORCP Chain**: `cloudnestra.com/prorcp/{base64_id}`
    *   This page also contains a "Play" button.
    *   Clicking it loads *another* `prorcp` page with a new ID.
    *   This chain appears to be recursive or extremely long (observed > 15 layers).

## Protection Mechanisms

### 1. Sandbox Detection (`sbx.js`)
The `prorcp` pages include a script `sbx.js` that actively detects if the page is running in a sandboxed iframe (common in headless browsers).
*   **Checks**: `window.frameElement.hasAttribute("sandbox")`, `document.domain` access, PDF viewer plugins.
*   **Action**: If a sandbox is detected, it redirects the page to `/sbx.html`, effectively breaking the flow.

### 2. Infinite/Recursive Chain
The `prorcp` pages form a chain where each page requires a user interaction (click) to load the next. This is designed to exhaust automated scrapers and make it difficult to reach the final video source without a real user environment.
*   **Confirmation**: We successfully captured the HTML of a `prorcp` page even when Puppeteer reported `about:blank`. The captured HTML contained *another* iframe pointing to a new `prorcp` URL with a different base64 ID. This confirms the recursive nature of the protection.

### 3. Headless Browser Detection & Blocking
*   **Puppeteer**: Our Puppeteer script was detected. The browser context often reported `about:blank` after navigation, likely due to `sbx.js` or similar scripts clearing the document or redirecting. Blocking `sbx.js` allowed us to capture the HTML, but the recursive chain persisted.
*   **Direct Requests**: Direct `curl` requests to the `prorcp` URLs (even with valid headers) hung indefinitely, indicating IP-based blocking or advanced fingerprinting (TLS fingerprinting) that detects non-browser clients.

## Conclusion
Superembed employs sophisticated anti-bot protection involving:
*   **Client-side Sandbox Detection**: To defeat headless browsers.
*   **Recursive Interaction Chains**: To exhaust scrapers.
*   **Network-level Blocking**: To prevent direct API access.

## Recommendations
To successfully extract sources, a more advanced approach is needed:
1.  **Stealth Puppeteer**: Use `puppeteer-extra-plugin-stealth` to evade detection.
2.  **Residential Proxies**: To avoid IP blocking.
3.  **Manual Analysis**: Inspect the network traffic of a *real* browser to identify the final request that fetches the video, bypassing the `prorcp` chain if possible.
