/**
 * DEOBFUSCATED DLHD Script 2
 * 
 * This script intercepts XMLHttpRequest and fetch calls to redirect
 * key2.keylocking.ru -> key.keylocking.ru
 * 
 * This is NOT a server selector - it's a key URL redirect!
 */

(async function() {
  // Self-protection code (anti-debugging) - removed for clarity
  
  // IMPORTANT: This intercepts XHR requests
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    // If the URL contains 'key2.keylocking.ru', replace it with 'key.keylocking.ru'
    if (url.includes('key2.keylocking.ru')) {
      const newUrl = url.replace('key2.keylocking.ru', 'key.keylocking.ru');
      arguments[1] = newUrl;
    }
    originalXHROpen.apply(this, arguments);
  };
  
  // IMPORTANT: This intercepts fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    let urlToCheck;
    
    if (typeof input === 'string' && input.includes('key2.keylocking.ru')) {
      urlToCheck = input;
    } else if (input instanceof Request && input.url.includes('key2.keylocking.ru')) {
      urlToCheck = input.url;
    }
    
    if (urlToCheck) {
      const newUrl = urlToCheck.replace('key2.keylocking.ru', 'key.keylocking.ru');
      input = typeof input === 'string' ? newUrl : new Request(newUrl, input);
      
      try {
        return await originalFetch(input, init);
      } catch (error) {
        throw error;
      }
    }
    
    return originalFetch(input, init);
  };
})();

/**
 * CONCLUSION:
 * 
 * This script is NOT a server selector. It simply redirects key requests from
 * key2.keylocking.ru to key.keylocking.ru.
 * 
 * The DLHD key server is: top2.giokko.ru/wmsxx.php
 * NOT keylocking.ru (that's a different service)
 * 
 * This script has NO relevance to the 418 blocking issue.
 */
