/**
 * Decode video sources from obfuscated JWPlayer config
 */

const dict = '||||||||||player|if|||||jw|||var|function||||links|tracks|submenu|settings|||item||svg||lastt|||||||script|audioTracks||on||hls2|hls3|jwplayer|https|hls4|589|position|else|file|icon|code|link|length|false|aria|attr|true|div|tott|currentFile|seek|newFile|path|ggima|document|data|63811935||return|name|||active||ttgzuctcyihe4z|get|ls|rewind||tt|sec|769|240|60009|html|1763350833|op|dl|com|date|prevt|dt|textContent|match|doc|text|ffffff||pg8s50jw8kzp|current_audio|getAudioTracks|removeClass||expanded||checked|addButton|hls|type|load|hide|log|console|adb|xyz|2215963772d9f85e8543258e031d3bf5|185|hash|gzuctcyihe4z|vvplay|new|itads|vvad||100|master|setCurrentAudioTrack|audio_name|for|audio_set|open|controls|playbackRates|captions|event|stop|res|getPlaylistItem|ready||play|||currentTracks||||insertAfter|detach|ff00|button|getPosition|974|887|013|867|178|focusable|viewBox|class|2000|org|w3|www|http|xmlns|ff11|06475|23525|29374|97928|30317|31579|29683|38421||30626||72072|H|track_name||appendChild|body|fviews|player4u|referer|embed|file_code|view|js|src|createElement|video_ad|doPlay|value|loaded|documentElement|parseFromString|DOMParser|startsWith|xtype|playAd|vast|time|uas|FFFFFF|jpg|pixoraa|3564||urlset||609nu51a4w0l_|00147|01|i60k6cbfsa8z|m3u8|300|English|setTimeout|default_audio|getItem|localStorage|dualSound|addClass|quality|hasClass|toggleClass|Track|Audio|dualy|images|mousedown|buttons|topbar|catch|ok|then|HEAD|method||fetch|firstFrame|once|null|getConfig|error|Rewind||778Z||214|2A4|3H209|3v19|9c4|7l41|9a6|3c0|1v19|4H79|3h48|8H146|3a4|2v125|130||1Zm162|4v62|13a4|51l|278Zm|278|1S103|1s6|3Zm||078a21|131|M113|Forward|69999|88605|21053|03598|02543|99999|72863|77056|04577|422413|163|210431|860275|03972|689569|893957|124979|52502|174985|57502|04363|13843|480087|93574|99396|160|76396|164107|63589|03604|125|778|993957|rewind2|set_audio_track|onload|onerror|ima3|sdkloader|googleapis|imasdk|||const|over_player_msg|Secure|None|SameSite|uqloads|domain|toGMTString|expires|cookie|1000|getTime|setTime|Date|createCookieSec|pause|remove|show|complete|jsonp|609nu51a4w0l|file_real|file_id|parseInt|ss|view4|vectorrab|logs|post|viewable|ttl|round|Math|set|S|async|trim|pickDirect|direct|encodeURIComponent|unescape|btoa|base64|xml|application|forEach|slow|fadeIn|video_ad_fadein|cache|no|Cache|Content|headers|ajaxSetup|v2done|pop3done|vastdone2|vastdone1|playbackRateControls|cast|streamhg|aboutlink|StreamHG|abouttext|720p|363|1080p|726|4K|2075|qualityLabels|insecure|vpaidmode|client|advertising|fontOpacity|backgroundOpacity|Tahoma|fontFamily|backgroundColor|color|userFontScale|thumbnails|kind|gzuctcyihe4z0000|url|get_slides|androidhls|menus|progress|timeslider|icons|controlbar|skin|auto|preload|duration|uniform|stretching|height|width|image|sources|debug|setup|vplayer|txt|cyou|stellarcrestacademy|739408|1763394033|kjhhiuahiuhgihdf||BVwaU6uDqaMf1Psyo8sv_Q|stream|215845|asn|p2|p1|500|sp|srv|129600|wA|4OzQ5bRHlo5wxNWjQ2FKhcgTzbogijp01Vg5Ut48|premilkyway'.split('|');

function decode(encoded) {
  return encoded.replace(/\b([0-9a-z]+)\b/g, (match) => {
    const index = parseInt(match, 36);
    return dict[index] || match;
  });
}

// The obfuscated sources object from the HTML:
// o={"1a":"1d://66.cp.2m/1a/65/64/63,n,h,x,.61/3n.67?t=co-cn&s=2j&e=cm&f=20&cl=2w&i=0.4&ck=cj&ci=2w&ch=2w&cg=cf","1e":"/ce/cd/cb/ca/c9/3n.67","1b":"1d://66.c8.c7/2w/1b/65/64/63,n,h,x,.61/3n.c6"}

const sources = {
  "1a": "1d://66.cp.2m/1a/65/64/63,n,h,x,.61/3n.67?t=co-cn&s=2j&e=cm&f=20&cl=2w&i=0.4&ck=cj&ci=2w&ch=2w&cg=cf",
  "1e": "/ce/cd/cb/ca/c9/3n.67",
  "1b": "1d://66.c8.c7/2w/1b/65/64/63,n,h,x,.61/3n.c6"
};

console.log('🎯 DECODED VIDEO SOURCES:\n');

for (const [key, value] of Object.entries(sources)) {
  const decodedKey = decode(key);
  const decodedValue = decode(value);
  console.log(`${decodedKey}: ${decodedValue}`);
}
