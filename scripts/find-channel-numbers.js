/**
 * Script to find channel numbers for US cable channels in IPTV portal
 * This will help us build a static mapping of channel numbers
 */

const PORTAL_URL = process.env.PORTAL_URL || 'http://line.protv.cc/c/';
const MAC_ADDRESS = process.env.MAC_ADDRESS || '00:1A:79:00:00:01'; // Replace with your MAC

// Our target channels to find
const TARGET_CHANNELS = [
  // Broadcast
  { name: 'ABC', aliases: ['ABC', 'WABC', 'KABC', 'ABC EAST', 'ABC WEST'] },
  { name: 'CBS', aliases: ['CBS', 'WCBS', 'KCBS', 'CBS EAST', 'CBS WEST'] },
  { name: 'NBC', aliases: ['NBC', 'WNBC', 'KNBC', 'NBC EAST', 'NBC WEST'] },
  { name: 'FOX', aliases: ['FOX', 'WNYW', 'KTTV', 'FOX EAST', 'FOX WEST'] },
  { name: 'PBS', aliases: ['PBS', 'WNET', 'PBS EAST', 'PBS WEST'] },
  { name: 'CW', aliases: ['CW', 'THE CW', 'CW EAST', 'CW WEST'] },
  
  // News
  { name: 'CNN', aliases: ['CNN', 'CNN HD', 'CNN US'] },
  { name: 'Fox News', aliases: ['FOX NEWS', 'FNC', 'FOX NEWS CHANNEL', 'FOX NEWS HD'] },
  { name: 'MSNBC', aliases: ['MSNBC', 'MSNBC HD'] },
  { name: 'CNBC', aliases: ['CNBC', 'CNBC US', 'CNBC HD'] },
  { name: 'Fox Business', aliases: ['FOX BUSINESS', 'FBN'] },
  { name: 'Bloomberg', aliases: ['BLOOMBERG', 'BLOOMBERG TV'] },
  { name: 'Newsmax', aliases: ['NEWSMAX', 'NEWSMAX TV'] },
  { name: 'C-SPAN', aliases: ['C-SPAN', 'CSPAN', 'C SPAN'] },
  { name: 'HLN', aliases: ['HLN', 'HEADLINE NEWS'] },
  { name: 'Weather Channel', aliases: ['WEATHER CHANNEL', 'TWC', 'THE WEATHER CHANNEL'] },
  
  // Sports
  { name: 'ESPN', aliases: ['ESPN', 'ESPN HD', 'ESPN US'] },
  { name: 'ESPN2', aliases: ['ESPN2', 'ESPN 2', 'ESPN2 HD'] },
  { name: 'ESPNU', aliases: ['ESPNU', 'ESPN U'] },
  { name: 'ESPNews', aliases: ['ESPNEWS', 'ESPN NEWS'] },
  { name: 'FS1', aliases: ['FS1', 'FOX SPORTS 1', 'FOX SPORTS'] },
  { name: 'FS2', aliases: ['FS2', 'FOX SPORTS 2'] },
  { name: 'NFL Network', aliases: ['NFL NETWORK', 'NFLN', 'NFL'] },
  { name: 'NFL RedZone', aliases: ['NFL REDZONE', 'REDZONE', 'RED ZONE'] },
  { name: 'MLB Network', aliases: ['MLB NETWORK', 'MLBN', 'MLB'] },
  { name: 'NBA TV', aliases: ['NBA TV', 'NBATV', 'NBA NETWORK'] },
  { name: 'NHL Network', aliases: ['NHL NETWORK', 'NHLN'] },
  { name: 'Golf Channel', aliases: ['GOLF CHANNEL', 'GOLF'] },
  { name: 'Tennis Channel', aliases: ['TENNIS CHANNEL', 'TENNIS'] },
  { name: 'CBS Sports', aliases: ['CBS SPORTS', 'CBSSN', 'CBS SPORTS NETWORK'] },
  { name: 'ACC Network', aliases: ['ACC NETWORK', 'ACCN', 'ACC'] },
  { name: 'SEC Network', aliases: ['SEC NETWORK', 'SECN', 'SEC'] },
  { name: 'Big Ten', aliases: ['BIG TEN', 'BTN', 'BIG TEN NETWORK'] },
  
  // Entertainment
  { name: 'USA', aliases: ['USA', 'USA NETWORK', 'USA HD'] },
  { name: 'TNT', aliases: ['TNT', 'TNT US', 'TNT HD'] },
  { name: 'TBS', aliases: ['TBS', 'TBS US', 'TBS HD'] },
  { name: 'FX', aliases: ['FX', 'FX US', 'FX HD'] },
  { name: 'FXX', aliases: ['FXX', 'FXX HD'] },
  { name: 'AMC', aliases: ['AMC', 'AMC US', 'AMC HD'] },
  { name: 'Bravo', aliases: ['BRAVO', 'BRAVO HD'] },
  { name: 'E!', aliases: ['E!', 'E ENTERTAINMENT', 'E NETWORK'] },
  { name: 'Syfy', aliases: ['SYFY', 'SCI FI', 'SCIFI'] },
  { name: 'Lifetime', aliases: ['LIFETIME', 'LIFETIME HD'] },
  { name: 'Hallmark', aliases: ['HALLMARK', 'HALLMARK CHANNEL'] },
  { name: 'Paramount', aliases: ['PARAMOUNT', 'PARAMOUNT NETWORK'] },
  { name: 'Comedy Central', aliases: ['COMEDY CENTRAL', 'COMEDY'] },
  { name: 'TV Land', aliases: ['TV LAND', 'TVLAND'] },
  { name: 'BET', aliases: ['BET', 'BET HD'] },
  { name: 'Freeform', aliases: ['FREEFORM', 'ABC FAMILY'] },
  { name: 'truTV', aliases: ['TRUTV', 'TRU TV'] },
  
  // Movies & Premium
  { name: 'HBO', aliases: ['HBO', 'HBO HD', 'HBO US', 'HBO EAST', 'HBO WEST'] },
  { name: 'HBO 2', aliases: ['HBO 2', 'HBO2', 'HBO 2 EAST', 'HBO 2 WEST'] },
  { name: 'HBO Signature', aliases: ['HBO SIGNATURE', 'HBO SIG'] },
  { name: 'HBO Family', aliases: ['HBO FAMILY', 'HBO FAM'] },
  { name: 'Cinemax', aliases: ['CINEMAX', 'MAX', 'CINEMAX HD'] },
  { name: 'Showtime', aliases: ['SHOWTIME', 'SHO', 'SHOWTIME HD', 'SHOWTIME EAST', 'SHOWTIME WEST'] },
  { name: 'Showtime 2', aliases: ['SHOWTIME 2', 'SHO2', 'SHO 2'] },
  { name: 'Starz', aliases: ['STARZ', 'STARZ HD', 'STARZ EAST', 'STARZ WEST'] },
  { name: 'Starz Encore', aliases: ['ENCORE', 'STARZ ENCORE'] },
  { name: 'MGM+', aliases: ['MGM+', 'EPIX', 'MGM PLUS'] },
  { name: 'TCM', aliases: ['TCM', 'TURNER CLASSIC MOVIES'] },
  
  // Kids
  { name: 'Disney', aliases: ['DISNEY', 'DISNEY CHANNEL', 'DISNEY HD', 'DISNEY EAST', 'DISNEY WEST'] },
  { name: 'Disney Junior', aliases: ['DISNEY JUNIOR', 'DISNEY JR'] },
  { name: 'Disney XD', aliases: ['DISNEY XD'] },
  { name: 'Nickelodeon', aliases: ['NICKELODEON', 'NICK', 'NICK HD', 'NICK EAST', 'NICK WEST'] },
  { name: 'Nick Jr', aliases: ['NICK JR', 'NICKJR', 'NICK JUNIOR'] },
  { name: 'Cartoon Network', aliases: ['CARTOON NETWORK', 'CN', 'CARTOON', 'CN EAST', 'CN WEST'] },
  { name: 'Boomerang', aliases: ['BOOMERANG', 'BOOM'] },
  
  // Lifestyle
  { name: 'HGTV', aliases: ['HGTV', 'HGTV HD'] },
  { name: 'Food Network', aliases: ['FOOD NETWORK', 'FOOD', 'FOOD HD'] },
  { name: 'TLC', aliases: ['TLC', 'TLC HD'] },
  { name: 'Travel Channel', aliases: ['TRAVEL CHANNEL', 'TRAVEL'] },
  { name: 'A&E', aliases: ['A&E', 'A AND E', 'AE', 'A&E HD'] },
  
  // Documentary
  { name: 'Discovery', aliases: ['DISCOVERY', 'DISCOVERY CHANNEL', 'DISC'] },
  { name: 'History', aliases: ['HISTORY', 'HISTORY CHANNEL', 'HISTORY HD'] },
  { name: 'National Geographic', aliases: ['NATIONAL GEOGRAPHIC', 'NAT GEO', 'NATGEO'] },
  { name: 'Animal Planet', aliases: ['ANIMAL PLANET', 'ANIMAL'] },
  { name: 'Science Channel', aliases: ['SCIENCE CHANNEL', 'SCIENCE'] },
  { name: 'Investigation Discovery', aliases: ['INVESTIGATION DISCOVERY', 'ID'] },
  
  // Music
  { name: 'MTV', aliases: ['MTV', 'MTV HD', 'MTV US'] },
  { name: 'VH1', aliases: ['VH1', 'VH 1', 'VH1 HD'] },
  { name: 'CMT', aliases: ['CMT', 'COUNTRY MUSIC TV'] },
  
  // Canadian
  { name: 'TSN 1', aliases: ['TSN 1', 'TSN1', 'TSN'] },
  { name: 'TSN 2', aliases: ['TSN 2', 'TSN2'] },
  { name: 'TSN 3', aliases: ['TSN 3', 'TSN3'] },
  { name: 'TSN 4', aliases: ['TSN 4', 'TSN4'] },
  { name: 'TSN 5', aliases: ['TSN 5', 'TSN5'] },
  { name: 'Sportsnet', aliases: ['SPORTSNET', 'SN', 'SPORTSNET ONE'] },
  { name: 'Sportsnet East', aliases: ['SPORTSNET EAST', 'SNE'] },
  { name: 'Sportsnet West', aliases: ['SPORTSNET WEST', 'SNW'] },
  { name: 'Sportsnet Ontario', aliases: ['SPORTSNET ONTARIO', 'SNO'] },
  { name: 'Sportsnet Pacific', aliases: ['SPORTSNET PACIFIC', 'SNP'] },
  { name: 'CBC', aliases: ['CBC', 'CBC TV', 'CBC HD'] },
  { name: 'CTV', aliases: ['CTV', 'CTV HD'] },
];

