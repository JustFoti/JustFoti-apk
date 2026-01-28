/**
 * TV Proxy Cloudflare Worker
 *
 * DLHD ONLY - NO IPTV/STALKER PROVIDERS!
 * 
 * Proxies DLHD live streams with automatic server lookup.
 * Uses proper channel routing to differentiate from other providers.
 *
 * Routes:
 *   GET /?channel=<id>           - Get proxied M3U8 playlist (DLHD channels only)
 *   GET /cdnlive?url=<url>       - Proxy nested M3U8 manifests (through Next.js /tv route)
 *   GET /segment?url=<url>       - Proxy video segments (DIRECT to worker, bypasses Next.js)
 *   GET /key?url=<encoded_url>   - Proxy encryption key (with PoW auth)
 *   GET /health                  - Health check
 * 
 * ROUTING ARCHITECTURE (January 2026):
 * - Manifests (.m3u8) → /tv/cdnlive (through Next.js for proper handling)
 * - Segments (.ts) → /segment (DIRECT to worker for optimal performance)
 * - This separation reduces latency and improves video playback
 * - See: cloudflare-proxy/SECURITY-ANALYSIS-TV-PROXY.md for details
 * 
 * KEY FETCHING (January 2026 Update):
 * - WASM-based PoW computation (bundled from DLHD's player v2.0.0-hardened)
 * - PoW runs entirely in CF worker - no external dependencies for nonce computation
 * - RPI proxy only needed for final key fetch (residential IP required)
 */

import { createLogger, type LogLevel } from './logger';
import { initDLHDPoW, computeNonce as computeWasmNonce, getVersion as getWasmVersion } from './dlhd-pow';

// ============================================================================
// DLHD Channel Key Mapping - January 2026
// CRITICAL: topembed.pw uses DIFFERENT channel keys than hitsplay.fun!
// - hitsplay.fun uses 'premium{id}' keys (e.g., 'premium35')
// - topembed.pw uses correct keys (e.g., 'eplayerskyfoot' for Sky Sports Football)
// ============================================================================
interface DLHDChannelInfo {
  channelKey: string;
  serverKey: string | null;
  name?: string;
}

