/**
 * Map ALL Xfinity guide channels to Stalker portal channels
 * Finds EAST and WEST versions where available
 */

const PORTAL_URL = process.env.PORTAL_URL || 'http://line.protv.cc/c/';
const MAC_ADDRESS = process.env.MAC_ADDRESS || '00:1A:79:00:00:01';
const CF_PROXY_URL = 'https://media-proxy.vynx.workers.dev';

// All genres to scan
const GENRES = [
  { id: '673', name: 'US| CW/MY NETWORK' },
  { id: '672', name: 'US| ENTERTAINMENT' },
  { id: '667', name: 'US| NEWS NETWORK' },
  { id: '666', name: 'US| KIDS NETWORK' },
  { id: '680', name: 'US| SPORTS NETWORK' },
  { id: '674', name: 'US| MOVIES NETWORK' },
  { id: '662', name: 'US| ABC NETWORK' },
  { id: '665', name: 'US| CBS NETWORK' },
  { id: '663', name: 'US| FOX NETWORK' },
  { id: '664', name: 'US| NBC NETWORK' },
  { id: '921', name: 'US| PBS NETWORK' },
  { id: '682', name: 'CA| ENGLISH' },
  { id: '671', name: 'CA| SPORT' },
  { id: '1030', name: 'US| BALLY NETWORK' },
  { id: '676', name: 'US| NBA PACKAGE' },
  { id: '677', name: 'US| NHL PACKAGE' },
  { id: '675', name: 'US| NFL PACKAGE' },
  { id: '804', name: 'US| MLB PACKAGE' },
  { id: '1118', name: 'US| ESPN PLUS' },
  { id: '1630', name: 'CA| SPORTSNET' },
  { id: '1345', name: 'US| HBO MAX NETWORK' },
  { id: '1865', name: 'US| TELEMUNDO NETWORK' },
];

async function makeRequest(url, mac, token = null, retries = 3) {
  const params = new URLSearchParams({ url, mac });
  if (token) params.set('token', token);
  
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${CF_PROXY_URL}/iptv/api?${params}`);
      const t = await r.text();
      const clean = t.replace(/^\/\*-secure-\s*/, '').replace(/\s*\*\/$/, '');
      return JSON.parse(clean);
    } catch (e) {
      if (i === retries - 1) return null;
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
}

async function handshake() {
  const url = `${PORTAL_URL}portal.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
  return (await makeRequest(url, MAC_ADDRESS))?.js?.token;
}

async function getChannels(token, genre, page = 0) {
  const url = `${PORTAL_URL}portal.php?type=itv&action=get_ordered_list&genre=${genre}&p=${page}&JsHttpRequest=1-xml`;
  const result = await makeRequest(url, MAC_ADDRESS, token);
  return result?.js || { data: [] };
}

// Find best match with EAST/WEST variants
function findChannel(allChannels, searchTerms, preferEast = true) {
  let matches = [];
  
  for (const term of searchTerms) {
    const termUpper = term.toUpperCase();
    const found = allChannels.filter(ch => {
      const name = ch.name.toUpperCase().replace(/^(US|CA)\|\s*/, '');
      return name.includes(termUpper);
    });
    matches.push(...found);
  }
  
  // Dedupe
  matches = [...new Map(matches.map(m => [m.id, m])).values()];
  
  if (matches.length === 0) return { east: null, west: null };
  
  // Separate EAST and WEST
  const eastMatches = matches.filter(ch => ch.name.toUpperCase().includes('EAST'));
  const westMatches = matches.filter(ch => ch.name.toUpperCase().includes('WEST'));
  const genericMatches = matches.filter(ch => 
    !ch.name.toUpperCase().includes('EAST') && !ch.name.toUpperCase().includes('WEST')
  );
  
  // Sort by quality
  const sortByQuality = (arr) => arr.sort((a, b) => {
    const score = n => n.includes('FHD') ? 3 : n.includes('4K') ? 4 : n.includes('HD') ? 2 : 1;
    return score(b.name.toUpperCase()) - score(a.name.toUpperCase());
  });
  
  sortByQuality(eastMatches);
  sortByQuality(westMatches);
  sortByQuality(genericMatches);
  
  return {
    east: eastMatches[0] || genericMatches[0] || null,
    west: westMatches[0] || genericMatches[0] || null,
  };
}

