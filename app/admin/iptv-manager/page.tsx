'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Database, 
  Plus, 
  Trash2, 
  Upload, 
  Link2, 
  CheckCircle, 
  XCircle,
  Loader2,
  Zap
} from 'lucide-react';

interface IPTVAccount {
  id: string;
  portal_url: string;
  mac_address: string;
  name?: string;
  channels_count: number;
  stream_limit: number;
  active_streams: number;
  status: 'active' | 'inactive' | 'error';
  last_tested?: number;
  priority: number;
  last_error?: string;
}

interface ChannelMapping {
  id: string;
  our_channel_id: string;
  our_channel_name: string;
  stalker_account_id: string;
  stalker_channel_id: string;
  stalker_channel_name: string;
  stalker_channel_cmd: string;
  priority: number;
  is_active: boolean;
  success_count: number;
  failure_count: number;
  portal_url?: string;
  account_name?: string;
}

interface OurChannel {
  id: string;
  name: string;
  category: string;
}


export default function IPTVManagerPage() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'mappings'>('accounts');
  const [accounts, setAccounts] = useState<IPTVAccount[]>([]);
  const [mappings, setMappings] = useState<ChannelMapping[]>([]);
  const [ourChannels, setOurChannels] = useState<OurChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Account form state
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ portal_url: '', mac_address: '', name: '', stream_limit: 1, priority: 0 });
  
  // Mapping form state
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<IPTVAccount | null>(null);
  const [stalkerChannels, setStalkerChannels] = useState<any[]>([]);
  const [loadingStalkerChannels, setLoadingStalkerChannels] = useState(false);
  const [channelSearch, setChannelSearch] = useState('');
  const [ourChannelSearch, setOurChannelSearch] = useState('');
  const [selectedOurChannel, setSelectedOurChannel] = useState<OurChannel | null>(null);
  const [selectedStalkerChannel, setSelectedStalkerChannel] = useState<any | null>(null);
  const [autoMatching, setAutoMatching] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/iptv-accounts');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Fetch mappings
  const fetchMappings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/channel-mappings');
      const data = await res.json();
      if (data.success) {
        setMappings(data.mappings);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Fetch our channels (from DLHD data)
  const fetchOurChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/livetv/channels?limit=1000');
      const data = await res.json();
      if (data.success) {
        setOurChannels(data.channels.map((ch: any) => ({
          id: ch.streamId,
          name: ch.name,
          category: ch.category
        })));
      }
    } catch (err: any) {
      console.error('Failed to fetch our channels:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchAccounts(), fetchMappings(), fetchOurChannels()])
      .finally(() => setLoading(false));
  }, [fetchAccounts, fetchMappings, fetchOurChannels]);


  // Add account
  const handleAddAccount = async () => {
    if (!newAccount.portal_url || !newAccount.mac_address) return;
    
    try {
      const res = await fetch('/api/admin/iptv-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newAccount })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddAccount(false);
        setNewAccount({ portal_url: '', mac_address: '', name: '', stream_limit: 1, priority: 0 });
        fetchAccounts();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Delete account
  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Delete this account? All mappings will also be deleted.')) return;
    
    try {
      await fetch('/api/admin/iptv-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      fetchAccounts();
      fetchMappings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Test account
  const handleTestAccount = async (account: IPTVAccount) => {
    try {
      const res = await fetch('/api/admin/iptv-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'test', 
          id: account.id,
          portal_url: account.portal_url, 
          mac_address: account.mac_address 
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Connection successful! ${data.channels} channels available.`);
      } else {
        alert(`Connection failed: ${data.error}`);
      }
      fetchAccounts();
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    }
  };

  // Import accounts from JSON
  const handleImportAccounts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const accountsToImport = (data.accounts || data)
          .filter((acc: any) => acc.success && (acc.content?.itv || 0) > 0)
          .map((acc: any) => ({
            portal_url: acc.portal,
            mac_address: acc.mac,
            channels_count: acc.content?.itv || 0,
            stream_limit: 1,
            priority: 0
          }));

        if (accountsToImport.length === 0) {
          alert('No valid accounts found in file');
          return;
        }

        const res = await fetch('/api/admin/iptv-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import', accounts: accountsToImport })
        });
        const result = await res.json();
        alert(`Imported ${result.imported} accounts`);
        fetchAccounts();
      } catch (err) {
        alert('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  // Load Stalker channels for mapping - loads ALL channels with pagination
  const loadStalkerChannels = async (account: IPTVAccount) => {
    setSelectedAccount(account);
    setLoadingStalkerChannels(true);
    setStalkerChannels([]);
    
    try {
      // First, test connection to get token
      const testRes = await fetch('/api/admin/iptv-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'test', 
          portalUrl: account.portal_url, 
          macAddress: account.mac_address 
        })
      });
      const testData = await testRes.json();
      
      if (!testData.success || !testData.token) {
        alert(`Failed to connect: ${testData.error}`);
        setLoadingStalkerChannels(false);
        return;
      }
      
      // Load ALL channels with pagination
      let allChannels: any[] = [];
      let page = 0;
      let hasMore = true;
      const pageSize = 100; // Request more per page
      
      while (hasMore) {
        const channelsRes = await fetch('/api/admin/iptv-debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'channels', 
            portalUrl: account.portal_url, 
            macAddress: account.mac_address,
            token: testData.token,
            genre: '*',
            page: page,
            pageSize: pageSize
          })
        });
        const channelsData = await channelsRes.json();
        
        if (channelsData.success && channelsData.channels?.data) {
          const pageChannels = channelsData.channels.data;
          allChannels = [...allChannels, ...pageChannels];
          
          // Check if there are more pages
          const totalItems = parseInt(channelsData.channels.total_items || '0');
          hasMore = allChannels.length < totalItems && pageChannels.length > 0;
          page++;
          
          // Update UI with progress
          setStalkerChannels([...allChannels]);
          
          // Small delay to avoid overwhelming the portal
          if (hasMore) await new Promise(r => setTimeout(r, 200));
        } else {
          hasMore = false;
        }
      }
      
      console.log(`Loaded ${allChannels.length} total channels from portal`);
    } catch (err: any) {
      alert(`Failed to load channels: ${err.message}`);
    } finally {
      setLoadingStalkerChannels(false);
    }
  };

  // Create mapping
  const createMapping = async (ourChannel: OurChannel, stalkerChannel: any, silent = false) => {
    if (!selectedAccount) return false;
    
    try {
      const res = await fetch('/api/admin/channel-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          our_channel_id: ourChannel.id,
          our_channel_name: ourChannel.name,
          stalker_account_id: selectedAccount.id,
          stalker_channel_id: stalkerChannel.id,
          stalker_channel_name: stalkerChannel.name,
          stalker_channel_cmd: stalkerChannel.cmd,
          priority: 0
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchMappings();
        if (!silent) {
          setSelectedOurChannel(null);
          setSelectedStalkerChannel(null);
        }
        return true;
      } else {
        if (!silent) alert(`Failed: ${data.error}`);
        return false;
      }
    } catch (err: any) {
      if (!silent) alert(`Error: ${err.message}`);
      return false;
    }
  };

  // Fuzzy match score - higher is better
  const fuzzyMatchScore = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (s1 === s2) return 100;
    if (s1.includes(s2) || s2.includes(s1)) return 80;
    
    // Check word overlap
    const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
    
    return (commonWords.length / Math.max(words1.length, words2.length)) * 60;
  };

  // Find best match for a channel
  const findBestMatch = (ourChannel: OurChannel): any | null => {
    if (stalkerChannels.length === 0) return null;
    
    let bestMatch: any = null;
    let bestScore = 0;
    
    for (const stalkerCh of stalkerChannels) {
      const score = fuzzyMatchScore(ourChannel.name, stalkerCh.name || '');
      if (score > bestScore && score >= 40) {
        bestScore = score;
        bestMatch = stalkerCh;
      }
    }
    
    return bestMatch;
  };

  // Auto-match all channels
  const autoMatchChannels = async () => {
    if (!selectedAccount || stalkerChannels.length === 0) return;
    
    setAutoMatching(true);
    let matched = 0;
    const unmappedChannels = ourChannels.filter(ch => 
      !mappings.some(m => m.our_channel_id === ch.id)
    );
    
    for (const ourCh of unmappedChannels) {
      const match = findBestMatch(ourCh);
      if (match) {
        const success = await createMapping(ourCh, match, true);
        if (success) matched++;
        // Small delay to avoid overwhelming the API
        await new Promise(r => setTimeout(r, 100));
      }
    }
    
    setAutoMatching(false);
    alert(`Auto-matched ${matched} channels`);
    fetchMappings();
  };

  // Get suggested matches for selected channel
  const getSuggestedMatches = (): any[] => {
    if (!selectedOurChannel || stalkerChannels.length === 0) return [];
    
    return stalkerChannels
      .map(ch => ({ ...ch, score: fuzzyMatchScore(selectedOurChannel.name, ch.name || '') }))
      .filter(ch => ch.score >= 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  };

  // Delete mapping
  const handleDeleteMapping = async (id: string) => {
    try {
      await fetch('/api/admin/channel-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      fetchMappings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter channels
  const filteredStalkerChannels = stalkerChannels.filter(ch => 
    ch.name?.toLowerCase().includes(channelSearch.toLowerCase())
  );
  
  const filteredOurChannels = ourChannels.filter(ch =>
    ch.name?.toLowerCase().includes(ourChannelSearch.toLowerCase())
  );


  const styles = {
    container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
    header: { marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { color: '#f8fafc', fontSize: '24px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 },
    tabs: { display: 'flex', gap: '8px', marginBottom: '24px' },
    tab: (active: boolean) => ({
      padding: '10px 20px',
      background: active ? 'linear-gradient(135deg, #7877c6 0%, #9333ea 100%)' : 'rgba(30, 41, 59, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: active ? '600' : '400'
    }),
    card: {
      background: 'rgba(30, 41, 59, 0.5)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    btn: (variant: 'primary' | 'secondary' | 'danger' = 'secondary') => ({
      padding: '8px 16px',
      background: variant === 'primary' ? 'linear-gradient(135deg, #7877c6 0%, #9333ea 100%)' 
        : variant === 'danger' ? 'rgba(239, 68, 68, 0.2)' 
        : 'rgba(255, 255, 255, 0.1)',
      border: variant === 'danger' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      color: variant === 'danger' ? '#ef4444' : '#fff',
      cursor: 'pointer',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }),
    input: {
      width: '100%',
      padding: '10px 14px',
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      color: '#f8fafc',
      fontSize: '14px',
      outline: 'none'
    },
    label: { display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
    accountCard: {
      background: 'rgba(15, 23, 42, 0.4)',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid rgba(255, 255, 255, 0.05)'
    },
    status: (status: string) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      background: status === 'active' ? 'rgba(34, 197, 94, 0.2)' : status === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(156, 163, 175, 0.2)',
      color: status === 'active' ? '#22c55e' : status === 'error' ? '#ef4444' : '#9ca3af'
    }),
    mappingRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'rgba(15, 23, 42, 0.4)',
      borderRadius: '8px',
      marginBottom: '8px',
      border: '1px solid rgba(255, 255, 255, 0.05)'
    },
    splitView: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
    channelList: { maxHeight: '400px', overflowY: 'auto' as const, paddingRight: '8px' },
    channelItem: {
      padding: '10px 14px',
      background: 'rgba(15, 23, 42, 0.4)',
      borderRadius: '8px',
      marginBottom: '6px',
      cursor: 'pointer',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'all 0.2s'
    }
  };


  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} color="#7877c6" />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Database size={28} />
          IPTV Account Manager
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportAccounts} style={{ display: 'none' }} />
          <button style={styles.btn('secondary')} onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import JSON
          </button>
          <button style={styles.btn('primary')} onClick={() => setShowAddAccount(true)}>
            <Plus size={16} /> Add Account
          </button>
        </div>
      </div>

      {error && (
        <div style={{ ...styles.card, background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <p style={{ color: '#ef4444', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={styles.tab(activeTab === 'accounts')} onClick={() => setActiveTab('accounts')}>
          <Database size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Accounts ({accounts.length})
        </button>
        <button style={styles.tab(activeTab === 'mappings')} onClick={() => setActiveTab('mappings')}>
          <Link2 size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Channel Mappings ({mappings.length})
        </button>
      </div>

      {/* Add Account Modal */}
      {showAddAccount && (
        <div style={styles.card}>
          <h3 style={{ color: '#f8fafc', margin: '0 0 16px 0' }}>Add New Account</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={styles.label}>Portal URL</label>
              <input 
                style={styles.input} 
                placeholder="http://example.com/c"
                value={newAccount.portal_url}
                onChange={e => setNewAccount({ ...newAccount, portal_url: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>MAC Address</label>
              <input 
                style={styles.input} 
                placeholder="00:1A:79:XX:XX:XX"
                value={newAccount.mac_address}
                onChange={e => setNewAccount({ ...newAccount, mac_address: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Name (optional)</label>
              <input 
                style={styles.input} 
                placeholder="My IPTV Account"
                value={newAccount.name}
                onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Stream Limit</label>
              <input 
                style={styles.input} 
                type="number"
                min="1"
                value={newAccount.stream_limit}
                onChange={e => setNewAccount({ ...newAccount, stream_limit: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button style={styles.btn('primary')} onClick={handleAddAccount}>Add Account</button>
            <button style={styles.btn('secondary')} onClick={() => setShowAddAccount(false)}>Cancel</button>
          </div>
        </div>
      )}


      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div style={styles.grid}>
          {accounts.map(account => (
            <div key={account.id} style={styles.accountCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ color: '#f8fafc', margin: '0 0 4px 0', fontSize: '14px' }}>
                    {account.name || new URL(account.portal_url).hostname}
                  </h4>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '12px' }}>{account.mac_address}</p>
                </div>
                <span style={styles.status(account.status)}>
                  {account.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {account.status}
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px' }}>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '11px' }}>Channels</p>
                  <p style={{ color: '#f8fafc', margin: 0, fontSize: '16px', fontWeight: '600' }}>{account.channels_count}</p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px' }}>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '11px' }}>Stream Limit</p>
                  <p style={{ color: '#f8fafc', margin: 0, fontSize: '16px', fontWeight: '600' }}>{account.stream_limit}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button style={styles.btn('secondary')} onClick={() => handleTestAccount(account)}>
                  <Zap size={14} /> Test
                </button>
                <button style={styles.btn('secondary')} onClick={() => { setShowAddMapping(true); loadStalkerChannels(account); }}>
                  <Link2 size={14} /> Map Channels
                </button>
                <button style={styles.btn('danger')} onClick={() => handleDeleteAccount(account.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          
          {accounts.length === 0 && (
            <div style={{ ...styles.card, textAlign: 'center', gridColumn: '1 / -1' }}>
              <p style={{ color: '#64748b', margin: 0 }}>No accounts yet. Add one or import from JSON.</p>
            </div>
          )}
        </div>
      )}


      {/* Mappings Tab */}
      {activeTab === 'mappings' && (
        <div>
          {mappings.length === 0 ? (
            <div style={{ ...styles.card, textAlign: 'center' }}>
              <p style={{ color: '#64748b', margin: 0 }}>No channel mappings yet. Select an account and map channels.</p>
            </div>
          ) : (
            mappings.map(mapping => (
              <div key={mapping.id} style={styles.mappingRow}>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#f8fafc', fontWeight: '500' }}>{mapping.our_channel_name}</span>
                  <span style={{ color: '#64748b', margin: '0 8px' }}>→</span>
                  <span style={{ color: '#7877c6' }}>{mapping.stalker_channel_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>
                    {mapping.account_name || mapping.portal_url?.split('/')[2]}
                  </span>
                  <span style={{ color: '#22c55e', fontSize: '12px' }}>✓ {mapping.success_count}</span>
                  <span style={{ color: '#ef4444', fontSize: '12px' }}>✗ {mapping.failure_count}</span>
                  <button style={styles.btn('danger')} onClick={() => handleDeleteMapping(mapping.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Channel Mapping Modal */}
      {showAddMapping && selectedAccount && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{ ...styles.card, width: '100%', maxWidth: '1400px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#f8fafc', margin: 0 }}>
                Map Channels - {selectedAccount.name || new URL(selectedAccount.portal_url).hostname}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  style={styles.btn('primary')} 
                  onClick={autoMatchChannels}
                  disabled={autoMatching || stalkerChannels.length === 0}
                >
                  {autoMatching ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                  {autoMatching ? 'Matching...' : 'Auto-Match All'}
                </button>
                <button style={styles.btn('secondary')} onClick={() => { 
                  setShowAddMapping(false); 
                  setSelectedAccount(null); 
                  setStalkerChannels([]); 
                  setSelectedOurChannel(null);
                  setSelectedStalkerChannel(null);
                }}>
                  Close
                </button>
              </div>
            </div>

            {/* Selected channels bar */}
            {(selectedOurChannel || selectedStalkerChannel) && (
              <div style={{ 
                background: 'rgba(120, 119, 198, 0.1)', 
                border: '1px solid rgba(120, 119, 198, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 4px 0' }}>Our Channel</p>
                    <p style={{ color: '#f8fafc', margin: 0, fontWeight: '500' }}>
                      {selectedOurChannel?.name || '(Select a channel)'}
                    </p>
                  </div>
                  <span style={{ color: '#7877c6', fontSize: '24px' }}>→</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 4px 0' }}>Stalker Channel</p>
                    <p style={{ color: '#7877c6', margin: 0, fontWeight: '500' }}>
                      {selectedStalkerChannel?.name || '(Select a channel)'}
                    </p>
                  </div>
                </div>
                <button 
                  style={{ ...styles.btn('primary'), opacity: (selectedOurChannel && selectedStalkerChannel) ? 1 : 0.5 }}
                  disabled={!selectedOurChannel || !selectedStalkerChannel}
                  onClick={() => {
                    if (selectedOurChannel && selectedStalkerChannel) {
                      createMapping(selectedOurChannel, selectedStalkerChannel);
                    }
                  }}
                >
                  <Link2 size={14} /> Create Mapping
                </button>
              </div>
            )}
            
            {loadingStalkerChannels ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} color="#7877c6" />
                <p style={{ color: '#64748b', marginTop: '12px' }}>Loading channels from portal...</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                {/* Our Channels */}
                <div>
                  <h4 style={{ color: '#f8fafc', margin: '0 0 12px 0' }}>Our Channels ({filteredOurChannels.length})</h4>
                  <div style={{ marginBottom: '12px' }}>
                    <input 
                      style={styles.input}
                      placeholder="Search our channels..."
                      value={ourChannelSearch}
                      onChange={e => setOurChannelSearch(e.target.value)}
                    />
                  </div>
                  <div style={styles.channelList}>
                    {filteredOurChannels.slice(0, 100).map(ch => {
                      const isMapped = mappings.some(m => m.our_channel_id === ch.id);
                      const isSelected = selectedOurChannel?.id === ch.id;
                      return (
                        <div 
                          key={ch.id} 
                          style={{
                            ...styles.channelItem,
                            background: isSelected ? 'rgba(120, 119, 198, 0.3)' : isMapped ? 'rgba(34, 197, 94, 0.1)' : styles.channelItem.background,
                            borderColor: isSelected ? 'rgba(120, 119, 198, 0.5)' : isMapped ? 'rgba(34, 197, 94, 0.3)' : styles.channelItem.border,
                          }}
                          onClick={() => setSelectedOurChannel(ch)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ color: '#f8fafc', fontSize: '13px' }}>{ch.name}</span>
                              <span style={{ color: '#64748b', fontSize: '11px', marginLeft: '8px' }}>{ch.category}</span>
                            </div>
                            {isMapped && <CheckCircle size={14} color="#22c55e" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Suggested Matches */}
                <div>
                  <h4 style={{ color: '#f8fafc', margin: '0 0 12px 0' }}>
                    {selectedOurChannel ? `Suggestions for "${selectedOurChannel.name}"` : 'Suggestions'}
                  </h4>
                  <div style={{ ...styles.channelList, background: 'rgba(120, 119, 198, 0.05)', borderRadius: '8px', padding: '12px' }}>
                    {selectedOurChannel ? (
                      getSuggestedMatches().length > 0 ? (
                        getSuggestedMatches().map((ch, idx) => (
                          <div 
                            key={`${ch.id}-${idx}`}
                            style={{
                              ...styles.channelItem,
                              background: selectedStalkerChannel?.id === ch.id ? 'rgba(120, 119, 198, 0.3)' : styles.channelItem.background,
                              borderColor: selectedStalkerChannel?.id === ch.id ? 'rgba(120, 119, 198, 0.5)' : styles.channelItem.border,
                            }}
                            onClick={() => setSelectedStalkerChannel(ch)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: '#7877c6', fontSize: '13px' }}>{ch.name}</span>
                              <span style={{ 
                                color: ch.score >= 60 ? '#22c55e' : ch.score >= 40 ? '#fbbf24' : '#94a3b8',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                {Math.round(ch.score)}%
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No matches found</p>
                      )
                    ) : (
                      <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Select a channel to see suggestions</p>
                    )}
                  </div>
                </div>
                
                {/* Stalker Channels */}
                <div>
                  <h4 style={{ color: '#f8fafc', margin: '0 0 12px 0' }}>All Stalker Channels ({filteredStalkerChannels.length})</h4>
                  <div style={{ marginBottom: '12px' }}>
                    <input 
                      style={styles.input}
                      placeholder="Search stalker channels..."
                      value={channelSearch}
                      onChange={e => setChannelSearch(e.target.value)}
                    />
                  </div>
                  <div style={styles.channelList}>
                    {filteredStalkerChannels.slice(0, 100).map(ch => (
                      <div 
                        key={ch.id} 
                        style={{
                          ...styles.channelItem,
                          background: selectedStalkerChannel?.id === ch.id ? 'rgba(120, 119, 198, 0.3)' : styles.channelItem.background,
                          borderColor: selectedStalkerChannel?.id === ch.id ? 'rgba(120, 119, 198, 0.5)' : styles.channelItem.border,
                        }}
                        onClick={() => setSelectedStalkerChannel(ch)}
                      >
                        <span style={{ color: '#7877c6', fontSize: '13px' }}>{ch.name}</span>
                        <span style={{ color: '#64748b', fontSize: '11px', marginLeft: '8px' }}>#{ch.number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