// COMPLETE DLHD Channel Mapping - Auto-generated from data/dlhd-channels.json
// Total topembed channels: 266
// COMPLETE DLHD Channel Mapping - Auto-generated from data/dlhd-channels.json
// Total topembed channels: 266
const DLHD_CHANNEL_MAP: Record<string, DLHDChannelInfo> = {
  '31': { channelKey: 'eplayerdigitvbt1', serverKey: 'top1', name: 'TNTSports1[UK]' },
  '32': { channelKey: 'eplayerdigitvbt2', serverKey: 'top1', name: 'TNTSports2[UK]' },
  '33': { channelKey: 'eplayerdigitvbt3', serverKey: 'top1', name: 'TNTSports3[UK]' },
  '34': { channelKey: 'eplayerdigitvbt4', serverKey: 'top1', name: 'TNTSports4[UK]' },
  '35': { channelKey: 'eplayerskyfoot', serverKey: 'top2', name: 'SkySportsFootball[UK]' },
  '36': { channelKey: 'skyarena', serverKey: 'top1', name: 'SkySportsArena[UK]' },
  '37': { channelKey: 'skyaction', serverKey: 'top2', name: 'SkySportsAction[UK]' },
  '38': { channelKey: 'eplayerskymain2', serverKey: 'top2', name: 'SkySportsMainEvent[UK]' },
  '39': { channelKey: 'eplayerfs1', serverKey: 'wiki', name: 'FOXSports1[USA]' },
  '40': { channelKey: 'tennisch', serverKey: 'wiki', name: 'TennisChannel[USA]' },
  '43': { channelKey: 'pdctv', serverKey: null, name: 'PDCTV[USA]' },
  '44': { channelKey: 'eplayerespn_usa', serverKey: 'hzt', name: 'ESPN[USA]' },
  '45': { channelKey: 'eplayerespn2_usa', serverKey: 'hzt', name: 'ESPN2[USA]' },
  '46': { channelKey: 'skytennis', serverKey: null, name: 'SkySportsTennis[UK]' },
  '48': { channelKey: 'CanalPlusSportPL', serverKey: null, name: 'CanalSport[Poland]' },
  '49': { channelKey: 'eplayerSPORTTV1', serverKey: 'top2', name: 'SportTV1[Portugal]' },
  '51': { channelKey: 'ustvabc', serverKey: 'wiki', name: 'AbcTv[USA]' },
  '52': { channelKey: 'ustvcbs', serverKey: 'x4', name: 'CBS[USA]' },
  '53': { channelKey: 'ustvnbc', serverKey: 'wiki', name: 'NBC[USA]' },
  '54': { channelKey: 'ustvfox', serverKey: null, name: 'Fox[USA]' },
  '56': { channelKey: 'eplayerSuperSportFootball', serverKey: 'wiki', name: 'SuperSportFootball[SouthAfrica]' },
  '57': { channelKey: 'Eurosport1PL', serverKey: 'x4', name: 'Eurosport1[Poland]' },
  '58': { channelKey: 'Eurosport2PL', serverKey: null, name: 'Eurosport2[Poland]' },
  '60': { channelKey: 'eplayerskyf1', serverKey: 'top2', name: 'SkySportsF1[UK]' },
  '61': { channelKey: 'beinsports1EN', serverKey: null, name: 'BeinSportsMena1[UK]' },
  '65': { channelKey: 'eplayerskycric', serverKey: 'top2', name: 'SkySportsCricket[UK]' },
  '66': { channelKey: 'tudnusa', serverKey: 'top2', name: 'TUDN[USA]' },
  '70': { channelKey: 'skygolf', serverKey: 'top2', name: 'SkySportsGolf[UK]' },
  '71': { channelKey: 'elevensports1pl', serverKey: 'x4', name: 'ElevenSports1[Poland]' },
  '74': { channelKey: 'eplayerSPORTTV2', serverKey: 'top2', name: 'SportTV2[Portugal]' },
  '75': { channelKey: 'Canalplus5pl', serverKey: null, name: 'CanalPlusSport5[Poland]' },
  '81': { channelKey: 'espnbrazil', serverKey: 'x4', name: 'ESPNBrazil[Brazil]' },
  '84': { channelKey: 'mlaligahd', serverKey: null, name: 'MLaliga[Spain]' },
  '88': { channelKey: 'premierebr', serverKey: null, name: 'Premiere1[Brasil]' },
  '89': { channelKey: 'combatbra', serverKey: null, name: 'Combate[Brazil]' },
  '91': { channelKey: 'beinsports1arb', serverKey: 'x4', name: 'BeinSports1[Arab]' },
  '92': { channelKey: 'beinsports2arb', serverKey: 'x4', name: 'BeinSports2[Arab]' },
  '101': { channelKey: 'primasportklub1', serverKey: 'max2', name: 'Sportklub1[Serbia]' },
  '102': { channelKey: 'primasportklub2', serverKey: 'max2', name: 'Sportklub2[Serbia]' },
  '103': { channelKey: 'primasportklub3', serverKey: 'max2', name: 'Sportklub3[Serbia]' },
  '104': { channelKey: 'primasportklub4', serverKey: 'max2', name: 'Sportklub4[Serbia]' },
  '111': { channelKey: 'eplayerTSN_1_HD', serverKey: 'x4', name: 'TSN1[Canada]' },
  '112': { channelKey: 'eplayerTSN_2_HD', serverKey: null, name: 'TSN2[Canada]' },
  '113': { channelKey: 'eplayerTSN_3_HD', serverKey: 'x4', name: 'TSN3[Canada]' },
  '114': { channelKey: 'eplayerTSN_4_HD', serverKey: 'x4', name: 'TSN4[Canada]' },
  '115': { channelKey: 'eplayerTSN_5_HD', serverKey: 'x4', name: 'TSN5[Canada]' },
  '116': { channelKey: 'beinsport1fr', serverKey: 'wiki', name: 'BeINSport1[France]' },
  '117': { channelKey: 'beinsport2fr', serverKey: 'wiki', name: 'BeINSport2[France]' },
  '118': { channelKey: 'beinsport3fr', serverKey: 'wiki', name: 'BeINSport3[France]' },
  '119': { channelKey: 'rmc1france', serverKey: 'wiki', name: 'RMCSport1[France]' },
  '121': { channelKey: 'frcanalplus', serverKey: 'top1', name: 'CanalPlus[France]' },
  '122': { channelKey: 'canalplusfrance', serverKey: 'wiki', name: 'CanalSport[France]' },
  '130': { channelKey: 'eplayerSKYPL', serverKey: 'top2', name: 'SkySportsPremierLeague[UK]' },
  '134': { channelKey: 'primarena1premiuserbia', serverKey: 'max2', name: 'ArenaPremium1[Serbia]' },
  '135': { channelKey: 'arena2premiumserbia', serverKey: 'x4', name: 'ArenaPremium2[Serbia]' },
  '139': { channelKey: 'arena3premiumserbia', serverKey: 'x4', name: 'ArenaPremium3[Serbia]' },
  '149': { channelKey: 'argespn', serverKey: 'x4', name: 'ESPN[Argentina]' },
  '150': { channelKey: 'arg_espn2', serverKey: 'top1', name: 'ESPN2[Argentina]' },
  '230': { channelKey: 'dazn1uk', serverKey: 'x4', name: 'DAZN1UK[UK]' },
  '267': { channelKey: 'starsports1', serverKey: 'wiki', name: 'StarSports1[India]' },
  '274': { channelKey: 'skysportsf1germany', serverKey: null, name: 'SkySportsF1[Germany]' },
  '276': { channelKey: 'laligatvuk', serverKey: 'azo', name: 'LaLigaTV[UK]' },
  '288': { channelKey: 'ustvespnews', serverKey: 'wiki', name: 'ESPNNews[USA]' },
  '289': { channelKey: 'eplayerSPORTTV5', serverKey: 'top2', name: 'SportTV4[Portugal]' },
  '290': { channelKey: 'eplayerSPORTTV5', serverKey: 'top2', name: 'SportTV5[Portugal]' },
  '291': { channelKey: 'eplayerSPORTTV6', serverKey: null, name: 'SportTV6[Portugal]' },
  '298': { channelKey: 'fxx', serverKey: 'wiki', name: 'FXX[USA]' },
  '300': { channelKey: 'ustvcw', serverKey: 'hzt', name: 'CW[USA]' },
  '308': { channelKey: 'ustvcbssn', serverKey: 'wiki', name: 'CBSSN[USA]' },
  '313': { channelKey: 'ustvdiscoverychannel', serverKey: 'wiki', name: 'DiscoveryChannel[USA]' },
  '316': { channelKey: 'eplayerespn_u', serverKey: 'hzt', name: 'ESPNU[USA]' },
  '318': { channelKey: 'ustvgolfchanel', serverKey: 'hzt', name: 'GOLFChannel[USA]' },
  '319': { channelKey: 'gameshow', serverKey: 'hzt', name: 'GameShowNetwork[USA]' },
  '336': { channelKey: 'tbs', serverKey: 'wiki', name: 'TBS[USA]' },
  '338': { channelKey: 'ustvtnt', serverKey: 'wiki', name: 'TNT[USA]' },
  '339': { channelKey: 'calciocartoonnetwork', serverKey: null, name: 'CartoonNetwork[Italy]' },
  '343': { channelKey: 'usanetwork', serverKey: 'hzt', name: 'USANetwork[USA]' },
  '346': { channelKey: 'willowtvcricket', serverKey: 'wiki', name: 'WillowTV[USA]' },
  '347': { channelKey: 'ustvfoxnnews', serverKey: 'top1', name: 'FoxNews[USA]' },
  '349': { channelKey: 'bbcnews', serverKey: 'x4', name: 'BBCNEWS24[UK]' },
  '350': { channelKey: 'itv1uk', serverKey: 'wiki', name: 'ITV1[UK]' },
  '351': { channelKey: 'itv2uk', serverKey: 'wiki', name: 'ITV2[UK]' },
  '352': { channelKey: 'itv3uk', serverKey: 'wiki', name: 'ITV3[UK]' },
  '353': { channelKey: 'itv4uk', serverKey: 'wiki', name: 'ITV4[UK]' },
  '354': { channelKey: 'channel4uk', serverKey: 'top1', name: 'Channel4[UK]' },
  '355': { channelKey: 'Channel5uk', serverKey: 'x4', name: 'Channel5[UK]' },
  '356': { channelKey: 'xbbc1', serverKey: 'x4', name: 'BBCOne[UK]' },
  '357': { channelKey: 'xbbc2', serverKey: 'x4', name: 'BBCTwo[UK]' },
  '358': { channelKey: 'xbbc3', serverKey: 'wiki', name: 'BBCThree[UK]' },
  '359': { channelKey: 'xbbc4', serverKey: 'wiki', name: 'BBCFour[UK]' },
  '364': { channelKey: 'rteoneir', serverKey: 'wiki', name: 'RTEOne[Ireland]' },
  '365': { channelKey: 'rtetwoir', serverKey: 'wiki', name: 'RTETwo[Ireland]' },
  '366': { channelKey: 'skysportsnews', serverKey: 'top1', name: 'SkySportsNews[UK]' },
  '368': { channelKey: 'eplayerSuperSportCricket', serverKey: null, name: 'SuperSportCricket[SouthAfrica]' },
  '369': { channelKey: 'fox501', serverKey: 'x4', name: 'Fox501[Australia]' },
  '370': { channelKey: 'astrocricket', serverKey: null, name: 'AstroCricket[Malaysia]' },
  '375': { channelKey: 'eplayerespn_dep', serverKey: 'wiki', name: 'ESPNDeportes[USA]' },
  '376': { channelKey: 'ustvwwe', serverKey: 'hzt', name: 'WweNetwork[USA]' },
  '377': { channelKey: 'mutv', serverKey: 'top1', name: 'MUTV[UK]' },
  '379': { channelKey: 'espn1nl', serverKey: 'top1', name: 'ESPN1[Netherlands]' },
  '385': { channelKey: 'eplayerSECNetwork', serverKey: 'wiki', name: 'SECNetwork[USA]' },
  '386': { channelKey: 'espn2nl', serverKey: 'top1', name: 'ESPN2[Netherlands]' },
  '387': { channelKey: 'arg_espn_premium', serverKey: null, name: 'ESPNPremium[Argentina]' },
  '388': { channelKey: 'argtntsports', serverKey: 'wiki', name: 'TNTSports[Argentina]' },
  // NOTE: Channel 388 also works with premium388 on ddy6 server (fallback from hitsplay.fun)
  // Server lookup: argtntsports → wiki, premium388 → ddy6
  '392': { channelKey: 'winsportsplus', serverKey: 'wiki', name: 'WINSports[Colombia]' },
  '393': { channelKey: 'ZiggoSportNL', serverKey: 'wiki', name: 'ZiggoSport[Netherlands]' },
  '396': { channelKey: 'Ziggosport4NL', serverKey: null, name: 'ZiggoSport4[Netherlands]' },
  '397': { channelKey: 'ustvbtn', serverKey: 'wiki', name: 'BTN[USA]' },
  '398': { channelKey: 'Ziggosport2NL', serverKey: 'wiki', name: 'ZiggoSport2[Netherlands]' },
  '399': { channelKey: 'ustvmlbnetwork', serverKey: 'hzt', name: 'MLBNetwork[USA]' },
  '400': { channelKey: 'premium400', serverKey: 'nfs', name: 'DigiSport1[Romania]' },
  '401': { channelKey: 'premium401', serverKey: 'nfs', name: 'DigiSport2[Romania]' },
  '402': { channelKey: 'premium402', serverKey: 'nfs', name: 'DigiSport3[Romania]' },
  '403': { channelKey: 'premium403', serverKey: 'nfs', name: 'DigiSport4[Romania]' },
  '405': { channelKey: 'eplayerNFLNetwork', serverKey: 'hzt', name: 'NFLNetwork[USA]' },
  '406': { channelKey: 'sportsnetont', serverKey: 'wiki', name: 'SportsnetOntario[Canada]' },
  '407': { channelKey: 'primasportsnetwest', serverKey: 'wiki', name: 'SportsnetWest[Canada]' },
  '408': { channelKey: 'sportsneteast', serverKey: 'wiki', name: 'SportsnetEast[Canada]' },
  '409': { channelKey: 'primasportsnet360', serverKey: 'wiki', name: 'Sportsnet360[Canada]' },
  '410': { channelKey: 'primasportsnetworld', serverKey: 'wiki', name: 'SportsnetWorld[Canada]' },
  '411': { channelKey: 'primasportsnetone', serverKey: 'wiki', name: 'SportsnetOne[Canada]' },
  '412': { channelKey: 'eplayerSupersportGrandstand', serverKey: null, name: 'SuperSportGrandstand[SouthAfrica]' },
  '413': { channelKey: 'eplayerSuperSportPSL', serverKey: 'wiki', name: 'SuperSportPSL[SouthAfrica]' },
  '414': { channelKey: 'eplayerSuperSportPL', serverKey: 'x4', name: 'SuperSportPremierLeague[SouthAfrica]' },
  '415': { channelKey: 'eplayerSuperSportLaLiga', serverKey: null, name: 'SuperSportLaLiga[SouthAfrica]' },
  '416': { channelKey: 'eplayerSuperSportVariety1', serverKey: null, name: 'SuperSportVariety1[SouthAfrica]' },
  '417': { channelKey: 'eplayerSuperSportVariety2', serverKey: null, name: 'SuperSportVariety2[SouthAfrica]' },
  '418': { channelKey: 'eplayerSuperSportVariety3', serverKey: 'x4', name: 'SuperSportVariety3[SouthAfrica]' },
  '419': { channelKey: 'eplayerSuperSportVariety4', serverKey: null, name: 'SuperSportVariety4[SouthAfrica]' },
  '420': { channelKey: 'eplayerSuperSportAction', serverKey: 'x4', name: 'SuperSportAction[SouthAfrica]' },
  '421': { channelKey: 'eplayerSuperSportRugby', serverKey: 'wiki', name: 'SuperSportRugby[SouthAfrica]' },
  '422': { channelKey: 'eplayerSuperSportGolf', serverKey: null, name: 'SuperSportGolf[SouthAfrica]' },
  '423': { channelKey: 'eplayerSuperSportTennis', serverKey: null, name: 'SuperSportTennis[SouthAfrica]' },
  '424': { channelKey: 'eplayerSuperSportMotorsport', serverKey: 'wiki', name: 'SuperSportMotorsport[SouthAfrica]' },
  '425': { channelKey: 'beinsportsusa', serverKey: 'top2', name: 'beINSPORTSUSA[USA]' },
  '426': { channelKey: 'dazn1de', serverKey: 'x4', name: 'DAZN1Deutschland[Germany]' },
  '427': { channelKey: 'dazn2de', serverKey: 'x4', name: 'DAZN2Deutschland[Germany]' },
  '429': { channelKey: 'arenasport1serbia', serverKey: 'x4', name: 'ArenaSport1[Serbia]' },
  '430': { channelKey: 'arenasport2serbia', serverKey: 'x4', name: 'ArenaSport2[Serbia]' },
  '431': { channelKey: 'arenasport3serbia', serverKey: 'x4', name: 'ArenaSport3[Serbia]' },
  '435': { channelKey: 'movistarligadecampeones1', serverKey: 'wiki', name: 'MovistarLigadeCampeones1[Spain]' },
  '436': { channelKey: 'movistardeportes', serverKey: 'wiki', name: 'MovistarDeportes[Spain]' },
  '445': { channelKey: 'dazn1es', serverKey: 'top2', name: 'DAZN1[Spain]' },
  '446': { channelKey: 'dazn2es', serverKey: 'top2', name: 'DAZN2[Spain]' },
  '449': { channelKey: 'skymix', serverKey: 'x4', name: 'SkySportsMix[UK]' },
  '450': { channelKey: 'ptvsportspk', serverKey: 'x4', name: 'PTVSports[Pakistan]' },
  '451': { channelKey: 'newpremier1uk', serverKey: 'top2', name: 'ViaplaySports1[UK]' },
  '453': { channelKey: 'sportklubserbia', serverKey: null, name: 'Sportklub[Serbia]' },
  '454': { channelKey: 'eplayerSPORTTV3', serverKey: 'top2', name: 'SportTV3[Portugal]' },
  '455': { channelKey: 'eplayereleven1', serverKey: 'wiki', name: 'ElevenSports1[Portugal]' },
  '456': { channelKey: 'eplayereleven2', serverKey: 'wiki', name: 'ElevenSports2[Portugal]' },
  '457': { channelKey: 'eplayereleven3', serverKey: 'wiki', name: 'ElevenSports3[Portugal]' },
  '458': { channelKey: 'eplayereleven4', serverKey: 'wiki', name: 'ElevenSports4[Portugal]' },
  '459': { channelKey: 'eplayereleven5', serverKey: 'wiki', name: 'ElevenSports5[Portugal]' },
  '461': { channelKey: 'Skysportsunoit', serverKey: null, name: 'SkySportsUno[Italy]' },
  '464': { channelKey: 'canalplus360', serverKey: 'wiki', name: 'CanalSport360[France]' },
  '465': { channelKey: 'diemasport', serverKey: 'wiki', name: 'DiemaSport[Bulgaria]' },
  '466': { channelKey: 'diemasport2', serverKey: 'wiki', name: 'DiemaSport2[Bulgaria]' },
  '494': { channelKey: 'Beinsport4maxfr', serverKey: 'x4', name: 'BeINSport4max[France]' },
  '521': { channelKey: 'movistarvamos', serverKey: 'wiki', name: 'EllasVamos[Spain]' },
  '524': { channelKey: 'eplayermovistarEurosport1_ES', serverKey: 'wiki', name: 'Eurosport1[Spain]' },
  '525': { channelKey: 'eplayermovistarEurosport2_ES', serverKey: 'wiki', name: 'Eurosport2[Spain]' },
  '532': { channelKey: 'telecincosp', serverKey: 'top1', name: 'TeleCinco[Spain]' },
  '537': { channelKey: 'daznf1', serverKey: 'top1', name: 'DAZNF1[Spain]' },
  '538': { channelKey: 'daznlaliga', serverKey: 'wiki', name: 'DAZNLaliga[Spain]' },
  '539': { channelKey: 'Laligahypermotion', serverKey: null, name: 'Laligahypermotion[Spain]' },
  '540': { channelKey: 'canal11', serverKey: 'wiki', name: 'Canal11[Portugal]' },
  '554': { channelKey: 'skysportsracing', serverKey: null, name: 'SkySportsRacing[UK]' },
  '555': { channelKey: 'racingtv', serverKey: 'wiki', name: 'RacingTV[UK]' },
  '556': { channelKey: 'eplayerSky_Sport_Top_Event_HD', serverKey: 'wiki', name: 'SkySportTopEvent[Germany]' },
  '558': { channelKey: 'eplayerSky_Sport_Bundesliga_1_HD', serverKey: 'x4', name: 'SkyBundesliga1[Germany]' },
  '563': { channelKey: 'motowizjapl', serverKey: null, name: 'Motowizja[Poland]' },
  '577': { channelKey: 'skysportsf1italy', serverKey: 'x4', name: 'SkySportsF1[Italy]' },
  '581': { channelKey: 'arenasport4serbia', serverKey: 'x4', name: 'ArenaSport4[Serbia]' },
  '583': { channelKey: 'premium583', serverKey: 'nfs', name: 'PrimaSport1[Romania]' },
  '584': { channelKey: 'premium584', serverKey: 'dokko1', name: 'PrimaSport2[Romania]' },
  '585': { channelKey: 'premium585', serverKey: 'nfs', name: 'PrimaSport3[Romania]' },
  '586': { channelKey: 'premium586', serverKey: null, name: 'PrimaSport4[Romania]' },
  '587': { channelKey: 'skynz_select', serverKey: null, name: 'SkySportSelect[NewZealand]' },
  '588': { channelKey: 'skynz1', serverKey: 'azo', name: 'SkySport1[NewZealand]' },
  '589': { channelKey: 'skynz2', serverKey: 'azo', name: 'SkySport2[NewZealand]' },
  '590': { channelKey: 'skynz3', serverKey: 'azo', name: 'SkySport3[NewZealand]' },
  '591': { channelKey: 'skynz4', serverKey: 'azo', name: 'SkySport4[NewZealand]' },
  '592': { channelKey: 'skynz5', serverKey: 'azo', name: 'SkySport5[NewZealand]' },
  '593': { channelKey: 'skynz6', serverKey: 'azo', name: 'SkySport6[NewZealand]' },
  '594': { channelKey: 'skynz7', serverKey: 'azo', name: 'SkySport7[NewZealand]' },
  '595': { channelKey: 'skynz8', serverKey: 'azo', name: 'SkySport8[NewZealand]' },
  '596': { channelKey: 'skynz9', serverKey: 'azo', name: 'SkySport9[NewZealand]' },
  '598': { channelKey: 'willowxtra', serverKey: 'x4', name: 'WillowXtra[USA]' },
  '607': { channelKey: 'eplayerrallytv_uk', serverKey: 'top1', name: 'RallyTV[UK]' },
  '622': { channelKey: 'ftkcosmote1', serverKey: 'top1', name: 'CosmoteSport1[Greece]' },
  '623': { channelKey: 'ftkcosmote2', serverKey: 'top1', name: 'CosmoteSport2[Greece]' },
  '624': { channelKey: 'ftkcosmote3', serverKey: 'top1', name: 'CosmoteSport3[Greece]' },
  '625': { channelKey: 'ftkcosmote4', serverKey: 'top1', name: 'CosmoteSport4[Greece]' },
  '626': { channelKey: 'ftkcosmote5', serverKey: 'top1', name: 'CosmoteSport5[Greece]' },
  '627': { channelKey: 'ftkcosmote6', serverKey: 'top1', name: 'CosmoteSport6[Greece]' },
  '628': { channelKey: 'ftkcosmote7', serverKey: 'top1', name: 'CosmoteSport7[Greece]' },
  '629': { channelKey: 'ftkcosmote8', serverKey: 'top1', name: 'CosmoteSport8[Greece]' },
  '630': { channelKey: 'ftkcosmote9', serverKey: 'top1', name: 'CosmoteSport9[Greece]' },
  '631': { channelKey: 'ftknovasport1', serverKey: 'top1', name: 'NovaSports1[Greece]' },
  '632': { channelKey: 'ftknovasport2', serverKey: 'top1', name: 'NovaSports2[Greece]' },
  '633': { channelKey: 'ftknovasport3', serverKey: 'top1', name: 'NovaSports3[Greece]' },
  '634': { channelKey: 'ftknovasport4', serverKey: 'top1', name: 'NovaSports4[Greece]' },
  '635': { channelKey: 'ftknovasport5', serverKey: null, name: 'NovaSports5[Greece]' },
  '636': { channelKey: 'ftknovasport6', serverKey: 'top1', name: 'NovaSports6[Greece]' },
  '637': { channelKey: 'ftknovasportstart', serverKey: 'x4', name: 'NovaSportsStart[Greece]' },
  '641': { channelKey: 'Sport1DE', serverKey: 'wiki', name: 'Sport1[Germany]' },
  '645': { channelKey: 'frlequipe', serverKey: 'top1', name: 'Lequipe[France]' },
  '646': { channelKey: 'mavtv', serverKey: null, name: 'MAVTV[USA]' },
  '663': { channelKey: 'nhlnet', serverKey: 'top1', name: 'NHLNetwork[USA]' },
  '664': { channelKey: 'accn', serverKey: 'wiki', name: 'ACCNetwork[USA]' },
  '670': { channelKey: 's4c', serverKey: 'top1', name: 'S4C[UK]' },
  '688': { channelKey: 'film4', serverKey: null, name: 'Film4[UK]' },
  '742': { channelKey: 'ustvaxs', serverKey: null, name: 'AxsTv[USA]' },
  '746': { channelKey: 'tyc_sports', serverKey: 'top1', name: 'TYCSports[Argentina]' },
  '753': { channelKey: 'nbcsa', serverKey: null, name: 'NBCSportsBayArea[USA]' },
  '754': { channelKey: 'nbcsboston', serverKey: 'wiki', name: 'NBCSBoston[USA]' },
  '755': { channelKey: 'nbcscali', serverKey: 'wiki', name: 'NBCSCalifornia[USA]' },
  '758': { channelKey: 'eplayerfs2', serverKey: 'wiki', name: 'FOXSports2[USA]' },
  '762': { channelKey: 'nesn', serverKey: 'wiki', name: 'NESN[USA]' },
  '763': { channelKey: 'yesnet', serverKey: 'wiki', name: 'YES[USA]' },
  '767': { channelKey: 'cbsny', serverKey: 'wiki', name: 'CBSNY[USA]' },
  '771': { channelKey: 'prem1ire', serverKey: null, name: 'Premiersport1[Ireland]' },
  '772': { channelKey: 'eurosport1fr', serverKey: 'wiki', name: 'Eurosport1[France]' },
  '773': { channelKey: 'eurosport2fr', serverKey: 'wiki', name: 'Eurosport2[France]' },
  '777': { channelKey: 'nbcphiladelphia', serverKey: 'hzt', name: 'NBCSPhiladelphia[USA]' },
  '787': { channelKey: 'argfoxsports1', serverKey: null, name: 'FOXSports1[Argentina]' },
  '788': { channelKey: 'argfoxsports2', serverKey: null, name: 'FOXSports2[Argentina]' },
  '798': { channelKey: 'arg_espn3', serverKey: null, name: 'ESPN3[Argentina]' },
  '809': { channelKey: 'tv3dk', serverKey: 'top2', name: 'TV3[Denmark]' },
  '820': { channelKey: 'fox502', serverKey: 'x4', name: 'Fox502[Australia]' },
  '821': { channelKey: 'fox503', serverKey: 'top2', name: 'Fox503[Australia]' },
  '822': { channelKey: 'fox504', serverKey: null, name: 'Fox504[Australia]' },
  '823': { channelKey: 'fox505', serverKey: null, name: 'Fox505[Australia]' },
  '824': { channelKey: 'fox506', serverKey: 'x4', name: 'Fox506[Australia]' },
  '825': { channelKey: 'fox507', serverKey: 'x4', name: 'Fox507[Australia]' },
  '829': { channelKey: 'masn', serverKey: 'wiki', name: 'MASN[USA]' },
  '843': { channelKey: 'premium843', serverKey: 'wiki', name: 'PrimaTV[Romania]' },
  '848': { channelKey: 'outdoorchannel', serverKey: 'wiki', name: 'OutdoorChannel[USA]' },
  '870': { channelKey: 'skysportscalcioIT', serverKey: 'x4', name: 'SkySportsCalcio[Italy]' },
  '871': { channelKey: 'skysports251IT', serverKey: 'x4', name: 'SkySports251[Italy]' },
  '884': { channelKey: 'eplayerSky_Sport_Tennis_HD', serverKey: 'wiki', name: 'SkySportTennis[Germany]' },
  '888': { channelKey: 'espn3nl', serverKey: 'top1', name: 'ESPN3[Netherlands]' },
  '891': { channelKey: 'Fanduelsportsdetroit', serverKey: null, name: 'FanDuelSportsDetroit[USA]' },
  '892': { channelKey: 'fanduelflorida', serverKey: 'top2', name: 'FanDuelSportsFlorida[USA]' },
  '895': { channelKey: 'Fanduelsportskansascity', serverKey: null, name: 'FanDuelSportKansasCity[USA]' },
  '896': { channelKey: 'Fanduelsportsmidwest', serverKey: null, name: 'FanDuelSportsMidwest[USA]' },
  '898': { channelKey: 'ballysportsnorth', serverKey: 'wiki', name: 'BallySportsNorth[USA]' },
  '899': { channelKey: 'fanduelohio', serverKey: null, name: 'FanDuelSportsOhio[USA]' },
  '900': { channelKey: 'ballysportsoklahoma', serverKey: null, name: 'BallySportsOklahoma[USA]' },
  '904': { channelKey: 'fanduelsoutheast', serverKey: 'wiki', name: 'FanDuelSportsSoutheast[USA]' },
  '905': { channelKey: 'ballysportssun', serverKey: null, name: 'BallySportsSun[USA]' },
  '906': { channelKey: 'ballysportssouthwest', serverKey: null, name: 'BallySportsWest[USA]' },
  '907': { channelKey: 'fanduelwis', serverKey: 'wiki', name: 'FanDuelSportsWisconsin[USA]' },
  '929': { channelKey: 'mexfs1', serverKey: 'azo', name: 'FOXSports1[Mexico]' },
  '930': { channelKey: 'mexfs2', serverKey: 'azo', name: 'FOXSports2[Mexico]' },
  '931': { channelKey: 'mexfs3', serverKey: 'azo', name: 'FOXSports3[Mexico]' },
  '935': { channelKey: 'mxtudn', serverKey: null, name: 'TUDN[Mexico]' },
  '940': { channelKey: 'arenasport5serbia', serverKey: 'x4', name: 'ArenaSport5[Serbia]' },
  '941': { channelKey: 'arenasport6serbia', serverKey: 'x4', name: 'ArenaSport6[Serbia]' },
  '942': { channelKey: 'arenasport7serbia', serverKey: 'x4', name: 'ArenaSport7[Serbia]' },
  '943': { channelKey: 'arenasport8serbia', serverKey: 'x4', name: 'ArenaSport8[Serbia]' },
  '946': { channelKey: 'eplayerSky_Sport_Bundesliga_2_HD', serverKey: 'x4', name: 'SkyBundesliga2[Germany]' },
  '947': { channelKey: 'eplayerSky_Sport_Bundesliga_3_HD', serverKey: 'x4', name: 'SkyBundesliga3[Germany]' },
  '948': { channelKey: 'eplayerSky_Sport_Bundesliga_4_HD', serverKey: 'x4', name: 'SkyBundesliga4[Germany]' },
  '949': { channelKey: 'eplayerSky_Sport_Bundesliga_5_HD', serverKey: 'x4', name: 'SkyBundesliga5[Germany]' },
};

