
(function(){
const $ = s => document.querySelector(s);

const CHANNEL_KEY   = "premium51";
const AUTH_TOKEN    = "a93fd3e1d2c6221f8f6ce1208821c075544e46e9c8c4e15e123343bf93d848c7";
const AUTH_COUNTRY  = "US";
const AUTH_TS       = "1765333288";
const AUTH_EXPIRY   = "1765336888";

function showPlayerContainer(){
  const o = $('#player-container');
  const l = $('#loader');
  if (l) l.remove();
  if (!$('#clappr-container')){
    const d = document.createElement('div');
    d.id = 'clappr-container';
    d.style.cssText = 'width:100%;height:100%;position:relative';
    o.appendChild(d);
  }
}

function fetchWithRetry(url, retries, delay, init){
  return new Promise((resolve, reject)=>{
    const attempt=()=>{
      fetch(url, init)
        .then(r => { if (!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
        .then(resolve)
        .catch(err => (retries--) ? setTimeout(attempt, delay) : reject(err));
    };
    attempt();
  });
}

// --- INITIAL AUTH USING auth2.php (GOOD FLOW) ---
function doInitialAuth() {
  const formData = new FormData();
  formData.append('channelKey', CHANNEL_KEY);
  formData.append('country', AUTH_COUNTRY);
  formData.append('timestamp', AUTH_TS);
  formData.append('expiry', AUTH_EXPIRY);
  formData.append('token', AUTH_TOKEN);

  return fetchWithRetry('https://security.giokko.ru/auth2.php', 3, 1000, {
    method: 'POST',
    body: formData
  }).then(data => {
    console.log('Auth2 authentication successful');
    return data;
  }).catch(err => {
    throw new Error('Auth2 failed: ' + err.message);
  });
}

let player;
// let engine = new p2pml.hlsjs.Engine({
//     segments: { swarmId: CHANNEL_KEY },
//     loader: { httpUseRanges: false, WaitForTracker: false, WaitForTrackerCounter: 800 }
// });

let reloadTimer = null;

function safeReloadPlayer(){
  if (reloadTimer) return; // avoid spamming
  console.warn("Playback stalled or errored. Reloading source in 3 seconds...");
  reloadTimer = setTimeout(()=>{
    try{
      if (player){
        player.stop();
        player.load(player.options.source && String(player.options.source).trim());
        player.play();
        player.unmute();
        player.setVolume(100);
      }
    }catch(_){}
    reloadTimer = null;
  }, 3000);
}

// Wait for dependencies to load
function waitForDependencies() {
  return new Promise((resolve) => {
    const checkDeps = () => {
      if (typeof Clappr !== 'undefined' && typeof HlsjsPlayback !== 'undefined') {
        console.log('Dependencies loaded');
        resolve();
      } else {
        setTimeout(checkDeps, 100);
      }
    };
    checkDeps();
  });
}

// --- NEW FLOW: WAIT FOR LIBS -> AUTH2 -> SERVER LOOKUP -> PLAYER ---
waitForDependencies().then(() => {
  return doInitialAuth();
})
  .then(() => {
    console.log('Auth2 complete, fetching server lookup');
    return fetchWithRetry('/server_lookup.js?channel_id='+encodeURIComponent(CHANNEL_KEY), 5, 1500);
  })
  .catch(err => {
    throw new Error('Server lookup failed: ' + err.message);
  })
  .then(data => {
    console.log('Server lookup successful');
    const sk = data.server_key;

    // in this implementation they always used .css
    const m3u8 = (sk === 'top1/cdn')
      ? `https://top1.giokko.ru/top1/cdn/${CHANNEL_KEY}/mono.css`
      : `https://${sk}new.giokko.ru/${sk}/${CHANNEL_KEY}/mono.css`;

    showPlayerContainer();


    player = new Clappr.Player({
      source: m3u8,
      mimeType: "application/vnd.apple.mpegurl",

      parentId: '#clappr-container',
      autoPlay: true,
      mute: true,
      height: '100%',
      width:  '100%',
      disableErrorScreen: true,
      plugins: [HlsjsPlayback],   // SidebarAdPlugin removed

      mediacontrol:{
        seekbar:"#E0CDA9",
        buttons:"#E0CDAA9"
      },

      // root hlsjs config used by HlsjsPlayback
      hlsjsConfig:{
        enableWorker: true,
        xhrSetup: function(xhr, url) {
          xhr.setRequestHeader('Authorization', 'Bearer YOUR_ACCESS_TOKEN_HERE');  // Add your token
          xhr.setRequestHeader('X-Channel-Key', 'YOUR_CHANNEL_KEY');               // Add your channel key
        },
        fragLoadingMaxRetry: Infinity,
        fragLoadingRetryDelay: 500,
        fragLoadingMaxRetryTimeout: 20000,
        manifestLoadingMaxRetry: Infinity,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: Infinity,
        levelLoadingRetryDelay: 1000,
        liveSyncDuration: 30,
        liveMaxLatencyDuration: 60,
        fragLoadingTimeOut: 15000,
        manifestLoadingTimeOut: 15000
      },

      playback:{
        forceHLS: true,
        crossOrigin:'anonymous',
        playInline:true,
        hlsjsConfig:{
          enableWorker: true,
          // loader: engine.createLoaderClass(),
          backBufferLength: 90 // Manages buffer for live streams
        },
      }
    });

    // If you want auto-reload on errors, uncomment these:
    // player.on(Clappr.Events.PLAYER_ERROR, ()=>safeReloadPlayer());
    // player.on(Clappr.Events.PLAYBACK_ERROR, ()=>safeReloadPlayer());
    // player.on(Clappr.Events.PLAYBACK_STALLED, ()=>safeReloadPlayer());

    // Attach header override once hls is ready
    player.on(Clappr.Events.PLAYER_READY, function() {
      const playback = player.getPlayback && player.getPlayback();
      const hls = playback && playback.hls;
      if (hls && hls.config) {
        hls.config.xhrSetup = function (xhr, url) {
          xhr.setRequestHeader('Authorization', 'Bearer YOUR_ACCESS_TOKEN_HERE');  // Replace with your token
          xhr.setRequestHeader('X-Channel-Key', 'YOUR_CHANNEL_KEY');              // Replace with your channel key
        };
        
        // Force infinite retries for all loading operations
        hls.config.fragLoadingMaxRetry = Infinity;
        hls.config.manifestLoadingMaxRetry = Infinity;
        hls.config.levelLoadingMaxRetry = Infinity;
      }
    });

  })
  .catch(err=>{
    console.error('Player initialization error:', err);
    const errorStep = err.message.includes('Auth2') ? 'Authentication (Auth2)' :
                      err.message.includes('Server lookup') ? 'Server Lookup' :
                      'Player Initialization';
    // If Auth2 specifically returned HTTP 500, show a helpful hint about VPN/proxy
    let auth500Advice = '';
    try {
      if (err && err.message && /Auth2/i.test(err.message) && /500/.test(err.message)) {
        auth500Advice = `<div style="font-size:13px;color:#ffd59e;margin-bottom:15px">${t('vpn_advice')}</div>`;
      }
    } catch (e) { /* ignore */ }

    $('#player-container').innerHTML = `
      <div style="color:#fff;text-align:center;padding:20px;font-family:'Segoe UI',sans-serif">
        <div style="font-size:24px;margin-bottom:10px">${t('error_title')}</div>
        <div style="font-size:16px;margin-bottom:15px">${t('failed_at')} <strong>${errorStep}</strong></div>
        <div style="font-size:14px;color:#ccc;margin-bottom:20px">${err.message}</div>
        ${auth500Advice}
        <button id="retryBtn" style="background:#E0CDA9;border:none;padding:12px 24px;font-size:16px;cursor:pointer;border-radius:4px">${t('retry')}</button>
      </div>
    `;
    
    // Retry without page refresh to avoid referer protection
    document.getElementById('retryBtn').addEventListener('click', function() {
      $('#player-container').innerHTML = `
        <div id="loader">
          <div class="spinner"></div>
          <div class="text">Retrying...</div>
        </div>
      `;
      
      // Reinitialize the entire flow without refresh
      setTimeout(() => {
        waitForDependencies().then(() => {
          return doInitialAuth();
        })
          .then(() => {
            console.log('Auth2 complete, fetching server lookup');
            return fetchWithRetry('/server_lookup.js?channel_id='+encodeURIComponent(CHANNEL_KEY), 5, 1500);
          })
          .catch(err => {
            throw new Error('Server lookup failed: ' + err.message);
          })
          .then(data => {
            console.log('Server lookup successful');
            const sk = data.server_key;
            const m3u8 = (sk === 'top1/cdn')
              ? `https://top1.giokko.ru/top1/cdn/${CHANNEL_KEY}/mono.css`
              : `https://${sk}new.giokko.ru/${sk}/${CHANNEL_KEY}/mono.css`;

            showPlayerContainer();

            player = new Clappr.Player({
              source: m3u8,
              mimeType: "application/vnd.apple.mpegurl",
              parentId: '#clappr-container',
              autoPlay: true,
              mute: true,
              height: '100%',
              width:  '100%',
              disableErrorScreen: true,
              plugins: [HlsjsPlayback],
              mediacontrol:{
                seekbar:"#E0CDA9",
                buttons:"#E0CDAA9"
              },
              hlsjsConfig:{
                enableWorker: true,
                xhrSetup: function(xhr, url) {
                  xhr.setRequestHeader('Authorization', 'Bearer YOUR_ACCESS_TOKEN_HERE');
                  xhr.setRequestHeader('X-Channel-Key', 'YOUR_CHANNEL_KEY');
                },
                fragLoadingMaxRetry: Infinity,
                fragLoadingRetryDelay: 500,
                fragLoadingMaxRetryTimeout: 20000,
                manifestLoadingMaxRetry: Infinity,
                manifestLoadingRetryDelay: 1000,
                levelLoadingMaxRetry: Infinity,
                levelLoadingRetryDelay: 1000,
                liveSyncDuration: 30,
                liveMaxLatencyDuration: 60,
                fragLoadingTimeOut: 15000,
                manifestLoadingTimeOut: 15000
              },
              playback:{
                forceHLS: true,
                crossOrigin:'anonymous',
                playInline:true,
                hlsjsConfig:{
                  enableWorker: true,
                  backBufferLength: 90
                },
              }
            });

            player.on(Clappr.Events.PLAYER_READY, function() {
              const playback = player.getPlayback && player.getPlayback();
              const hls = playback && playback.hls;
              if (hls && hls.config) {
                hls.config.xhrSetup = function (xhr, url) {
                  xhr.setRequestHeader('Authorization', 'Bearer YOUR_ACCESS_TOKEN_HERE');
                  xhr.setRequestHeader('X-Channel-Key', 'YOUR_CHANNEL_KEY');
                };
                hls.config.fragLoadingMaxRetry = Infinity;
                hls.config.manifestLoadingMaxRetry = Infinity;
                hls.config.levelLoadingMaxRetry = Infinity;
              }
            });
          })
          .catch(retryErr => {
            console.error('Retry failed:', retryErr);
            const retryErrorStep = retryErr.message.includes('Auth2') ? 'Authentication (Auth2)' :
                                   retryErr.message.includes('Server lookup') ? 'Server Lookup' :
                                   'Player Initialization';
            // Advice also on retry failure if auth2 returned 500
            let retryAuthAdvice = '';
            try {
              if (retryErr && retryErr.message && /Auth2/i.test(retryErr.message) && /500/.test(retryErr.message)) {
                retryAuthAdvice = `<div style="font-size:13px;color:#ffd59e;margin-bottom:15px">${t('vpn_advice')}</div>`;
              }
            } catch (e) { /* ignore */ }

            $('#player-container').innerHTML = `
              <div style="color:#fff;text-align:center;padding:20px;font-family:'Segoe UI',sans-serif">
                <div style="font-size:24px;margin-bottom:10px">${t('error_title')}</div>
                <div style="font-size:16px;margin-bottom:15px">${t('failed_at')} <strong>${retryErrorStep}</strong></div>
                <div style="font-size:14px;color:#ccc;margin-bottom:20px">${retryErr.message}</div>
                ${retryAuthAdvice}
                <button onclick="location.reload()" style="background:#E0CDA9;border:none;padding:12px 24px;font-size:16px;cursor:pointer;border-radius:4px">${t('reload')}</button>
              </div>
            `;
          });
      }, 500);
    });
  });

document.cookie = "access=true";

window.WSUnmute = () => {
  const b = document.getElementById('UnMutePlayer');
  if (b) b.style.display = 'none';
  if (player) player.setVolume(100);
};

})();
