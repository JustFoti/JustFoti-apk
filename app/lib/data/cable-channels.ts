/**
 * Curated list of major US/Canada cable TV channels
 * Organized by category like Xfinity TV Guide
 */

export interface CableChannel {
  id: string;
  name: string;
  shortName: string; // For matching in IPTV portals
  aliases: string[]; // Alternative names to search for
  category: ChannelCategory;
  logo?: string;
  hdVariants?: string[]; // HD, FHD, 4K variants to search
}

export type ChannelCategory = 
  | 'broadcast'      // ABC, CBS, NBC, FOX, PBS, CW
  | 'news'           // CNN, Fox News, MSNBC, etc.
  | 'sports'         // ESPN, FS1, NFL Network, etc.
  | 'entertainment'  // USA, TNT, TBS, FX, etc.
  | 'movies'         // HBO, Showtime, Starz, etc.
  | 'kids'           // Nickelodeon, Disney, Cartoon Network
  | 'lifestyle'      // HGTV, Food Network, TLC, etc.
  | 'documentary'    // Discovery, History, Nat Geo, etc.
  | 'music'          // MTV, VH1, CMT
  | 'spanish'        // Telemundo, Univision
  | 'canadian';      // TSN, Sportsnet, CBC

export const CHANNEL_CATEGORIES: Record<ChannelCategory, { name: string; icon: string }> = {
  broadcast: { name: 'Broadcast', icon: '📺' },
  news: { name: 'News', icon: '📰' },
  sports: { name: 'Sports', icon: '🏈' },
  entertainment: { name: 'Entertainment', icon: '🎬' },
  movies: { name: 'Movies & Premium', icon: '🎥' },
  kids: { name: 'Kids & Family', icon: '👶' },
  lifestyle: { name: 'Lifestyle', icon: '🏠' },
  documentary: { name: 'Documentary', icon: '🔬' },
  music: { name: 'Music', icon: '🎵' },
  spanish: { name: 'Spanish', icon: '🇲🇽' },
  canadian: { name: 'Canadian', icon: '🇨🇦' },
};

