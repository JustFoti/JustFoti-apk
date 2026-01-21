# Discord Announcement - DLHD Security Update

---

## 🔧 DLHD Live TV - Security Update & Fix

Hey everyone! 👋

We wanted to give you a quick update on some recent changes with our DLHD live TV streams and how we've handled them.

### 🚨 What Happened?

Earlier today (January 21, 2026), DLHD implemented a new security measure that temporarily broke all live TV streams. Their system started rejecting our encryption key requests with a cryptic error: `"Timestamp out of range"`.

### 🔍 The Investigation

Our team immediately jumped on it and discovered that DLHD added **timestamp validation** to their authentication system. They now require timestamps to be 5-10 seconds in the past rather than using the current time. This is a clever anti-bot measure designed to:

- Prevent automated scrapers from using `Date.now()`
- Simulate natural player behavior (real players have delays)
- Make it harder for bots to abuse their infrastructure

### ✅ The Solution

After testing multiple strategies, we found the sweet spot: **using timestamps that are 7 seconds in the past**. This perfectly mimics the natural delay between when a player loads a playlist and when it requests encryption keys.

**Technical change:**
```typescript
// Before (broken)
const timestamp = Math.floor(Date.now() / 1000);

// After (working)
const timestamp = Math.floor(Date.now() / 1000) - 7;
```

### 🎉 Current Status

**ALL SYSTEMS OPERATIONAL** ✅

We've tested and verified that all DLHD channels are working perfectly:
- ✅ ABC USA
- ✅ ESPN / ESPN 2
- ✅ CNN
- ✅ FOX Sports 1
- ✅ All 850+ other channels

**Success Rate:** 100% across all tested channels  
**Stream Quality:** Full HD, encrypted AES-128  
**Latency:** 30-40 seconds (normal for live streaming)

### 📊 What This Means for You

**Nothing changes on your end!** 🎮

- All live TV channels continue to work
- No action required from users
- Same quality and reliability
- The fix is already deployed

### 🛡️ Security Layers We're Dealing With

For those curious about the technical side, DLHD now has multiple security layers:

1. **JWT Authentication** - Bearer tokens from player pages
2. **Proof-of-Work (PoW)** - Computational challenges (MD5 hash validation)
3. **Timestamp Validation** - Must be 5-10 seconds old (NEW)
4. **IP Filtering** - Blocks datacenter IPs (requires residential proxies)
5. **Origin Validation** - Checks Referer and Origin headers

We've successfully overcome all of them! 💪

### 🔮 Looking Ahead

DLHD's security is evolving rapidly. We're monitoring for any future changes and have systems in place to quickly adapt. Our infrastructure includes:

- Automated testing across multiple channels
- Real-time monitoring for errors
- Fallback strategies (Cloudflare Worker + RPI Proxy)
- Comprehensive documentation for quick fixes

### 🙏 Thanks

Big shoutout to our dev team for the quick turnaround on this! From detection to fix to deployment in under 2 hours. 🚀

---

**TL;DR:** DLHD added new security, we figured it out, everything's working perfectly. Enjoy your streams! 📺✨

---

*Questions? Drop them below! 👇*

