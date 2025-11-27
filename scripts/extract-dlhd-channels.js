/**
 * Extract ALL channels from DaddyLiveHD HTML file
 * This script parses the saved HTML and extracts channel data
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', '..', 'reverse-engineering-output', 'pages', '24_7 Channels _ DaddyLiveHD - Live Sports Streaming Free - DaddyLiveHD.sx - DLHD.html');

console.log('Reading HTML file...');
const html = fs.readFileSync(htmlPath, 'utf-8');

// Extract all channel cards using regex
const channelRegex = /<a class="card" href="https:\/\/dlhd\.dad\/watch\.php\?id=(\d+)" data-title="([^"]*)" data-first="([^"]*)">[\s\S]*?<div class="card__title">([^<]*)<\/div>/g;

const channels = [];
let match;

while ((match = channelRegex.exec(html)) !== null) {
  const [, id, dataTitle, firstLetter, displayName] = match;
  channels.push({
    id: parseInt(id),
    name: displayName.trim(),
    searchName: dataTitle.toLowerCase(),
    firstLetter: firstLetter.toUpperCase()
  });
}

console.log(`Found ${channels.length} channels`);

// Categorize channels by type/network
function categorizeChannel(name) {
  const nameLower = name.toLowerCase();
  
  // Sports Networks
  if (nameLower.includes('espn')) return { category: 'Sports', subcategory: 'ESPN' };
  if (nameLower.includes('fox sports') || nameLower.includes('fanduel sports')) return { category: 'Sports', subcategory: 'Fox Sports' };
  if (nameLower.includes('bein')) return { category: 'Sports', subcategory: 'beIN Sports' };
  if (nameLower.includes('sky sports')) return { category: 'Sports', subcategory: 'Sky Sports' };
  if (nameLower.includes('dazn')) return { category: 'Sports', subcategory: 'DAZN' };
  if (nameLower.includes('eurosport')) return { category: 'Sports', subcategory: 'Eurosport' };
  if (nameLower.includes('arena sport')) return { category: 'Sports', subcategory: 'Arena Sport' };
  if (nameLower.includes('supersport')) return { category: 'Sports', subcategory: 'SuperSport' };
  if (nameLower.includes('tnt sports')) return { category: 'Sports', subcategory: 'TNT Sports' };
  if (nameLower.includes('bt sport')) return { category: 'Sports', subcategory: 'BT Sport' };
  if (nameLower.includes('nba tv') || nameLower.includes('nfl network') || nameLower.includes('nhl network') || nameLower.includes('mlb network')) return { category: 'Sports', subcategory: 'League Networks' };
  if (nameLower.includes('golf') || nameLower.includes('tennis') || nameLower.includes('cricket') || nameLower.includes('fight') || nameLower.includes('wwe') || nameLower.includes('ufc')) return { category: 'Sports', subcategory: 'Specialty Sports' };
  if (nameLower.includes('sport') || nameLower.includes('laliga') || nameLower.includes('premier') || nameLower.includes('football')) return { category: 'Sports', subcategory: 'Other Sports' };
  
  // News
  if (nameLower.includes('cnn') || nameLower.includes('fox news') || nameLower.includes('msnbc') || nameLower.includes('bbc news') || nameLower.includes('news')) return { category: 'News', subcategory: 'News' };
  
  // Entertainment Networks
  if (nameLower.includes('hbo')) return { category: 'Entertainment', subcategory: 'HBO' };
  if (nameLower.includes('showtime')) return { category: 'Entertainment', subcategory: 'Showtime' };
  if (nameLower.includes('starz')) return { category: 'Entertainment', subcategory: 'Starz' };
  if (nameLower.includes('cinemax')) return { category: 'Entertainment', subcategory: 'Cinemax' };
  if (nameLower.includes('canal+') || nameLower.includes('canal +')) return { category: 'Entertainment', subcategory: 'Canal+' };
  
  // Broadcast Networks
  if (nameLower.includes('abc') || nameLower.includes('cbs') || nameLower.includes('nbc') || nameLower.includes('fox ') || nameLower.includes('cw ')) return { category: 'Broadcast', subcategory: 'US Networks' };
  if (nameLower.includes('bbc') || nameLower.includes('itv') || nameLower.includes('channel 4') || nameLower.includes('channel 5')) return { category: 'Broadcast', subcategory: 'UK Networks' };
  
  // Kids/Family
  if (nameLower.includes('disney') || nameLower.includes('cartoon') || nameLower.includes('nickelodeon') || nameLower.includes('nick ')) return { category: 'Kids & Family', subcategory: 'Kids' };
  
  // Movies
  if (nameLower.includes('movie') || nameLower.includes('film') || nameLower.includes('cinema') || nameLower.includes('tcm')) return { category: 'Movies', subcategory: 'Movies' };
  
  // Documentary
  if (nameLower.includes('discovery') || nameLower.includes('history') || nameLower.includes('nat geo') || nameLower.includes('national geographic') || nameLower.includes('animal planet')) return { category: 'Documentary', subcategory: 'Documentary' };
  
  // Regional by country
  if (nameLower.includes('usa') || nameLower.includes('america')) return { category: 'Regional', subcategory: 'USA' };
  if (nameLower.includes('uk') || nameLower.includes('britain')) return { category: 'Regional', subcategory: 'UK' };
  if (nameLower.includes('spain') || nameLower.includes('spanish') || nameLower.includes('es ')) return { category: 'Regional', subcategory: 'Spain' };
  if (nameLower.includes('france') || nameLower.includes('french')) return { category: 'Regional', subcategory: 'France' };
  if (nameLower.includes('germany') || nameLower.includes('german') || nameLower.includes(' de')) return { category: 'Regional', subcategory: 'Germany' };
  if (nameLower.includes('italy') || nameLower.includes('italian')) return { category: 'Regional', subcategory: 'Italy' };
  if (nameLower.includes('portugal') || nameLower.includes('portuguese')) return { category: 'Regional', subcategory: 'Portugal' };
  if (nameLower.includes('poland') || nameLower.includes('polish')) return { category: 'Regional', subcategory: 'Poland' };
  if (nameLower.includes('brazil') || nameLower.includes('brasil')) return { category: 'Regional', subcategory: 'Brazil' };
  if (nameLower.includes('argentina')) return { category: 'Regional', subcategory: 'Argentina' };
  if (nameLower.includes('mexico') || nameLower.includes(' mx')) return { category: 'Regional', subcategory: 'Mexico' };
  if (nameLower.includes('canada') || nameLower.includes(' ca')) return { category: 'Regional', subcategory: 'Canada' };
  if (nameLower.includes('australia') || nameLower.includes(' au')) return { category: 'Regional', subcategory: 'Australia' };
  if (nameLower.includes('turkey') || nameLower.includes('turkish')) return { category: 'Regional', subcategory: 'Turkey' };
  if (nameLower.includes('arabic') || nameLower.includes('arab') || nameLower.includes('uae') || nameLower.includes('qatar')) return { category: 'Regional', subcategory: 'Middle East' };
  if (nameLower.includes('russia') || nameLower.includes('russian')) return { category: 'Regional', subcategory: 'Russia' };
  if (nameLower.includes('serbia') || nameLower.includes('croatia') || nameLower.includes('bulgaria') || nameLower.includes('romania')) return { category: 'Regional', subcategory: 'Eastern Europe' };
  if (nameLower.includes('greece') || nameLower.includes('greek') || nameLower.includes('cyprus')) return { category: 'Regional', subcategory: 'Greece/Cyprus' };
  if (nameLower.includes('netherlands') || nameLower.includes(' nl')) return { category: 'Regional', subcategory: 'Netherlands' };
  if (nameLower.includes('sweden') || nameLower.includes('denmark') || nameLower.includes('norway')) return { category: 'Regional', subcategory: 'Scandinavia' };
  if (nameLower.includes('israel')) return { category: 'Regional', subcategory: 'Israel' };
  if (nameLower.includes('malaysia') || nameLower.includes('astro')) return { category: 'Regional', subcategory: 'Malaysia' };
  if (nameLower.includes('africa') || nameLower.includes('dstv')) return { category: 'Regional', subcategory: 'Africa' };
  
  return { category: 'General', subcategory: 'Other' };
}

// Add categories to channels
const categorizedChannels = channels.map(ch => ({
  ...ch,
  ...categorizeChannel(ch.name)
}));

// Sort by category, then subcategory, then name
categorizedChannels.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  if (a.subcategory !== b.subcategory) return a.subcategory.localeCompare(b.subcategory);
  return a.name.localeCompare(b.name);
});

// Output statistics
const stats = {};
categorizedChannels.forEach(ch => {
  if (!stats[ch.category]) stats[ch.category] = {};
  if (!stats[ch.category][ch.subcategory]) stats[ch.category][ch.subcategory] = 0;
  stats[ch.category][ch.subcategory]++;
});

console.log('\n=== Channel Statistics ===');
Object.keys(stats).sort().forEach(cat => {
  console.log(`\n${cat}:`);
  Object.keys(stats[cat]).sort().forEach(sub => {
    console.log(`  ${sub}: ${stats[cat][sub]} channels`);
  });
});

// Save to JSON file
const outputPath = path.join(__dirname, '..', '..', 'data', 'dlhd-channels.json');
fs.writeFileSync(outputPath, JSON.stringify({
  totalChannels: categorizedChannels.length,
  lastUpdated: new Date().toISOString(),
  categories: stats,
  channels: categorizedChannels
}, null, 2));

console.log(`\nSaved ${categorizedChannels.length} channels to ${outputPath}`);

// Also create a TypeScript types file
const typesContent = `// Auto-generated from DaddyLiveHD channel extraction
// Total channels: ${categorizedChannels.length}

export interface DLHDChannel {
  id: number;
  name: string;
  searchName: string;
  firstLetter: string;
  category: string;
  subcategory: string;
}

export const DLHD_CATEGORIES = ${JSON.stringify(Object.keys(stats).sort(), null, 2)} as const;

export type DLHDCategory = typeof DLHD_CATEGORIES[number];
`;

const typesPath = path.join(__dirname, '..', '..', 'app', 'types', 'dlhd-channels.ts');
fs.writeFileSync(typesPath, typesContent);
console.log(`Saved types to ${typesPath}`);