function getChannelInfo(channelId: string): DLHDChannelInfo {
  const mapped = DLHD_CHANNEL_MAP[channelId];
  if (mapped) return mapped;
  return { channelKey: `premium${channelId}`, serverKey: null };
}

export interface Env {
  LOG_LEVEL?: string;
  RPI_PROXY_URL?: string;
  RPI_PROXY_KEY?: string;
  RATE_LIMIT_KV?: KVNamespace; // For rate limiting segment requests
  SEGMENT_TOKEN_SECRET?: string; // For signed segment URLs
}

const ALLOWED_ORIGINS = [
  'https://tv.vynx.cc',
  'https://flyx.tv',
  'https://www.flyx.tv',
  'http://localhost:3000',
  'http://localhost:3001',
  // SECURITY: Removed '*' - was allowing all origins, defeating anti-leech protection
  '.vercel.app',
  '.pages.dev',
  '.workers.dev',
];

// UPDATED January 2026: epicplayplay.cfd is DEAD! Using topembed.pw instead
const PLAYER_DOMAIN = 'topembed.pw';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ============================================================================
// MULTI-BACKEND SYSTEM - January 2026
// ============================================================================
// DLHD has 6 players, each using different backends. We implement fallback:
// 1. Player 3 (topembed.pw → dvalna.ru) - Requires JWT + PoW
// 2. Player 5 (cdn-live.tv → cdn-live-tv.ru) - Simple token, NO JWT/PoW!
// 3. Player 6 (moveonjoy.com) - NO AUTH AT ALL!
// ============================================================================

// Channel ID to cdn-live.tv channel name mapping
// COMPLETE MAPPING - Extracted from ALL DLHD channels via Player 5 (ddyplayer.cfd)
// Format: { channelId: { name: 'channel-name', code: 'country-code' } }
// These are dynamically extracted - the proxy will fetch fresh tokens from ddyplayer.cfd
const CHANNEL_TO_CDNLIVE: Record<string, { name: string; code: string }> = {
  // UK Sports
  '31': { name: 'tnt sports 1', code: 'gb' },
  '32': { name: 'tnt sports 2', code: 'gb' },
  '33': { name: 'tnt sports 3', code: 'gb' },
  '34': { name: 'tnt sports 4', code: 'gb' },
  '35': { name: 'sky sports football', code: 'gb' },
  '36': { name: 'sky sports arena', code: 'gb' },
  '37': { name: 'sky sports action', code: 'gb' },
  '38': { name: 'sky sports main event', code: 'gb' },
  '46': { name: 'sky sports tennis', code: 'gb' },
  '60': { name: 'sky sports f1', code: 'gb' },
  '65': { name: 'sky sports cricket', code: 'gb' },
  '70': { name: 'sky sports golf', code: 'gb' },
  '130': { name: 'sky sports premier league', code: 'gb' },
  '230': { name: 'dazn 1', code: 'gb' },
  '276': { name: 'laliga tv', code: 'gb' },
  '449': { name: 'sky sports mix', code: 'gb' },
  '451': { name: 'viaplay sports 1', code: 'gb' },
  '550': { name: 'viaplay sports 2', code: 'gb' },
  '554': { name: 'sky sports racing', code: 'gb' },
  '576': { name: 'sky sports news', code: 'gb' },
  '350': { name: 'itv 1', code: 'gb' },
  '351': { name: 'itv 2', code: 'gb' },
  '352': { name: 'itv 3', code: 'gb' },
  '353': { name: 'itv 4', code: 'gb' },
  '354': { name: 'channel 4', code: 'gb' },
  '355': { name: 'channel 5', code: 'gb' },
  '356': { name: 'bbc one', code: 'gb' },
  '357': { name: 'bbc two', code: 'gb' },
  '358': { name: 'bbc three', code: 'gb' },
  '359': { name: 'bbc four', code: 'gb' },
  '41': { name: 'euro sport 1', code: 'gb' },
  '42': { name: 'euro sport 2', code: 'gb' },
  // US Sports
  '39': { name: 'fox sports 1', code: 'us' },
  '40': { name: 'tennis channel', code: 'us' },
  '44': { name: 'espn', code: 'us' },
  '45': { name: 'espn 2', code: 'us' },
  '51': { name: 'abc', code: 'us' },
  '52': { name: 'cbs', code: 'us' },
  '54': { name: 'fox', code: 'us' },
  '66': { name: 'tudn', code: 'us' },
  '131': { name: 'telemundo', code: 'us' },
  '132': { name: 'univision', code: 'us' },
  '288': { name: 'espn news', code: 'us' },
  '305': { name: 'bbc', code: 'us' },
  '306': { name: 'bet', code: 'us' },
  '308': { name: 'cbs sports network', code: 'us' },
  '309': { name: 'cnbc', code: 'us' },
  '312': { name: 'disney channel', code: 'us' },
  '313': { name: 'discovery channel', code: 'us' },
  '316': { name: 'espn u', code: 'us' },
  '318': { name: 'golf tv', code: 'us' },
  '320': { name: 'hallmark', code: 'us' },
  '321': { name: 'hbo', code: 'us' },
  '322': { name: 'history', code: 'us' },
  '326': { name: 'lifetime', code: 'us' },
  '328': { name: 'national geographic', code: 'us' },
  '330': { name: 'nickelodeon tv', code: 'us' },
  '333': { name: 'showtime', code: 'us' },
  '336': { name: 'tbs', code: 'us' },
  '337': { name: 'tlc', code: 'us' },
  '338': { name: 'tnt', code: 'us' },
  '340': { name: 'travel channel', code: 'us' },
  '343': { name: 'usa network', code: 'us' },
  '345': { name: 'cnn', code: 'us' },
  '346': { name: 'willow cricket', code: 'us' },
  '347': { name: 'fox news', code: 'us' },
  '369': { name: 'fox cricket', code: 'us' },
  '374': { name: 'cinemax', code: 'us' },
  '375': { name: 'espn deportes', code: 'us' },
  '376': { name: 'wwe', code: 'us' },
  '385': { name: 'sec network', code: 'us' },
  '397': { name: 'btn', code: 'us' },
  '399': { name: 'mlb network', code: 'us' },
  '404': { name: 'nba tv', code: 'us' },
  '405': { name: 'nfl network', code: 'us' },
  '425': { name: 'bein sports', code: 'us' },
  '597': { name: 'goltv', code: 'us' },
  '598': { name: 'willow 2 cricket', code: 'us' },
  '123': { name: 'astro grandstand', code: 'us' },
  '124': { name: 'astro football', code: 'us' },
  '125': { name: 'astro premier league', code: 'us' },
  '126': { name: 'astro premier league 2', code: 'us' },
  '370': { name: 'astro cricket', code: 'us' },
  // South Africa
  '56': { name: 'supersport football', code: 'za' },
  '368': { name: 'supersport cricket', code: 'za' },
  '412': { name: 'supersport grandstand', code: 'za' },
  '413': { name: 'supersport psl', code: 'za' },
  '414': { name: 'supersport premier league', code: 'za' },
  '415': { name: 'supersport laliga', code: 'za' },
  '416': { name: 'supersport variety 1', code: 'za' },
  '417': { name: 'supersport variety 2', code: 'za' },
  '418': { name: 'supersport variety 3', code: 'za' },
  '419': { name: 'supersport variety 4', code: 'za' },
  '420': { name: 'supersport action', code: 'za' },
  '421': { name: 'supersport rugby', code: 'za' },
  '422': { name: 'supersport golf', code: 'za' },
  '423': { name: 'supersport tennis', code: 'za' },
  '424': { name: 'supersport motorsport', code: 'za' },
  '572': { name: 'supersport maximo 1', code: 'za' },
  // Poland
  '50': { name: 'polsat sport 2', code: 'pl' },
  '71': { name: 'eleven sports 1', code: 'pl' },
  '72': { name: 'eleven sports 2', code: 'pl' },
  '259': { name: 'canal sport 2', code: 'pl' },
  // France
  '116': { name: 'bein sports 1', code: 'fr' },
  '117': { name: 'bein sports 2', code: 'fr' },
  '118': { name: 'bein sports 3', code: 'fr' },
  '121': { name: 'canal', code: 'fr' },
  '122': { name: 'canal sport', code: 'fr' },
  '494': { name: 'bein sports max 4', code: 'fr' },
  // Germany
  '274': { name: 'sky sport f1', code: 'de' },
  '427': { name: 'dazn 2', code: 'de' },
  // Italy
  '461': { name: 'sky sport uno', code: 'it' },
  '462': { name: 'sky sport arena', code: 'it' },
  // Spain
  '84': { name: 'm laliga', code: 'es' },
  // Brazil
  '81': { name: 'espn', code: 'br' },
  // Portugal
  '380': { name: 'benfica tv', code: 'pt' },
  // Saudi Arabia / Arab
  '92': { name: 'bein sports 2', code: 'sa' },
  // Serbia
  '134': { name: 'arena 1 premium', code: 'rs' },
  // Netherlands
  '393': { name: 'ziggo sport 1', code: 'nl' },
  '398': { name: 'ziggo sport 2', code: 'nl' },
  // Canada
  '406': { name: 'sportsnet ontario', code: 'ca' },
  '408': { name: 'sportsnet east', code: 'ca' },
  '409': { name: 'sportsnet 360', code: 'ca' },
  // Australia
  '491': { name: 'bein sports 1', code: 'au' },
  '492': { name: 'bein sports 2', code: 'au' },
  '493': { name: 'bein sports 3', code: 'au' },
  // New Zealand
  '587': { name: 'sky sport select', code: 'nz' },
  '588': { name: 'sky sport 1', code: 'nz' },
  '589': { name: 'sky sport 2', code: 'nz' },
  '590': { name: 'sky sport 3', code: 'nz' },
  '591': { name: 'sky sport 4', code: 'nz' },
  '592': { name: 'sky sport 5', code: 'nz' },
  '593': { name: 'sky sport 6', code: 'nz' },
  '594': { name: 'sky sport 7', code: 'nz' },
  '595': { name: 'sky sport 8', code: 'nz' },
  '596': { name: 'sky sport 9', code: 'nz' },
  // Uruguay
  '391': { name: 'vtv', code: 'uy' },
  // Greece
  '599': { name: 'nova sports premier league', code: 'gr' },
};

// Channel ID to moveonjoy stream URL mapping
// Extracted from Player 6 (tv-bu1.blogspot.com → moveonjoy.com)
// Format: { channelId: 'https://fl{N}.moveonjoy.com/{STREAM_NAME}/index.m3u8' }
// NO AUTH REQUIRED - direct M3U8 access!
const CHANNEL_TO_MOVEONJOY: Record<string, string> = {
  // Sports - USA
  '11': 'https://fl7.moveonjoy.com/UFC/index.m3u8',
  '19': 'https://fl31.moveonjoy.com/MLB_NETWORK/index.m3u8',
  '39': 'https://fl7.moveonjoy.com/FOX_Sports_1/index.m3u8',
  '45': 'https://fl2.moveonjoy.com/ESPN_2/index.m3u8',
  '90': 'https://fl1.moveonjoy.com/SEC_NETWORK/index.m3u8',
  '91': 'https://fl31.moveonjoy.com/ACC_NETWORK/index.m3u8',
  '92': 'https://fl31.moveonjoy.com/ESPN_U/index.m3u8',
  '93': 'https://fl31.moveonjoy.com/ESPN_NEWS/index.m3u8',
  '94': 'https://fl7.moveonjoy.com/BIG_TEN_NETWORK/index.m3u8',
  '98': 'https://fl31.moveonjoy.com/NBA_TV/index.m3u8',
  '127': 'https://fl31.moveonjoy.com/CBS_SPORTS_NETWORK/index.m3u8',
  '129': 'https://fl31.moveonjoy.com/YES_NETWORK/index.m3u8',
  '146': 'https://fl7.moveonjoy.com/WWE/index.m3u8',
  // Broadcast Networks - USA
  '51': 'https://fl1.moveonjoy.com/AL_BIRMINGHAM_ABC/index.m3u8',
  '52': 'https://fl1.moveonjoy.com/FL_West_Palm_Beach_CBS/index.m3u8',
  '53': 'https://fl61.moveonjoy.com/FL_Tampa_NBC/index.m3u8',
  // Entertainment - USA
  '20': 'https://fl61.moveonjoy.com/MTV/index.m3u8',
  '21': 'https://fl31.moveonjoy.com/SYFY/index.m3u8',
  '303': 'https://fl61.moveonjoy.com/AMC_NETWORK/index.m3u8',
  '304': 'https://fl1.moveonjoy.com/Animal_Planet/index.m3u8',
  '306': 'https://fl1.moveonjoy.com/TRU_TV/index.m3u8',
  '307': 'https://fl7.moveonjoy.com/BRAVO/index.m3u8',
  '310': 'https://fl61.moveonjoy.com/Comedy_Central/index.m3u8',
  '312': 'https://fl31.moveonjoy.com/DISNEY/index.m3u8',
  '313': 'https://fl31.moveonjoy.com/DISCOVERY_FAMILY_CHANNEL/index.m3u8',
  '315': 'https://fl61.moveonjoy.com/E_ENTERTAINMENT_TELEVISION/index.m3u8',
  '317': 'https://fl61.moveonjoy.com/FX/index.m3u8',
  '320': 'https://fl61.moveonjoy.com/HALLMARK_CHANNEL/index.m3u8',
  '321': 'https://fl61.moveonjoy.com/HBO/index.m3u8',
  '328': 'https://fl31.moveonjoy.com/National_Geographic/index.m3u8',
  '333': 'https://fl31.moveonjoy.com/SHOWTIME/index.m3u8',
  '334': 'https://fl31.moveonjoy.com/PARAMOUNT_NETWORK/index.m3u8',
  '337': 'https://fl1.moveonjoy.com/TLC/index.m3u8',
  '339': 'https://fl1.moveonjoy.com/CARTOON_NETWORK/index.m3u8',
  '360': 'https://fl1.moveonjoy.com/BBC_AMERICA/index.m3u8',
};

// ============================================================================
// BACKEND: lovecdn.ru/popcdn.day - Token auth, UNENCRYPTED
// ============================================================================
// Path: popcdn.day/player/{STREAM_NAME} → beautifulpeople.lovecdn.ru
// Token is generated dynamically by popcdn.day
// NO ENCRYPTION - direct M3U8 access with token!
// ============================================================================
const CHANNEL_TO_LOVECDN: Record<string, string> = {
  // Sports - USA
  '44': 'ESPN',
  '45': 'ESPN2',
  '39': 'FOXSPORTS1',
  '146': 'WWE',        // WWE Network
  // Note: ABC, CBS, NBC, FOX, UFC not available on popcdn.day
};