const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

async function makeRequest(url, mac, token = null, debug = false) {
  const params = new URLSearchParams({ url, mac });
  if (token) params.set('token', token);
  
  const cfBase = CF_PROXY_URL.replace(/\/tv\/?$/, '').replace(/\/+$/, '');
  const fullUrl = `${cfBase}/iptv/api?${params.toString()}`;
  
  if (debug) console.log('Request URL:', fullUrl.substring(0, 100) + '...');
  
  const response = await fetch(fullUrl);
  const text = await response.text();
  
  if (debug) console.log('Response status:', response.status);
  if (debug) console.log('Response preview:', text.substring(0, 200));
  
  const clean = text.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
  try {
    return JSON.parse(clean);
  } catch (e) {
    if (debug) console.log('Parse error, raw text:', clean.substring(0, 500));
    return null;
  }
}

async function handshake(portalUrl, mac) {
  const url = new URL('/portal.php', portalUrl);
  url.searchParams.set('type', 'stb');
  url.searchParams.set('action', 'handshake');
  url.searchParams.set('token', '');
  url.searchParams.set('JsHttpRequest', '1-xml');
  
  const data = await makeRequest(url.toString(), mac);
  return data?.js?.token;
}

async function getChannels(portalUrl, mac, token, genre = '*', page = 0) {
  const url = new URL('/portal.php', portalUrl);
  url.searchParams.set('type', 'itv');
  url.searchParams.set('action', 'get_ordered_list');
  url.searchParams.set('genre', genre);
  url.searchParams.set('p', page.toString());
  url.searchParams.set('JsHttpRequest', '1-xml');
  
  const data = await makeRequest(url.toString(), mac, token);
  return data?.js || { data: [], total_items: 0 };
}

