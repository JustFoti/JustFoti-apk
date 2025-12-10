
// Get encoded domains list from PHP
var encodedDomains = "WyJ0aGVkYWRkeS50byIsImxpdmVwbGF5cy5zaG9wIiwic3BvcnRzcy5zaG9wIiwidGhlZGFkZHkuY2xpY2siLCJzcG9ydHMyd2F0Y2guc2hvcCIsImJ1ZGR5Y2VudGVyLnNob3AiLCJiaW5nc3BvcnQuc2hvcCIsInZpcHJvdzEuc2hvcCIsInNwb3J0c3NsaXZlLnNob3AiLCJiaXp6LXN0cmVhbXMydS5zaG9wIiwidG9wc3RyZWFtei5zaG9wIiwiZGFkZHlsaXZlLm1wIiwid29ybGRzc3RyZWFtLnNob3AiLCJsaXZld29ybGQuc2hvcCIsIm1penR2LmxpdmUiLCI0a3N0cmVhbXMuc2hvcCIsInNvb3BlcnN0cmVhbXM0dS5zaG9wIiwiZ29vbXN0cmVhbS5zaG9wIiwicmlwcGxlc3RyZWFtNHUuc2hvcCIsIjFzdHN0cmVhbXMuc2hvcCIsImZzc3BvcnRzaGQuc2hvcCIsIjRrbmV0d29yay5zaG9wIiwiZGFkZHlsaXZlMi5jbGljayIsIm1penR2LnRvcCIsImRhZGR5bGl2ZTMuY2xpY2siLCJkYWRkeWxpdmUyLnRvcCIsImdvbXN0cmVhbXMuaW5mbyIsImR1YnpuZXR3b3Jrei5zaG9wIiwiZGFkZHlsaXZlLmRhZCIsInRudC1zcG9ydHMuc2hvcCIsImZyZWVzcG9ydHNocS5zaG9wIiwia2x1YnNwb3J0cy53ZWJzaXRlIiwidHJpcHBsZXN0cmVhbS5zaG9wIiwiaG9tb3Nwb3J0dC5zaG9wIiwiaGRzdHJlbWluZy5zaG9wIiwiZnNzcG9ydHpoZC5zaG9wIiwia2x1YnNwb3J0cy5zdG9yZSIsImZzc3BvcnRzaGRkLnNob3AiLCJyZWRkaXQtc3RyZWFtaW5nLnNob3AiLCJnb29taGQuc2hvcCIsImRsaGQuY2xpY2siLCJ0dnNwb3J0c2xpdmUuc2hvcCIsImVuZ3N0cmVhbXMuc2hvcCIsInppZ2dvZ3JhdGlzLnNob3AiLCJ0aGVkYWRkeS5kYWQiLCJ5ZWFoc3RyZWFtcy5jb20iLCJkYWRkeWxpdmUzLmNvbSIsImJ1ZmZ6dHJlYW16LnNob3AiLCJraWNrc3RyZWFtLnNob3AiLCJ0aGVkYWRkeS50b3AiLCJyb2phZGlyZWN0LnNob3AiLCJzcG9ydHNzdHJlYW1zLnNob3AiLCJkYWRkeWxpdmVzdHJlYW0uY29tIiwicG9zY2l0ZWNocy5zaG9wIiwiZGxoZC5kYWQiLCJnb2Fsc3RyZWFtZXIuc2hvcCIsImZ1Ym90di5zaG9wIiwibGl2aW5nc3BvcnRzLnNob3AiLCJzdHJlYW1seWRldi5zaG9wIiwiZGFkZHlsaXZlc3RyZWFtLnNob3AiLCJhbGxzcG9ydHNzLnNob3AiLCJyaXBwbGVwbGF5LnNob3AiLCJ2aWN0b3J5c3RyZWFtLnNob3AiLCJsaXZlc3BvcnRodWIuc2hvcCIsInNwb3J0eWh1YnMuc2hvcCIsImV2ZXJ5c3BvcnRzdHYuc2hvcCIsInByb3N0cmVhbXMuc2hvcCIsImRlcG9ydGVsaWJyZXMuc2hvcCIsInllYWhwYW5lbC5zaG9wIiwidGhlc3BvcnRzdHJlYW0uc2hvcCIsImtsdWJzcG9ydHMuc2hvcCIsInBhbmRhc3RyZWFtcy5zaG9wIiwib3ZvZ29hbC5jZmQiLCJ3b3JsZHNwb3J0ejR1LmNmZCIsImtsdWJzcG9ydHMuc2JzIiwiZGFkZHloZC5jb20iLCJzcG9ydG1hcmdpbi5jZmQiLCJmcmVldHZzcG9yLmNmZCJd";

// Decode Base64 JSON list into array
var allowedDomains = JSON.parse(atob(encodedDomains));

/**
 * Extract hostname safely
 */
function getHostname(url) {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch (e) {
        return "";
    }
}

/**
 * Check if domain is exactly in the whitelist
 * Prevents "1miztv.shop" or "fake-miztv.shop" from passing
 */
function isAllowedDomain(hostname) {
    return allowedDomains.some(function(domain) {
        return hostname === domain.toLowerCase(); // strict exact match
    });
}

var currentReferer = document.referrer;
var refererHostname = getHostname(currentReferer);

console.log("Current Referrer:", currentReferer);
console.log("Referer Hostname:", refererHostname);

if (currentReferer === "" || !isAllowedDomain(refererHostname)) {
    console.log("Referrer not allowed. Redirecting to error page.");
    window.location = "/xx.html";
} else {
    console.log("Referrer is allowed");
}
