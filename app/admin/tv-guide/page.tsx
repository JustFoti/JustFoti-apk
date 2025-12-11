'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Tv, Play, Loader2, CheckCircle, AlertCircle, 
  RefreshCw, Search, Volume2, VolumeX
} from 'lucide-react';
import { 
  CABLE_CHANNELS, 
  CHANNEL_CATEGORIES, 
  getChannelsByCategory,
  findMatchingChannel,
  type CableChannel,
  type ChannelCategory 
} from '@/app/lib/data/cable-channels';
import type Hls from 'hls.js';
import type mpegts from 'mpegts.js';

const RPI_PROXY_URL = process.env.NEXT_PUBLIC_RPI_PROXY_URL;
const CF_PROXY_URL = process.env.NEXT_PUBLIC_CF_TV_PROXY_URL || 'https://media-proxy.vynx.workers.dev';
const RPI_PROXY_KEY = process.env.NEXT_PUBLIC_RPI_PROXY_KEY;

interface ChannelStatus {
  channelId: string;
  status: 'unknown' | 'available' | 'unavailable' | 'loading';
  portalChannel?: { id: string; name: string; cmd: string };
  streamUrl?: string;
}

interface PortalAccount {
  portal: string;
  mac: string;
  token?: string;
}

export default function TVGuidePage() {
  const [selectedCategory, setSelectedCategory] = useState<ChannelCategory>('broadcast');
  const [channelStatuses, setChannelStatuses] = useState<Record<string, ChannelStatus>>({});
  const [portalChannels, setPortalChannels] = useState<any[]>([]);
  const [account, setAccount] = useState<PortalAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<CableChannel | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [muted, setMuted] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<mpegts.Player | null>(null);

  const channelsByCategory = getChannelsByCategory();

  // Load saved account from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tv-guide-account');
    if (saved) {
      try {
        setAccount(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Connect to portal and get token
  const connectPortal = useCallback(async (portal: string, mac: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/iptv-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', portalUrl: portal, macAddress: mac })
      });
      const data = await response.json();
      
      if (data.success && data.token) {
        const newAccount = { portal, mac, token: data.token };
        setAccount(newAccount);
        localStorage.setItem('tv-guide-account', JSON.stringify(newAccount));
        return data.token;
      } else {
        throw new Error(data.error || 'Connection failed');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all channels from portal (for matching)
  const fetchPortalChannels = useCallback(async (token: string) => {
    if (!account) return [];
    
    const response = await fetch('/api/admin/iptv-debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'all_channels', 
        portalUrl: account.portal, 
        macAddress: account.mac, 
        token,
        usOnly: true
      })
    });
    const data = await response.json();
    return data.channels || [];
  }, [account]);

  // Scan for available channels
  const scanChannels = useCallback(async () => {
    if (!account?.token) return;
    
    setScanning(true);
    
    try {
      // Fetch portal channels if not already loaded
      let channels = portalChannels;
      if (channels.length === 0) {
        channels = await fetchPortalChannels(account.token);
        setPortalChannels(channels);
      }
      
      // Match each cable channel to portal channels
      const newStatuses: Record<string, ChannelStatus> = {};
      
      for (const channel of CABLE_CHANNELS) {
        const match = findMatchingChannel(channel, channels);
        newStatuses[channel.id] = {
          channelId: channel.id,
          status: match ? 'available' : 'unavailable',
          portalChannel: match || undefined
        };
      }
      
      setChannelStatuses(newStatuses);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
    }
  }, [account, portalChannels, fetchPortalChannels]);

  // Play a channel
  const playChannel = useCallback(async (channel: CableChannel) => {
    if (!account?.token) return;
    
    const status = channelStatuses[channel.id];
    if (!status?.portalChannel) return;
    
    setSelectedChannel(channel);
    setStreamLoading(true);
    setStreamUrl(null);
    setPlayerError(null);
    
    try {
      const response = await fetch('/api/admin/iptv-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'stream', 
          portalUrl: account.portal, 
          macAddress: account.mac, 
          token: account.token,
          cmd: status.portalChannel.cmd
        })
      });
      const data = await response.json();
      
      if (data.success && data.streamUrl) {
        setStreamUrl(data.streamUrl);
      } else {
        setPlayerError(data.error || 'Failed to get stream');
      }
    } catch (error: any) {
      setPlayerError(error.message);
    } finally {
      setStreamLoading(false);
    }
  }, [account, channelStatuses]);

  // Setup video player
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    // Cleanup previous
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      mpegtsRef.current.destroy();
      mpegtsRef.current = null;
    }

    const video = videoRef.current;
    const isHLS = streamUrl.includes('.m3u8');

    const setupPlayer = async () => {
      if (isHLS) {
        const HlsModule = await import('hls.js');
        const Hls = HlsModule.default;
        
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) setPlayerError(`HLS Error: ${data.details}`);
          });
          hlsRef.current = hls;
        }
      } else {
        // MPEG-TS stream
        const mpegtsModule = await import('mpegts.js');
        const mpegtsLib = mpegtsModule.default;
        
        if (mpegtsLib.isSupported()) {
          // Build proxy URL
          const proxyParams = new URLSearchParams({ url: streamUrl });
          if (account?.mac) proxyParams.set('mac', account.mac);
          
          let proxyUrl: string;
          if (RPI_PROXY_URL) {
            if (RPI_PROXY_KEY) proxyParams.set('key', RPI_PROXY_KEY);
            proxyUrl = `${RPI_PROXY_URL}/iptv/stream?${proxyParams}`;
          } else {
            const cfBase = CF_PROXY_URL.replace(/\/tv\/?$/, '').replace(/\/+$/, '');
            proxyUrl = `${cfBase}/iptv/stream?${proxyParams}`;
          }
          
          const player = mpegtsLib.createPlayer({
            type: 'mpegts',
            isLive: true,
            url: proxyUrl,
          }, {
            enableWorker: true,
            enableStashBuffer: true,
            stashInitialSize: 384 * 1024,
          });
          
          player.attachMediaElement(video);
          player.load();
          player.on(mpegtsLib.Events.ERROR, (_type: string, detail: string) => {
            setPlayerError(`Stream Error: ${detail}`);
          });
          video.play().catch(() => {});
          mpegtsRef.current = player;
        }
      }
    };

    setupPlayer().catch(err => setPlayerError(err.message));

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      if (mpegtsRef.current) mpegtsRef.current.destroy();
    };
  }, [streamUrl, account?.mac]);

  // Filter channels by search
  const filteredChannels = searchQuery
    ? CABLE_CHANNELS.filter(ch => 
        ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.shortName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : channelsByCategory[selectedCategory];

  // Count available channels
  const availableCount = Object.values(channelStatuses).filter(s => s.status === 'available').length;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
      color: '#f8fafc',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Tv size={32} color="#7877c6" />
          TV Guide
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          {availableCount > 0 
            ? `${availableCount} of ${CABLE_CHANNELS.length} channels available`
            : 'Connect to a portal and scan for channels'}
        </p>
      </div>

      {/* Portal Connection */}
      {!account?.token ? (
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Connect to Portal</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const portal = (form.elements.namedItem('portal') as HTMLInputElement).value;
            const mac = (form.elements.namedItem('mac') as HTMLInputElement).value;
            await connectPortal(portal, mac);
          }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                name="portal"
                placeholder="Portal URL (e.g., http://line.protv.cc)"
                defaultValue={account?.portal || ''}
                style={{
                  flex: '1',
                  minWidth: '250px',
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '14px'
                }}
              />
              <input
                name="mac"
                placeholder="MAC Address"
                defaultValue={account?.mac || ''}
                style={{
                  width: '200px',
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '14px'
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: '#7877c6',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ 
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} color="#22c55e" />
            <span style={{ color: '#22c55e', fontSize: '14px' }}>
              Connected to {new URL(account.portal).hostname}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={scanChannels}
              disabled={scanning}
              style={{
                padding: '8px 16px',
                background: scanning ? 'rgba(120, 119, 198, 0.3)' : 'rgba(120, 119, 198, 0.2)',
                border: '1px solid rgba(120, 119, 198, 0.3)',
                borderRadius: '6px',
                color: '#7877c6',
                fontSize: '13px',
                cursor: scanning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {scanning ? 'Scanning...' : 'Scan Channels'}
            </button>
            <button
              onClick={() => {
                setAccount(null);
                localStorage.removeItem('tv-guide-account');
                setChannelStatuses({});
                setPortalChannels([]);
              }}
              style={{
                padding: '8px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#ef4444',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
        {/* Sidebar - Categories */}
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '16px',
          height: 'fit-content'
        }}>
          {/* Search */}
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Category List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {(Object.entries(CHANNEL_CATEGORIES) as [ChannelCategory, { name: string; icon: string }][]).map(([key, { name, icon }]) => {
              const categoryChannels = channelsByCategory[key];
              const availableInCategory = categoryChannels.filter(ch => channelStatuses[ch.id]?.status === 'available').length;
              
              return (
                <button
                  key={key}
                  onClick={() => { setSelectedCategory(key); setSearchQuery(''); }}
                  style={{
                    padding: '12px 14px',
                    background: selectedCategory === key ? 'rgba(120, 119, 198, 0.2)' : 'transparent',
                    border: selectedCategory === key ? '1px solid rgba(120, 119, 198, 0.3)' : '1px solid transparent',
                    borderRadius: '8px',
                    color: selectedCategory === key ? '#f8fafc' : '#94a3b8',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>{icon} {name}</span>
                  {availableInCategory > 0 && (
                    <span style={{ 
                      background: 'rgba(34, 197, 94, 0.2)', 
                      color: '#22c55e',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px'
                    }}>
                      {availableInCategory}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Area */}
        <div>
          {/* Video Player */}
          {selectedChannel && (
            <div style={{ 
              background: '#000',
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '24px',
              position: 'relative'
            }}>
              <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                <video
                  ref={videoRef}
                  muted={muted}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: '#000'
                  }}
                />
                {streamLoading && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#fff'
                  }}>
                    <Loader2 size={48} className="animate-spin" />
                  </div>
                )}
                {playerError && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#ef4444',
                    textAlign: 'center'
                  }}>
                    <AlertCircle size={48} style={{ marginBottom: '8px' }} />
                    <div>{playerError}</div>
                  </div>
                )}
              </div>
              {/* Player Controls */}
              <div style={{
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Tv size={20} color="#7877c6" />
                  <span style={{ fontWeight: '600' }}>{selectedChannel.name}</span>
                </div>
                <button
                  onClick={() => setMuted(!muted)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: '#fff'
                  }}
                >
                  {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              </div>
            </div>
          )}

          {/* Channel Grid */}
          <div style={{ 
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px'
          }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
              {searchQuery ? `Search Results` : CHANNEL_CATEGORIES[selectedCategory].icon + ' ' + CHANNEL_CATEGORIES[selectedCategory].name}
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
              gap: '12px' 
            }}>
              {filteredChannels.map(channel => {
                const status = channelStatuses[channel.id];
                const isAvailable = status?.status === 'available';
                const isSelected = selectedChannel?.id === channel.id;
                
                return (
                  <button
                    key={channel.id}
                    onClick={() => isAvailable && playChannel(channel)}
                    disabled={!isAvailable}
                    style={{
                      padding: '16px',
                      background: isSelected 
                        ? 'rgba(120, 119, 198, 0.3)' 
                        : isAvailable 
                          ? 'rgba(34, 197, 94, 0.1)' 
                          : 'rgba(0,0,0,0.2)',
                      border: isSelected 
                        ? '2px solid #7877c6' 
                        : isAvailable 
                          ? '1px solid rgba(34, 197, 94, 0.3)' 
                          : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      cursor: isAvailable ? 'pointer' : 'not-allowed',
                      opacity: isAvailable ? 1 : 0.5,
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ 
                      fontSize: '24px', 
                      marginBottom: '8px',
                      filter: isAvailable ? 'none' : 'grayscale(1)'
                    }}>
                      <Tv size={32} color={isAvailable ? '#22c55e' : '#64748b'} />
                    </div>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '14px',
                      color: isAvailable ? '#f8fafc' : '#64748b',
                      marginBottom: '4px'
                    }}>
                      {channel.shortName}
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#64748b' 
                    }}>
                      {channel.name}
                    </div>
                    {isAvailable && (
                      <div style={{
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}>
                        <Play size={12} color="#22c55e" />
                        <span style={{ fontSize: '10px', color: '#22c55e' }}>Available</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