async function getGenres(portalUrl, mac, token) {
  const url = new URL('/portal.php', portalUrl);
  url.searchParams.set('type', 'itv');
  url.searchParams.set('action', 'get_genres');
  url.searchParams.set('JsHttpRequest', '1-xml');
  
  console.log('Getting genres...');
  const data = await makeRequest(url.toString(), mac, token, true);
  console.log('Genres response:', JSON.stringify(data).substring(0, 300));
  return data?.js || [];
}

function matchChannel(portalChannel, targetChannel) {
  const name = portalChannel.name.toUpperCase();
  
  for (const alias of targetChannel.aliases) {
    const aliasUpper = alias.toUpperCase();
    
    // Check if it's a US or CA channel containing our alias
    if ((name.startsWith('US|') || name.startsWith('CA|')) && name.includes(aliasUpper)) {
      return true;
    }
  }
  return false;
}

async function main() {
  console.log('='.repeat(80));
  console.log('IPTV Channel Number Finder');
  console.log('Portal:', PORTAL_URL);
  console.log('MAC:', MAC_ADDRESS);
  console.log('='.repeat(80));
  console.log('');
  
  // Step 1: Handshake
  console.log('[1/4] Performing handshake...');
  const token = await handshake(PORTAL_URL, MAC_ADDRESS);
  if (!token) {
    console.error('Failed to get token!');
    process.exit(1);
  }
  console.log('Token:', token.substring(0, 20) + '...');
  console.log('');
  
  // Step 2: Get genres
  console.log('[2/4] Getting genres...');
  const genres = await getGenres(PORTAL_URL, MAC_ADDRESS, token);
  console.log(`Found ${genres.length} total genres`);
  if (genres.length > 0) {
    console.log('Sample genres:', genres.slice(0, 5).map(g => g.title).join(', '));
  }
  
  const usGenres = genres.filter(g => 
    g.title?.toUpperCase().startsWith('US|') || 
    g.title?.toUpperCase().startsWith('CA|')
  );
  console.log(`Found ${usGenres.length} US/CA genres`);
  console.log('');
  
  // Step 3: Fetch ALL channels (not just by genre) and filter for US/CA
  console.log('[3/4] Fetching all channels...');
  const allChannels = [];
  let page = 0;
  let hasMore = true;
  const pageSize = 500;
  
  while (hasMore && page < 100) { // Up to 50,000 channels
    const result = await getChannels(PORTAL_URL, MAC_ADDRESS, token, '*', page);
    if (result.data && result.data.length > 0) {
      // Filter for US/CA channels by name prefix
      const usChannels = result.data.filter(ch => {
        const name = ch.name.toUpperCase();
        return name.startsWith('US|') || name.startsWith('CA|');
      });
      allChannels.push(...usChannels);
      process.stdout.write(`\rPage ${page + 1}: ${result.data.length} channels, ${allChannels.length} US/CA total`);
      page++;
      hasMore = result.data.length >= 14;
    } else {
      hasMore = false;
    }
    await new Promise(r => setTimeout(r, 30));
  }
  console.log(`\nTotal US/CA channels found: ${allChannels.length}`);
  console.log('');
  
  // Step 4: Match channels
  console.log('[4/4] Matching channels to our cable list...');
  console.log('');
  
  const results = [];
  
  for (const target of TARGET_CHANNELS) {
    const matches = allChannels.filter(ch => matchChannel(ch, target));
    
    if (matches.length > 0) {
      // Sort by quality preference (FHD > HD > SD)
      matches.sort((a, b) => {
        const aName = a.name.toUpperCase();
        const bName = b.name.toUpperCase();
        const aScore = aName.includes('FHD') ? 3 : aName.includes('4K') ? 4 : aName.includes('HD') ? 2 : 1;
        const bScore = bName.includes('FHD') ? 3 : bName.includes('4K') ? 4 : bName.includes('HD') ? 2 : 1;
        return bScore - aScore;
      });
      
      results.push({
        channel: target.name,
        matches: matches.map(m => ({
          number: m.number,
          id: m.id,
          name: m.name,
          cmd: m.cmd
        }))
      });
    } else {
      results.push({
        channel: target.name,
        matches: []
      });
    }
  }
  
  // Print results
  console.log('='.repeat(80));
  console.log('CHANNEL MAPPING RESULTS');
  console.log('='.repeat(80));
  console.log('');
  
  let foundCount = 0;
  let notFoundCount = 0;
  
  for (const result of results) {
    if (result.matches.length > 0) {
      foundCount++;
      console.log(`✅ ${result.channel}`);
      for (const match of result.matches.slice(0, 3)) { // Show top 3 matches
        console.log(`   #${match.number.padStart(5)} | ${match.name}`);
      }
    } else {
      notFoundCount++;
      console.log(`❌ ${result.channel} - NOT FOUND`);
    }
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log(`SUMMARY: ${foundCount} found, ${notFoundCount} not found`);
  console.log('='.repeat(80));
  
  // Output as JSON for easy copy
  console.log('');
  console.log('JSON MAPPING (copy this):');
  console.log('');
  
  const mapping = {};
  for (const result of results) {
    if (result.matches.length > 0) {
      const best = result.matches[0];
      mapping[result.channel] = {
        number: best.number,
        id: best.id,
        name: best.name
      };
    }
  }
  
  console.log(JSON.stringify(mapping, null, 2));
}

main().catch(console.error);
