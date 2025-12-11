/**
 * Static mapping of Xfinity cable channels to Stalker portal channel IDs
 * Portal: line.protv.cc
 * Generated from scripts/full-channel-mapping.json
 */

export interface StalkerChannelMapping {
  id: string;
  name: string;
  category: string;
  east: { number: string; id: string; name: string } | null;
  west: { number: string; id: string; name: string } | null;
}

export const STALKER_CHANNEL_MAPPING: Record<string, StalkerChannelMapping> = {
  // ===== BROADCAST =====
  abc: { id: 'abc', name: 'ABC', category: 'broadcast', east: { number: '25288', id: '45439', name: 'US| ABC HD' }, west: { number: '25288', id: '45439', name: 'US| ABC HD' } },
  cbs: { id: 'cbs', name: 'CBS', category: 'broadcast', east: { number: '25506', id: '45604', name: 'US| CBS HD' }, west: { number: '25506', id: '45604', name: 'US| CBS HD' } },
  nbc: { id: 'nbc', name: 'NBC', category: 'broadcast', east: { number: '32356', id: '174038', name: 'US| NBC 4 NEW YORK NY (WNBC)' }, west: { number: '32356', id: '174038', name: 'US| NBC 4 NEW YORK NY (WNBC)' } },
  fox: { id: 'fox', name: 'FOX', category: 'broadcast', east: { number: '25532', id: '90959', name: 'US| FOX HD' }, west: { number: '25532', id: '90959', name: 'US| FOX HD' } },
  pbs: { id: 'pbs', name: 'PBS', category: 'broadcast', east: { number: '25443', id: '45510', name: 'US| PBS HD' }, west: { number: '25443', id: '45510', name: 'US| PBS HD' } },
  cw: { id: 'cw', name: 'The CW', category: 'broadcast', east: { number: '32500', id: '174144', name: 'US| CW 39 WSFL MIAMI' }, west: { number: '32502', id: '174147', name: 'US| CW 6 SAN DIEGO CA (KFMB)' } },

  // ===== NEWS =====
  cnn: { id: 'cnn', name: 'CNN', category: 'news', east: { number: '25517', id: '442785', name: 'US| CNN FHD' }, west: { number: '25517', id: '442785', name: 'US| CNN FHD' } },
  foxnews: { id: 'foxnews', name: 'Fox News', category: 'news', east: { number: '25534', id: '45573', name: 'US| FOX NEWS HD' }, west: { number: '25534', id: '45573', name: 'US| FOX NEWS HD' } },
  msnbc: { id: 'msnbc', name: 'MSNBC', category: 'news', east: { number: '25538', id: '45535', name: 'US| MSNBC HD' }, west: { number: '25538', id: '45535', name: 'US| MSNBC HD' } },
  cnbc: { id: 'cnbc', name: 'CNBC', category: 'news', east: { number: '25519', id: '45593', name: 'US| CNBC HD' }, west: { number: '25519', id: '45593', name: 'US| CNBC HD' } },
  foxbusiness: { id: 'foxbusiness', name: 'Fox Business', category: 'news', east: { number: '25530', id: '45575', name: 'US| FOX BUSINESS NETWORK HD' }, west: { number: '25530', id: '45575', name: 'US| FOX BUSINESS NETWORK HD' } },
  bloomberg: { id: 'bloomberg', name: 'Bloomberg', category: 'news', east: { number: '25535', id: '91936', name: 'US| BLOOMBERG HD' }, west: { number: '25535', id: '91936', name: 'US| BLOOMBERG HD' } },
  newsmax: { id: 'newsmax', name: 'Newsmax', category: 'news', east: { number: '25550', id: '150355', name: 'US| NEWSMAX HD' }, west: { number: '25550', id: '150355', name: 'US| NEWSMAX HD' } },
  cspan: { id: 'cspan', name: 'C-SPAN', category: 'news', east: { number: '25503', id: '91952', name: 'US| C-SPAN 1 HD' }, west: { number: '25503', id: '91952', name: 'US| C-SPAN 1 HD' } },
  cspan2: { id: 'cspan2', name: 'C-SPAN 2', category: 'news', east: { number: '25504', id: '91953', name: 'US| C-SPAN 2 HD' }, west: { number: '25504', id: '91953', name: 'US| C-SPAN 2 HD' } },
  hln: { id: 'hln', name: 'HLN', category: 'news', east: { number: '25393', id: '91857', name: 'US| HLN HD' }, west: { number: '25393', id: '91857', name: 'US| HLN HD' } },
  weatherchannel: { id: 'weatherchannel', name: 'Weather Channel', category: 'news', east: { number: '25471', id: '45455', name: 'US| THE WEATHER CHANNEL HD' }, west: { number: '25471', id: '45455', name: 'US| THE WEATHER CHANNEL HD' } },

  // ===== SPORTS =====
  espn: { id: 'espn', name: 'ESPN', category: 'sports', east: { number: '25698', id: '45579', name: 'US| ESPN HD' }, west: { number: '25698', id: '45579', name: 'US| ESPN HD' } },
  espn2: { id: 'espn2', name: 'ESPN2', category: 'sports', east: { number: '25699', id: '45580', name: 'US| ESPN 2 HD' }, west: { number: '25699', id: '45580', name: 'US| ESPN 2 HD' } },
  espnu: { id: 'espnu', name: 'ESPNU', category: 'sports', east: { number: '25701', id: '90958', name: 'US| ESPN U' }, west: { number: '25701', id: '90958', name: 'US| ESPN U' } },
  espnews: { id: 'espnews', name: 'ESPNews', category: 'sports', east: { number: '25700', id: '45578', name: 'US| ESPN NEWS HD' }, west: { number: '25700', id: '45578', name: 'US| ESPN NEWS HD' } },
  fs1: { id: 'fs1', name: 'FS1', category: 'sports', east: { number: '25706', id: '45571', name: 'US| FOX SPORTS 1 HD' }, west: { number: '25706', id: '45571', name: 'US| FOX SPORTS 1 HD' } },
  fs2: { id: 'fs2', name: 'FS2', category: 'sports', east: { number: '25707', id: '45570', name: 'US| FOX SPORTS 2 HD' }, west: { number: '25707', id: '45570', name: 'US| FOX SPORTS 2 HD' } },
  nflnetwork: { id: 'nflnetwork', name: 'NFL Network', category: 'sports', east: { number: '29410', id: '45526', name: 'US| NFL NETWORK HD' }, west: { number: '29410', id: '45526', name: 'US| NFL NETWORK HD' } },
  nflredzone: { id: 'nflredzone', name: 'NFL RedZone', category: 'sports', east: { number: '29411', id: '45524', name: 'US| NFL REDZONE HD' }, west: { number: '29411', id: '45524', name: 'US| NFL REDZONE HD' } },
  mlbnetwork: { id: 'mlbnetwork', name: 'MLB Network', category: 'sports', east: { number: '25731', id: '45539', name: 'US| MLB NETWORK' }, west: { number: '25731', id: '45539', name: 'US| MLB NETWORK' } },
  nbanetwork: { id: 'nbanetwork', name: 'NBA TV', category: 'sports', east: { number: '29096', id: '749756', name: 'US| NBA TV HD' }, west: { number: '29096', id: '749756', name: 'US| NBA TV HD' } },
  nhlnetwork: { id: 'nhlnetwork', name: 'NHL Network', category: 'sports', east: { number: '29245', id: '746188', name: 'US| NHL NETWORK' }, west: { number: '29245', id: '746188', name: 'US| NHL NETWORK' } },
  golfchannel: { id: 'golfchannel', name: 'Golf Channel', category: 'sports', east: { number: '25729', id: '45554', name: 'US| GOLF CHANNEL HD' }, west: { number: '25729', id: '45554', name: 'US| GOLF CHANNEL HD' } },
  tennischannel: { id: 'tennischannel', name: 'Tennis Channel', category: 'sports', east: { number: '25756', id: '811667', name: 'US| TENNIS CHANNEL' }, west: { number: '25756', id: '811667', name: 'US| TENNIS CHANNEL' } },
  cbssports: { id: 'cbssports', name: 'CBS Sports', category: 'sports', east: { number: '25685', id: '45601', name: 'US| CBS SPORTS NETWORK HD' }, west: { number: '25685', id: '45601', name: 'US| CBS SPORTS NETWORK HD' } },
  accnetwork: { id: 'accnetwork', name: 'ACC Network', category: 'sports', east: { number: '25672', id: '90960', name: 'US| ACC NETWORK HD' }, west: { number: '25672', id: '90960', name: 'US| ACC NETWORK HD' } },
  secnetwork: { id: 'secnetwork', name: 'SEC Network', category: 'sports', east: { number: '25746', id: '45506', name: 'US| SEC NETWORK HD' }, west: { number: '25746', id: '45506', name: 'US| SEC NETWORK HD' } },
  bigten: { id: 'bigten', name: 'Big Ten Network', category: 'sports', east: { number: '25684', id: '45609', name: 'US| BIG TEN NETWORK HD' }, west: { number: '25684', id: '45609', name: 'US| BIG TEN NETWORK HD' } },

  // ===== ENTERTAINMENT =====
  usa: { id: 'usa', name: 'USA Network', category: 'entertainment', east: { number: '25489', id: '45466', name: 'US| USA NETWORK HD' }, west: { number: '25489', id: '45466', name: 'US| USA NETWORK HD' } },
  tnt: { id: 'tnt', name: 'TNT', category: 'entertainment', east: { number: '25477', id: '45469', name: 'US| TNT HD' }, west: { number: '25477', id: '45469', name: 'US| TNT HD' } },
  tbs: { id: 'tbs', name: 'TBS', category: 'entertainment', east: { number: '25465', id: '45475', name: 'US| TBS HD' }, west: { number: '25465', id: '45475', name: 'US| TBS HD' } },
  fx: { id: 'fx', name: 'FX', category: 'entertainment', east: { number: '25373', id: '45451', name: 'US| FX HD' }, west: { number: '25373', id: '45451', name: 'US| FX HD' } },
  fxx: { id: 'fxx', name: 'FXX', category: 'entertainment', east: { number: '25376', id: '45449', name: 'US| FXX HD' }, west: { number: '25376', id: '45449', name: 'US| FXX HD' } },
  amc: { id: 'amc', name: 'AMC', category: 'entertainment', east: { number: '25292', id: '45445', name: 'US| AMC HD' }, west: { number: '25292', id: '45445', name: 'US| AMC HD' } },
  bravo: { id: 'bravo', name: 'Bravo', category: 'entertainment', east: { number: '25315', id: '45446', name: 'US| BRAVO HD' }, west: { number: '25315', id: '45446', name: 'US| BRAVO HD' } },
  syfy: { id: 'syfy', name: 'Syfy', category: 'entertainment', east: { number: '25462', id: '45476', name: 'US| SYFY HD' }, west: { number: '25462', id: '45476', name: 'US| SYFY HD' } },
  lifetime: { id: 'lifetime', name: 'Lifetime', category: 'entertainment', east: { number: '25408', id: '45541', name: 'US| LIFETIME HD' }, west: { number: '25408', id: '45541', name: 'US| LIFETIME HD' } },
  hallmark: { id: 'hallmark', name: 'Hallmark', category: 'entertainment', east: { number: '25386', id: '45458', name: 'US| HALLMARK HD' }, west: { number: '25386', id: '45458', name: 'US| HALLMARK HD' } },
  paramount: { id: 'paramount', name: 'Paramount Network', category: 'entertainment', east: { number: '25442', id: '45500', name: 'US| PARAMOUNT HD' }, west: { number: '25442', id: '45500', name: 'US| PARAMOUNT HD' } },
  comedy: { id: 'comedy', name: 'Comedy Central', category: 'entertainment', east: { number: '25330', id: '45448', name: 'US| COMEDY CENTRAL HD' }, west: { number: '25330', id: '45448', name: 'US| COMEDY CENTRAL HD' } },
  tvland: { id: 'tvland', name: 'TV Land', category: 'entertainment', east: { number: '25486', id: '45467', name: 'US| TV LAND HD' }, west: { number: '25486', id: '45467', name: 'US| TV LAND HD' } },
  bet: { id: 'bet', name: 'BET', category: 'entertainment', east: { number: '25306', id: '45610', name: 'US| BET HD' }, west: { number: '25306', id: '45610', name: 'US| BET HD' } },
  wetv: { id: 'wetv', name: 'WE tv', category: 'entertainment', east: { number: '25494', id: '45464', name: 'US| WE TV HD' }, west: { number: '25494', id: '45464', name: 'US| WE TV HD' } },
  oxygen: { id: 'oxygen', name: 'Oxygen', category: 'entertainment', east: { number: '25440', id: '45517', name: 'US| OXYGEN HD' }, west: { number: '25441', id: '91868', name: 'US| OXYGEN WEST HD' } },
  own: { id: 'own', name: 'OWN', category: 'entertainment', east: { number: '25439', id: '45518', name: 'US| OWN HD' }, west: { number: '25439', id: '45518', name: 'US| OWN HD' } },
  freeform: { id: 'freeform', name: 'Freeform', category: 'entertainment', east: { number: '25369', id: '45557', name: 'US| FREEFORM HD' }, west: { number: '25370', id: '91849', name: 'US| FREEFORM WEST HD' } },
  ion: { id: 'ion', name: 'ION', category: 'entertainment', east: { number: '25403', id: '872292', name: 'US| ION HD' }, west: { number: '25403', id: '872292', name: 'US| ION HD' } },
  trutv: { id: 'trutv', name: 'truTV', category: 'entertainment', east: { number: '25482', id: '45468', name: 'US| TRUTV HD' }, west: { number: '25483', id: '91878', name: 'US| TRUTV WEST HD' } },

  // ===== MOVIES & PREMIUM =====
  hbo: { id: 'hbo', name: 'HBO', category: 'movies', east: { number: '25795', id: '45549', name: 'US| HBO HD' }, west: { number: '25795', id: '45549', name: 'US| HBO HD' } },
  hbo2: { id: 'hbo2', name: 'HBO 2', category: 'movies', east: { number: '25797', id: '45552', name: 'US| HBO 2 HD' }, west: { number: '25797', id: '45552', name: 'US| HBO 2 HD' } },
  hbosignature: { id: 'hbosignature', name: 'HBO Signature', category: 'movies', east: { number: '25801', id: '45547', name: 'US| HBO SIGNATURE HD' }, west: { number: '25801', id: '45547', name: 'US| HBO SIGNATURE HD' } },
  hbofamily: { id: 'hbofamily', name: 'HBO Family', category: 'movies', east: { number: '25800', id: '45550', name: 'US| HBO FAMILY HD' }, west: { number: '25800', id: '45550', name: 'US| HBO FAMILY HD' } },
  max: { id: 'max', name: 'Cinemax', category: 'movies', east: { number: '25787', id: '45598', name: 'US| CINEMAX EAST HD' }, west: { number: '25788', id: '45594', name: 'US| CINEMAX WEST HD' } },
  showtime: { id: 'showtime', name: 'Showtime', category: 'movies', east: { number: '25825', id: '45503', name: 'US| SHOWTIME HD' }, west: { number: '25825', id: '45503', name: 'US| SHOWTIME HD' } },
  showtime2: { id: 'showtime2', name: 'Showtime 2', category: 'movies', east: { number: '25828', id: '45505', name: 'US| SHOWTIME 2 HD' }, west: { number: '25828', id: '45505', name: 'US| SHOWTIME 2 HD' } },
  starz: { id: 'starz', name: 'Starz', category: 'movies', east: { number: '25840', id: '45480', name: 'US| STARZ HD' }, west: { number: '25840', id: '45480', name: 'US| STARZ HD' } },
  starzencore: { id: 'starzencore', name: 'Encore', category: 'movies', east: { number: '25850', id: '45486', name: 'US| STARZ ENCORE EAST HD' }, west: { number: '25854', id: '91947', name: 'US| STARZ ENCORE WESTERNS HD' } },
  tcm: { id: 'tcm', name: 'TCM', category: 'movies', east: { number: '25468', id: '90968', name: 'US| TCM HD' }, west: { number: '25469', id: '1813852', name: 'US| TCM WEST HD' } },

  // ===== KIDS =====
  disney: { id: 'disney', name: 'Disney Channel', category: 'kids', east: { number: '25629', id: '45588', name: 'US| DISNEY CHANNEL HD' }, west: { number: '25629', id: '45588', name: 'US| DISNEY CHANNEL HD' } },
  disneyjr: { id: 'disneyjr', name: 'Disney Junior', category: 'kids', east: { number: '25631', id: '45587', name: 'US| DISNEY JR HD' }, west: { number: '25632', id: '91832', name: 'US| DISNEY JR WEST HD' } },
  disneyxd: { id: 'disneyxd', name: 'Disney XD', category: 'kids', east: { number: '25633', id: '45586', name: 'US| DISNEY XD HD' }, west: { number: '25634', id: '91833', name: 'US| DISNEY XD WEST HD' } },
  nick: { id: 'nick', name: 'Nickelodeon', category: 'kids', east: { number: '25635', id: '45521', name: 'US| NICKELODEON HD' }, west: { number: '25635', id: '45521', name: 'US| NICKELODEON HD' } },
  nickjr: { id: 'nickjr', name: 'Nick Jr', category: 'kids', east: { number: '25637', id: '45522', name: 'US| NICK JR HD' }, west: { number: '25637', id: '45522', name: 'US| NICK JR HD' } },
  cartoonnetwork: { id: 'cartoonnetwork', name: 'Cartoon Network', category: 'kids', east: { number: '25626', id: '45607', name: 'US| CARTOON NETWORK HD' }, west: { number: '25626', id: '45607', name: 'US| CARTOON NETWORK HD' } },
  boomerang: { id: 'boomerang', name: 'Boomerang', category: 'kids', east: { number: '25625', id: '45608', name: 'US| BOOMERANG HD' }, west: { number: '25625', id: '45608', name: 'US| BOOMERANG HD' } },

  // ===== LIFESTYLE =====
  hgtv: { id: 'hgtv', name: 'HGTV', category: 'lifestyle', east: { number: '25391', id: '1350074', name: 'US| HGTV HD' }, west: { number: '25391', id: '1350074', name: 'US| HGTV HD' } },
  foodnetwork: { id: 'foodnetwork', name: 'Food Network', category: 'lifestyle', east: { number: '25365', id: '45577', name: 'US| FOOD NETWORK HD' }, west: { number: '25365', id: '45577', name: 'US| FOOD NETWORK HD' } },
  cookingchannel: { id: 'cookingchannel', name: 'Cooking Channel', category: 'lifestyle', east: { number: '25335', id: '45591', name: 'US| COOKING CHANNEL HD' }, west: { number: '25335', id: '45591', name: 'US| COOKING CHANNEL HD' } },
  tlc: { id: 'tlc', name: 'TLC', category: 'lifestyle', east: { number: '25473', id: '45471', name: 'US| TLC HD' }, west: { number: '25473', id: '45471', name: 'US| TLC HD' } },
  travelchannel: { id: 'travelchannel', name: 'Travel Channel', category: 'lifestyle', east: { number: '25480', id: '45437', name: 'US| TRAVEL CHANNEL HD' }, west: { number: '25481', id: '91880', name: 'US| TRAVEL CHANNEL WEST HD' } },
  ae: { id: 'ae', name: 'A&E', category: 'lifestyle', east: { number: '25287', id: '45619', name: 'US| A&E HD' }, west: { number: '25287', id: '45619', name: 'US| A&E HD' } },

  // ===== DOCUMENTARY =====
  discovery: { id: 'discovery', name: 'Discovery', category: 'documentary', east: { number: '25342', id: '1737815', name: 'US| DISCOVERY CHANNEL EAST' }, west: { number: '25343', id: '1737816', name: 'US| DISCOVERY CHANNEL WEST' } },
  history: { id: 'history', name: 'History', category: 'documentary', east: { number: '25390', id: '45444', name: 'US| HISTORY HD' }, west: { number: '25390', id: '45444', name: 'US| HISTORY HD' } },
  natgeo: { id: 'natgeo', name: 'National Geographic', category: 'documentary', east: { number: '25434', id: '45453', name: 'US| NAT GEO HD' }, west: { number: '25434', id: '45453', name: 'US| NAT GEO HD' } },
  natgeowild: { id: 'natgeowild', name: 'Nat Geo Wild', category: 'documentary', east: { number: '25435', id: '45452', name: 'US| NAT GEO WILD HD' }, west: { number: '25435', id: '45452', name: 'US| NAT GEO WILD HD' } },
  animalplanet: { id: 'animalplanet', name: 'Animal Planet', category: 'documentary', east: { number: '25295', id: '45447', name: 'US| ANIMAL PLANET HD' }, west: { number: '25296', id: '91762', name: 'US| ANIMAL PLANET WEST HD' } },
  sciencechannel: { id: 'sciencechannel', name: 'Science Channel', category: 'documentary', east: { number: '25345', id: '45441', name: 'US| DISCOVERY SCIENCE HD' }, west: { number: '25345', id: '45441', name: 'US| DISCOVERY SCIENCE HD' } },
  investigation: { id: 'investigation', name: 'Investigation Discovery', category: 'documentary', east: { number: '36987', id: '176875', name: 'CA| INVESTIGATION DISCOVERY HD' }, west: { number: '36987', id: '176875', name: 'CA| INVESTIGATION DISCOVERY HD' } },

  // ===== MUSIC =====
  mtv: { id: 'mtv', name: 'MTV', category: 'music', east: { number: '25420', id: '45461', name: 'US| MTV HD' }, west: { number: '25420', id: '45461', name: 'US| MTV HD' } },
  mtv2: { id: 'mtv2', name: 'MTV2', category: 'music', east: { number: '25419', id: '90963', name: 'US| MTV 2 HD' }, west: { number: '25419', id: '90963', name: 'US| MTV 2 HD' } },
  vh1: { id: 'vh1', name: 'VH1', category: 'music', east: { number: '25492', id: '45436', name: 'US| VH1 HD' }, west: { number: '25492', id: '45436', name: 'US| VH1 HD' } },
  cmt: { id: 'cmt', name: 'CMT', category: 'music', east: { number: '25327', id: '90937', name: 'US| CMT HD' }, west: { number: '25327', id: '90937', name: 'US| CMT HD' } },

  // ===== SPANISH =====
  telemundo: { id: 'telemundo', name: 'Telemundo', category: 'spanish', east: { number: '32582', id: '1597334', name: 'US| TELEMUNDO (EAST)' }, west: { number: '32627', id: '1597377', name: 'US| TELEMUNDO (WEST)' } },

  // ===== CANADIAN =====
  cbc: { id: 'cbc', name: 'CBC', category: 'canadian', east: { number: '36912', id: '176800', name: 'CA| CBC EAST HD' }, west: { number: '36912', id: '176800', name: 'CA| CBC EAST HD' } },
  ctv: { id: 'ctv', name: 'CTV', category: 'canadian', east: { number: '36934', id: '176812', name: 'CA| CTV HD' }, west: { number: '36934', id: '176812', name: 'CA| CTV HD' } },
  global: { id: 'global', name: 'Global', category: 'canadian', east: { number: '36948', id: '176824', name: 'CA| GLOBAL EAST HD' }, west: { number: '36951', id: '176825', name: 'CA| GLOBAL VANCOUVER/BC HD' } },
  tsn1: { id: 'tsn1', name: 'TSN 1', category: 'canadian', east: { number: '37206', id: '904216', name: 'CA| TSN1 FHD' }, west: { number: '37206', id: '904216', name: 'CA| TSN1 FHD' } },
  tsn2: { id: 'tsn2', name: 'TSN 2', category: 'canadian', east: { number: '37208', id: '904215', name: 'CA| TSN2 FHD' }, west: { number: '37208', id: '904215', name: 'CA| TSN2 FHD' } },
  tsn3: { id: 'tsn3', name: 'TSN 3', category: 'canadian', east: { number: '37210', id: '904214', name: 'CA| TSN3 FHD' }, west: { number: '37210', id: '904214', name: 'CA| TSN3 FHD' } },
  tsn4: { id: 'tsn4', name: 'TSN 4', category: 'canadian', east: { number: '37212', id: '904213', name: 'CA| TSN4 FHD' }, west: { number: '37212', id: '904213', name: 'CA| TSN4 FHD' } },
  tsn5: { id: 'tsn5', name: 'TSN 5', category: 'canadian', east: { number: '37214', id: '904212', name: 'CA| TSN5 FHD' }, west: { number: '37214', id: '904212', name: 'CA| TSN5 FHD' } },
  sportsnetone: { id: 'sportsnetone', name: 'Sportsnet ONE', category: 'canadian', east: { number: '37466', id: '904209', name: 'CA| SPORTSNET ONE FHD' }, west: { number: '37466', id: '904209', name: 'CA| SPORTSNET ONE FHD' } },
  sportsneteast: { id: 'sportsneteast', name: 'Sportsnet East', category: 'canadian', east: { number: '37462', id: '904210', name: 'CA| SPORTSNET EAST FHD' }, west: null },
  sportsnetwest: { id: 'sportsnetwest', name: 'Sportsnet West', category: 'canadian', east: null, west: { number: '37464', id: '904206', name: 'CA| SPORTSNET WEST FHD' } },
  sportsnetontario: { id: 'sportsnetontario', name: 'Sportsnet Ontario', category: 'canadian', east: { number: '37468', id: '904208', name: 'CA| SPORTSNET ONTARIO FHD' }, west: { number: '37468', id: '904208', name: 'CA| SPORTSNET ONTARIO FHD' } },
  sportsnetpacific: { id: 'sportsnetpacific', name: 'Sportsnet Pacific', category: 'canadian', east: { number: '37470', id: '904207', name: 'CA| SPORTSNET PACIFIC FHD' }, west: { number: '37470', id: '904207', name: 'CA| SPORTSNET PACIFIC FHD' } },
};

export const STALKER_CATEGORIES = {
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

export function getChannelsByCategory() {
  const grouped: Record<string, StalkerChannelMapping[]> = {};
  for (const [, channel] of Object.entries(STALKER_CHANNEL_MAPPING)) {
    if (!grouped[channel.category]) grouped[channel.category] = [];
    grouped[channel.category].push(channel);
  }
  return grouped;
}

export function getChannelById(id: string): StalkerChannelMapping | null {
  return STALKER_CHANNEL_MAPPING[id] || null;
}

export function getStalkerChannelId(channelId: string, preferWest = false): string | null {
  const mapping = STALKER_CHANNEL_MAPPING[channelId];
  if (!mapping) return null;
  
  if (preferWest && mapping.west) return mapping.west.id;
  if (mapping.east) return mapping.east.id;
  if (mapping.west) return mapping.west.id;
  return null;
}