async function main() {
  console.log('Mapping ALL Xfinity channels to Stalker portal...\n');
  
  const token = await handshake();
  if (!token) { console.error('No token!'); return; }
  
  // Collect all channels from all genres
  const allChannels = [];
  
  for (const genre of GENRES) {
    process.stdout.write(`Scanning ${genre.name}...`);
    let page = 0;
    let count = 0;
    
    while (page < 50) {
      const result = await getChannels(token, genre.id, page);
      if (!result.data?.length) break;
      allChannels.push(...result.data);
      count += result.data.length;
      page++;
      if (result.data.length < 14) break;
      await new Promise(r => setTimeout(r, 20));
    }
    console.log(` ${count}`);
  }
  
  console.log(`\nTotal channels scanned: ${allChannels.length}\n`);

  // Define all channels to map (from cable-channels.ts)
  const CHANNELS_TO_MAP = [
    // BROADCAST
    { id: 'abc', name: 'ABC', search: ['ABC HD', 'ABC FHD'] },
    { id: 'cbs', name: 'CBS', search: ['CBS HD', 'CBS FHD'] },
    { id: 'nbc', name: 'NBC', search: ['NBC HD', 'NBC FHD', 'WNBC', 'NBC 4 NEW YORK'] },
    { id: 'fox', name: 'FOX', search: ['FOX HD', 'FOX FHD'] },
    { id: 'pbs', name: 'PBS', search: ['PBS HD', 'PBS FHD'] },
    { id: 'cw', name: 'The CW', search: ['CW HD', 'THE CW', 'CW NETWORK'] },
    
    // NEWS
    { id: 'cnn', name: 'CNN', search: ['CNN HD', 'CNN FHD'] },
    { id: 'foxnews', name: 'Fox News', search: ['FOX NEWS HD', 'FOX NEWS FHD'] },
    { id: 'msnbc', name: 'MSNBC', search: ['MSNBC HD', 'MSNBC FHD'] },
    { id: 'cnbc', name: 'CNBC', search: ['CNBC HD', 'CNBC FHD'] },
    { id: 'foxbusiness', name: 'Fox Business', search: ['FOX BUSINESS', 'FBN'] },
    { id: 'bloomberg', name: 'Bloomberg', search: ['BLOOMBERG', 'BLOOMBERG TV'] },
    { id: 'newsmax', name: 'Newsmax', search: ['NEWSMAX'] },
    { id: 'cspan', name: 'C-SPAN', search: ['C-SPAN', 'CSPAN'] },
    { id: 'cspan2', name: 'C-SPAN 2', search: ['C-SPAN 2', 'CSPAN 2', 'CSPAN2'] },
    { id: 'hln', name: 'HLN', search: ['HLN', 'HEADLINE NEWS'] },
    { id: 'weatherchannel', name: 'Weather Channel', search: ['WEATHER CHANNEL', 'THE WEATHER CHANNEL'] },
    
    // SPORTS
    { id: 'espn', name: 'ESPN', search: ['ESPN HD', 'ESPN FHD'] },
    { id: 'espn2', name: 'ESPN2', search: ['ESPN 2 HD', 'ESPN2 HD', 'ESPN 2 FHD'] },
    { id: 'espnu', name: 'ESPNU', search: ['ESPNU', 'ESPN U'] },
    { id: 'espnews', name: 'ESPNews', search: ['ESPNEWS', 'ESPN NEWS'] },
    { id: 'fs1', name: 'FS1', search: ['FOX SPORTS 1', 'FS1'] },
    { id: 'fs2', name: 'FS2', search: ['FOX SPORTS 2', 'FS2'] },
    { id: 'nflnetwork', name: 'NFL Network', search: ['NFL NETWORK'] },
    { id: 'nflredzone', name: 'NFL RedZone', search: ['NFL REDZONE', 'REDZONE'] },
    { id: 'mlbnetwork', name: 'MLB Network', search: ['MLB NETWORK'] },
    { id: 'nbanetwork', name: 'NBA TV', search: ['NBA TV'] },
    { id: 'nhlnetwork', name: 'NHL Network', search: ['NHL NETWORK'] },
    { id: 'golfchannel', name: 'Golf Channel', search: ['GOLF CHANNEL'] },
    { id: 'tennischannel', name: 'Tennis Channel', search: ['TENNIS CHANNEL'] },
    { id: 'cbssports', name: 'CBS Sports', search: ['CBS SPORTS NETWORK', 'CBS SPORTS'] },
    { id: 'accnetwork', name: 'ACC Network', search: ['ACC NETWORK', 'ACCN'] },
    { id: 'secnetwork', name: 'SEC Network', search: ['SEC NETWORK', 'SECN'] },
    { id: 'bigten', name: 'Big Ten Network', search: ['BIG TEN NETWORK', 'BTN'] },
    
    // ENTERTAINMENT
    { id: 'usa', name: 'USA Network', search: ['USA NETWORK HD', 'USA NETWORK FHD'] },
    { id: 'tnt', name: 'TNT', search: ['TNT HD', 'TNT FHD'] },
    { id: 'tbs', name: 'TBS', search: ['TBS HD', 'TBS FHD'] },
    { id: 'fx', name: 'FX', search: ['FX HD', 'FX FHD'] },
    { id: 'fxx', name: 'FXX', search: ['FXX HD', 'FXX FHD'] },
    { id: 'amc', name: 'AMC', search: ['AMC HD', 'AMC FHD'] },
    { id: 'bravo', name: 'Bravo', search: ['BRAVO HD', 'BRAVO FHD'] },
    { id: 'e', name: 'E!', search: ['E! HD', 'E ENTERTAINMENT'] },
    { id: 'syfy', name: 'Syfy', search: ['SYFY HD', 'SYFY FHD'] },
    { id: 'lifetime', name: 'Lifetime', search: ['LIFETIME HD', 'LIFETIME FHD'] },
    { id: 'hallmark', name: 'Hallmark', search: ['HALLMARK HD', 'HALLMARK CHANNEL'] },
    { id: 'paramount', name: 'Paramount Network', search: ['PARAMOUNT NETWORK', 'PARAMOUNT HD'] },
    { id: 'comedy', name: 'Comedy Central', search: ['COMEDY CENTRAL HD', 'COMEDY CENTRAL FHD'] },
    { id: 'tvland', name: 'TV Land', search: ['TV LAND', 'TVLAND'] },
    { id: 'bet', name: 'BET', search: ['BET HD', 'BET FHD'] },
    { id: 'wetv', name: 'WE tv', search: ['WE TV', 'WETV'] },
    { id: 'oxygen', name: 'Oxygen', search: ['OXYGEN'] },
    { id: 'own', name: 'OWN', search: ['OWN', 'OPRAH'] },
    { id: 'freeform', name: 'Freeform', search: ['FREEFORM', 'ABC FAMILY'] },
    { id: 'ion', name: 'ION', search: ['ION TV', 'ION TELEVISION'] },
    { id: 'trutv', name: 'truTV', search: ['TRUTV', 'TRU TV'] },
    
    // MOVIES & PREMIUM
    { id: 'hbo', name: 'HBO', search: ['HBO HD', 'HBO FHD'] },
    { id: 'hbo2', name: 'HBO 2', search: ['HBO 2', 'HBO2'] },
    { id: 'hbosignature', name: 'HBO Signature', search: ['HBO SIGNATURE', 'HBO SIG'] },
    { id: 'hbofamily', name: 'HBO Family', search: ['HBO FAMILY'] },
    { id: 'max', name: 'Cinemax', search: ['CINEMAX', 'MAX HD'] },
    { id: 'showtime', name: 'Showtime', search: ['SHOWTIME HD', 'SHOWTIME FHD'] },
    { id: 'showtime2', name: 'Showtime 2', search: ['SHOWTIME 2', 'SHO 2'] },
    { id: 'starz', name: 'Starz', search: ['STARZ HD', 'STARZ FHD'] },
    { id: 'starzencore', name: 'Encore', search: ['ENCORE', 'STARZ ENCORE'] },
    { id: 'tcm', name: 'TCM', search: ['TCM', 'TURNER CLASSIC'] },
    
    // KIDS
    { id: 'disney', name: 'Disney Channel', search: ['DISNEY CHANNEL HD', 'DISNEY CHANNEL FHD'] },
    { id: 'disneyjr', name: 'Disney Junior', search: ['DISNEY JUNIOR', 'DISNEY JR'] },
    { id: 'disneyxd', name: 'Disney XD', search: ['DISNEY XD'] },
    { id: 'nick', name: 'Nickelodeon', search: ['NICKELODEON HD', 'NICKELODEON FHD'] },
    { id: 'nickjr', name: 'Nick Jr', search: ['NICK JR', 'NICK JUNIOR'] },
    { id: 'nicktoons', name: 'Nicktoons', search: ['NICKTOONS'] },
    { id: 'cartoonnetwork', name: 'Cartoon Network', search: ['CARTOON NETWORK HD', 'CARTOON NETWORK FHD'] },
    { id: 'boomerang', name: 'Boomerang', search: ['BOOMERANG'] },
    
    // LIFESTYLE
    { id: 'hgtv', name: 'HGTV', search: ['HGTV HD', 'HGTV FHD'] },
    { id: 'foodnetwork', name: 'Food Network', search: ['FOOD NETWORK HD', 'FOOD NETWORK FHD'] },
    { id: 'cookingchannel', name: 'Cooking Channel', search: ['COOKING CHANNEL'] },
    { id: 'tlc', name: 'TLC', search: ['TLC HD', 'TLC FHD'] },
    { id: 'travelchannel', name: 'Travel Channel', search: ['TRAVEL CHANNEL'] },
    { id: 'ae', name: 'A&E', search: ['A&E HD', 'A&E FHD'] },
    
    // DOCUMENTARY
    { id: 'discovery', name: 'Discovery', search: ['DISCOVERY HD', 'DISCOVERY FHD', 'DISCOVERY CHANNEL'] },
    { id: 'history', name: 'History', search: ['HISTORY HD', 'HISTORY FHD', 'HISTORY CHANNEL'] },
    { id: 'natgeo', name: 'National Geographic', search: ['NATIONAL GEOGRAPHIC', 'NAT GEO HD'] },
    { id: 'natgeowild', name: 'Nat Geo Wild', search: ['NAT GEO WILD', 'NATGEO WILD'] },
    { id: 'animalplanet', name: 'Animal Planet', search: ['ANIMAL PLANET'] },
    { id: 'sciencechannel', name: 'Science Channel', search: ['SCIENCE CHANNEL', 'SCIENCE HD'] },
    { id: 'investigation', name: 'Investigation Discovery', search: ['INVESTIGATION DISCOVERY', 'ID HD'] },
    
    // MUSIC
    { id: 'mtv', name: 'MTV', search: ['MTV HD', 'MTV FHD'] },
    { id: 'mtv2', name: 'MTV2', search: ['MTV 2', 'MTV2'] },
    { id: 'vh1', name: 'VH1', search: ['VH1 HD', 'VH1 FHD'] },
    { id: 'cmt', name: 'CMT', search: ['CMT HD', 'CMT FHD'] },
    
    // SPANISH
    { id: 'telemundo', name: 'Telemundo', search: ['TELEMUNDO'] },
    { id: 'univision', name: 'Univision', search: ['UNIVISION'] },
    { id: 'espndeportes', name: 'ESPN Deportes', search: ['ESPN DEPORTES'] },
    
    // CANADIAN
    { id: 'cbc', name: 'CBC', search: ['CBC HD', 'CBC FHD'] },
    { id: 'ctv', name: 'CTV', search: ['CTV HD', 'CTV FHD'] },
    { id: 'tsn1', name: 'TSN 1', search: ['TSN1', 'TSN 1'] },
    { id: 'tsn2', name: 'TSN 2', search: ['TSN2', 'TSN 2'] },
    { id: 'tsn3', name: 'TSN 3', search: ['TSN3', 'TSN 3'] },
    { id: 'tsn4', name: 'TSN 4', search: ['TSN4', 'TSN 4'] },
    { id: 'tsn5', name: 'TSN 5', search: ['TSN5', 'TSN 5'] },
    { id: 'sportsnetone', name: 'Sportsnet ONE', search: ['SPORTSNET ONE'] },
    { id: 'sportsneteast', name: 'Sportsnet East', search: ['SPORTSNET EAST'] },
    { id: 'sportsnetwest', name: 'Sportsnet West', search: ['SPORTSNET WEST'] },
    { id: 'sportsnetontario', name: 'Sportsnet Ontario', search: ['SPORTSNET ONTARIO'] },
    { id: 'sportsnetpacific', name: 'Sportsnet Pacific', search: ['SPORTSNET PACIFIC'] },
  ];
  
  // Map all channels
  const mapping = {};
  let found = 0;
  let notFound = 0;
  
  console.log('CHANNEL MAPPING RESULTS:');
  console.log('='.repeat(80));
  
  for (const channel of CHANNELS_TO_MAP) {
    const result = findChannel(allChannels, channel.search);
    
    if (result.east || result.west) {
      found++;
      mapping[channel.id] = {
        name: channel.name,
        east: result.east ? { number: result.east.number, id: result.east.id, name: result.east.name } : null,
        west: result.west ? { number: result.west.number, id: result.west.id, name: result.west.name } : null,
      };
      
      const eastStr = result.east ? `#${result.east.number} ${result.east.name}` : 'N/A';
      const westStr = result.west && result.west.id !== result.east?.id ? `#${result.west.number} ${result.west.name}` : 'same';
      console.log(`✓ ${channel.name.padEnd(20)} EAST: ${eastStr.substring(0, 40)}`);
      if (westStr !== 'same') console.log(`${''.padEnd(22)} WEST: ${westStr.substring(0, 40)}`);
    } else {
      notFound++;
      console.log(`✗ ${channel.name.padEnd(20)} NOT FOUND`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`SUMMARY: ${found} found, ${notFound} not found`);
  console.log('='.repeat(80));
  
  // Output JSON
  console.log('\n\nJSON MAPPING:');
  console.log(JSON.stringify(mapping, null, 2));
  
  // Save to file
  const fs = require('fs');
  fs.writeFileSync('scripts/full-channel-mapping.json', JSON.stringify(mapping, null, 2));
  console.log('\nSaved to scripts/full-channel-mapping.json');
}

main().catch(console.error);