// Channel ID to topembed.pw channel name mapping
// Extracted from DLHD /watch/ pages which use topembed.pw
const CHANNEL_TO_TOPEMBED: Record<string, string> = {
  // USA Sports
  '31': 'TNTSports1[UK]',
  '32': 'TNTSports2[UK]',
  '33': 'TNTSports3[UK]',
  '34': 'TNTSports4[UK]',
  '35': 'SkySportsFootball[UK]',
  '36': 'SkySportsArena[UK]',
  '37': 'SkySportsAction[UK]',
  '38': 'SkySportsMainEvent[UK]',
  '39': 'FOXSports1[USA]',
  '40': 'TennisChannel[USA]',
  '43': 'PDCTV[USA]',
  '44': 'ESPN[USA]',
  '45': 'ESPN2[USA]',
  '46': 'SkySportsTennis[UK]',
  '48': 'CanalSport[Poland]',
  '49': 'SportTV1[Portugal]',
  '51': 'AbcTv[USA]',
  '52': 'CBS[USA]',
  '53': 'NBC[USA]',
  '54': 'Fox[USA]',
  '56': 'SuperSportFootball[SouthAfrica]',
  '57': 'Eurosport1[Poland]',
  '58': 'Eurosport2[Poland]',
  '60': 'SkySportsF1[UK]',
  '61': 'BeinSportsMena1[UK]',
  '65': 'SkySportsCricket[UK]',
  '66': 'TUDN[USA]',
  '70': 'SkySportsGolf[UK]',
  '71': 'ElevenSports1[Poland]',
  '74': 'SportTV2[Portugal]',
  '75': 'CanalPlusSport5[Poland]',
  '81': 'ESPNBrazil[Brazil]',
  '84': 'MLaliga[Spain]',
  '88': 'Premiere1[Brasil]',
  '89': 'Combate[Brazil]',
  '91': 'BeinSports1[Arab]',
  '92': 'BeinSports2[Arab]',
  // beIN Sports
  '93': 'BeinSports3[Arab]',
  '94': 'BeinSports4[Arab]',
  '95': 'BeinSports5[Arab]',
  '96': 'BeinSports6[Arab]',
  '97': 'BeinSports7[Arab]',
  '98': 'BeinSports8[Arab]',
  '99': 'BeinSports9[Arab]',
  '100': 'BeinSportsXtra1',
  // Sky Sports UK (additional)
  '130': 'SkySportsPremierLeague[UK]',
  '449': 'SkySportsMix[UK]',
  '554': 'SkySportsRacing[UK]',
  '576': 'SkySportsNews[UK]',
  // beIN France
  '116': 'BeinSports1[France]',
  '117': 'BeinSports2[France]',
  '118': 'BeinSports3[France]',
  // beIN Turkey
  '62': 'BeinSports1[Turkey]',
  '63': 'BeinSports2[Turkey]',
  '64': 'BeinSports3[Turkey]',
  '67': 'BeinSports4[Turkey]',
  // Canal+ France
  '121': 'CanalPlus[France]',
  '122': 'CanalPlusSport[France]',
  // USA Networks
  '300': 'CW[USA]',
  '308': 'CBSSN[USA]',
  '345': 'CNN[USA]',
  '397': 'BTN[USA]',
  '425': 'beINSPORTSUSA[USA]',
  // UK Channels
  '354': 'Channel4[UK]',
  '355': 'Channel5[UK]',
  '356': 'BBCOne[UK]',
  '357': 'BBCTwo[UK]',
  '358': 'BBCThree[UK]',
  '359': 'BBCFour[UK]',
  '349': 'BBCNEWS24[UK]',
  '366': 'SkySportsNews[UK]',
  // DAZN
  '230': 'DAZN1[UK]',
  '426': 'DAZN1Bar[Germany]',
  '427': 'DAZN2Bar[Germany]',
  '445': 'DAZN1[Spain]',
  '446': 'DAZN2[Spain]',
  '447': 'DAZN3[Spain]',
  '448': 'DAZN4[Spain]',
  // Poland
  '565': 'TVNHD[Poland]',
  '566': 'CanalPlusPremium[Poland]',
  '567': 'CanalPlusFamily[Poland]',
  '570': 'CanalPlusSeriale[Poland]',
  // USA Regional Sports
  '770': 'MarqueeSportsNetwork[USA]',
  '776': 'ChicagoSportsNetwork[USA]',
  '664': 'ACCNetwork[USA]',
};

// UPDATED January 2026: Complete list of ALL known dvalna.ru servers
// Order matters - most common/reliable servers first for faster discovery
const ALL_SERVER_KEYS = [
  'wiki',     // Most common for topembed.pw channels
  'hzt',      // Common for US sports
  'x4',       // Common for European channels
  'top2',     // Common for UK Sky Sports
  'top1',     // Alternative top server
  'top1/cdn', // CDN variant
  'ddy6',     // Used by hitsplay.fun premium keys
  'dokko1',   // Romanian channels
  'nfs',      // Romanian channels
  'zeko',     // Fallback server
  'chevy',    // Server lookup endpoint host
  'azo',      // New Zealand Sky Sports
  'max2',     // Serbian channels
  'wind',     // Alternative server
];
const CDN_DOMAIN = 'dvalna.ru';

// CORRECT SECRET - extracted from WASM module (January 2026)
// The old 64-char hex secret is WRONG! This is the real one from the WASM.
const HMAC_SECRET = '444c44cc8888888844444444';
const POW_THRESHOLD = 0x1000;
const MAX_NONCE_ITERATIONS = 100000;

