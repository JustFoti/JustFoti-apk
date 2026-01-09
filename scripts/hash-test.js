const fs = require("fs");
const code = fs.readFileSync("1movies-860-chunk.js", "utf8");

// Extract the array from e() function
const arrayMatch = code.match(/function e\(\)\{let t=\[((?:"[^"]*",?)+)\]/);
const strings = arrayMatch[1].match(/"([^"]*)"/g).map(s => s.slice(1, -1));

console.log("Array length:", strings.length);

// Custom base64 decode
function customBase64Decode(str) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
  let t = "", n = "";
  for (let i = 0, r, a, idx = 0; a = str.charAt(idx++); ~a && (r = i % 4 ? 64 * r + a : a, i++ % 4) && (t += String.fromCharCode(255 & r >> (-2 * i & 6))))
    a = alphabet.indexOf(a);
  for (let e = 0, r = t.length; e < r; e++)
    n += "%" + ("00" + t.charCodeAt(e).toString(16)).slice(-2);
  return decodeURIComponent(n);
}

// Simulate the shuffle to find correct rotation
let arr = [...strings];
const target = 264678;

function rWithArr(n, arrToUse) {
  return customBase64Decode(arrToUse[n - 338]);
}

function checksum(arrToUse) {
  return -parseInt(rWithArr(340, arrToUse))/1*(-parseInt(rWithArr(401, arrToUse))/2)+parseInt(rWithArr(412, arrToUse))/3*(parseInt(rWithArr(431, arrToUse))/4)+-parseInt(rWithArr(358, arrToUse))/5+parseInt(rWithArr(379, arrToUse))/6*(-parseInt(rWithArr(352, arrToUse))/7)+-parseInt(rWithArr(382, arrToUse))/8+-parseInt(rWithArr(442, arrToUse))/9*(parseInt(rWithArr(429, arrToUse))/10)+parseInt(rWithArr(425, arrToUse))/11;
}

// Find the correct rotation
let foundRotation = -1;
for (let rotation = 0; rotation < strings.length; rotation++) {
  try {
    const cs = checksum(arr);
    if (cs === target) {
      console.log("Found rotation by checksum:", rotation);
      foundRotation = rotation;
      break;
    }
  } catch (e) {}
  arr.push(arr.shift());
}

// The checksum uses different indices than the hash construction
// Checksum indices: 340, 401, 412, 431, 358, 379, 352, 382, 442, 429, 425
// These translate to: 2, 63, 74, 93, 20, 41, 14, 44, 104, 91, 87

// Hash construction indices: 392, 409, etc.
// These translate to: 54, 71, etc.

// Let me check what the checksum indices decode to at rotation 104
console.log("\nChecksum indices at rotation 104:");
arr = [...strings];
for (let i = 0; i < 104; i++) arr.push(arr.shift());
const checksumIndices = [340, 401, 412, 431, 358, 379, 352, 382, 442, 429, 425];
checksumIndices.forEach(idx => {
  const arrIdx = idx - 338;
  const decoded = customBase64Decode(arr[arrIdx]);
  const parsed = parseInt(decoded);
  console.log("  r(" + idx + ") = arr[" + arrIdx + "] = " + decoded + " -> parseInt = " + parsed);
});

// Reset and use rotation 104
arr = [...strings];
for (let i = 0; i < 104; i++) arr.push(arr.shift());

// Use the shuffled array
const decoded = arr.map(s => customBase64Decode(s));
console.log("First 20 decoded after shuffle:");
decoded.slice(0, 20).forEach((s, i) => console.log("  [" + i + "] " + s));

// Check specific indices
console.log("\nSpecific indices:");
console.log("  r(359,-116) = decoded[21] =", decoded[21]); // 359-338=21
console.log("  r(444,0) = decoded[106] =", decoded[106]); // 444-338=106
console.log("  r(346,-168) = decoded[8] =", decoded[8]); // 346-338=8

// t(e, tt, n, a) = r(n - 770, e)
// t(1261,1240,1219,1216) = r(1219-770, 1261) = r(449, 1261) = decoded[449-338] = decoded[111]
// t(1141,1199,1144,1144) = r(1144-770, 1141) = r(374, 1141) = decoded[374-338] = decoded[36]
console.log("  t(1261,1240,1219,1216) = decoded[111] =", decoded[111]); // input encoding
console.log("  t(1141,1199,1144,1144) = decoded[36] =", decoded[36]); // output encoding
console.log("  t(1225,1254,1202,1173) = decoded[" + (1202-770-338) + "] =", decoded[1202-770-338]); // property name

// Show hex-like strings
console.log("\nHex-like decoded strings:");
decoded.forEach((s, i) => {
  if (/^[a-f0-9]{8,}$/.test(s)) {
    console.log("  [" + i + "] " + s);
  }
});

// r(n, e) returns decoded[n - 338]
function r(n, e) { return decoded[n - 338] || "[INVALID]"; }
function t(e, tt, n, a) { return r(n - 770, e); }

// Build hash
const parts = [
  r(392, -33), r(409, -34), t(1184, 1222, 1178, 1176),
  r(381, -150), r(344, -129), r(364, -148), r(413, -112), r(362, -121),
  "pTGy82DLIz",
  t(1188, 1196, 1204, 1193), t(1138, 1140, 1194, 1196),
  t(1157, 1208, 1193, 1167), t(1201, 1201, 1180, 1149),
  "pliKjWPhvP",
  t(1138, 1161, 1118, 1127), t(1219, 1223, 1208, 1156),
  t(1175, 1146, 1167, 1151), t(1113, 1090, 1111, 1071),
  r(360, -94),
  "0363-4e1b-5482-8d76-",
  t(1136, 1178, 1186, 1229),
  "4b/e993fc0bc499fdfb502f96b8596",
  r(377, -72),
  t(1092, 1125, 1113, 1150), t(1233, 1152, 1196, 1215),
  r(433, -37), r(389, -82), r(386, -58),
  "88bf9898b9",
  t(1247, 1238, 1191, 1160), r(399, -90),
  "913b00773/ar"
];

console.log("\nHash parts:");
parts.forEach((p, i) => console.log("  [" + i + "] " + p));
console.log("\nFull:", parts.join(""));


// Check what r(368,-104) returns (the endpoint)
console.log("\nr(368,-104) =", r(368, -104));
console.log("r(394,-130) =", r(394, -130));

// Test the API
async function testAPI() {
  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
  
  // Get pageData
  const pageRes = await fetch('https://111movies.com/movie/550', { headers: HEADERS });
  const pageHtml = await pageRes.text();
  const nextDataMatch = pageHtml.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  const nextData = JSON.parse(nextDataMatch[1]);
  const pageData = nextData.props?.pageProps?.data;
  
  console.log("\npageData:", pageData?.substring(0, 50) + "...");
  
  // Build API URL - the hash includes /ar, and endpoint is /sr
  // URL format: /{hash_with_ar}/{pageData}/sr
  // But the hash starts with h/ which creates: /h/...
  // So the full URL is: /h/APA91Pu8.../ar/{pageData}/sr
  const hashWithAr = parts.join("");
  
  // The pageData needs to be encoded using the character substitution
  // For now, let's try with the raw pageData
  const apiUrl = "https://111movies.com/" + hashWithAr + "/" + pageData + "/sr";
  console.log("API URL:", apiUrl.substring(0, 150) + "...");
  console.log("Full URL length:", apiUrl.length);
  
  // Try the API
  const apiRes = await fetch(apiUrl, {
    headers: {
      ...HEADERS,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/octet-stream',
      'x-cache-token': 'IWllVsuBx0Iy',
    }
  });
  
  console.log("API Response:", apiRes.status);
  const body = await apiRes.text();
  console.log("Body:", body.substring(0, 500));
}

testAPI().catch(console.error);
