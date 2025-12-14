# [UPDATE] Remember that ad-free streaming site I reverse engineered? 10 days later, it's even more ridiculous now.

So a couple weeks ago I posted about FlyX - the streaming site I built after spending 5 months reverse engineering pirate sites' "DRM" so you don't have to watch movies through a gauntlet of crypto miners and fake download buttons.

The response was insane. Thousands of you started using it. Some of you found bugs. Some of you had feature requests. Some of you just wanted to tell me I'm going to jail (still waiting on that subpoena, btw).

I've been coding like a maniac for the past 10 days. Here's what's new:

---

## 📺 Cast to Your TV (Chromecast + AirPlay)

You can finally stop squinting at your laptop like it's 2008.

- **Chromecast** - Works on Chrome/Edge. Hit the cast button, pick your device, done.
- **AirPlay** - Safari/iOS users, you're covered too.

The implementation was actually pretty clean - Remote Playback API for Chromecast, WebKit's playback target picker for AirPlay. No third-party SDK bloat. Just native browser APIs doing what they're supposed to do.

---

## 🎮 Full TV Remote / Keyboard Navigation

Built spatial navigation from scratch because apparently no one else has done this properly for web apps.

- Arrow keys navigate the entire UI
- Enter to select
- Works on Fire TV, Android TV, any device with a D-pad
- The player has its own keyboard controls (seek, volume, fullscreen, etc.)

This took way longer than it should have. Turns out calculating "which element is above this one" when you have a responsive grid layout is... not trivial. But now you can browse from your couch without touching a mouse.

---

## 📝 Subtitles Actually Work Now (29 Languages)

This was the most requested feature and honestly the most annoying to implement.

**Languages:** English, Spanish, French, German, Italian, Portuguese, Russian, Arabic, Chinese, Japanese, Korean, Dutch, Polish, Turkish, Greek, Hebrew, Hindi, Thai, Vietnamese, Indonesian, Czech, Hungarian, Romanian, Ukrainian, Danish, Finnish, Norwegian, Swedish, Portuguese (BR)

**Quality scoring** - Auto-picks the highest rated subtitle based on downloads + ratings. No more manually scrolling through 47 versions of the same subtitle.

**Upload your own** - Drop in your .SRT or .VTT when the built-in ones suck.

**Subtitle sync** - This is the one that made me want to throw my keyboard. Subs out of sync? Hit G/H to adjust timing by 0.5 second increments. No more watching with dialogue that's 2 seconds behind the action.

**Customization** - Font size, background opacity, text color, vertical position. All saved locally.

---

## 🎌 AnimeKai Integration (Anime Gets Its Own Provider)

Anime content now automatically routes to AnimeKai instead of the generic providers. Why? Because anime has different needs:

- **Sub/Dub toggle** right in the player - one click to switch
- **Remembers your preference** - if you're a dub person (no judgment... okay maybe a little), it'll always load dubs first
- **Multiple servers** - Mega, Yuki, and others with automatic fallback
- **Better quality** - AnimeKai actually gives a shit about anime, unlike the generic providers that treat it as an afterthought

The detection is automatic - if TMDB says it's Japanese animation, you get AnimeKai. No manual switching needed.

---

## 📱 Pinch-to-Zoom on Mobile

- Double-tap for 2x zoom
- Pinch up to 4x
- Crop out those annoying black bars on ultrawide content
- Single tap to pause/play

Implemented using touch event math that I definitely didn't have to rewrite three times.

---

## 🌍 Region Filter

Filter content by country. 35+ regions - US, UK, Korea, Japan, etc. See what's trending in specific countries. Your preference saves locally.

Useful for finding content that's popular in specific markets but doesn't show up in the global trending.

---

## ▶️ Continue Watching

Homepage now shows your in-progress stuff with progress bars. Click and you're right back where you left off.

- Works for movies and TV shows
- Full episode tracking (S2E7, etc.)
- Filters out stuff you've finished or barely started

All stored locally. No accounts. No tracking. Just localStorage doing its job.

---

## ▶️ Auto-Play Next Episode

For the binge watchers:

- Countdown timer at the end of episodes
- Skip button if you're impatient
- Configurable countdown time (5-30 seconds)
- Can disable it entirely if you hate it

---

## 🎛️ Other Player Improvements

- **Manual quality selection** - Auto, 1080p, 720p, 480p, etc.
- **Playback speed** - 0.5x to 2x
- **Volume memory** - Remembers your volume between sessions
- **Better buffering** - Tweaked HLS.js settings for smoother playback
- **VidSrc as primary** - More reliable than the previous default

---

## The Irony Update

Some of the pirate sites I reverse engineered have noticed FlyX. A few have started changing their obfuscation. One even added a new layer of protection.

You know what that means? They're spending engineering resources to protect their ability to serve you malware. Not to protect content they don't own. To protect their ad revenue.

Meanwhile, I'm over here providing the same content without the exploitation, for free, with the code public on GitHub. The cognitive dissonance is *chef's kiss*.

**But here's the best part:**

One of the site owners I cracked actually reached out. Not with threats. Not with a cease and desist. With *information about their competitors*.

They offered to help me crack their rivals' protection systems. Details about how other sites structure their obfuscation, where the weaknesses are, how to bypass their defenses.

There is no honor among thieves. But apparently there's spite, and spite is just as useful. The pirate streaming ecosystem is eating itself—they're so busy competing for ad revenue that they'll sabotage each other to get ahead. Meanwhile I'm just sitting here accepting free intel.

You cannot make this stuff up.

---

## Links

- **Site:** https://tv.vynx.cc
- **GitHub:** https://github.com/Vynx-Velvet/Flyx-main

Still zero ads. Still zero tracking. Still zero guilt about stealing from thieves.

Let me know if you find bugs or have feature requests. I'm clearly not sleeping anyway.

---

**TL;DR:** Added Chromecast/AirPlay casting, full TV remote navigation, 29-language subtitles with sync adjustment, dedicated anime provider with sub/dub toggle, pinch-to-zoom, region filtering, continue watching, auto-play next episode, and a bunch of player improvements. The pirate sites are mad. I am unbothered.