// ============================================================================
// MD5 Implementation for Cloudflare Workers (crypto.subtle doesn't support MD5)
// ============================================================================
function md5(string: string): string {
  function rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift));
  }

  function addUnsigned(x: number, y: number): number {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  function F(x: number, y: number, z: number): number { return (x & y) | ((~x) & z); }
  function G(x: number, y: number, z: number): number { return (x & z) | (y & (~z)); }
  function H(x: number, y: number, z: number): number { return x ^ y ^ z; }
  function I(x: number, y: number, z: number): number { return y ^ (x | (~z)); }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(str: string): number[] {
    const lWordCount: number[] = [];
    const lMessageLength = str.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    
    for (let i = 0; i < lNumberOfWords; i++) lWordCount[i] = 0;
    
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      const lWordIndex = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordCount[lWordIndex] = lWordCount[lWordIndex] | (str.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    const lWordIndex = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordCount[lWordIndex] = lWordCount[lWordIndex] | (0x80 << lBytePosition);
    lWordCount[lNumberOfWords - 2] = lMessageLength << 3;
    lWordCount[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordCount;
  }

  function wordToHex(value: number): string {
    let hex = '';
    for (let i = 0; i <= 3; i++) {
      const byte = (value >>> (i * 8)) & 255;
      hex += ('0' + byte.toString(16)).slice(-2);
    }
    return hex;
  }

  const x = convertToWordArray(string);
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;

  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
}

// ============================================================================
// HMAC-SHA256 using Web Crypto API
// ============================================================================
async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// PoW Computation (WASM-based - January 2026)
// ============================================================================
let wasmInitialized = false;

async function computePoWNonce(resource: string, keyNumber: string, timestamp: number): Promise<bigint | null> {
  try {
    // Initialize WASM if not already done
    if (!wasmInitialized) {
      await initDLHDPoW();
      wasmInitialized = true;
      console.log(`[PoW] WASM initialized: ${getWasmVersion()}`);
    }
    
    // Compute nonce using WASM
    const nonce = computeWasmNonce(resource, keyNumber, timestamp);
    return nonce;
  } catch (error) {
    console.error('[PoW] WASM computation failed:', error);
    return null;
  }
}

// ============================================================================
// Caches
// ============================================================================
const serverKeyCache = new Map<string, { serverKey: string; fetchedAt: number }>();
const SERVER_KEY_CACHE_TTL_MS = 10 * 60 * 1000;

// JWT cache - stores JWT tokens fetched from player page
// Key is the topembed channel name (e.g., 'AbcTv[USA]')
interface JWTCacheEntry {
  jwt: string;
  channelKey: string;  // The 'sub' field from JWT (e.g., 'ustvabc', 'eplayerespn_usa')
  exp: number;
  fetchedAt: number;
}
const jwtCache = new Map<string, JWTCacheEntry>();
const JWT_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (JWT valid for 5)

// Reverse mapping: channel key (from JWT sub) → topembed channel name
// This allows us to find the JWT when we only have the channel key from a key URL
const channelKeyToTopembed = new Map<string, string>();

// DLHD channel ID → dvalna.ru channel key mapping
// This is populated when we successfully fetch JWTs
// Format: { '51': 'ustvabc', '44': 'eplayerespn_usa', ... }
const dlhdIdToChannelKey = new Map<string, string>();

/**
 * Fetch JWT from topembed.pw or hitsplay.fun player page - this is the REAL auth token needed for key requests
 * 
 * UPDATED January 2026: 
 * - epicplayplay.cfd is DEAD! 
 * - topembed.pw uses the same dvalna.ru backend but with CORRECT channel naming (e.g., 'skyaction' not 'premium37')
 * - hitsplay.fun provides JWT directly but uses 'premium{id}' keys which don't work on all servers
 * - PRIORITY: topembed.pw first (correct keys), then hitsplay.fun (fallback)
 */
async function fetchPlayerJWT(channel: string, logger: any, env?: Env): Promise<string | null> {
  const cacheKey = channel;
  const cached = jwtCache.get(cacheKey);
  
  // Check cache - use if not expired
  if (cached && Date.now() - cached.fetchedAt < JWT_CACHE_TTL_MS) {
    const now = Math.floor(Date.now() / 1000);
    if (cached.exp > now + 300) { // At least 5 min remaining
      logger.info('JWT cache hit', { channel, expiresIn: cached.exp - now });
      return cached.jwt;
    }
  }
  
  logger.info('Fetching fresh JWT', { channel });
  
  // ============================================================================
  // METHOD 1: Try topembed.pw FIRST - it provides CORRECT channel keys!
  // hitsplay.fun uses 'premium{id}' which doesn't work on all dvalna servers
  // topembed.pw uses correct keys like 'skyaction', 'eplayerskyfoot', etc.
  // ============================================================================
  const topembedName = CHANNEL_TO_TOPEMBED[channel];
  if (topembedName) {
    try {
      const playerUrl = `https://${PLAYER_DOMAIN}/channel/${topembedName}`;
      logger.info('Trying topembed.pw for JWT (preferred)', { channel, topembedName });
      
      let html: string | undefined;
      
      // Try RPI proxy first if configured (topembed may block CF IPs)
      if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
        const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(playerUrl)}&key=${env.RPI_PROXY_KEY}&referer=${encodeURIComponent('https://dlhd.link/')}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        try {
          const res = await fetch(rpiUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            html = await res.text();
          }
        } catch (e) {
          clearTimeout(timeoutId);
        }
      }
      
      // Direct fetch fallback
      if (!html) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          const res = await fetch(playerUrl, {
            headers: {
              'User-Agent': USER_AGENT,
              'Referer': 'https://dlhd.link/',
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            html = await res.text();
          }
        } catch (e) {
          clearTimeout(timeoutId);
        }
      }
      
      if (html) {
        const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
        if (jwtMatch) {
          const jwt = jwtMatch[0];
          let channelKey = `premium${channel}`;
          let exp = Math.floor(Date.now() / 1000) + 18000;
          
          try {
            const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(atob(payloadB64));
            channelKey = payload.sub || channelKey;
            exp = payload.exp || exp;
            logger.info('JWT from topembed.pw', { channelKey, exp, expiresIn: exp - Math.floor(Date.now() / 1000) });
          } catch (e) {
            logger.warn('JWT decode failed');
          }
          
          // Cache it
          jwtCache.set(cacheKey, { jwt, channelKey, exp, fetchedAt: Date.now() });
          channelKeyToTopembed.set(channelKey, topembedName);
          dlhdIdToChannelKey.set(channel, channelKey);
          
          return jwt;
        }
      }
    } catch (e) {
      logger.warn('topembed.pw JWT fetch failed', { error: (e as Error).message });
    }
  }
  
  // ============================================================================
  // METHOD 2: Try hitsplay.fun - fallback for channels without topembed mapping
  // NOTE: hitsplay uses 'premium{id}' keys which may not work on all servers
  // Route through RPI proxy since hitsplay.fun may block CF IPs
  // ============================================================================
  try {
    const hitsplayUrl = `https://hitsplay.fun/premiumtv/daddyhd.php?id=${channel}`;
    logger.info('Trying hitsplay.fun for JWT (fallback)', { channel });
    
    let html: string | undefined;
    
    // Try RPI proxy first (hitsplay blocks CF IPs)
    if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
      const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(hitsplayUrl)}&key=${env.RPI_PROXY_KEY}&referer=${encodeURIComponent('https://dlhd.link/')}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 sec timeout
      
      try {
        const res = await fetch(rpiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          html = await res.text();
        }
      } catch (e) {
        clearTimeout(timeoutId);
        logger.warn('RPI hitsplay fetch failed', { error: (e as Error).message });
      }
    }
    
    // Direct fetch fallback (may not work from CF)
    if (!html) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 sec - fail fast
      
      try {
        const res = await fetch(hitsplayUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            'Referer': 'https://dlhd.link/',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          html = await res.text();
        }
      } catch (e) {
        clearTimeout(timeoutId);
      }
    }
    
    if (html) {
      
      // hitsplay.fun embeds JWT directly in the page
      const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      if (jwtMatch) {
        const jwt = jwtMatch[0];
        
        // Decode payload
        let channelKey = `premium${channel}`;
        let exp = Math.floor(Date.now() / 1000) + 18000;
        
        try {
          const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(payloadB64));
          channelKey = payload.sub || channelKey;
          exp = payload.exp || exp;
          logger.info('JWT from hitsplay.fun', { channelKey, exp, expiresIn: exp - Math.floor(Date.now() / 1000) });
        } catch (e) {
          logger.warn('JWT decode failed, using defaults');
        }
        
        // Cache it
        jwtCache.set(cacheKey, { jwt, channelKey, exp, fetchedAt: Date.now() });
        channelKeyToTopembed.set(channelKey, channel);
        dlhdIdToChannelKey.set(channel, channelKey);
        
        return jwt;
      }
    }
  } catch (e) {
    logger.warn('hitsplay.fun JWT fetch failed', { error: (e as Error).message });
  }
  
  // ============================================================================
  // METHOD 3: Try to dynamically fetch topembed name from DLHD page
  // This is for channels not in our static mapping
  // SECURITY: Validate channel ID format and sanitize extracted names
  // ============================================================================
  if (!topembedName) {
    // SECURITY: Only allow numeric channel IDs to prevent injection
    if (!/^\d{1,4}$/.test(channel)) {
      logger.warn('Invalid channel ID format, skipping dynamic fetch', { channel });
    } else {
      try {
        logger.info('Channel not in mapping, fetching from DLHD', { channel });
        const dlhdUrl = `https://dlhd.link/watch/stream-${channel}.php`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const dlhdRes = await fetch(dlhdUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            'Referer': 'https://dlhd.link/',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (dlhdRes.ok) {
          const dlhdHtml = await dlhdRes.text();
          const topembedMatch = dlhdHtml.match(/topembed\.pw\/channel\/([^"'\s]+)/);
          if (topembedMatch) {
            const dynamicTopembedName = topembedMatch[1];
            
            // SECURITY: Validate extracted channel name - only allow alphanumeric, brackets, and limited special chars
            if (!/^[A-Za-z0-9_\-\[\]()]{1,64}$/.test(dynamicTopembedName)) {
              logger.warn('Invalid dynamic topembed name format', { channel, dynamicTopembedName: dynamicTopembedName.substring(0, 20) });
            } else {
              logger.info('Found topembed name from DLHD', { channel, topembedName: dynamicTopembedName });
              
              // Now fetch JWT from this topembed URL
              const playerUrl = `https://${PLAYER_DOMAIN}/channel/${encodeURIComponent(dynamicTopembedName)}`;
              
              let html: string | undefined;
              if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
                // SECURITY: Use timeout for RPI proxy requests
                const rpiController = new AbortController();
                const rpiTimeoutId = setTimeout(() => rpiController.abort(), 8000);
                
                try {
                  const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(playerUrl)}&referer=${encodeURIComponent('https://dlhd.link/')}`;
                  const res = await fetch(rpiUrl, {
                    headers: { 'X-API-Key': env.RPI_PROXY_KEY },
                    signal: rpiController.signal,
                  });
                  clearTimeout(rpiTimeoutId);
                  if (res.ok) html = await res.text();
                } catch (e) {
                  clearTimeout(rpiTimeoutId);
                  logger.warn('RPI proxy timeout/error', { error: (e as Error).message });
                }
              }
              
              if (!html) {
                const directController = new AbortController();
                const directTimeoutId = setTimeout(() => directController.abort(), 5000);
                
                try {
                  const res = await fetch(playerUrl, {
                    headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://dlhd.link/' },
                    signal: directController.signal,
                  });
                  clearTimeout(directTimeoutId);
                  if (res.ok) html = await res.text();
                } catch (e) {
                  clearTimeout(directTimeoutId);
                }
              }
              
              if (html) {
                const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
                if (jwtMatch) {
                  const jwt = jwtMatch[0];
                  let channelKey = `premium${channel}`;
                  let exp = Math.floor(Date.now() / 1000) + 18000;
                  
                  try {
                    const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
                    const payload = JSON.parse(atob(payloadB64));
                    channelKey = payload.sub || channelKey;
                    exp = payload.exp || exp;
                    logger.info('JWT from dynamic topembed', { channelKey, exp });
                  } catch {}
                  
                  jwtCache.set(cacheKey, { jwt, channelKey, exp, fetchedAt: Date.now() });
                  channelKeyToTopembed.set(channelKey, dynamicTopembedName);
                  dlhdIdToChannelKey.set(channel, channelKey);
                  
                  logger.info('JWT cached with mappings', { 
                    channel, 
                    topembedName: dynamicTopembedName, 
                    channelKey,
                    source: 'dynamic-dlhd'
                  });
                  
                  return jwt;
                }
              }
            }
          }
        }
      } catch (e) {
        logger.warn('Dynamic topembed fetch failed', { error: (e as Error).message });
      }
    }
  }
  
  logger.warn('All JWT fetch methods failed', { channel });
  return null;
}

async function getServerKey(channelKey: string, logger: any, env?: Env): Promise<string> {
  const cached = serverKeyCache.get(channelKey);
  if (cached && Date.now() - cached.fetchedAt < SERVER_KEY_CACHE_TTL_MS) return cached.serverKey;
  
  const lookupUrl = `https://chevy.${CDN_DOMAIN}/server_lookup?channel_id=${channelKey}`;
  
  try {
    // Try direct fetch first
    const res = await fetch(lookupUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Referer': `https://${PLAYER_DOMAIN}/` },
    });
    if (res.ok) {
      const text = await res.text();
      if (!text.startsWith('<')) {
        const data = JSON.parse(text);
        if (data.server_key) {
          logger.info('Server lookup success (direct)', { channelKey, serverKey: data.server_key });
          serverKeyCache.set(channelKey, { serverKey: data.server_key, fetchedAt: Date.now() });
          return data.server_key;
        }
      } else {
        logger.warn('Server lookup returned HTML (blocked?)', { channelKey });
      }
    } else {
      logger.warn('Server lookup HTTP error', { channelKey, status: res.status });
    }
  } catch (e) {
    logger.warn('Server lookup direct fetch failed', { channelKey, error: (e as Error).message });
  }
  
  // Try RPI proxy if configured
  if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
    try {
      const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(lookupUrl)}&key=${env.RPI_PROXY_KEY}`;
      const rpiRes = await fetch(rpiUrl);
      if (rpiRes.ok) {
        const text = await rpiRes.text();
        if (!text.startsWith('<')) {
          const data = JSON.parse(text);
          if (data.server_key) {
            logger.info('Server lookup success (RPI)', { channelKey, serverKey: data.server_key });
            serverKeyCache.set(channelKey, { serverKey: data.server_key, fetchedAt: Date.now() });
            return data.server_key;
          }
        }
      }
    } catch (e) {
      logger.warn('Server lookup RPI fetch failed', { channelKey, error: (e as Error).message });
    }
  }
  
  logger.warn('Server lookup failed, using default', { channelKey, default: 'zeko' });
  return 'zeko';
}

function constructM3U8Url(serverKey: string, channelKey: string): string {
  // UPDATED January 2026: Added 'wiki', 'hzt', 'x4', 'dokko1', 'top2', 'nfs' servers used by topembed.pw
  if (serverKey === 'wiki') return `https://wikinew.${CDN_DOMAIN}/wiki/${channelKey}/mono.css`;
  if (serverKey === 'hzt') return `https://hztnew.${CDN_DOMAIN}/hzt/${channelKey}/mono.css`;
  if (serverKey === 'x4') return `https://x4new.${CDN_DOMAIN}/x4/${channelKey}/mono.css`;
  if (serverKey === 'dokko1') return `https://dokko1new.${CDN_DOMAIN}/dokko1/${channelKey}/mono.css`;
  if (serverKey === 'top1/cdn') return `https://top1.${CDN_DOMAIN}/top1/cdn/${channelKey}/mono.css`;
  if (serverKey === 'top2') return `https://top2new.${CDN_DOMAIN}/top2/${channelKey}/mono.css`;
  if (serverKey === 'nfs') return `https://nfsnew.${CDN_DOMAIN}/nfs/${channelKey}/mono.css`;
  return `https://${serverKey}new.${CDN_DOMAIN}/${serverKey}/${channelKey}/mono.css`;
}

/**
 * Fetch server key from dvalna.ru server_lookup endpoint
 * This returns the correct server for a given channel key
 */
async function fetchServerKeyFromLookup(channelKey: string, logger: any, env?: Env): Promise<string | null> {
  const lookupUrl = `https://chevy.${CDN_DOMAIN}/server_lookup?channel_id=${encodeURIComponent(channelKey)}`;
  
  try {
    let res: Response;
    if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
      const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(lookupUrl)}&key=${env.RPI_PROXY_KEY}&referer=${encodeURIComponent(`https://${PLAYER_DOMAIN}/`)}`;
      res = await fetch(rpiUrl);
    } else {
      res = await fetch(lookupUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': `https://${PLAYER_DOMAIN}/`,
        },
      });
    }
    
    if (!res.ok) {
      logger.warn('server_lookup failed', { status: res.status, channelKey });
      return null;
    }
    
    const text = await res.text();
    const match = text.match(/"server_key"\s*:\s*"([^"]+)"/);
    if (match) {
      logger.info('server_lookup success', { channelKey, serverKey: match[1] });
      return match[1];
    }
    
    return null;
  } catch (e) {
    logger.warn('server_lookup error', { channelKey, error: (e as Error).message });
    return null;
  }
}

// ============================================================================
// BACKEND 2: cdn-live.tv → cdn-live-tv.ru (NO JWT/PoW NEEDED!)
// ============================================================================
// This backend uses simple token-based auth embedded in the player page.
// Much simpler than dvalna.ru which requires JWT + PoW.
// ============================================================================

interface CdnLiveResult {
  success: boolean;
  m3u8Url?: string;
  token?: string;
  error?: string;
}

// Cache for cdn-live tokens (they expire, but we can reuse for a while)
const cdnLiveTokenCache = new Map<string, { token: string; fetchedAt: number }>();
const CDN_LIVE_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Decode the obfuscated JavaScript from cdn-live.tv player page
 * The script uses a custom base conversion cipher
 */
function decodeCdnLiveScript(encodedData: string, charset: string, base: number, delimiterIdx: number, offset: number): string {
  let result = '';
  let i = 0;
  const delimiter = charset[delimiterIdx];
  
  while (i < encodedData.length) {
    let s = '';
    // Read until delimiter
    while (i < encodedData.length && encodedData[i] !== delimiter) {
      s += encodedData[i];
      i++;
    }
    i++; // Skip delimiter
    
    if (!s) continue;
    
    // Replace charset chars with indices
    let numStr = '';
    for (const char of s) {
      const idx = charset.indexOf(char);
      if (idx !== -1) {
        numStr += idx.toString();
      }
    }
    
    // Convert from base to decimal, subtract offset
    const charCode = parseInt(numStr, base) - offset;
    if (charCode > 0 && charCode < 65536) {
      result += String.fromCharCode(charCode);
    }
  }
  
  return result;
}

/**
 * Extract stream URL from cdn-live.tv player page
 * CRITICAL: Uses RPI proxy - cdn-live.tv blocks Cloudflare IPs
 */
async function fetchCdnLiveStream(channelName: string, countryCode: string, logger: any, env?: Env): Promise<CdnLiveResult> {
  const cacheKey = `${countryCode}-${channelName}`;
  const cached = cdnLiveTokenCache.get(cacheKey);
  
  // Check cache
  if (cached && Date.now() - cached.fetchedAt < CDN_LIVE_TOKEN_TTL_MS) {
    const m3u8Url = `https://cdn-live-tv.ru/api/v1/channels/${countryCode}-${channelName}/index.m3u8?token=${cached.token}`;
    logger.info('cdn-live cache hit', { channel: channelName, code: countryCode });
    return { success: true, m3u8Url, token: cached.token };
  }
  
  logger.info('Fetching cdn-live.tv stream', { channel: channelName, code: countryCode });
  
  try {
    // Fetch the player page - MUST use RPI proxy (cdn-live.tv blocks CF IPs)
    const playerUrl = `https://cdn-live.tv/api/v1/channels/player/?name=${encodeURIComponent(channelName)}&code=${countryCode}&user=cdnlivetv&plan=free`;
    
    let res: Response;
    if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
      const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(playerUrl)}&key=${env.RPI_PROXY_KEY}&referer=${encodeURIComponent('https://dlhd.link/')}`;
      res = await fetch(rpiUrl);
    } else {
      // Fallback to direct fetch if RPI not configured (will likely fail)
      logger.warn('RPI proxy not configured for cdn-live token fetch');
      res = await fetch(playerUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': 'https://dlhd.link/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
    }
    
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }
    
    const html = await res.text();
    
    // Method 1: Try to find direct M3U8 URL in the page
    const directM3u8Match = html.match(/https:\/\/(?:edge\.)?cdn-live-tv\.ru\/api\/v1\/channels\/[^"'\s]+\.m3u8\?token=[^"'\s]+/);
    if (directM3u8Match) {
      const m3u8Url = directM3u8Match[0].replace(/&amp;/g, '&');
      const tokenMatch = m3u8Url.match(/token=([^&]+)/);
      if (tokenMatch) {
        cdnLiveTokenCache.set(cacheKey, { token: tokenMatch[1], fetchedAt: Date.now() });
      }
      logger.info('cdn-live direct URL found', { url: m3u8Url.substring(0, 80) });
      return { success: true, m3u8Url };
    }
    
    // Method 2: Try to find playlistUrl in decoded script
    const playlistMatch = html.match(/playlistUrl\s*=\s*['"]([^'"]+)['"]/);
    if (playlistMatch) {
      const m3u8Url = playlistMatch[1];
      const tokenMatch = m3u8Url.match(/token=([^&]+)/);
      if (tokenMatch) {
        cdnLiveTokenCache.set(cacheKey, { token: tokenMatch[1], fetchedAt: Date.now() });
      }
      logger.info('cdn-live playlistUrl found', { url: m3u8Url.substring(0, 80) });
      return { success: true, m3u8Url };
    }
    
    // Method 3: Try to decode obfuscated script
    // Look for eval(function(h,u,n,t,e,r) pattern
    // Format: }("ENCODED",unused,"CHARSET",offset,base,unused))
    // Security: Limit input size to prevent ReDoS attacks
    if (html.length > 500000) {
      logger.warn('cdn-live: HTML too large for regex parsing', { size: html.length });
      return { success: false, error: 'Response too large' };
    }
    
    // Method 3a: Try to find HUNTER obfuscation pattern
    // The pattern is: eval(function(h,u,n,t,e,r){...}("encoded",num,"charset",num,num,num))
    // We need to find the function body end and then parse the arguments
    const hunterIdx = html.indexOf('eval(function(h,u,n,t,e,r)');
    if (hunterIdx !== -1) {
      const context = html.substring(hunterIdx, hunterIdx + 50000); // Get enough context for the encoded data
      const bodyStart = context.indexOf('{');
      
      if (bodyStart !== -1) {
        // Count braces to find the end of the function body
        let depth = 0;
        let bodyEnd = -1;
        for (let i = bodyStart; i < context.length; i++) {
          if (context[i] === '{') depth++;
          if (context[i] === '}') {
            depth--;
            if (depth === 0) {
              bodyEnd = i;
              break;
            }
          }
        }
        
        if (bodyEnd !== -1) {
          const afterBody = context.substring(bodyEnd);
          // Parse arguments: }("encoded",unused,"charset",offset,base,unused))
          const argsMatch = afterBody.match(/\}\s*\(\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
          
          if (argsMatch) {
            const [, encodedData, , charset, offsetStr, baseStr] = argsMatch;
            const base = parseInt(baseStr, 10);
            const offset = parseInt(offsetStr, 10);
            
            // Security: Validate parsed parameters are within reasonable bounds
            if (isNaN(base) || isNaN(offset) || base < 2 || base > 64 || offset < 0 || offset > 65536) {
              logger.warn('cdn-live: invalid decode parameters', { base, offset });
            } else if (encodedData.length > 100000) {
              logger.warn('cdn-live: encoded data too large', { size: encodedData.length });
            } else {
              logger.info('cdn-live: decoding HUNTER obfuscated script', { 
                encodedLen: encodedData.length, 
                charset: charset.substring(0, 20),
                base, 
                offset 
              });
              
              const decoded = decodeCdnLiveScript(encodedData, charset, base, base, offset);
              logger.info('cdn-live: decoded script', { decodedLen: decoded.length, preview: decoded.substring(0, 200) });
              
              const decodedM3u8Match = decoded.match(/https:\/\/(?:edge\.)?cdn-live-tv\.ru\/api\/v1\/channels\/[^"'\s]+\.m3u8\?token=[^"'\s&]+/);
              if (decodedM3u8Match) {
                const m3u8Url = decodedM3u8Match[0];
                const tokenMatch = m3u8Url.match(/token=([^&"'\s]+)/);
                if (tokenMatch) {
                  cdnLiveTokenCache.set(cacheKey, { token: tokenMatch[1], fetchedAt: Date.now() });
                }
                logger.info('cdn-live decoded URL found', { url: m3u8Url.substring(0, 80) });
                return { success: true, m3u8Url };
              }
            }
          }
        }
      }
    }
    
    // Method 3b: Fallback to old regex pattern (for backwards compatibility)
    const evalMatch = html.match(/\}\s*\(\s*"([^"]+)"\s*,\s*\d+\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*\d+\s*\)\s*\)/);
    if (evalMatch) {
      const [, encodedData, charset, offsetStr, baseStr] = evalMatch;
      const base = parseInt(baseStr, 10);
      const offset = parseInt(offsetStr, 10);
      
      // Security: Validate parsed parameters are within reasonable bounds
      if (isNaN(base) || isNaN(offset) || base < 2 || base > 64 || offset < 0 || offset > 65536) {
        logger.warn('cdn-live: invalid decode parameters', { base, offset });
        return { success: false, error: 'Invalid decode parameters' };
      }
      
      // Security: Limit encoded data size
      if (encodedData.length > 100000) {
        logger.warn('cdn-live: encoded data too large', { size: encodedData.length });
        return { success: false, error: 'Encoded data too large' };
      }
      
      logger.info('cdn-live: decoding obfuscated script (fallback)', { 
        encodedLen: encodedData.length, 
        charset: charset.substring(0, 20),
        base, 
        offset 
      });
      const decoded = decodeCdnLiveScript(encodedData, charset, base, base, offset);
      logger.info('cdn-live: decoded script', { decodedLen: decoded.length, preview: decoded.substring(0, 200) });
      
      const decodedM3u8Match = decoded.match(/https:\/\/(?:edge\.)?cdn-live-tv\.ru\/api\/v1\/channels\/[^"'\s]+\.m3u8\?token=[^"'\s&]+/);
      if (decodedM3u8Match) {
        const m3u8Url = decodedM3u8Match[0];
        const tokenMatch = m3u8Url.match(/token=([^&"'\s]+)/);
        if (tokenMatch) {
          cdnLiveTokenCache.set(cacheKey, { token: tokenMatch[1], fetchedAt: Date.now() });
        }
        logger.info('cdn-live decoded URL found', { url: m3u8Url.substring(0, 80) });
        return { success: true, m3u8Url };
      }
    }
    
    logger.warn('cdn-live: could not extract stream URL', { htmlLength: html.length });
    return { success: false, error: 'Could not extract stream URL from player page' };
    
  } catch (err) {
    logger.error('cdn-live fetch error', { error: (err as Error).message });
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// PLAYER 5 EXTRACTOR: ddyplayer.cfd → cdn-live-tv.ru (HUNTER obfuscation)
// ============================================================================
// Path: DLHD /casting/ → ddyplayer.cfd → cdn-live-tv.ru
// Uses HUNTER obfuscation: eval(function(h,u,n,t,e,r){...})
// ============================================================================

interface Player5Result {
  success: boolean;
  m3u8Url?: string;
  channelName?: string;
  countryCode?: string;
  error?: string;
}

/**
 * Decode HUNTER obfuscation used by ddyplayer.cfd
 */
function decodeHunter(encodedData: string, charset: string, offset: number, delimiterIdx: number): string {
  let result = '';
  const delimiter = charset[delimiterIdx];
  
  for (let i = 0; i < encodedData.length; i++) {
    let s = '';
    while (i < encodedData.length && encodedData[i] !== delimiter) {
      s += encodedData[i];
      i++;
    }
    if (s === '') continue;
    
    // Replace each char with its index in charset
    for (let j = 0; j < charset.length; j++) {
      s = s.split(charset[j]).join(j.toString());
    }
    
    // Convert from base-delimiterIdx to base-10, subtract offset
    const code = parseInt(s, delimiterIdx) - offset;
    if (code > 0 && code < 65536) {
      result += String.fromCharCode(code);
    }
  }
  
  try {
    return decodeURIComponent(escape(result));
  } catch {
    return result;
  }
}

/**
 * Extract HUNTER parameters from HTML
 * Format: }("encodedData",num,"charset",num,num,num))
 */
function extractHunterParams(html: string): { encodedData: string; charset: string; offset: number; delimiterIdx: number } | null {
  const fullPattern = /\}\s*\(\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*\)/;
  const match = html.match(fullPattern);
  
  if (match) {
    return {
      encodedData: match[1],
      charset: match[3],
      offset: parseInt(match[4]),
      delimiterIdx: parseInt(match[5])
    };
  }
  
  return null;
}

/**
 * Extract stream URL from Player 5 (ddyplayer.cfd)
 * This is the REAL Player 5 extractor that fetches dynamically
 */
async function extractPlayer5Stream(channel: string, logger: any): Promise<Player5Result> {
  logger.info('Player 5: Extracting stream', { channel });
  
  try {
    // Step 1: Get DLHD /casting/ page to find ddyplayer iframe
    const dlhdUrl = `https://dlhd.link/casting/stream-${channel}.php`;
    const dlhdRes = await fetch(dlhdUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://dlhd.link/'
      }
    });
    
    if (!dlhdRes.ok) {
      return { success: false, error: `DLHD page returned ${dlhdRes.status}` };
    }
    
    const dlhdHtml = await dlhdRes.text();
    
    // Find ddyplayer.cfd iframe
    const iframeMatch = dlhdHtml.match(/src=["'](https:\/\/ddyplayer\.cfd[^"']+)["']/);
    if (!iframeMatch) {
      return { success: false, error: 'No ddyplayer.cfd iframe found' };
    }
    
    const ddyUrl = iframeMatch[1];
    const urlObj = new URL(ddyUrl);
    const channelName = urlObj.searchParams.get('name');
    const countryCode = urlObj.searchParams.get('code');
    
    logger.info('Player 5: Found ddyplayer', { channelName, countryCode });
    
    // Step 2: Fetch ddyplayer page
    const ddyRes = await fetch(ddyUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://dlhd.link/'
      }
    });
    
    if (!ddyRes.ok) {
      return { success: false, error: `ddyplayer returned ${ddyRes.status}` };
    }
    
    const ddyHtml = await ddyRes.text();
    
    // Step 3: Try to find direct M3U8 URL first
    const directM3u8 = ddyHtml.match(/https:\/\/cdn-live-tv\.ru\/[^"'\s]+\.m3u8[^"'\s]*/);
    if (directM3u8) {
      return {
        success: true,
        m3u8Url: directM3u8[0],
        channelName: channelName || undefined,
        countryCode: countryCode || undefined
      };
    }
    
    // Step 4: Extract HUNTER parameters and decode
    const params = extractHunterParams(ddyHtml);
    if (!params) {
      return { success: false, error: 'No HUNTER params found' };
    }
    
    logger.info('Player 5: Decoding HUNTER', { charset: params.charset.substring(0, 20), offset: params.offset });
    
    const decoded = decodeHunter(params.encodedData, params.charset, params.offset, params.delimiterIdx);
    
    if (decoded.length < 100) {
      return { success: false, error: 'Decoding failed' };
    }
    
    // Step 5: Extract M3U8 URL from decoded content
    const m3u8Match = decoded.match(/https:\/\/cdn-live-tv\.ru\/api\/v1\/channels\/[^"'\s]+\.m3u8\?token=[^"'\s]+/);
    
    if (!m3u8Match) {
      const altMatch = decoded.match(/https:\/\/[^"'\s]*\.m3u8\?token=[^"'\s]+/);
      if (altMatch) {
        return { success: true, m3u8Url: altMatch[0], channelName: channelName || undefined, countryCode: countryCode || undefined };
      }
      return { success: false, error: 'No M3U8 URL in decoded content' };
    }
    
    return {
      success: true,
      m3u8Url: m3u8Match[0],
      channelName: channelName || undefined,
      countryCode: countryCode || undefined
    };
    
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// BACKEND 3: moveonjoy.com (NO AUTH AT ALL!)
// ============================================================================
// This is the simplest backend - direct M3U8 access with no authentication.
// Stream URLs are pre-mapped in CHANNEL_TO_MOVEONJOY
// ============================================================================

interface MoveonjoyResult {
  success: boolean;
  m3u8Url?: string;
  error?: string;
}

/**
 * Get stream from moveonjoy.com (NO AUTH NEEDED!)
 * Uses pre-mapped URLs from CHANNEL_TO_MOVEONJOY
 */
async function fetchMoveonjoyStream(channel: string, logger: any): Promise<MoveonjoyResult> {
  const m3u8Url = CHANNEL_TO_MOVEONJOY[channel];
  
  if (!m3u8Url) {
    return { success: false, error: `No moveonjoy mapping for channel ${channel}` };
  }
  
  logger.info('Trying moveonjoy.com', { channel, url: m3u8Url.substring(0, 60) });
  
  try {
    const res = await fetch(m3u8Url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://tv-bu1.blogspot.com/',
      },
    });
    
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }
    
    const content = await res.text();
    if (content.includes('#EXTM3U') && (content.includes('#EXTINF') || content.includes('#EXT-X-STREAM-INF'))) {
      logger.info('moveonjoy stream found', { channel });
      return { success: true, m3u8Url };
    }
    
    return { success: false, error: 'Invalid M3U8 content' };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// BACKEND 4: lovecdn.ru/popcdn.day (Token auth, UNENCRYPTED)
// ============================================================================
// Path: popcdn.day/player/{STREAM_NAME} → beautifulpeople.lovecdn.ru
// Token is generated dynamically by popcdn.day
// NO ENCRYPTION - direct M3U8 access with token!
// ============================================================================

interface LovecdnResult {
  success: boolean;
  m3u8Url?: string;
  error?: string;
}

/**
 * Get stream from lovecdn.ru via popcdn.day
 * Fetches token dynamically from popcdn.day player page
 */
async function fetchLovecdnStream(channel: string, logger: any): Promise<LovecdnResult> {
  const streamName = CHANNEL_TO_LOVECDN[channel];
  
  if (!streamName) {
    return { success: false, error: `No lovecdn mapping for channel ${channel}` };
  }
  
  logger.info('Trying lovecdn.ru', { channel, streamName });
  
  try {
    // Fetch popcdn.day player page to get token
    const popcdnUrl = `https://popcdn.day/player/${streamName}`;
    const res = await fetch(popcdnUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://lovecdn.ru/',
      },
    });
    
    if (!res.ok) {
      return { success: false, error: `popcdn.day returned ${res.status}` };
    }
    
    const html = await res.text();
    
    if (html.includes('Channel not found')) {
      return { success: false, error: 'Channel not found on popcdn.day' };
    }
    
    // Extract M3U8 URL (escaped in JSON)
    const m3u8Match = html.match(/https?:\\\/\\\/[^"'\s]*lovecdn\.ru[^"'\s]*\.m3u8[^"'\s]*/);
    if (!m3u8Match) {
      return { success: false, error: 'No M3U8 URL found in popcdn.day response' };
    }
    
    // Unescape the URL
    const m3u8Url = m3u8Match[0].replace(/\\\//g, '/');
    
    // Verify the stream works
    const m3u8Res = await fetch(m3u8Url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://popcdn.day/',
      },
    });
    
    if (!m3u8Res.ok) {
      return { success: false, error: `lovecdn.ru returned ${m3u8Res.status}` };
    }
    
    const content = await m3u8Res.text();
    if (content.includes('#EXTM3U')) {
      logger.info('lovecdn stream found', { channel, streamName });
      return { success: true, m3u8Url };
    }
    
    return { success: false, error: 'Invalid M3U8 content from lovecdn.ru' };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}


// ============================================================================
// MAIN HANDLER
// ============================================================================
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const logLevel = (env.LOG_LEVEL || 'debug') as LogLevel;
    const logger = createLogger(request, logLevel);
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    const url = new URL(request.url);
    const path = url.pathname;
    
    logger.info('TV Proxy request', { 
      path, 
      search: url.search,
      channel: url.searchParams.get('channel'),
      fullUrl: request.url 
    });

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders(origin) });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return jsonResponse({ error: 'Method not allowed' }, 405, origin);
    }

    if (!isAllowedOrigin(origin, referer)) {
      // EXCEPTION: Allow segment requests without strict origin check
      // HLS.js makes XHR requests for segments which may not include proper headers
      // Segments are public data (not auth-protected), so this is safe
      if (path !== '/segment') {
        return jsonResponse({ error: 'Access denied' }, 403, origin);
      }
    }

    try {
      if (path === '/health' || path === '/' && !url.searchParams.has('channel')) {
        return jsonResponse({ status: 'healthy', domain: CDN_DOMAIN, method: 'pow-auth' }, 200, origin);
      }
      if (path === '/key') return handleKeyProxy(url, logger, origin, env);
      if (path === '/segment') {
        // Pass client IP for rate limiting
        const clientIP = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        url.searchParams.set('_ip', clientIP);
        return handleSegmentProxy(url, logger, origin, env);
      }
      
      // CRITICAL: When accessed via /tv route from index.ts, url.origin is the media-proxy domain
      // but we need to include /tv in the proxy URLs so they route back to this worker
      // Check if we're being accessed through the /tv route by looking at the original URL
      // The proxyBase should be the full path prefix that routes to this worker
      const proxyBase = `${url.origin}/tv`;
      
      if (path === '/cdnlive') return handleCdnLiveM3U8Proxy(url, logger, origin, proxyBase, env);

      const channel = url.searchParams.get('channel');
      const skipBackends = url.searchParams.get('skip')?.split(',').filter(Boolean) || [];
      logger.info('Channel param', { channel, hasChannel: !!channel, skipBackends });
      
      if (!channel || !/^\d+$/.test(channel)) {
        return jsonResponse({ 
          error: 'Missing or invalid channel parameter',
          path,
          search: url.search,
          receivedChannel: channel 
        }, 400, origin);
      }
      return handlePlaylistRequest(channel, proxyBase, logger, origin, env, request, skipBackends);
    } catch (error) {
      logger.error('TV Proxy error', error as Error);
      return jsonResponse({ error: 'Proxy error', details: (error as Error).message }, 500, origin);
    }
  },
};

