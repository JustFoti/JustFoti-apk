/**
 * DLHD Channel Key Mapping - January 2026
 * 
 * CRITICAL: topembed.pw uses DIFFERENT channel keys than hitsplay.fun!
 * - hitsplay.fun uses 'premium{id}' keys (e.g., 'premium35')
 * - topembed.pw uses correct keys (e.g., 'eplayerskyfoot' for Sky Sports Football)
 * 
 * This mapping was extracted by scanning all 800 DLHD channels via topembed.pw
 * and the dvalna.ru /server_lookup endpoint.
 */

export interface DLHDChannelInfo {
  channelKey: string;
  serverKey: string | null;
  name?: string;
}

export const DLHD_CHANNEL_MAP: Record<string, DLHDChannelInfo> = {
  // TNT Sports UK (31-34)
  '31': { channelKey: 'eplayerdigitvbt1', serverKey: 'top1', name: 'TNT Sports 1 [UK]' },
  '32': { channelKey: 'eplayerdigitvbt2', serverKey: 'top1', name: 'TNT Sports 2 [UK]' },
  '33': { channelKey: 'eplayerdigitvbt3', serverKey: 'top1', name: 'TNT Sports 3 [UK]' },
  '34': { channelKey: 'eplayerdigitvbt4', serverKey: 'top1', name: 'TNT Sports 4 [UK]' },
  
  // Sky Sports UK
  '35': { channelKey: 'eplayerskyfoot', serverKey: 'top2', name: 'Sky Sports Football [UK]' },
  '36': { channelKey: 'skyarena', serverKey: 'top1', name: 'Sky Sports Arena [UK]' },
  '37': { channelKey: 'skyaction', serverKey: 'top2', name: 'Sky Sports Action [UK]' },
  '38': { channelKey: 'eplayerskymain2', serverKey: 'top2', name: 'Sky Sports Main Event [UK]' },
  '46': { channelKey: 'skytennis', serverKey: null, name: 'Sky Sports Tennis [UK]' },
  '60': { channelKey: 'eplayerskyf1', serverKey: 'top2', name: 'Sky Sports F1 [UK]' },
  '65': { channelKey: 'eplayerskycric', serverKey: 'top2', name: 'Sky Sports Cricket [UK]' },
  '70': { channelKey: 'skygolf', serverKey: 'top2', name: 'Sky Sports Golf [UK]' },
  '130': { channelKey: 'eplayerSKYPL', serverKey: 'top2', name: 'Sky Sports Premier League [UK]' },
  
  // USA Sports
  '39': { channelKey: 'eplayerfs1', serverKey: 'wiki', name: 'FOX Sports 1 [USA]' },
  '40': { channelKey: 'tennisch', serverKey: 'wiki', name: 'Tennis Channel [USA]' },
  '44': { channelKey: 'eplayerespn_usa', serverKey: 'hzt', name: 'ESPN [USA]' },
  '45': { channelKey: 'eplayerespn2_usa', serverKey: 'hzt', name: 'ESPN 2 [USA]' },
  '51': { channelKey: 'ustvabc', serverKey: 'wiki', name: 'ABC [USA]' },
  '52': { channelKey: 'ustvcbs', serverKey: 'x4', name: 'CBS [USA]' },
  '53': { channelKey: 'ustvnbc', serverKey: 'wiki', name: 'NBC [USA]' },
  '66': { channelKey: 'tudnusa', serverKey: 'top2', name: 'TUDN [USA]' },
  '288': { channelKey: 'ustvespnews', serverKey: 'wiki', name: 'ESPN News [USA]' },
  '300': { channelKey: 'ustvcw', serverKey: 'hzt', name: 'CW [USA]' },
  '308': { channelKey: 'ustvcbssn', serverKey: 'wiki', name: 'CBS Sports Network [USA]' },
  '316': { channelKey: 'eplayerespn_u', serverKey: 'hzt', name: 'ESPN U [USA]' },
  
  // Portugal
  '49': { channelKey: 'eplayerSPORTTV1', serverKey: 'top2', name: 'Sport TV 1 [Portugal]' },
  '74': { channelKey: 'eplayerSPORTTV2', serverKey: 'top2', name: 'Sport TV 2 [Portugal]' },
  
  // South Africa
  '56': { channelKey: 'eplayerSuperSportFootball', serverKey: 'wiki', name: 'SuperSport Football' },
  
  // Poland
  '57': { channelKey: 'Eurosport1PL', serverKey: 'x4', name: 'Eurosport 1 [Poland]' },
  
  // beIN Sports
  '91': { channelKey: 'beinsports1arb', serverKey: 'x4', name: 'beIN Sports 1 [Arab]' },
  '92': { channelKey: 'beinsports2arb', serverKey: 'x4', name: 'beIN Sports 2 [Arab]' },
  
  // Brazil
  '81': { channelKey: 'espnbrazil', serverKey: 'x4', name: 'ESPN Brazil' },
  
  // Serbia
  '101': { channelKey: 'primasportklub1', serverKey: 'max2', name: 'Sportklub 1 [Serbia]' },
  '102': { channelKey: 'primasportklub2', serverKey: 'max2', name: 'Sportklub 2 [Serbia]' },
  '103': { channelKey: 'primasportklub3', serverKey: 'max2', name: 'Sportklub 3 [Serbia]' },
  '104': { channelKey: 'primasportklub4', serverKey: 'max2', name: 'Sportklub 4 [Serbia]' },
  '134': { channelKey: 'primarena1premiuserbia', serverKey: 'max2', name: 'Arena Premium 1' },
  '135': { channelKey: 'arena2premiumserbia', serverKey: 'x4', name: 'Arena Premium 2' },
  '139': { channelKey: 'arena3premiumserbia', serverKey: 'x4', name: 'Arena Premium 3' },
  
  // Canada
  '111': { channelKey: 'eplayerTSN_1_HD', serverKey: 'x4', name: 'TSN 1 [Canada]' },
  '113': { channelKey: 'eplayerTSN_3_HD', serverKey: 'x4', name: 'TSN 3 [Canada]' },
  '114': { channelKey: 'eplayerTSN_4_HD', serverKey: 'x4', name: 'TSN 4 [Canada]' },
  '115': { channelKey: 'eplayerTSN_5_HD', serverKey: 'x4', name: 'TSN 5 [Canada]' },
  
  // France
  '116': { channelKey: 'beinsport1fr', serverKey: 'wiki', name: 'beIN Sports 1 [France]' },
  '117': { channelKey: 'beinsport2fr', serverKey: 'wiki', name: 'beIN Sports 2 [France]' },
  '118': { channelKey: 'beinsport3fr', serverKey: 'wiki', name: 'beIN Sports 3 [France]' },
  '119': { channelKey: 'rmc1france', serverKey: 'wiki', name: 'RMC Sport 1 [France]' },
  '121': { channelKey: 'frcanalplus', serverKey: 'top1', name: 'Canal+ [France]' },
  '122': { channelKey: 'canalplusfrance', serverKey: 'wiki', name: 'Canal+ Sport [France]' },
  
  // Argentina
  '149': { channelKey: 'argespn', serverKey: 'x4', name: 'ESPN [Argentina]' },
  '150': { channelKey: 'arg_espn2', serverKey: 'top1', name: 'ESPN 2 [Argentina]' },
  
  // UK - DAZN & LaLiga
  '230': { channelKey: 'dazn1uk', serverKey: 'x4', name: 'DAZN 1 [UK]' },
  '276': { channelKey: 'laligatvuk', serverKey: 'azo', name: 'LaLiga TV [UK]' },
  
  // India
  '267': { channelKey: 'starsports1', serverKey: 'wiki', name: 'Star Sports 1 [India]' },
};

export function getChannelInfo(channelId: string): DLHDChannelInfo {
  const mapped = DLHD_CHANNEL_MAP[channelId];
  if (mapped) return mapped;
  return { channelKey: `premium${channelId}`, serverKey: null };
}

export function hasChannelMapping(channelId: string): boolean {
  return channelId in DLHD_CHANNEL_MAP;
}
