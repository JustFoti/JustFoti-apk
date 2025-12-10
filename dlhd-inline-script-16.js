
(function(){
  'use strict';

  const var_aa1fa76706      = "a93fd3e1d2c6221f8f6ce1208821c075544e46e9c8c4e15e123343bf93d848c7";
  const var_4e12ffd85e = "premium51";
  const var_0736be66bc    = "US";
  const var_d083796634  = "1765333288";
  const var_38f26a5b58     = "1765336888";

  let isSandboxed = false;

  function detectSandbox() {
    try {
      if (window.top !== window.self) {
        try {
          void window.top.location.href;
        } catch (e) {
          isSandboxed = true;
          console.log('S1');
          return;
        }
      }
      const obj = document.createElement('object');
      obj.data = 'data:application/pdf;base64,aG1t';
      obj.width = 1;
      obj.height = 1;
      obj.style.position = 'absolute';
      obj.style.top = '-500px';
      obj.style.left = '-500px';
      obj.style.visibility = 'hidden';
      obj.onerror = function() {
        isSandboxed = true;
        console.log('S2');
        this.remove();
      };
      document.body.appendChild(obj);
    } catch (err) {
      isSandboxed = true;
      console.log('S3');
    }
  }

  function fetchWithRetry(url, retries, delay, init) {
    return new Promise((resolve, reject) => {
      const attempt = () => {
        fetch(url, init)
          .then(r => { if (!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
          .then(resolve)
          .catch(err => (retries--) ? setTimeout(attempt, delay) : reject(err));
      };
      attempt();
    });
  }

  function runAuthCheck() {
    if (isSandboxed) {
      console.log('X1: sandboxed');
      return;
    }

    // Heartbeat will always run (only sandbox check remains)
    const formData = new FormData();
    formData.append('channelKey', var_4e12ffd85e);
    formData.append('country', var_0736be66bc);
    formData.append('timestamp', var_d083796634);
    formData.append('expiry', var_38f26a5b58);
    formData.append('token', var_aa1fa76706);

    fetchWithRetry('https://security.giokko.ru/auth2.php', 2, 500, { method:'POST', body: formData })
      .then(data => {
        console.log('OK');
      })
      .catch(e => console.log('E1'));
  }

  window.addEventListener('load', () => {
    detectSandbox();

    // First call immediately on page load
    runAuthCheck();

    // Then repeat every 60 seconds
    setInterval(runAuthCheck, 160000);
  });

})();