// ============================================================================
// PARALLEL BACKEND HELPERS - Fast startup optimization
// All M3U8 fetches go through RPI proxy for residential IP
// ============================================================================

async function fetchViaRpiProxy(
  url: string,
  referer: string,
  env: Env | undefined,
  logger: any,
  signal?: AbortSignal,
  origin?: string
): Promise<Response> {
  if (!env?.RPI_PROXY_URL || !env?.RPI_PROXY_KEY) {
    // Fallback to direct fetch if RPI not configured
    logger.warn('RPI proxy not configured, falling back to direct fetch');
    return fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': referer,
        ...(origin ? { 'Origin': origin } : {}),
      },
      signal,
    });
  }
  
  // Pass both referer AND origin for dvalna.ru requests
  const originParam = origin ? `&origin=${encodeURIComponent(origin)}` : '';
  const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(url)}&key=${env.RPI_PROXY_KEY}&referer=${encodeURIComponent(referer)}${originParam}`;
  return fetch(rpiUrl, { signal });
}

async function tryMoveonjoyBackend(
  channel: string, 
  moveonjoyUrl: string, 
  proxyOrigin: string, 
  logger: any, 
  origin: string | null,
  env?: Env
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20 sec timeout for RPI proxy
  
  try {
    const m3u8Res = await fetchViaRpiProxy(
      moveonjoyUrl,
      'https://tv-bu1.blogspot.com/',
      env,
      logger,
      controller.signal
    );
    
    clearTimeout(timeout);
    
    if (!m3u8Res.ok) return null;
    
    const content = await m3u8Res.text();
    if (!content.includes('#EXTM3U') || (!content.includes('#EXTINF') && !content.includes('.ts'))) {
      return null;
    }
    
    logger.info('FAST: moveonjoy.com succeeded', { channel });
    const proxied = rewriteMoveonjoyM3U8(content, proxyOrigin, moveonjoyUrl);
    
    return new Response(proxied, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        ...corsHeaders(origin),
        'Cache-Control': 'no-store',
        'X-DLHD-Channel': channel,
        'X-DLHD-Backend': 'moveonjoy.com',
        'X-Fast-Path': 'true',
      },
    });
  } catch (e) {
    clearTimeout(timeout);
    return null;
  }
}

async function tryCdnLiveBackend(
  channel: string,
  mapping: { name: string; code: string },
  proxyOrigin: string,
  logger: any,
  origin: string | null,
  env?: Env
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 sec timeout
  
  try {
    const cdnResult = await fetchCdnLiveStream(mapping.name, mapping.code, logger, env);
    
    if (!cdnResult.success || !cdnResult.m3u8Url) {
      return null;
    }
    
    // Pass both referer AND origin - cdn-live-tv.ru may require both like dvalna.ru
    const m3u8Res = await fetchViaRpiProxy(
      cdnResult.m3u8Url,
      'https://cdn-live.tv/',
      env,
      logger,
      controller.signal,
      'https://cdn-live.tv' // Origin header
    );
    
    clearTimeout(timeout);
    
    if (!m3u8Res.ok) {
      return null;
    }
    
    const content = await m3u8Res.text();
    if (!content.includes('#EXTM3U') || (!content.includes('#EXTINF') && !content.includes('.ts') && !content.includes('#EXT-X-STREAM-INF'))) {
      return null;
    }
    
    const proxied = rewriteCdnLiveM3U8(content, proxyOrigin, cdnResult.m3u8Url);
    
    return new Response(proxied, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        ...corsHeaders(origin),
        'Cache-Control': 'no-store',
        'X-DLHD-Channel': channel,
        'X-DLHD-Backend': 'cdn-live-tv.ru',
        'X-Fast-Path': 'true',
      },
    });
  } catch (e) {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Try to fetch M3U8 from a specific server/channelKey combination
 * Returns the content if successful, null otherwise
 */
async function tryDvalnaServer(
  serverKey: string,
  channelKey: string,
  env: Env | undefined,
  logger: any,
  timeoutMs: number = 8000
): Promise<{ content: string; m3u8Url: string } | null> {
  const m3u8Url = constructM3U8Url(serverKey, channelKey);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const m3u8Res = await fetchViaRpiProxy(
      `${m3u8Url}?_t=${Date.now()}`,
      `https://${PLAYER_DOMAIN}/`,
      env,
      logger,
      controller.signal,
      `https://${PLAYER_DOMAIN}`
    );
    
    clearTimeout(timeout);
    
    if (!m3u8Res.ok) return null;
    
    const content = await m3u8Res.text();
    
    // Validate it's a real M3U8 with actual content
    if (!content.includes('#EXTM3U') || (!content.includes('#EXTINF') && !content.includes('.ts'))) {
      return null;
    }
    
    return { content, m3u8Url };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function tryDvalnaBackend(
  channel: string,
  jwtPromise: Promise<string | null>,
  proxyOrigin: string,
  logger: any,
  origin: string | null,
  env?: Env,
  errors?: string[]
): Promise<Response | null> {
  const jwt = await jwtPromise;
  if (!jwt) {
    if (errors) errors.push('dvalna: No JWT available');
    return null;
  }
  
  // Build list of channel keys to try
  const channelKeysToTry: string[] = [];
  
  // 1. Mapped channel key (from topembed.pw)
  const mappedInfo = getChannelInfo(channel);
  if (!mappedInfo.channelKey.startsWith('premium')) {
    channelKeysToTry.push(mappedInfo.channelKey);
  }
  
  // 2. Channel key from JWT 'sub' field
  try {
    const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(payloadB64));
    if (payload.sub && !channelKeysToTry.includes(payload.sub)) {
      channelKeysToTry.push(payload.sub);
    }
  } catch {}
  
  // 3. Premium fallback (from hitsplay.fun)
  const premiumKey = `premium${channel}`;
  if (!channelKeysToTry.includes(premiumKey)) {
    channelKeysToTry.push(premiumKey);
  }
  
  logger.info('dvalna: trying channel keys', { channel, keys: channelKeysToTry });
  
  // For each channel key, try server_lookup first, then brute force all servers
  for (const channelKey of channelKeysToTry) {
    // First try server_lookup to get the "correct" server
    const lookupServer = await fetchServerKeyFromLookup(channelKey, logger, env);
    
    // Build server list: lookup result first (if any), then all others
    const serversToTry = [...ALL_SERVER_KEYS];
    if (lookupServer) {
      // Move lookup result to front
      const idx = serversToTry.indexOf(lookupServer);
      if (idx > 0) {
        serversToTry.splice(idx, 1);
        serversToTry.unshift(lookupServer);
      } else if (idx === -1) {
        serversToTry.unshift(lookupServer);
      }
    }
    
    logger.info('dvalna: trying servers for key', { channelKey, servers: serversToTry, lookupServer });
    
    // Try servers in parallel batches for speed (3 at a time)
    const BATCH_SIZE = 3;
    for (let i = 0; i < serversToTry.length; i += BATCH_SIZE) {
      const batch = serversToTry.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.all(
        batch.map(server => tryDvalnaServer(server, channelKey, env, logger, 10000))
      );
      
      // Check if any succeeded
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result) {
          const serverKey = batch[j];
          logger.info('dvalna: SUCCESS', { channel, channelKey, serverKey });
          
          // Cache the working server
          serverKeyCache.set(channelKey, { serverKey, fetchedAt: Date.now() });
          
          const proxied = rewriteM3U8(result.content, proxyOrigin, result.m3u8Url);
          
          return new Response(proxied, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.apple.mpegurl',
              ...corsHeaders(origin),
              'Cache-Control': 'no-store',
              'X-DLHD-Channel': channel,
              'X-DLHD-ChannelKey': channelKey,
              'X-DLHD-Server': serverKey,
              'X-DLHD-Backend': 'dvalna.ru',
              'X-Fast-Path': 'true',
            },
          });
        }
      }
      
      // Log failed batch
      batch.forEach((server, idx) => {
        if (!results[idx] && errors) {
          errors.push(`dvalna/${channelKey}/${server}: failed`);
        }
      });
    }
    
    logger.warn('dvalna: all servers failed for key', { channelKey });
  }
  
  if (errors) errors.push(`dvalna: all ${channelKeysToTry.length} channel keys failed on all ${ALL_SERVER_KEYS.length} servers`);
  return null;
}

