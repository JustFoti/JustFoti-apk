const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../reverse-engineering-output/pages/24_7 Channels _ DaddyLiveHD - Live Sports Streaming Free - DaddyLiveHD.sx - DLHD.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract all channel cards using regex
const regex = /<a class="card" href="https:\/\/dlhd\.dad\/watch\.php\?id=(\d+)" data-title="([^"]+)" data-first="([^"]+)">\s*<div class="card__title">([^<]+)<\/div>/g;

// Decode HTML entities
function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num));
}

const channels = [];
let match;
while ((match = regex.exec(html)) !== null) {
  const name = decodeHtmlEntities(match[4].trim());
  const id = match[1];
  
  // Categorize based on name
  let category = 'entertainment';
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('sport') || nameLower.includes('espn') || nameLower.includes('fox sports') || 
      nameLower.includes('bein') || nameLower.includes('eurosport') || nameLower.includes('dazn') ||
      nameLower.includes('arena') || nameLower.includes('sky sport') || nameLower.includes('btn') ||
      nameLower.includes('nba') || nameLower.includes('nfl') || nameLower.includes('mlb') ||
      nameLower.includes('nhl') || nameLower.includes('golf') || nameLower.includes('tennis') ||
      nameLower.includes('cricket') || nameLower.includes('supersport') || nameLower.includes('tnt sports') ||
      nameLower.includes('premier') || nameLower.includes('laliga') || nameLower.includes('eleven') ||
      nameLower.includes('match') || nameLower.includes('movistar') || nameLower.includes('cosmote') ||
      nameLower.includes('canal+ sport') || nameLower.includes('fanduel') || nameLower.includes('altitude')) {
    category = 'sports';
  } else if (nameLower.includes('news') || nameLower.includes('cnn') || nameLower.includes('msnbc') ||
             nameLower.includes('fox news') || nameLower.includes('bbc news') || nameLower.includes('cnbc')) {
    category = 'news';
  } else if (nameLower.includes('movie') || nameLower.includes('hbo') || nameLower.includes('cinemax') ||
             nameLower.includes('showtime') || nameLower.includes('starz') || nameLower.includes('film') ||
             nameLower.includes('cinema') || nameLower.includes('tcm') || nameLower.includes('amc')) {
    category = 'movies';
  } else if (nameLower.includes('cartoon') || nameLower.includes('disney') || nameLower.includes('nick') ||
             nameLower.includes('boomerang') || nameLower.includes('kids')) {
    category = 'kids';
  } else if (nameLower.includes('discovery') || nameLower.includes('nat geo') || nameLower.includes('history') ||
             nameLower.includes('animal') || nameLower.includes('science') || nameLower.includes('travel')) {
    category = 'documentary';
  }
  
  // Determine country/region
  let country = 'international';
  if (nameLower.includes('usa') || nameLower.includes('us ') || nameLower.endsWith(' us')) country = 'usa';
  else if (nameLower.includes('uk') || nameLower.includes('british')) country = 'uk';
  else if (nameLower.includes('spain') || nameLower.includes('spanish') || nameLower.includes(' es')) country = 'spain';
  else if (nameLower.includes('france') || nameLower.includes('french')) country = 'france';
  else if (nameLower.includes('germany') || nameLower.includes(' de')) country = 'germany';
  else if (nameLower.includes('italy') || nameLower.includes('italian')) country = 'italy';
  else if (nameLower.includes('portugal') || nameLower.includes(' pt')) country = 'portugal';
  else if (nameLower.includes('poland') || nameLower.includes('polish')) country = 'poland';
  else if (nameLower.includes('brazil') || nameLower.includes('brasil')) country = 'brazil';
  else if (nameLower.includes('argentina')) country = 'argentina';
  else if (nameLower.includes('mexico') || nameLower.includes(' mx')) country = 'mexico';
  else if (nameLower.includes('canada') || nameLower.includes(' ca')) country = 'canada';
  else if (nameLower.includes('australia') || nameLower.includes(' au')) country = 'australia';
  else if (nameLower.includes('turkey') || nameLower.includes('turkish')) country = 'turkey';
  else if (nameLower.includes('arabic') || nameLower.includes('mena') || nameLower.includes('uae') || 
           nameLower.includes('qatar') || nameLower.includes('dubai') || nameLower.includes('abu dhabi')) country = 'middle-east';
  else if (nameLower.includes('serbia') || nameLower.includes('croatia') || nameLower.includes('bih')) country = 'balkans';
  else if (nameLower.includes('russia') || nameLower.includes('russian')) country = 'russia';
  else if (nameLower.includes('netherlands') || nameLower.includes(' nl')) country = 'netherlands';
  else if (nameLower.includes('greece') || nameLower.includes('greek')) country = 'greece';
  else if (nameLower.includes('israel')) country = 'israel';
  else if (nameLower.includes('malaysia')) country = 'malaysia';
  else if (nameLower.includes('denmark')) country = 'denmark';
  else if (nameLower.includes('sweden')) country = 'sweden';
  else if (nameLower.includes('hungary')) country = 'hungary';
  else if (nameLower.includes('romania')) country = 'romania';
  else if (nameLower.includes('bulgaria')) country = 'bulgaria';
  else if (nameLower.includes('cyprus')) country = 'cyprus';
  
  channels.push({
    id,
    name,
    category,
    country,
    firstLetter: match[3]
  });
}

console.log('Total channels extracted:', channels.length);

// Group by category
const byCategory = {};
channels.forEach(ch => {
  if (!byCategory[ch.category]) byCategory[ch.category] = [];
  byCategory[ch.category].push(ch);
});

console.log('\nChannels by category:');
Object.entries(byCategory).forEach(([cat, chs]) => {
  console.log(`  ${cat}: ${chs.length}`);
});

// Save to JSON
const outputPath = path.join(__dirname, '../data/dlhd-channels.json');
fs.writeFileSync(outputPath, JSON.stringify({
  totalChannels: channels.length,
  lastUpdated: new Date().toISOString(),
  channels
}, null, 2));

console.log('\nSaved to:', outputPath);