export const CABLE_CHANNELS: CableChannel[] = [
  // ===== BROADCAST NETWORKS =====
  { id: 'abc', name: 'ABC', shortName: 'ABC', aliases: ['ABC', 'WABC', 'KABC'], category: 'broadcast', hdVariants: ['HD', 'FHD'] },
  { id: 'cbs', name: 'CBS', shortName: 'CBS', aliases: ['CBS', 'WCBS', 'KCBS'], category: 'broadcast', hdVariants: ['HD', 'FHD'] },
  { id: 'nbc', name: 'NBC', shortName: 'NBC', aliases: ['NBC', 'WNBC', 'KNBC'], category: 'broadcast', hdVariants: ['HD', 'FHD'] },
  { id: 'fox', name: 'FOX', shortName: 'FOX', aliases: ['FOX', 'WNYW', 'KTTV'], category: 'broadcast', hdVariants: ['HD', 'FHD'] },
  { id: 'pbs', name: 'PBS', shortName: 'PBS', aliases: ['PBS', 'WNET', 'KCET'], category: 'broadcast', hdVariants: ['HD'] },
  { id: 'cw', name: 'The CW', shortName: 'CW', aliases: ['CW', 'THE CW', 'WPIX'], category: 'broadcast', hdVariants: ['HD'] },
  { id: 'mynetwork', name: 'MyNetworkTV', shortName: 'MNTV', aliases: ['MYNETWORK', 'MY NETWORK'], category: 'broadcast' },

  // ===== NEWS =====
  { id: 'cnn', name: 'CNN', shortName: 'CNN', aliases: ['CNN', 'CNN HD', 'CNN US'], category: 'news', hdVariants: ['HD', 'FHD'] },
  { id: 'foxnews', name: 'Fox News', shortName: 'FOX NEWS', aliases: ['FOX NEWS', 'FNC', 'FOX NEWS CHANNEL'], category: 'news', hdVariants: ['HD', 'FHD'] },
  { id: 'msnbc', name: 'MSNBC', shortName: 'MSNBC', aliases: ['MSNBC'], category: 'news', hdVariants: ['HD', 'FHD'] },
  { id: 'cnbc', name: 'CNBC', shortName: 'CNBC', aliases: ['CNBC', 'CNBC US'], category: 'news', hdVariants: ['HD'] },
  { id: 'foxbusiness', name: 'Fox Business', shortName: 'FBN', aliases: ['FOX BUSINESS', 'FBN'], category: 'news', hdVariants: ['HD'] },
  { id: 'bloomberg', name: 'Bloomberg', shortName: 'BLOOMBERG', aliases: ['BLOOMBERG', 'BLOOMBERG TV'], category: 'news', hdVariants: ['HD'] },
  { id: 'newsmax', name: 'Newsmax', shortName: 'NEWSMAX', aliases: ['NEWSMAX', 'NEWSMAX TV'], category: 'news', hdVariants: ['HD'] },
  { id: 'cspan', name: 'C-SPAN', shortName: 'CSPAN', aliases: ['C-SPAN', 'CSPAN', 'C SPAN'], category: 'news' },
  { id: 'cspan2', name: 'C-SPAN 2', shortName: 'CSPAN2', aliases: ['C-SPAN 2', 'CSPAN2', 'C SPAN 2'], category: 'news' },
  { id: 'hln', name: 'HLN', shortName: 'HLN', aliases: ['HLN', 'HEADLINE NEWS'], category: 'news', hdVariants: ['HD'] },
  { id: 'weatherchannel', name: 'The Weather Channel', shortName: 'TWC', aliases: ['WEATHER CHANNEL', 'TWC', 'THE WEATHER CHANNEL'], category: 'news', hdVariants: ['HD'] },

  // ===== SPORTS =====
  { id: 'espn', name: 'ESPN', shortName: 'ESPN', aliases: ['ESPN', 'ESPN US'], category: 'sports', hdVariants: ['HD', 'FHD'] },
  { id: 'espn2', name: 'ESPN2', shortName: 'ESPN2', aliases: ['ESPN2', 'ESPN 2'], category: 'sports', hdVariants: ['HD', 'FHD'] },
  { id: 'espnu', name: 'ESPNU', shortName: 'ESPNU', aliases: ['ESPNU', 'ESPN U'], category: 'sports', hdVariants: ['HD'] },
  { id: 'espnews', name: 'ESPNews', shortName: 'ESPNEWS', aliases: ['ESPNEWS', 'ESPN NEWS'], category: 'sports', hdVariants: ['HD'] },
  { id: 'fs1', name: 'FS1', shortName: 'FS1', aliases: ['FS1', 'FOX SPORTS 1', 'FOX SPORTS'], category: 'sports', hdVariants: ['HD', 'FHD'] },
  { id: 'fs2', name: 'FS2', shortName: 'FS2', aliases: ['FS2', 'FOX SPORTS 2'], category: 'sports', hdVariants: ['HD'] },
  { id: 'nbcsn', name: 'USA Network (Sports)', shortName: 'USA', aliases: ['USA NETWORK', 'USA'], category: 'sports', hdVariants: ['HD'] },
  { id: 'nflnetwork', name: 'NFL Network', shortName: 'NFLN', aliases: ['NFL NETWORK', 'NFLN', 'NFL'], category: 'sports', hdVariants: ['HD', 'FHD'] },
  { id: 'nflredzone', name: 'NFL RedZone', shortName: 'REDZONE', aliases: ['NFL REDZONE', 'REDZONE', 'RED ZONE'], category: 'sports', hdVariants: ['HD', 'FHD'] },
  { id: 'mlbnetwork', name: 'MLB Network', shortName: 'MLBN', aliases: ['MLB NETWORK', 'MLBN', 'MLB'], category: 'sports', hdVariants: ['HD'] },
  { id: 'nbanetwork', name: 'NBA TV', shortName: 'NBATV', aliases: ['NBA TV', 'NBATV', 'NBA NETWORK'], category: 'sports', hdVariants: ['HD'] },
  { id: 'nhlnetwork', name: 'NHL Network', shortName: 'NHLN', aliases: ['NHL NETWORK', 'NHLN', 'NHL'], category: 'sports', hdVariants: ['HD'] },
  { id: 'golfchannel', name: 'Golf Channel', shortName: 'GOLF', aliases: ['GOLF CHANNEL', 'GOLF'], category: 'sports', hdVariants: ['HD'] },
  { id: 'tennischannel', name: 'Tennis Channel', shortName: 'TENNIS', aliases: ['TENNIS CHANNEL', 'TENNIS'], category: 'sports', hdVariants: ['HD'] },
  { id: 'cbssports', name: 'CBS Sports Network', shortName: 'CBSSN', aliases: ['CBS SPORTS', 'CBSSN', 'CBS SPORTS NETWORK'], category: 'sports', hdVariants: ['HD'] },
  { id: 'accnetwork', name: 'ACC Network', shortName: 'ACCN', aliases: ['ACC NETWORK', 'ACCN', 'ACC'], category: 'sports', hdVariants: ['HD'] },
  { id: 'secnetwork', name: 'SEC Network', shortName: 'SECN', aliases: ['SEC NETWORK', 'SECN', 'SEC'], category: 'sports', hdVariants: ['HD'] },
  { id: 'bigten', name: 'Big Ten Network', shortName: 'BTN', aliases: ['BIG TEN', 'BTN', 'BIG TEN NETWORK'], category: 'sports', hdVariants: ['HD'] },
  { id: 'pac12', name: 'Pac-12 Network', shortName: 'PAC12', aliases: ['PAC-12', 'PAC12', 'PAC 12'], category: 'sports', hdVariants: ['HD'] },

  // ===== ENTERTAINMENT =====

  { id: 'usa', name: 'USA Network', shortName: 'USA', aliases: ['USA', 'USA NETWORK'], category: 'entertainment', hdVariants: ['HD', 'FHD'] },
  { id: 'tnt', name: 'TNT', shortName: 'TNT', aliases: ['TNT', 'TNT US'], category: 'entertainment', hdVariants: ['HD', 'FHD'] },
  { id: 'tbs', name: 'TBS', shortName: 'TBS', aliases: ['TBS', 'TBS US'], category: 'entertainment', hdVariants: ['HD', 'FHD'] },
  { id: 'fx', name: 'FX', shortName: 'FX', aliases: ['FX', 'FX US'], category: 'entertainment', hdVariants: ['HD', 'FHD'] },
  { id: 'fxx', name: 'FXX', shortName: 'FXX', aliases: ['FXX'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'amc', name: 'AMC', shortName: 'AMC', aliases: ['AMC', 'AMC US'], category: 'entertainment', hdVariants: ['HD', 'FHD'] },
  { id: 'bravo', name: 'Bravo', shortName: 'BRAVO', aliases: ['BRAVO'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'e', name: 'E!', shortName: 'E!', aliases: ['E!', 'E ENTERTAINMENT', 'E NETWORK'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'syfy', name: 'Syfy', shortName: 'SYFY', aliases: ['SYFY', 'SCI FI', 'SCIFI'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'lifetime', name: 'Lifetime', shortName: 'LIFETIME', aliases: ['LIFETIME', 'LMN'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'hallmark', name: 'Hallmark Channel', shortName: 'HALLMARK', aliases: ['HALLMARK', 'HALLMARK CHANNEL'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'hallmarkmovies', name: 'Hallmark Movies', shortName: 'HMM', aliases: ['HALLMARK MOVIES', 'HMM', 'HALLMARK MOVIES & MYSTERIES'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'paramount', name: 'Paramount Network', shortName: 'PARAMOUNT', aliases: ['PARAMOUNT', 'PARAMOUNT NETWORK', 'SPIKE'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'comedy', name: 'Comedy Central', shortName: 'COMEDY', aliases: ['COMEDY CENTRAL', 'COMEDY'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'tvland', name: 'TV Land', shortName: 'TVLAND', aliases: ['TV LAND', 'TVLAND'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'bet', name: 'BET', shortName: 'BET', aliases: ['BET', 'BLACK ENTERTAINMENT'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'wetv', name: 'WE tv', shortName: 'WETV', aliases: ['WE TV', 'WETV', 'WE'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'oxygen', name: 'Oxygen', shortName: 'OXYGEN', aliases: ['OXYGEN'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'own', name: 'OWN', shortName: 'OWN', aliases: ['OWN', 'OPRAH WINFREY NETWORK'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'freeform', name: 'Freeform', shortName: 'FREEFORM', aliases: ['FREEFORM', 'ABC FAMILY'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'ion', name: 'ION', shortName: 'ION', aliases: ['ION', 'ION TV', 'ION TELEVISION'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'trutv', name: 'truTV', shortName: 'TRUTV', aliases: ['TRUTV', 'TRU TV', 'TRUE TV'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'pop', name: 'Pop TV', shortName: 'POP', aliases: ['POP', 'POP TV'], category: 'entertainment', hdVariants: ['HD'] },
  { id: 'reelz', name: 'Reelz', shortName: 'REELZ', aliases: ['REELZ'], category: 'entertainment', hdVariants: ['HD'] },

  // ===== MOVIES & PREMIUM =====
  { id: 'hbo', name: 'HBO', shortName: 'HBO', aliases: ['HBO', 'HBO US'], category: 'movies', hdVariants: ['HD', 'FHD', '4K'] },
  { id: 'hbo2', name: 'HBO 2', shortName: 'HBO2', aliases: ['HBO 2', 'HBO2'], category: 'movies', hdVariants: ['HD'] },
  { id: 'hbosignature', name: 'HBO Signature', shortName: 'HBOSIG', aliases: ['HBO SIGNATURE', 'HBO SIG'], category: 'movies', hdVariants: ['HD'] },
  { id: 'hbofamily', name: 'HBO Family', shortName: 'HBOFAM', aliases: ['HBO FAMILY', 'HBO FAM'], category: 'movies', hdVariants: ['HD'] },
  { id: 'hbocomedy', name: 'HBO Comedy', shortName: 'HBOCOM', aliases: ['HBO COMEDY', 'HBO COM'], category: 'movies', hdVariants: ['HD'] },
  { id: 'hbozone', name: 'HBO Zone', shortName: 'HBOZONE', aliases: ['HBO ZONE'], category: 'movies', hdVariants: ['HD'] },
  { id: 'max', name: 'MAX (Cinemax)', shortName: 'MAX', aliases: ['MAX', 'CINEMAX', 'MOREMAX'], category: 'movies', hdVariants: ['HD'] },
  { id: 'showtime', name: 'Showtime', shortName: 'SHO', aliases: ['SHOWTIME', 'SHO'], category: 'movies', hdVariants: ['HD', 'FHD'] },
  { id: 'showtime2', name: 'Showtime 2', shortName: 'SHO2', aliases: ['SHOWTIME 2', 'SHO2', 'SHO 2'], category: 'movies', hdVariants: ['HD'] },
  { id: 'shoextreme', name: 'Showtime Extreme', shortName: 'SHOEXT', aliases: ['SHOWTIME EXTREME', 'SHO EXTREME'], category: 'movies', hdVariants: ['HD'] },
  { id: 'starz', name: 'Starz', shortName: 'STARZ', aliases: ['STARZ', 'STARZ!'], category: 'movies', hdVariants: ['HD', 'FHD'] },
  { id: 'starzedge', name: 'Starz Edge', shortName: 'STARZEDGE', aliases: ['STARZ EDGE'], category: 'movies', hdVariants: ['HD'] },
  { id: 'starzencore', name: 'Starz Encore', shortName: 'ENCORE', aliases: ['ENCORE', 'STARZ ENCORE'], category: 'movies', hdVariants: ['HD'] },
  { id: 'epix', name: 'MGM+', shortName: 'MGM', aliases: ['MGM+', 'EPIX', 'MGM PLUS'], category: 'movies', hdVariants: ['HD'] },
  { id: 'tcm', name: 'TCM', shortName: 'TCM', aliases: ['TCM', 'TURNER CLASSIC MOVIES', 'TURNER CLASSIC'], category: 'movies', hdVariants: ['HD'] },
  { id: 'sundance', name: 'SundanceTV', shortName: 'SUNDANCE', aliases: ['SUNDANCE', 'SUNDANCE TV', 'SUNDANCETV'], category: 'movies', hdVariants: ['HD'] },
  { id: 'ifc', name: 'IFC', shortName: 'IFC', aliases: ['IFC', 'INDEPENDENT FILM'], category: 'movies', hdVariants: ['HD'] },

  // ===== KIDS & FAMILY =====
  { id: 'disney', name: 'Disney Channel', shortName: 'DISNEY', aliases: ['DISNEY', 'DISNEY CHANNEL'], category: 'kids', hdVariants: ['HD'] },
  { id: 'disneyjr', name: 'Disney Junior', shortName: 'DISNEYJR', aliases: ['DISNEY JUNIOR', 'DISNEY JR'], category: 'kids', hdVariants: ['HD'] },
  { id: 'disneyxd', name: 'Disney XD', shortName: 'DISNEYXD', aliases: ['DISNEY XD'], category: 'kids', hdVariants: ['HD'] },
  { id: 'nick', name: 'Nickelodeon', shortName: 'NICK', aliases: ['NICKELODEON', 'NICK'], category: 'kids', hdVariants: ['HD'] },
  { id: 'nickjr', name: 'Nick Jr.', shortName: 'NICKJR', aliases: ['NICK JR', 'NICKJR', 'NICK JUNIOR'], category: 'kids', hdVariants: ['HD'] },
  { id: 'nicktoons', name: 'Nicktoons', shortName: 'NICKTOONS', aliases: ['NICKTOONS'], category: 'kids', hdVariants: ['HD'] },
  { id: 'teennick', name: 'TeenNick', shortName: 'TEENNICK', aliases: ['TEENNICK', 'TEEN NICK'], category: 'kids', hdVariants: ['HD'] },
  { id: 'cartoonnetwork', name: 'Cartoon Network', shortName: 'CN', aliases: ['CARTOON NETWORK', 'CN', 'CARTOON'], category: 'kids', hdVariants: ['HD'] },
  { id: 'boomerang', name: 'Boomerang', shortName: 'BOOM', aliases: ['BOOMERANG', 'BOOM'], category: 'kids', hdVariants: ['HD'] },
  { id: 'universal', name: 'Universal Kids', shortName: 'UNKIDS', aliases: ['UNIVERSAL KIDS', 'SPROUT'], category: 'kids', hdVariants: ['HD'] },
  { id: 'pbskids', name: 'PBS Kids', shortName: 'PBSKIDS', aliases: ['PBS KIDS'], category: 'kids', hdVariants: ['HD'] },

  // ===== LIFESTYLE =====
  { id: 'hgtv', name: 'HGTV', shortName: 'HGTV', aliases: ['HGTV', 'HOME & GARDEN'], category: 'lifestyle', hdVariants: ['HD'] },
  { id: 'foodnetwork', name: 'Food Network', shortName: 'FOOD', aliases: ['FOOD NETWORK', 'FOOD'], category: 'lifestyle', hdVariants: ['HD'] },
  { id: 'cookingchannel', name: 'Cooking Channel', shortName: 'COOKING', aliases: ['COOKING CHANNEL', 'COOKING'], category: 'lifestyle', hdVariants: ['HD'] },
  { id: 'tlc', name: 'TLC', shortName: 'TLC', aliases: ['TLC', 'THE LEARNING CHANNEL'], category: 'lifestyle', hdVariants: ['HD'] },
  { id: 'travelchannel', name: 'Travel Channel', shortName: 'TRAVEL', aliases: ['TRAVEL CHANNEL', 'TRAVEL'], category: 'lifestyle', hdVariants: ['HD'] },
  { id: 'diy', name: 'DIY Network', shortName: 'DIY', aliases: ['DIY', 'DIY NETWORK'], category: 'lifestyle', hdVariants: ['HD'] },
  { id: 'ae', name: 'A&E', shortName: 'A&E', aliases: ['A&E', 'A AND E', 'AE'], category: 'lifestyle', hdVariants: ['HD'] },

  // ===== DOCUMENTARY =====

  { id: 'discovery', name: 'Discovery', shortName: 'DISC', aliases: ['DISCOVERY', 'DISCOVERY CHANNEL', 'DISC'], category: 'documentary', hdVariants: ['HD'] },
  { id: 'history', name: 'History', shortName: 'HISTORY', aliases: ['HISTORY', 'HISTORY CHANNEL'], category: 'documentary', hdVariants: ['HD'] },
  { id: 'natgeo', name: 'National Geographic', shortName: 'NATGEO', aliases: ['NATIONAL GEOGRAPHIC', 'NAT GEO', 'NATGEO'], category: 'documentary', hdVariants: ['HD'] },
  { id: 'natgeowild', name: 'Nat Geo Wild', shortName: 'NGWILD', aliases: ['NAT GEO WILD', 'NATGEO WILD'], category: 'documentary', hdVariants: ['HD'] },
  { id: 'animalplanet', name: 'Animal Planet', shortName: 'ANIMAL', aliases: ['ANIMAL PLANET', 'ANIMAL'], category: 'documentary', hdVariants: ['HD'] },
  { id: 'sciencechannel', name: 'Science Channel', shortName: 'SCIENCE', aliases: ['SCIENCE CHANNEL', 'SCIENCE'], category: 'documentary', hdVariants: ['HD'] },
  { id: 'smithsonian', name: 'Smithsonian Channel', shortName: 'SMITH', aliases: ['SMITHSONIAN', 'SMITHSONIAN CHANNEL'], category: 'documentary', hdVariants: ['HD'] },
  { id: 'investigation', name: 'Investigation Discovery', shortName: 'ID', aliases: ['INVESTIGATION DISCOVERY', 'ID', 'INVESTIGATION'], category: 'documentary', hdVariants: ['HD'] },
  { id: 'h2', name: 'History 2', shortName: 'H2', aliases: ['H2', 'HISTORY 2', 'VICE'], category: 'documentary', hdVariants: ['HD'] },
  { id: 'destinationamerica', name: 'Destination America', shortName: 'DESTA', aliases: ['DESTINATION AMERICA'], category: 'documentary', hdVariants: ['HD'] },
  { id: 'motortrend', name: 'MotorTrend', shortName: 'MOTOR', aliases: ['MOTORTREND', 'MOTOR TREND', 'VELOCITY'], category: 'documentary', hdVariants: ['HD'] },

  // ===== MUSIC =====
  { id: 'mtv', name: 'MTV', shortName: 'MTV', aliases: ['MTV', 'MTV US'], category: 'music', hdVariants: ['HD'] },
  { id: 'mtv2', name: 'MTV2', shortName: 'MTV2', aliases: ['MTV2', 'MTV 2'], category: 'music', hdVariants: ['HD'] },
  { id: 'vh1', name: 'VH1', shortName: 'VH1', aliases: ['VH1', 'VH 1'], category: 'music', hdVariants: ['HD'] },
  { id: 'cmt', name: 'CMT', shortName: 'CMT', aliases: ['CMT', 'COUNTRY MUSIC TV'], category: 'music', hdVariants: ['HD'] },
  { id: 'bet', name: 'BET', shortName: 'BET', aliases: ['BET'], category: 'music', hdVariants: ['HD'] },

  // ===== SPANISH =====
  { id: 'telemundo', name: 'Telemundo', shortName: 'TELEMUNDO', aliases: ['TELEMUNDO'], category: 'spanish', hdVariants: ['HD'] },
  { id: 'univision', name: 'Univision', shortName: 'UNIVISION', aliases: ['UNIVISION'], category: 'spanish', hdVariants: ['HD'] },
  { id: 'unimas', name: 'UniMás', shortName: 'UNIMAS', aliases: ['UNIMAS', 'UNI MAS'], category: 'spanish', hdVariants: ['HD'] },
  { id: 'galavision', name: 'Galavisión', shortName: 'GALAVISION', aliases: ['GALAVISION'], category: 'spanish', hdVariants: ['HD'] },
  { id: 'espndeportes', name: 'ESPN Deportes', shortName: 'ESPND', aliases: ['ESPN DEPORTES', 'ESPN DEP'], category: 'spanish', hdVariants: ['HD'] },
  { id: 'foxdeportes', name: 'Fox Deportes', shortName: 'FOXD', aliases: ['FOX DEPORTES', 'FOX DEP'], category: 'spanish', hdVariants: ['HD'] },

  // ===== CANADIAN =====
  { id: 'cbc', name: 'CBC', shortName: 'CBC', aliases: ['CBC', 'CBC TV'], category: 'canadian', hdVariants: ['HD'] },
  { id: 'ctv', name: 'CTV', shortName: 'CTV', aliases: ['CTV'], category: 'canadian', hdVariants: ['HD'] },
  { id: 'global', name: 'Global', shortName: 'GLOBAL', aliases: ['GLOBAL', 'GLOBAL TV'], category: 'canadian', hdVariants: ['HD'] },
  { id: 'tsn1', name: 'TSN 1', shortName: 'TSN1', aliases: ['TSN 1', 'TSN1', 'TSN'], category: 'canadian', hdVariants: ['HD'] },
  { id: 'tsn2', name: 'TSN 2', shortName: 'TSN2', aliases: ['TSN 2', 'TSN2'], category: 'canadian', hdVariants: ['HD'] },
  { id: 'tsn3', name: 'TSN 3', shortName: 'TSN3', aliases: ['TSN 3', 'TSN3'], category: 'canadian', hdVariants: ['HD'] },
  { id: 'tsn4', name: 'TSN 4', shortName: 'TSN4', aliases: ['TSN 4', 'TSN4'], category: 'canadian', hdVariants: ['HD'] },
  { id: 'tsn5', name: 'TSN 5', shortName: 'TSN5', aliases: ['TSN 5', 'TSN5'], category: 'canadian', hdVariants: ['HD'] },
  { id: 'sportsnet', name: 'Sportsnet', shortName: 'SN', aliases: ['SPORTSNET', 'SN', 'SPORTSNET ONE'], category: 'canadian', hdVariants: ['HD'] },
  { id: 'sportsneteast', name: 'Sportsnet East', shortName: 'SNE', aliases: ['SPORTSNET EAST', 'SNE'], category: 'canadian', hdVariants: ['HD'] },
  { id: 'sportsnetwest', name: 'Sportsnet West', shortName: 'SNW', aliases: ['SPORTSNET WEST', 'SNW'], category: 'canadian', hdVariants: ['HD'] },
  { id: 'sportsnetpacific', name: 'Sportsnet Pacific', shortName: 'SNP', aliases: ['SPORTSNET PACIFIC', 'SNP'], category: 'canadian', hdVariants: ['HD'] },
  { id: 'sportsnetontario', name: 'Sportsnet Ontario', shortName: 'SNO', aliases: ['SPORTSNET ONTARIO', 'SNO'], category: 'canadian', hdVariants: ['HD'] },
];

/**
 * Get all channels grouped by category
 */
export function getChannelsByCategory(): Record<ChannelCategory, CableChannel[]> {
  const grouped: Record<ChannelCategory, CableChannel[]> = {
    broadcast: [],
    news: [],
    sports: [],
    entertainment: [],
    movies: [],
    kids: [],
    lifestyle: [],
    documentary: [],
    music: [],
    spanish: [],
    canadian: [],
  };
  
  for (const channel of CABLE_CHANNELS) {
    grouped[channel.category].push(channel);
  }
  
  return grouped;
}

/**
 * Build search patterns for finding a channel in IPTV portal
 * Returns patterns like "ESPN HD", "ESPN FHD", "US| ESPN", etc.
 */
export function getSearchPatterns(channel: CableChannel): string[] {
  const patterns: string[] = [];
  
  // Add base aliases
  for (const alias of channel.aliases) {
    patterns.push(alias);
    patterns.push(`US| ${alias}`);
    patterns.push(`CA| ${alias}`);
    
    // Add HD variants
    if (channel.hdVariants) {
      for (const variant of channel.hdVariants) {
        patterns.push(`${alias} ${variant}`);
        patterns.push(`US| ${alias} ${variant}`);
        patterns.push(`CA| ${alias} ${variant}`);
      }
    }
  }
  
  return patterns;
}

/**
 * Find matching IPTV channel from portal channels list
 */
export function findMatchingChannel(
  cableChannel: CableChannel, 
  portalChannels: { id: string; name: string; cmd: string }[]
): { id: string; name: string; cmd: string } | null {
  const patterns = getSearchPatterns(cableChannel);
  
  // Try exact match first, then partial
  for (const pattern of patterns) {
    const patternUpper = pattern.toUpperCase();
    
    // Exact match
    const exact = portalChannels.find(ch => 
      ch.name.toUpperCase() === patternUpper
    );
    if (exact) return exact;
  }
  
  // Partial match - channel name contains our pattern
  for (const pattern of patterns) {
    const patternUpper = pattern.toUpperCase();
    
    const partial = portalChannels.find(ch => {
      const nameUpper = ch.name.toUpperCase();
      // Must contain the pattern and be a US/CA channel
      return nameUpper.includes(patternUpper) && 
             (nameUpper.startsWith('US|') || nameUpper.startsWith('CA|'));
    });
    if (partial) return partial;
  }
  
  return null;
}

export default CABLE_CHANNELS;