async function handlePlaylistRequest(channel: string, proxyOrigin: string, logger: any, origin: string | null, env?: Env, request?: Request, skipBackends: string[] = []): Promise<Response> {
  const errors: string[] = [];

  // ============================================================================
  // BACKEND PRIORITY ORDER: moveonjoy → cdn-live → dvalna
  // Try fastest/simplest backends first, fall back to slower ones
  // ============================================================================

  // Start JWT fetch early in background (needed for dvalna if we get there)
  const jwtPromise = !skipBackends.includes('dvalna') 
    ? fetchPlayerJWT(channel, logger, env) 
    : Promise.resolve(null);

  // ============================================================================
  // BACKEND 1: moveonjoy.com (NO AUTH - fastest)
  // ============================================================================
  const moveonjoyUrl = CHANNEL_TO_MOVEONJOY[channel];
  if (moveonjoyUrl && !skipBackends.includes('moveonjoy')) {
    try {
      const result = await tryMoveonjoyBackend(channel, moveonjoyUrl, proxyOrigin, logger, origin, env);
      if (result && result.status === 200) {
        return result;
      }
    } catch (e) {
      errors.push(`moveonjoy: ${(e as Error).message}`);
    }
  }

  // ============================================================================
  // BACKEND 2: cdn-live-tv.ru (simple token auth)
  // ============================================================================
  const cdnLiveMapping = CHANNEL_TO_CDNLIVE[channel];
  if (cdnLiveMapping && !skipBackends.includes('cdnlive')) {
    try {
      const result = await tryCdnLiveBackend(channel, cdnLiveMapping, proxyOrigin, logger, origin, env);
      if (result && result.status === 200) {
        return result;
      }
    } catch (e) {
      errors.push(`cdnlive: ${(e as Error).message}`);
    }
  }

  // ============================================================================
  // BACKEND 3: dvalna.ru (needs JWT + PoW - slowest but most channels)
  // ============================================================================
  if (!skipBackends.includes('dvalna')) {
    try {
      const result = await tryDvalnaBackend(channel, jwtPromise, proxyOrigin, logger, origin, env, errors);
      if (result && result.status === 200) {
        return result;
      }
    } catch (e) {
      errors.push(`dvalna: ${(e as Error).message}`);
    }
  }

  // ============================================================================
  // ALL BACKENDS FAILED
  // ============================================================================
  const offlineErrors = errors.filter(e => e.includes('offline') || e.includes('empty'));
  const hasOfflineChannel = offlineErrors.length > 0;
  
  if (hasOfflineChannel) {
    return jsonResponse({ 
      error: 'Channel offline', 
      message: 'This channel exists but is not currently streaming.',
      channel,
      offlineOn: offlineErrors.map(e => e.split(':')[0]),
      hint: 'US broadcast channels are often only available during live sports events. Try again later.'
    }, 503, origin);
  }
  
  return jsonResponse({ 
    error: 'All backends failed', 
    channel,
    errors: errors.slice(0, 10),
    backendsTriedCount: 3,
    hint: 'moveonjoy.com, cdn-live-tv.ru, and dvalna.ru all failed'
  }, 502, origin);
}

// ============================================================================
// M3U8 REWRITERS FOR DIFFERENT BACKENDS
// ============================================================================

/**
 * Rewrite M3U8 for cdn-live-tv.ru backend
 * This backend uses token-based auth, segments include the token
 * 
 * CRITICAL: All URLs must be proxied through appropriate endpoints because
 * cdn-live-tv.ru blocks direct browser requests (CORS/geo-blocking)
 * 
 * ROUTING STRATEGY (January 2026 Fix):
 * - .m3u8 manifests → /tv/cdnlive?url=... (through Next.js /tv route)
 * - .ts segments → /segment?url=... (DIRECTLY to worker, bypassing /tv)
 * - Keys (URI= in EXT-X-KEY) → /segment?url=... (DIRECTLY to worker)
 * - Audio/subtitle tracks (URI= in EXT-X-MEDIA) → /tv/cdnlive?url=... (m3u8 manifests)
 * 
 * This ensures segments are served from edge worker for performance,
 * while manifests can be processed through Next.js if needed.
 */
function rewriteCdnLiveM3U8(content: string, proxyOrigin: string, m3u8BaseUrl: string): string {
  const baseUrl = new URL(m3u8BaseUrl);
  const basePath = baseUrl.pathname.replace(/\/[^/]*$/, '/');
  const token = baseUrl.searchParams.get('token') || '';
  
  const lines = content.split('\n').map(line => {
    const trimmed = line.trim();
    
    // Handle URI attributes (EXT-X-KEY for keys, EXT-X-MEDIA for audio/subtitle tracks)
    if (trimmed.includes('URI="')) {
      return trimmed.replace(/URI="([^"]+)"/, (_, uri: string) => {
        // Skip if already proxied
        if (uri.includes('/segment?url=') || uri.includes('/key?url=') || uri.includes('/cdnlive?url=')) {
          return `URI="${uri}"`;
        }
        const fullUrl = uri.startsWith('http') ? uri : `${baseUrl.origin}${basePath}${uri}`;
        const workerOrigin = proxyOrigin.replace(/\/tv$/, '');
        
        // Route based on file type:
        // - .m3u8 files (audio/subtitle tracks) → /tv/cdnlive for manifest handling
        // - Keys and other files → /segment for direct proxying
        if (fullUrl.includes('.m3u8')) {
          return `URI="${proxyOrigin}/cdnlive?url=${encodeURIComponent(fullUrl)}"`;
        } else {
          return `URI="${workerOrigin}/segment?url=${encodeURIComponent(fullUrl)}"`;
        }
      });
    }
    
    if (!trimmed || trimmed.startsWith('#')) return line;
    
    // Skip if already proxied
    if (trimmed.includes('/segment?url=') || trimmed.includes('/cdnlive?url=')) return line;
    
    let absoluteUrl: string;
    
    // Make relative URLs absolute
    if (!trimmed.startsWith('http')) {
      absoluteUrl = `${baseUrl.origin}${basePath}${trimmed}`;
    } else {
      absoluteUrl = trimmed;
    }
    
    // Ensure token is included
    if (!absoluteUrl.includes('token=') && token) {
      absoluteUrl += (absoluteUrl.includes('?') ? '&' : '?') + `token=${token}`;
    }
    
    // Route based on file type:
    // CRITICAL FIX: Segments must go DIRECTLY to worker, NOT through /tv route!
    // - .m3u8 files → /tv/cdnlive (through Next.js /tv route for manifest handling)
    // - .ts segments → /segment (DIRECTLY to worker, bypassing Next.js)
    if (absoluteUrl.includes('.m3u8')) {
      // Manifests go through /tv route
      return `${proxyOrigin}/cdnlive?url=${encodeURIComponent(absoluteUrl)}`;
    } else {
      // Segments go DIRECTLY to worker (strip /tv prefix from proxyOrigin)
      const workerOrigin = proxyOrigin.replace(/\/tv$/, '');
      return `${workerOrigin}/segment?url=${encodeURIComponent(absoluteUrl)}`;
    }
  });
  
  return lines.join('\n');
}

/**
 * Handle /cdnlive proxy requests for cdn-live-tv.ru M3U8 files
 * This proxies nested M3U8 playlists (variant/level playlists) and rewrites their URLs
 * CRITICAL: All fetches go through RPI proxy - cdn-live blocks CF IPs
 */
async function handleCdnLiveM3U8Proxy(url: URL, logger: any, origin: string | null, proxyOrigin: string, env?: Env): Promise<Response> {
  const m3u8Url = url.searchParams.get('url');
  if (!m3u8Url) {
    return jsonResponse({ error: 'Missing url parameter' }, 400, origin);
  }

  // SECURITY: Validate URL format before decoding
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(m3u8Url);
  } catch {
    logger.warn('Invalid URL encoding', { url: m3u8Url.substring(0, 50) });
    return jsonResponse({ error: 'Invalid URL encoding' }, 400, origin);
  }

  logger.info('CDN-Live M3U8 proxy', { url: decodedUrl.substring(0, 100) });

  try {
    // SECURITY: Strict domain validation to prevent SSRF
    // Only allow exact CDN-Live domains, not substrings
    const urlObj = new URL(decodedUrl);
    const allowedDomains = [
      'cdn-live-tv.ru',
      'cdn-live-tv.cfd',
      'cdn-live.tv',
      'edge.cdn-live-tv.ru',
    ];
    
    const hostname = urlObj.hostname.toLowerCase();
    const isAllowedDomain = allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    
    if (!isAllowedDomain) {
      logger.warn('CDN-Live domain validation failed', { hostname });
      return jsonResponse({ error: 'Invalid domain' }, 400, origin);
    }
    
    // SECURITY: Only allow HTTPS
    if (urlObj.protocol !== 'https:') {
      return jsonResponse({ error: 'HTTPS required' }, 400, origin);
    }

    // SECURITY: Add timeout to prevent slow-loris attacks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    // Try RPI proxy first, then fallback to direct fetch
    const referer = 'https://cdn-live.tv/';
    let response: Response | null = null;
    let fetchedVia = 'direct';
    
    if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
      logger.info('Trying RPI proxy for CDN-Live M3U8');
      try {
        const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(decodedUrl)}&key=${env.RPI_PROXY_KEY}&referer=${encodeURIComponent(referer)}`;
        const rpiRes = await fetch(rpiUrl, { signal: controller.signal });
        if (rpiRes.ok) {
          response = rpiRes;
          fetchedVia = 'rpi';
        } else {
          logger.warn('RPI M3U8 fetch failed, trying direct', { status: rpiRes.status });
        }
      } catch (rpiErr) {
        logger.warn('RPI proxy error, trying direct', { error: (rpiErr as Error).message });
      }
    }
    
    // Direct fetch (either as fallback or if RPI not configured)
    if (!response) {
      logger.info('Using direct fetch for CDN-Live M3U8');
      response = await fetch(decodedUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': referer,
          'Origin': 'https://cdn-live.tv',
        },
        signal: controller.signal,
      });
      fetchedVia = 'direct';
    }
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error('CDN-Live upstream error', { status: response.status, via: fetchedVia });
      return jsonResponse({ error: `Upstream error: ${response.status}` }, response.status, origin);
    }

    const content = await response.text();
    
    if (!content.includes('#EXTM3U')) {
      return jsonResponse({ error: 'Invalid M3U8' }, 502, origin);
    }

    const rewritten = rewriteCdnLiveM3U8(content, proxyOrigin, decodedUrl);

    return new Response(rewritten, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store',
        ...corsHeaders(origin),
        'X-Fetched-Via': fetchedVia,
      },
    });
  } catch (error) {
    logger.error('CDN-Live proxy error', { error: (error as Error).message });
    return jsonResponse({ error: 'Proxy failed', details: (error as Error).message }, 502, origin);
  }
}

/**
 * Rewrite M3U8 for moveonjoy.com backend
 * This backend has no auth, just make URLs absolute
 */
function rewriteMoveonjoyM3U8(content: string, proxyOrigin: string, m3u8BaseUrl: string): string {
  const baseUrl = new URL(m3u8BaseUrl);
  const basePath = baseUrl.pathname.replace(/\/[^/]*$/, '/');
  
  const lines = content.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    
    // Make relative URLs absolute
    if (!trimmed.startsWith('http')) {
      return `${baseUrl.origin}${basePath}${trimmed}`;
    }
    return line;
  });
  
  return lines.join('\n');
}

/**
 * Rewrite M3U8 for lovecdn.ru backend
 * This backend uses token-based auth, segments include the token
 */
function rewriteLovecdnM3U8(content: string, proxyOrigin: string, m3u8BaseUrl: string): string {
  const baseUrl = new URL(m3u8BaseUrl);
  const basePath = baseUrl.pathname.replace(/\/[^/]*$/, '/');
  const token = baseUrl.searchParams.get('token') || '';
  
  const lines = content.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    
    // Make relative URLs absolute
    if (!trimmed.startsWith('http')) {
      let absoluteUrl = `${baseUrl.origin}${basePath}${trimmed}`;
      // Ensure token is included for segments
      if (!absoluteUrl.includes('token=') && token) {
        absoluteUrl += (absoluteUrl.includes('?') ? '&' : '?') + `token=${token}`;
      }
      return absoluteUrl;
    }
    return line;
  });
  
  return lines.join('\n');
}

async function handleKeyProxy(url: URL, logger: any, origin: string | null, env?: Env): Promise<Response> {
  // Global timeout for the entire key proxy operation
  const startTime = Date.now();
  const MAX_KEY_PROXY_TIME = 25000; // 25 seconds max
  
  const keyUrlParam = url.searchParams.get('url');
  if (!keyUrlParam) return jsonResponse({ error: 'Missing url parameter' }, 400, origin);

  let keyUrl = decodeURIComponent(keyUrlParam);
  logger.info('Key proxy request', { keyUrl: keyUrl.substring(0, 80) });

  // UPDATED January 2026: Handle both premium{id} and topembed channel keys (like 'ustvabc')
  // Extract channel key and key number from URL
  const keyPathMatch = keyUrl.match(/\/key\/([^/]+)\/(\d+)/);
  if (!keyPathMatch) return jsonResponse({ error: 'Could not extract channel key from URL' }, 400, origin);

  const channelKey = keyPathMatch[1]; // Could be 'premium51', 'ustvabc', 'eplayerespn_usa', etc.
  const keyNumber = keyPathMatch[2];
  
  logger.info('Key request parsed', { channelKey, keyNumber });

  // Strategy to find JWT:
  // 1. Check if we have a cached JWT for this exact channel key
  // 2. If channelKey is premium{id}, try to fetch JWT for that channel ID
  // 3. Use reverse mapping (channelKeyToTopembed) to find the topembed name
  // 4. Search all cached JWTs for matching channelKey
  
  let jwt: string | null = null;
  let jwtSource = 'unknown';
  
  // Method 1: Check reverse mapping (channelKey → topembed name)
  const topembedName = channelKeyToTopembed.get(channelKey);
  if (topembedName) {
    const cached = jwtCache.get(topembedName);
    if (cached && cached.channelKey === channelKey) {
      const now = Math.floor(Date.now() / 1000);
      if (cached.exp > now + 60) { // At least 1 min remaining
        jwt = cached.jwt;
        jwtSource = `reverse-mapping:${topembedName}`;
        logger.info('JWT found via reverse mapping', { channelKey, topembedName });
      }
    }
  }
  
  // Method 2: If channelKey is premium{id}, fetch JWT for that channel
  if (!jwt) {
    const premiumMatch = channelKey.match(/^premium(\d+)$/);
    if (premiumMatch) {
      const channelId = premiumMatch[1];
      logger.info('Trying to fetch JWT for premium channel', { channelId });
      jwt = await fetchPlayerJWT(channelId, logger, env);
      if (jwt) {
        jwtSource = `fetch:premium${channelId}`;
        // Verify the JWT's channelKey matches what we need
        try {
          const payloadB64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(payloadB64));
          if (payload.sub && payload.sub !== channelKey) {
            logger.warn('JWT channelKey mismatch', { expected: channelKey, got: payload.sub });
            // The JWT is for a different channel key - this is actually correct!
            // The M3U8 uses premium{id} but the JWT uses the real channel key
            // We need to update our key URL to use the JWT's channel key
          }
        } catch (e) {
          logger.warn('Could not verify JWT channelKey');
        }
      }
    }
  }
  
  // Method 3: Search all cached JWTs for matching channelKey
  if (!jwt) {
    for (const [cacheKey, entry] of jwtCache.entries()) {
      if (entry.channelKey === channelKey) {
        const now = Math.floor(Date.now() / 1000);
        if (entry.exp > now + 60) {
          jwt = entry.jwt;
          jwtSource = `cache-search:${cacheKey}`;
          logger.info('JWT found via cache search', { channelKey, cacheKey });
          break;
        }
      }
    }
  }
  
  // Method 4: Try to find DLHD channel ID from channelKey using DLHD_CHANNEL_MAP
  // This is a fast lookup - no network requests needed
  if (!jwt) {
    // Search DLHD_CHANNEL_MAP for a channel with matching channelKey
    for (const [dlhdId, info] of Object.entries(DLHD_CHANNEL_MAP)) {
      if (info.channelKey === channelKey) {
        logger.info('Found DLHD ID for channelKey', { channelKey, dlhdId });
        jwt = await fetchPlayerJWT(dlhdId, logger, env);
        if (jwt) {
          jwtSource = `dlhd-map:${dlhdId}`;
          break;
        }
      }
    }
  }
  
  if (!jwt) {
    logger.warn('No JWT found for channel key', { channelKey });
    return jsonResponse({ 
      error: 'Failed to fetch JWT for key decryption',
      channelKey,
      keyNumber,
      hint: 'Channel may not be mapped to topembed.pw. Try using moveonjoy or cdn-live-tv backend instead.',
      cachedChannelKeys: Array.from(channelKeyToTopembed.keys()).slice(0, 10)
    }, 502, origin);
  }
  
  logger.info('JWT found', { channelKey, jwtSource });

  // Compute PoW nonce using WASM
  // Use current timestamp (no offset needed with WASM PoW)
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = await computePoWNonce(channelKey, keyNumber, timestamp);
  if (nonce === null) {
    return jsonResponse({ error: 'Failed to compute PoW nonce' }, 500, origin);
  }

  logger.info('Key fetch with WASM PoW', { channelKey, keyNumber, timestamp, nonce: nonce.toString(), jwtSource });

  const newKeyUrl = `https://chevy.${CDN_DOMAIN}/key/${channelKey}/${keyNumber}`;

  try {
    let data: ArrayBuffer;
    let fetchedVia = 'rpi-proxy-v4';
    
    // Use RPI proxy for key fetch - DLHD blocks Cloudflare IPs
    // But now we compute PoW in CF Worker and pass headers to RPI
    if (!env?.RPI_PROXY_URL || !env?.RPI_PROXY_KEY) {
      return jsonResponse({ 
        error: 'RPI proxy not configured', 
        hint: 'Configure RPI_PROXY_URL and RPI_PROXY_KEY for key decryption',
      }, 502, origin);
    }
    
    // Use the new /dlhd-key-v4 endpoint that accepts pre-computed auth headers
    const rpiKeyUrl = new URL(`${env.RPI_PROXY_URL}/dlhd-key-v4`);
    rpiKeyUrl.searchParams.set('url', newKeyUrl);
    rpiKeyUrl.searchParams.set('key', env.RPI_PROXY_KEY);
    rpiKeyUrl.searchParams.set('jwt', jwt);
    rpiKeyUrl.searchParams.set('timestamp', timestamp.toString());
    rpiKeyUrl.searchParams.set('nonce', nonce.toString());
    
    logger.info('Fetching key via RPI proxy v4', { url: rpiKeyUrl.toString().substring(0, 100) });
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    let rpiRes: Response;
    try {
      rpiRes = await fetch(rpiKeyUrl.toString(), { signal: controller.signal });
    } catch (e) {
      clearTimeout(timeoutId);
      if ((e as Error).name === 'AbortError') {
        logger.warn('RPI key fetch timeout');
        return jsonResponse({ error: 'Key fetch timeout - RPI proxy not responding' }, 504, origin);
      }
      throw e;
    }
    clearTimeout(timeoutId);
    
    if (!rpiRes.ok) {
      const errText = await rpiRes.text();
      logger.warn('RPI key fetch failed', { status: rpiRes.status, error: errText });
      return jsonResponse({ 
        error: 'Key fetch failed via RPI', 
        rpiStatus: rpiRes.status,
        rpiError: errText.substring(0, 200),
        channelKey,
        keyNumber,
      }, 502, origin);
    }
    
    data = await rpiRes.arrayBuffer();

    if (data.byteLength === 16) {
      const text = new TextDecoder().decode(data);
      // Make sure it's not an error message
      if (!text.startsWith('{') && !text.startsWith('[') && !text.startsWith('E')) {
        logger.info('Key fetched successfully', { size: 16, fetchedVia });
        return new Response(data, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': '16',
            ...corsHeaders(origin),
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Fetched-Via': fetchedVia,
          },
        });
      }
    }

    const text = new TextDecoder().decode(data);
    logger.warn('Invalid key response', { size: data.byteLength, preview: text.substring(0, 100) });
    return jsonResponse({ 
      error: 'Invalid key response', 
      size: data.byteLength,
      preview: text.substring(0, 100),
      channelKey,
      keyNumber,
    }, 502, origin);
  } catch (error) {
    return jsonResponse({ error: 'Key fetch failed', details: (error as Error).message }, 502, origin);
  }
}

// Known DLHD CDN domains that block Cloudflare IPs
const DLHD_DOMAINS = ['dvalna.ru', 'kiko2.ru', 'giokko.ru'];

/**
 * Check if a URL is from a DLHD CDN domain that blocks CF IPs
 */
function isDLHDDomain(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return DLHD_DOMAINS.some(domain => url.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

async function handleSegmentProxy(url: URL, logger: any, origin: string | null, env?: Env): Promise<Response> {
  const segmentUrl = url.searchParams.get('url');
  if (!segmentUrl) return jsonResponse({ error: 'Missing url parameter' }, 400, origin);

  // SECURITY: Rate limiting to prevent bandwidth abuse
  // Each IP gets limited requests per minute
  const clientIP = url.searchParams.get('_ip') || 'unknown'; // Set by CF worker
  if (env?.RATE_LIMIT_KV) {
    const rateLimitKey = `segment_rate:${clientIP}`;
    const currentCount = parseInt(await env.RATE_LIMIT_KV.get(rateLimitKey) || '0');
    const SEGMENT_RATE_LIMIT = 300; // 300 segments per minute (5 per second)
    
    if (currentCount >= SEGMENT_RATE_LIMIT) {
      logger.warn('Rate limit exceeded for segment requests', { ip: clientIP, count: currentCount });
      return jsonResponse({ error: 'Rate limit exceeded' }, 429, origin);
    }
    
    // Increment counter with 60 second TTL
    await env.RATE_LIMIT_KV.put(rateLimitKey, String(currentCount + 1), { expirationTtl: 60 });
  }

  // SECURITY: Strict URL validation to prevent SSRF attacks
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(segmentUrl);
  } catch {
    logger.warn('Invalid URL encoding in segment request');
    return jsonResponse({ error: 'Invalid URL encoding' }, 400, origin);
  }

  // SECURITY: Validate domain whitelist to prevent proxying arbitrary URLs
  const allowedDomains = [
    'dvalna.ru',
    'cdn-live-tv.ru',
    'cdn-live-tv.cfd',
    'cdn-live.tv',
    'edge.cdn-live-tv.ru',
    'edge.cdn-live-tv.cfd',
    'moveonjoy.com',
    'lovecdn.ru',
    'popcdn.day',
    'beautifulpeople.lovecdn.ru',
  ];

  try {
    const urlObj = new URL(decodedUrl);
    const hostname = urlObj.hostname.toLowerCase();
    const isAllowed = allowedDomains.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      logger.warn('SSRF attempt - unauthorized domain', { hostname, origin });
      return jsonResponse({ error: 'Unauthorized domain' }, 403, origin);
    }
  } catch (e) {
    logger.warn('Invalid URL format in segment request', { url: decodedUrl.substring(0, 50) });
    return jsonResponse({ error: 'Invalid URL format' }, 400, origin);
  }

  // Determine correct Referer based on domain
  let referer = `https://${PLAYER_DOMAIN}/`;
  let requestOrigin = `https://${PLAYER_DOMAIN}`;
  try {
    const urlHost = new URL(decodedUrl).hostname;
    if (urlHost.includes('cdn-live-tv.ru') || urlHost.includes('cdn-live-tv.cfd') || urlHost.includes('cdn-live.tv')) {
      referer = 'https://cdn-live.tv/';
      requestOrigin = 'https://cdn-live.tv';
    } else if (urlHost.includes('moveonjoy.com')) {
      referer = 'https://tv-bu1.blogspot.com/';
      requestOrigin = 'https://tv-bu1.blogspot.com';
    } else if (urlHost.includes('dvalna.ru') || urlHost.includes('kiko2.ru') || urlHost.includes('giokko.ru')) {
      // DLHD CDN requires topembed.pw referer
      referer = `https://${PLAYER_DOMAIN}/`;
      requestOrigin = `https://${PLAYER_DOMAIN}`;
    }
  } catch {}
  
  logger.info('Segment proxy request', { url: decodedUrl.substring(0, 80), referer });

  try {
    let data: ArrayBuffer;
    let fetchedVia = 'direct';
    
    // Try RPI proxy first, then fallback to direct fetch
    // cdn-live-tv.ru may work from CF IPs, so we try both
    // dvalna.ru REQUIRES residential IP - direct fetch will fail
    if (env?.RPI_PROXY_URL && env?.RPI_PROXY_KEY) {
      logger.info('Trying RPI proxy for segment');
      try {
        // Pass both referer AND origin for dvalna.ru segments
        const rpiUrl = `${env.RPI_PROXY_URL}/animekai?url=${encodeURIComponent(decodedUrl)}&key=${env.RPI_PROXY_KEY}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(requestOrigin)}`;
        logger.info('RPI URL', { rpiUrl: rpiUrl.substring(0, 150) });
        
        const rpiRes = await fetch(rpiUrl, {
          signal: AbortSignal.timeout(25000), // 25 second timeout
        });
        
        logger.info('RPI response', { status: rpiRes.status, contentType: rpiRes.headers.get('content-type') });
        
        if (rpiRes.ok) {
          data = await rpiRes.arrayBuffer();
          fetchedVia = 'rpi';
          logger.info('RPI segment fetched', { size: data.byteLength });
        } else {
          const errText = await rpiRes.text();
          logger.warn('RPI segment fetch failed, trying direct', { status: rpiRes.status, error: errText.substring(0, 200) });
          // Fall through to direct fetch
        }
      } catch (rpiErr) {
        logger.warn('RPI proxy error, trying direct', { error: (rpiErr as Error).message });
        // Fall through to direct fetch
      }
    }
    
    // Direct fetch (either as fallback or if RPI not configured)
    if (!data!) {
      logger.info('Using direct fetch for segment');
      const directRes = await fetch(decodedUrl, {
        headers: { 
          'User-Agent': USER_AGENT, 
          'Referer': referer,
          'Origin': requestOrigin,
        },
      });
      
      if (!directRes.ok) {
        logger.warn('Direct segment fetch HTTP error', { 
          status: directRes.status, 
          statusText: directRes.statusText,
          url: decodedUrl.substring(0, 100)
        });
        return jsonResponse({ 
          error: 'Segment fetch failed', 
          status: directRes.status,
        }, 502, origin);
      }
      
      data = await directRes.arrayBuffer();
      fetchedVia = 'direct';
    }
    
    // Log segment info but DON'T reject based on format
    // dvalna.ru segments may be encrypted or have non-standard headers
    const firstBytes = new Uint8Array(data.slice(0, 8));
    const isValidTS = firstBytes[0] === 0x47; // TS sync byte
    const firstChars = new TextDecoder().decode(firstBytes);
    const isValidFMP4 = firstChars.includes('ftyp') || firstChars.includes('moof') || firstChars.includes('mdat');
    
    // Only reject if it looks like an error response (JSON/HTML)
    if (!isValidTS && !isValidFMP4 && data.byteLength < 1000) {
      const preview = new TextDecoder().decode(data.slice(0, 500));
      // Check if it's actually an error response
      if (preview.startsWith('{') || preview.startsWith('<') || preview.includes('"error"')) {
        logger.warn('Segment response looks like error', { 
          size: data.byteLength, 
          preview: preview.substring(0, 200),
          url: decodedUrl.substring(0, 80)
        });
        return jsonResponse({ 
          error: 'Segment fetch returned error response', 
          preview: preview.substring(0, 100),
        }, 502, origin);
      }
    }
    
    logger.info('Segment fetch succeeded', { size: data.byteLength, isTS: isValidTS, isFMP4: isValidFMP4, via: fetchedVia });

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp2t',
        ...corsHeaders(origin),
        'Cache-Control': 'public, max-age=300',
        'X-Fetched-Via': fetchedVia,
      },
    });
  } catch (error) {
    logger.error('Segment proxy error', { error: (error as Error).message });
    return jsonResponse({ error: 'Segment fetch failed', details: (error as Error).message }, 502, origin);
  }
}

function rewriteM3U8(content: string, proxyOrigin: string, m3u8BaseUrl: string): string {
  let modified = content;

  // Rewrite key URLs - keys MUST be proxied (require PoW auth)
  // Key URLs can be on kiko2.ru, dvalna.ru, or giokko.ru domains
  // Channel keys can be premium{id} OR named keys like eplayerespn_usa, ustvabc, etc.
  modified = modified.replace(/URI="([^"]+)"/g, (_, originalKeyUrl) => {
    // Skip if already proxied through our worker
    if (originalKeyUrl.includes('/key?url=') || originalKeyUrl.includes('/segment?url=')) {
      return `URI="${originalKeyUrl}"`;
    }
    
    let absoluteKeyUrl = originalKeyUrl;
    if (!absoluteKeyUrl.startsWith('http')) {
      const base = new URL(m3u8BaseUrl);
      absoluteKeyUrl = new URL(originalKeyUrl, base.origin + base.pathname.replace(/\/[^/]*$/, '/')).toString();
    }
    
    // Match key URLs with any channel key format (premium{id} or named like eplayerespn_usa)
    const keyPathMatch = absoluteKeyUrl.match(/\/key\/([^/]+)\/(\d+)/);
    if (keyPathMatch) {
      // Normalize to chevy.dvalna.ru for our proxy
      absoluteKeyUrl = `https://chevy.${CDN_DOMAIN}/key/${keyPathMatch[1]}/${keyPathMatch[2]}`;
    }
    // proxyOrigin already contains /tv, so just append /key (not /tv/key)
    return `URI="${proxyOrigin}/key?url=${encodeURIComponent(absoluteKeyUrl)}"`;
  });

  modified = modified.replace(/\n?#EXT-X-ENDLIST\s*$/m, '');

  // Fix: DLHD now splits long segment URLs across multiple lines
  // Join lines that are continuations of URLs (don't start with # or http)
  const rawLines = modified.split('\n');
  const joinedLines: string[] = [];
  let currentLine = '';
  
  for (const line of rawLines) {
    const trimmed = line.trim();
    
    // If line starts with # or is empty, flush current and add this line
    if (!trimmed || trimmed.startsWith('#')) {
      if (currentLine) {
        joinedLines.push(currentLine);
        currentLine = '';
      }
      joinedLines.push(line);
    }
    // If line starts with http, it's a new URL
    else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (currentLine) {
        joinedLines.push(currentLine);
      }
      currentLine = trimmed;
    }
    // Otherwise it's a continuation of the previous URL
    else {
      currentLine += trimmed;
    }
  }
  
  // Don't forget the last line
  if (currentLine) {
    joinedLines.push(currentLine);
  }

  // Proxy segment URLs through our worker
  // dvalna.ru blocks direct browser requests (CORS/geo-blocking)
  // so we MUST proxy segments through the worker
  const lines = joinedLines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    
    // Skip if already proxied
    if (trimmed.includes('/segment?url=') || trimmed.includes('/key?url=')) return line;
    
    // Proxy segment URLs through our worker
    // Strip /tv from proxyOrigin to get the worker origin for /segment endpoint
    const workerOrigin = proxyOrigin.replace(/\/tv$/, '');
    return `${workerOrigin}/segment?url=${encodeURIComponent(trimmed)}`;
  });

  return lines.join('\n');
}

function isAllowedOrigin(origin: string | null, referer: string | null): boolean {
  // SECURITY FIX: Do NOT allow requests without origin/referer!
  // Previous assumption that "media players don't send headers" is FALSE and exploitable.
  // Modern HLS.js and video players DO send Referer headers.
  // Attackers can trivially strip headers using curl/wget/scripts.
  // 
  // If you need to support legacy players, use signed tokens instead (see anti-leech-proxy.ts)
  if (!origin && !referer) {
    // TEMPORARY: Log these requests to identify legitimate vs malicious traffic
    console.warn('[SECURITY] Request without Origin/Referer - potential leech attempt');
    return false; // DENY by default
  }
  
  const check = (o: string) => ALLOWED_ORIGINS.some(a => {
    if (a.includes('localhost')) return o.includes('localhost');
    // Handle domain suffix patterns (e.g., '.pages.dev', '.workers.dev', '.vercel.app')
    if (a.startsWith('.')) {
      try {
        const originHost = new URL(o).hostname;
        return originHost.endsWith(a);
      } catch {
        return false;
      }
    }
    try {
      const allowedHost = new URL(a).hostname;
      const originHost = new URL(o).hostname;
      return originHost === allowedHost || originHost.endsWith(`.${allowedHost}`);
    } catch {
      return false;
    }
  });
  if (origin && check(origin)) return true;
  if (referer) try { return check(new URL(referer).origin); } catch {}
  
  // SECURITY: Do NOT allow all origins - this defeats anti-leech protection
  // If origin/referer is provided but doesn't match, DENY access
  return false;
}

function corsHeaders(origin?: string | null): Record<string, string> {
  // SECURITY: Only return specific origin if it's in our allowed list
  // Using '*' allows any site to embed our streams
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(a => {
    if (a.includes('localhost')) return origin.includes('localhost');
    if (a.startsWith('.')) {
      try {
        return new URL(origin).hostname.endsWith(a);
      } catch { return false; }
    }
    try {
      const allowedHost = new URL(a).hostname;
      const originHost = new URL(origin).hostname;
      return originHost === allowedHost || originHost.endsWith(`.${allowedHost}`);
    } catch { return false; }
  }) ? origin : null;
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || 'https://flyx.tv', // Default to main domain, not '*'
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function jsonResponse(data: object, status: number, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}
