'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Database, 
  Plus, 
  Trash2, 
  Upload, 
  Link2, 
  CheckCircle, 
  XCircle,
  Loader2,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Search,
  RefreshCw,
  Activity,
  Tv,
  Radio,
  Signal,
  SignalHigh,
  SignalLow,
  SignalZero,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// ============ INTERFACES ============

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
  country: string;
  streamId: string;
  firstLetter: string;
  isHD: boolean;
  categoryInfo: { name: string; icon: string };
  countryInfo: { name: string; flag: string };
}

interface ChannelWithStatus extends OurChannel {
  status: 'online' | 'offline' | 'unknown';
  isEnabled: boolean;
  mappingCount: number;
  successRate: number;
  lastChecked?: number;
  healthScore: number;
}

interface ChannelFilters {
  categories: { id: string; name: string; icon: string; count: number }[];
  countries: { id: string; name: string; flag: string; count: number }[];
  letters: string[];
}

// ============ MAIN COMPONENT ============

export default function IPTVManagerPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'channels' | 'accounts' | 'mappings'>('channels');
  
  // Channel state
  const [channels, setChannels] = useState<ChannelWithStatus[]>([]);
  const [channelFilters, setChannelFilters] = useState<ChannelFilters>({ categories: [], countries: [], letters: [] });
  const [channelSearch, setChannelSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [channelStatusFilter, setChannelStatusFilter] = useState<'all' | 'online' | 'offline' | 'enabled' | 'disabled'>('all');
  
  // Account state
  const [accounts, setAccounts] = useState<IPTVAccount[]>([]);
  const [mappings, setMappings] = useState<ChannelMapping[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshingChannels, setRefreshingChannels] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Account form state
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ portal_url: '', mac_address: '', name: '', stream_limit: 1, priority: 0 });
  
  // Mapping form state
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<IPTVAccount | null>(null);
  const [stalkerChannels, setStalkerChannels] = useState<any[]>([]);
  const [loadingStalkerChannels, _setLoadingStalkerChannels] = useState(false);
  const [stalkerChannelSearch, setStalkerChannelSearch] = useState('');
  const [ourChannelSearch, setOurChannelSearch] = useState('');
  const [selectedOurChannel, setSelectedOurChannel] = useState<OurChannel | null>(null);
  const [selectedStalkerChannel, setSelectedStalkerChannel] = useState<any | null>(null);
  const [autoMatching, setAutoMatching] = useState(false);
  const [autoMappingAll, setAutoMappingAll] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Progress state for mapping
  const [mappingProgress, setMappingProgress] = useState<string | null>(null);
  
  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<{
    accountId: string;
    mac: string;
    status: 'checking' | 'valid' | 'invalid' | 'error';
    error?: string;
    channelsTested?: number;
  }[]>([]);

  // Channel health check state
  const [healthCheckProgress, setHealthCheckProgress] = useState<string | null>(null);

  // ============ DATA FETCHING ============

  // Fetch channels with status
  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/livetv/channels?limit=1000');
      const data = await res.json();
      
      if (data.success) {
        // Get mappings to determine channel status
        const mappingsRes = await fetch('/api/admin/channel-mappings');
        const mappingsData = await mappingsRes.json();
        const channelMappings = mappingsData.success ? mappingsData.mappings : [];
        
        // Create a map of channel ID to mapping info
        const mappingsByChannel = new Map<string, ChannelMapping[]>();
        channelMappings.forEach((m: ChannelMapping) => {
          const existing = mappingsByChannel.get(m.our_channel_id) || [];
          existing.push(m);
          mappingsByChannel.set(m.our_channel_id, existing);
        });
        
        // Enhance channels with status info
        const enhancedChannels: ChannelWithStatus[] = data.channels.map((ch: OurChannel) => {
          const chMappings = mappingsByChannel.get(ch.streamId) || [];
          const totalSuccess = chMappings.reduce((sum, m) => sum + (m.success_count || 0), 0);
          const totalFailure = chMappings.reduce((sum, m) => sum + (m.failure_count || 0), 0);
          const totalAttempts = totalSuccess + totalFailure;
          const successRate = totalAttempts > 0 ? (totalSuccess / totalAttempts) * 100 : 0;
          const hasActiveMappings = chMappings.some(m => m.is_active);
          
          // Determine status based on mappings and success rate
          let status: 'online' | 'offline' | 'unknown' = 'unknown';
          if (chMappings.length > 0) {
            if (successRate >= 50) {
              status = 'online';
            } else if (totalAttempts > 0) {
              status = 'offline';
            }
          }
          
          // Calculate health score (0-100)
          let healthScore = 0;
          if (chMappings.length > 0) {
            healthScore = Math.min(100, Math.round(
              (successRate * 0.6) + 
              (Math.min(chMappings.length, 5) * 8) // More mappings = better redundancy
            ));
          }
          
          return {
            ...ch,
            status,
            isEnabled: hasActiveMappings,
            mappingCount: chMappings.length,
            successRate,
            healthScore,
            lastChecked: chMappings.length > 0 ? Date.now() : undefined
          };
        });
        
        setChannels(enhancedChannels);
        setChannelFilters(data.filters);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

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

  // Initial data load
  useEffect(() => {
    Promise.all([fetchChannels(), fetchAccounts(), fetchMappings()])
      .finally(() => setLoading(false));
  }, [fetchChannels, fetchAccounts, fetchMappings]);

  // ============ CHANNEL ACTIONS ============

  // Toggle channel enabled/disabled
  const handleToggleChannel = async (channel: ChannelWithStatus) => {
    try {
      // Get all mappings for this channel
      const channelMappings = mappings.filter(m => m.our_channel_id === channel.streamId);
      
      if (channelMappings.length === 0) {
        alert('No mappings found for this channel. Add mappings first.');
        return;
      }
      
      const newStatus = !channel.isEnabled;
      
      // Update all mappings for this channel
      for (const mapping of channelMappings) {
        await fetch('/api/admin/channel-mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            id: mapping.id,
            is_active: newStatus
          })
        });
      }
      
      // Refresh data
      await fetchChannels();
      await fetchMappings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Refresh single channel status
  const handleRefreshChannel = async (channel: ChannelWithStatus) => {
    try {
      setRefreshingChannels(true);
      
      // Get mappings for this channel
      const channelMappings = mappings.filter(m => m.our_channel_id === channel.streamId);
      
      if (channelMappings.length === 0) {
        alert('No mappings found for this channel.');
        setRefreshingChannels(false);
        return;
      }
      
      // Test the first active mapping
      const activeMapping = channelMappings.find(m => m.is_active) || channelMappings[0];
      const account = accounts.find(a => a.id === activeMapping.stalker_account_id);
      
      if (!account) {
        alert('Account not found for this mapping.');
        setRefreshingChannels(false);
        return;
      }
      
      // Test the stream
      const res = await fetch('/api/admin/iptv-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-channel',
          portalUrl: account.portal_url,
          macAddress: account.mac_address,
          channelCmd: activeMapping.stalker_channel_cmd
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`Channel "${channel.name}" is working!`);
      } else {
        alert(`Channel "${channel.name}" test failed: ${data.error || 'Unknown error'}`);
      }
      
      await fetchChannels();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshingChannels(false);
    }
  };

  // Bulk health check
  const handleBulkHealthCheck = async () => {
    setCheckingHealth(true);
    setHealthCheckProgress('Starting health check...');
    
    try {
      const channelsWithMappings = channels.filter(ch => ch.mappingCount > 0);
      let checked = 0;
      let online = 0;
      let offline = 0;
      
      for (const channel of channelsWithMappings.slice(0, 20)) { // Limit to 20 for performance
        setHealthCheckProgress(`Checking ${checked + 1}/${Math.min(channelsWithMappings.length, 20)}: ${channel.name}`);
        
        const channelMappings = mappings.filter(m => m.our_channel_id === channel.streamId);
        const activeMapping = channelMappings.find(m => m.is_active) || channelMappings[0];
        const account = accounts.find(a => a.id === activeMapping?.stalker_account_id);
        
        if (account && activeMapping) {
          try {
            const res = await fetch('/api/admin/iptv-debug', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'test-channel',
                portalUrl: account.portal_url,
                macAddress: account.mac_address,
                channelCmd: activeMapping.stalker_channel_cmd
              })
            });
            
            const data = await res.json();
            if (data.success) {
              online++;
            } else {
              offline++;
            }
          } catch {
            offline++;
          }
        }
        
        checked++;
      }
      
      setHealthCheckProgress(null);
      alert(`Health check complete!\n\n✓ Online: ${online}\n✗ Offline: ${offline}\n\nChecked ${checked} channels.`);
      await fetchChannels();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckingHealth(false);
      setHealthCheckProgress(null);
    }
  };

  // ============ FILTERED CHANNELS ============

  const filteredChannels = useMemo(() => {
    let result = channels;
    
    // Filter by search
    if (channelSearch) {
      const searchLower = channelSearch.toLowerCase();
      result = result.filter(ch => 
        ch.name.toLowerCase().includes(searchLower) ||
        ch.streamId.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(ch => ch.category === selectedCategory);
    }
    
    // Filter by country
    if (selectedCountry !== 'all') {
      result = result.filter(ch => ch.country === selectedCountry);
    }
    
    // Filter by status
    if (channelStatusFilter !== 'all') {
      switch (channelStatusFilter) {
        case 'online':
          result = result.filter(ch => ch.status === 'online');
          break;
        case 'offline':
          result = result.filter(ch => ch.status === 'offline');
          break;
        case 'enabled':
          result = result.filter(ch => ch.isEnabled);
          break;
        case 'disabled':
          result = result.filter(ch => !ch.isEnabled);
          break;
      }
    }
    
    return result;
  }, [channels, channelSearch, selectedCategory, selectedCountry, channelStatusFilter]);

  // ============ CHANNEL STATS ============

  const channelStats = useMemo(() => {
    const total = channels.length;
    const online = channels.filter(ch => ch.status === 'online').length;
    const offline = channels.filter(ch => ch.status === 'offline').length;
    const enabled = channels.filter(ch => ch.isEnabled).length;
    const mapped = channels.filter(ch => ch.mappingCount > 0).length;
    const avgHealth = channels.length > 0 
      ? Math.round(channels.reduce((sum, ch) => sum + ch.healthScore, 0) / channels.length)
      : 0;
    
    return { total, online, offline, enabled, mapped, avgHealth };
  }, [channels]);


  // ============ ACCOUNT FUNCTIONS ============

  // Auto-map ALL channels for ALL accounts
  const handleAutoMapAllAccountsChannels = async () => {
    if (accounts.length === 0) {
      alert('No accounts to map. Import accounts first.');
      return;
    }
    
    if (!confirm(`This will create channel mappings for ALL ${accounts.length} accounts.\n\nProcesses one account at a time (102 channels each).\n\nContinue?`)) {
      return;
    }
    
    setAutoMappingAll(true);
    setMappingProgress(`Starting... 0/${accounts.length} accounts`);
    
    let totalMapped = 0;
    let totalSkipped = 0;
    let accountsProcessed = 0;
    
    try {
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        setMappingProgress(`Mapping account ${i + 1}/${accounts.length}: ${account.name || account.mac_address.substring(0, 14)}...`);
        
        const res = await fetch('/api/admin/channel-mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'auto-map-all',
            stalker_account_id: account.id,
          })
        });
        
        const result = await res.json();
        
        if (result.success) {
          totalMapped += result.mapped;
          totalSkipped += result.skipped;
          accountsProcessed++;
          
          await fetchMappings();
        }
        
        setMappingProgress(`Completed ${i + 1}/${accounts.length} accounts (${totalMapped} mappings created)`);
      }
      
      setMappingProgress(null);
      alert(`✓ Auto-mapping complete!\n\nAccounts processed: ${accountsProcessed}/${accounts.length}\nTotal mappings created: ${totalMapped}\nSkipped: ${totalSkipped}`);
      await fetchChannels();
    } catch (err: any) {
      setMappingProgress(null);
      alert(`Error: ${err.message}`);
    } finally {
      setAutoMappingAll(false);
      setMappingProgress(null);
    }
  };

  // Helper to fetch with timeout
  const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
      }
      throw err;
    }
  };

  // Verify a single account
  const verifyAccount = async (account: IPTVAccount): Promise<typeof verifyResults[0]> => {
    const maskedMac = account.mac_address.substring(0, 11) + '**:**:**';
    
    try {
      const testRes = await fetchWithTimeout('/api/admin/iptv-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'test', 
          portalUrl: account.portal_url, 
          macAddress: account.mac_address 
        })
      }, 8000);
      const testData = await testRes.json();
      
      if (!testData.success || !testData.token) {
        return { accountId: account.id, mac: maskedMac, status: 'invalid', error: testData.error || 'Handshake failed' };
      }
      
      return { 
        accountId: account.id, 
        mac: maskedMac, 
        status: 'valid', 
        channelsTested: testData.content?.itv || 0
      };
      
    } catch (err: any) {
      return { accountId: account.id, mac: maskedMac, status: 'error', error: err.message };
    }
  };

  // Verify all accounts
  const handleVerifyAllAccounts = async () => {
    if (accounts.length === 0) {
      alert('No accounts to verify.');
      return;
    }
    
    setVerifying(true);
    setVerifyResults([]);
    setVerifyProgress(`Starting verification of ${accounts.length} accounts...`);
    
    const results: typeof verifyResults = accounts.map(acc => ({
      accountId: acc.id,
      mac: acc.mac_address.substring(0, 11) + '**:**:**',
      status: 'checking' as const,
    }));
    setVerifyResults([...results]);
    
    let valid = 0;
    let invalid = 0;
    let deleted = 0;
    let errors = 0;
    let completed = 0;
    
    const CONCURRENCY = 10;
    
    const processAccount = async (account: IPTVAccount, index: number) => {
      const result = await verifyAccount(account);
      results[index] = result;
      setVerifyResults([...results]);
      
      completed++;
      setVerifyProgress(`Verified ${completed}/${accounts.length} (${valid} valid, ${invalid} invalid)`);
      
      if (result.status === 'valid') {
        valid++;
      } else if (result.status === 'invalid') {
        invalid++;
        try {
          const deleteRes = await fetch('/api/admin/iptv-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id: account.id })
          });
          const deleteData = await deleteRes.json();
          if (deleteData.success) {
            deleted++;
            results[index] = { ...result, error: `${result.error} (DELETED)` };
            setVerifyResults([...results]);
          }
        } catch (err) {
          console.error('Failed to delete account:', account.id, err);
        }
      } else {
        errors++;
      }
    };
    
    for (let i = 0; i < accounts.length; i += CONCURRENCY) {
      const batch = accounts.slice(i, i + CONCURRENCY);
      const batchPromises = batch.map((account, batchIndex) => 
        processAccount(account, i + batchIndex)
      );
      await Promise.all(batchPromises);
    }
    
    await fetchAccounts();
    await fetchMappings();
    await fetchChannels();
    
    setVerifyProgress(null);
    setVerifying(false);
    
    alert(`Verification complete!\n\n✓ Valid: ${valid}\n✗ Invalid: ${invalid} (${deleted} removed)\n⚠ Errors: ${errors}`);
  };

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
      fetchChannels();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Delete ALL accounts
  const handleDeleteAllAccounts = async () => {
    if (!confirm(`Delete ALL ${accounts.length} accounts? This will also delete all channel mappings.`)) return;
    if (!confirm('Are you sure? This cannot be undone!')) return;
    
    try {
      await fetch('/api/admin/iptv-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteAll' })
      });
      fetchAccounts();
      fetchMappings();
      fetchChannels();
      alert('All accounts deleted');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Delete ALL mappings
  const handleDeleteAllMappings = async () => {
    if (!confirm(`Delete ALL ${mappings.length} channel mappings?`)) return;
    
    try {
      await fetch('/api/admin/channel-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteAll' })
      });
      fetchMappings();
      fetchChannels();
      alert('All mappings deleted');
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
        const rawAccounts = Array.isArray(data) ? data : (data.accounts || []);
        
        if (!Array.isArray(rawAccounts)) {
          alert('Invalid JSON format. Expected an array of accounts.');
          return;
        }

        const accountsToImport = rawAccounts
          .filter((acc: any) => {
            if (!acc.portal || !acc.mac) return false;
            if (acc.success === false) return false;
            return true;
          })
          .map((acc: any) => ({
            portal_url: acc.portal,
            mac_address: acc.mac,
            name: acc.profile?.name || acc.profile?.login || null,
            channels_count: acc.content?.itv || 0,
            stream_limit: acc.profile?.playback_limit || 1,
            priority: 0
          }));

        if (accountsToImport.length === 0) {
          const totalScanned = rawAccounts.length;
          alert(`No valid accounts found.\n\nScanned: ${totalScanned} accounts\n\nMake sure accounts have portal URL, MAC address, and success=true.`);
          return;
        }

        const skipped = rawAccounts.length - accountsToImport.length;
        
        const res = await fetch('/api/admin/iptv-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import', accounts: accountsToImport })
        });
        const result = await res.json();
        
        let message = `✓ Imported ${result.imported} accounts`;
        if (skipped > 0) {
          message += `\n(${skipped} skipped - failed or missing portal/mac)`;
        }
        alert(message);
        fetchAccounts();
      } catch (err) {
        console.error('Import error:', err);
        alert('Failed to parse JSON file. Check console for details.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          our_channel_id: ourChannel.streamId,
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
        fetchChannels();
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

  // Fuzzy match score
  const fuzzyMatchScore = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (s1 === s2) return 100;
    if (s1.includes(s2) || s2.includes(s1)) return 80;
    
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
    const unmappedChannels = channels.filter(ch => 
      !mappings.some(m => m.our_channel_id === ch.streamId)
    );
    
    for (const ourCh of unmappedChannels) {
      const match = findBestMatch(ourCh);
      if (match) {
        const success = await createMapping(ourCh, match, true);
        if (success) matched++;
        await new Promise(r => setTimeout(r, 100));
      }
    }
    
    setAutoMatching(false);
    alert(`Auto-matched ${matched} channels`);
    fetchMappings();
    fetchChannels();
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

  // Filter channels for mapping modal
  const filteredStalkerChannels = stalkerChannels.filter(ch => 
    ch.name?.toLowerCase().includes(stalkerChannelSearch.toLowerCase())
  );
  
  const filteredOurChannelsForMapping = channels.filter(ch =>
    ch.name?.toLowerCase().includes(ourChannelSearch.toLowerCase())
  );


  // ============ STYLES ============

  const styles = {
    container: { padding: '24px', maxWidth: '1600px', margin: '0 auto' },
    header: { marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '16px' },
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
      fontWeight: active ? '600' : '400',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }),
    card: {
      background: 'rgba(30, 41, 59, 0.5)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    btn: (variant: 'primary' | 'secondary' | 'danger' | 'success' = 'secondary') => ({
      padding: '8px 16px',
      background: variant === 'primary' ? 'linear-gradient(135deg, #7877c6 0%, #9333ea 100%)' 
        : variant === 'danger' ? 'rgba(239, 68, 68, 0.2)' 
        : variant === 'success' ? 'rgba(34, 197, 94, 0.2)'
        : 'rgba(255, 255, 255, 0.1)',
      border: variant === 'danger' ? '1px solid rgba(239, 68, 68, 0.3)' 
        : variant === 'success' ? '1px solid rgba(34, 197, 94, 0.3)'
        : '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      color: variant === 'danger' ? '#ef4444' : variant === 'success' ? '#22c55e' : '#fff',
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
      background: status === 'active' || status === 'online' ? 'rgba(34, 197, 94, 0.2)' 
        : status === 'error' || status === 'offline' ? 'rgba(239, 68, 68, 0.2)' 
        : 'rgba(156, 163, 175, 0.2)',
      color: status === 'active' || status === 'online' ? '#22c55e' 
        : status === 'error' || status === 'offline' ? '#ef4444' 
        : '#9ca3af'
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
    },
    statsCard: {
      background: 'rgba(15, 23, 42, 0.4)',
      borderRadius: '12px',
      padding: '16px',
      textAlign: 'center' as const,
      border: '1px solid rgba(255, 255, 255, 0.05)'
    },
    dropdown: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      maxHeight: '300px',
      overflowY: 'auto' as const,
      zIndex: 100,
      marginTop: '4px'
    },
    dropdownItem: {
      padding: '10px 14px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
    },
    healthBar: (_score: number) => ({
      width: '100%',
      height: '4px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '2px',
      overflow: 'hidden' as const,
      position: 'relative' as const
    }),
    healthFill: (score: number) => ({
      width: `${score}%`,
      height: '100%',
      background: score >= 70 ? '#22c55e' : score >= 40 ? '#fbbf24' : '#ef4444',
      borderRadius: '2px'
    })
  };

  // ============ RENDER ============

  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} color="#7877c6" />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Tv size={28} />
          IPTV Manager
        </h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportAccounts} style={{ display: 'none' }} />
          <button style={styles.btn('secondary')} onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import Accounts
          </button>
          <button style={styles.btn('primary')} onClick={() => setShowAddAccount(true)}>
            <Plus size={16} /> Add Account
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ ...styles.card, background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <p style={{ color: '#ef4444', margin: 0 }}>{error}</p>
          <button style={{ ...styles.btn('secondary'), marginTop: '8px' }} onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Progress Indicators */}
      {mappingProgress && (
        <div style={{ ...styles.card, background: 'rgba(120, 119, 198, 0.1)', borderColor: 'rgba(120, 119, 198, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} color="#7877c6" />
            <p style={{ color: '#a78bfa', margin: 0, fontWeight: '500' }}>{mappingProgress}</p>
          </div>
        </div>
      )}

      {verifyProgress && (
        <div style={{ ...styles.card, background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} color="#22c55e" />
            <p style={{ color: '#22c55e', margin: 0, fontWeight: '500' }}>{verifyProgress}</p>
          </div>
        </div>
      )}

      {healthCheckProgress && (
        <div style={{ ...styles.card, background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} color="#3b82f6" />
            <p style={{ color: '#3b82f6', margin: 0, fontWeight: '500' }}>{healthCheckProgress}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={styles.tab(activeTab === 'channels')} onClick={() => setActiveTab('channels')}>
          <Tv size={16} />
          Channels ({channels.length})
        </button>
        <button style={styles.tab(activeTab === 'accounts')} onClick={() => setActiveTab('accounts')}>
          <Database size={16} />
          Accounts ({accounts.length})
        </button>
        <button style={styles.tab(activeTab === 'mappings')} onClick={() => setActiveTab('mappings')}>
          <Link2 size={16} />
          Mappings ({mappings.length})
        </button>
      </div>

      {/* ============ CHANNELS TAB ============ */}
      {activeTab === 'channels' && (
        <div>
          {/* Channel Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={styles.statsCard}>
              <Tv size={24} color="#7877c6" style={{ marginBottom: '8px' }} />
              <p style={{ color: '#f8fafc', fontSize: '24px', fontWeight: '600', margin: 0 }}>{channelStats.total}</p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Total Channels</p>
            </div>
            <div style={styles.statsCard}>
              <Signal size={24} color="#22c55e" style={{ marginBottom: '8px' }} />
              <p style={{ color: '#22c55e', fontSize: '24px', fontWeight: '600', margin: 0 }}>{channelStats.online}</p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Online</p>
            </div>
            <div style={styles.statsCard}>
              <SignalZero size={24} color="#ef4444" style={{ marginBottom: '8px' }} />
              <p style={{ color: '#ef4444', fontSize: '24px', fontWeight: '600', margin: 0 }}>{channelStats.offline}</p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Offline</p>
            </div>
            <div style={styles.statsCard}>
              <Link2 size={24} color="#a78bfa" style={{ marginBottom: '8px' }} />
              <p style={{ color: '#a78bfa', fontSize: '24px', fontWeight: '600', margin: 0 }}>{channelStats.mapped}</p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Mapped</p>
            </div>
            <div style={styles.statsCard}>
              <Activity size={24} color="#fbbf24" style={{ marginBottom: '8px' }} />
              <p style={{ color: '#fbbf24', fontSize: '24px', fontWeight: '600', margin: 0 }}>{channelStats.avgHealth}%</p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Avg Health</p>
            </div>
          </div>

          {/* Channel Filters */}
          <div style={{ ...styles.card, marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {/* Search */}
              <div style={{ flex: '1', minWidth: '200px' }}>
                <label style={styles.label}>Search Channels</label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    style={{ ...styles.input, paddingLeft: '36px' }}
                    placeholder="Search by name or ID..."
                    value={channelSearch}
                    onChange={e => setChannelSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div style={{ minWidth: '180px', position: 'relative' }}>
                <label style={styles.label}>Category</label>
                <button
                  style={{ ...styles.input, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => { setShowCategoryDropdown(!showCategoryDropdown); setShowCountryDropdown(false); }}
                >
                  <span>{selectedCategory === 'all' ? 'All Categories' : channelFilters.categories.find(c => c.id === selectedCategory)?.name || selectedCategory}</span>
                  {showCategoryDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showCategoryDropdown && (
                  <div style={styles.dropdown}>
                    <div
                      style={{ ...styles.dropdownItem, background: selectedCategory === 'all' ? 'rgba(120, 119, 198, 0.2)' : 'transparent' }}
                      onClick={() => { setSelectedCategory('all'); setShowCategoryDropdown(false); }}
                    >
                      <span style={{ color: '#f8fafc' }}>All Categories</span>
                      <span style={{ color: '#64748b', fontSize: '12px' }}>{channels.length}</span>
                    </div>
                    {channelFilters.categories.map(cat => (
                      <div
                        key={cat.id}
                        style={{ ...styles.dropdownItem, background: selectedCategory === cat.id ? 'rgba(120, 119, 198, 0.2)' : 'transparent' }}
                        onClick={() => { setSelectedCategory(cat.id); setShowCategoryDropdown(false); }}
                      >
                        <span style={{ color: '#f8fafc' }}>{cat.icon} {cat.name}</span>
                        <span style={{ color: '#64748b', fontSize: '12px' }}>{cat.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Country Filter */}
              <div style={{ minWidth: '180px', position: 'relative' }}>
                <label style={styles.label}>Country</label>
                <button
                  style={{ ...styles.input, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => { setShowCountryDropdown(!showCountryDropdown); setShowCategoryDropdown(false); }}
                >
                  <span>{selectedCountry === 'all' ? 'All Countries' : channelFilters.countries.find(c => c.id === selectedCountry)?.name || selectedCountry}</span>
                  {showCountryDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showCountryDropdown && (
                  <div style={styles.dropdown}>
                    <div
                      style={{ ...styles.dropdownItem, background: selectedCountry === 'all' ? 'rgba(120, 119, 198, 0.2)' : 'transparent' }}
                      onClick={() => { setSelectedCountry('all'); setShowCountryDropdown(false); }}
                    >
                      <span style={{ color: '#f8fafc' }}>All Countries</span>
                      <span style={{ color: '#64748b', fontSize: '12px' }}>{channels.length}</span>
                    </div>
                    {channelFilters.countries.map(country => (
                      <div
                        key={country.id}
                        style={{ ...styles.dropdownItem, background: selectedCountry === country.id ? 'rgba(120, 119, 198, 0.2)' : 'transparent' }}
                        onClick={() => { setSelectedCountry(country.id); setShowCountryDropdown(false); }}
                      >
                        <span style={{ color: '#f8fafc' }}>{country.flag} {country.name}</span>
                        <span style={{ color: '#64748b', fontSize: '12px' }}>{country.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div style={{ minWidth: '150px' }}>
                <label style={styles.label}>Status</label>
                <select
                  style={styles.input}
                  value={channelStatusFilter}
                  onChange={e => setChannelStatusFilter(e.target.value as any)}
                >
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={styles.btn('secondary')}
                  onClick={() => fetchChannels()}
                  disabled={refreshingChannels}
                >
                  <RefreshCw size={16} className={refreshingChannels ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <button
                  style={styles.btn('primary')}
                  onClick={handleBulkHealthCheck}
                  disabled={checkingHealth}
                >
                  <Activity size={16} />
                  Health Check
                </button>
              </div>
            </div>
          </div>

          {/* Channel List */}
          <div style={{ ...styles.card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#f8fafc', margin: 0, fontSize: '16px' }}>
                Showing {filteredChannels.length} of {channels.length} channels
              </h3>
            </div>

            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>Channel</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>Country</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>Health</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>Mappings</th>
                    <th style={{ padding: '12px', textAlign: 'right', color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChannels.slice(0, 100).map(channel => (
                    <tr key={channel.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: 'rgba(120, 119, 198, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Radio size={20} color="#7877c6" />
                          </div>
                          <div>
                            <p style={{ color: '#f8fafc', margin: 0, fontWeight: '500', fontSize: '14px' }}>{channel.name}</p>
                            <p style={{ color: '#64748b', margin: 0, fontSize: '12px' }}>ID: {channel.streamId}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                          {channel.categoryInfo?.icon} {channel.categoryInfo?.name || channel.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                          {channel.countryInfo?.flag} {channel.countryInfo?.name || channel.country}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={styles.status(channel.status)}>
                          {channel.status === 'online' ? <SignalHigh size={12} /> : channel.status === 'offline' ? <SignalZero size={12} /> : <SignalLow size={12} />}
                          {channel.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span style={{ 
                            color: channel.healthScore >= 70 ? '#22c55e' : channel.healthScore >= 40 ? '#fbbf24' : '#ef4444',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {channel.healthScore}%
                          </span>
                          <div style={{ ...styles.healthBar(channel.healthScore), width: '60px' }}>
                            <div style={styles.healthFill(channel.healthScore)} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          background: channel.mappingCount > 0 ? 'rgba(120, 119, 198, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                          color: channel.mappingCount > 0 ? '#a78bfa' : '#9ca3af',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {channel.mappingCount}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            style={styles.btn(channel.isEnabled ? 'success' : 'secondary')}
                            onClick={() => handleToggleChannel(channel)}
                            title={channel.isEnabled ? 'Disable channel' : 'Enable channel'}
                          >
                            {channel.isEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button
                            style={styles.btn('secondary')}
                            onClick={() => handleRefreshChannel(channel)}
                            disabled={refreshingChannels}
                            title="Test channel"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredChannels.length > 100 && (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '16px', margin: 0 }}>
                  Showing first 100 channels. Use filters to narrow down results.
                </p>
              )}
              {filteredChannels.length === 0 && (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '32px', margin: 0 }}>
                  No channels found matching your filters.
                </p>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ============ ACCOUNTS TAB ============ */}
      {activeTab === 'accounts' && (
        <div>
          {/* Account Actions */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {accounts.length > 0 && (
              <>
                <button 
                  style={styles.btn('secondary')} 
                  onClick={handleVerifyAllAccounts}
                  disabled={verifying || autoMappingAll}
                >
                  {verifying ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={16} />}
                  {verifying ? 'Verifying...' : 'Verify All'}
                </button>
                <button 
                  style={styles.btn('primary')} 
                  onClick={handleAutoMapAllAccountsChannels}
                  disabled={autoMappingAll || verifying}
                >
                  {autoMappingAll ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Link2 size={16} />}
                  {autoMappingAll ? 'Mapping...' : 'Map All Channels'}
                </button>
                <button style={styles.btn('danger')} onClick={handleDeleteAllAccounts} disabled={verifying || autoMappingAll}>
                  <Trash2 size={16} /> Remove All
                </button>
              </>
            )}
          </div>

          {/* Verification Results */}
          {verifyResults.length > 0 && (
            <div style={{ ...styles.card, marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ color: '#f8fafc', margin: 0, fontSize: '16px' }}>
                  <ShieldCheck size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Verification Results
                </h3>
                <button 
                  style={{ ...styles.btn('secondary'), padding: '4px 10px', fontSize: '12px' }} 
                  onClick={() => setVerifyResults([])}
                >
                  Clear
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
                {verifyResults.map((result, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: '10px 14px', 
                      background: result.status === 'valid' ? 'rgba(34, 197, 94, 0.1)' 
                        : result.status === 'invalid' ? 'rgba(239, 68, 68, 0.1)'
                        : result.status === 'error' ? 'rgba(245, 158, 11, 0.1)'
                        : 'rgba(156, 163, 175, 0.1)',
                      borderRadius: '8px',
                      border: `1px solid ${
                        result.status === 'valid' ? 'rgba(34, 197, 94, 0.3)' 
                        : result.status === 'invalid' ? 'rgba(239, 68, 68, 0.3)'
                        : result.status === 'error' ? 'rgba(245, 158, 11, 0.3)'
                        : 'rgba(156, 163, 175, 0.3)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    {result.status === 'checking' && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} color="#9ca3af" />}
                    {result.status === 'valid' && <CheckCircle size={16} color="#22c55e" />}
                    {result.status === 'invalid' && <XCircle size={16} color="#ef4444" />}
                    {result.status === 'error' && <AlertTriangle size={16} color="#f59e0b" />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        color: result.status === 'valid' ? '#22c55e' 
                          : result.status === 'invalid' ? '#ef4444'
                          : '#9ca3af',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}>
                        {result.mac}
                      </div>
                      {result.error && (
                        <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {result.error}
                        </div>
                      )}
                      {result.status === 'valid' && result.channelsTested && (
                        <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                          {result.channelsTested} channels available
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account Grid */}
          <div style={styles.grid}>
            {accounts.map(account => (
              <div key={account.id} style={styles.accountCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ color: '#f8fafc', margin: '0 0 4px 0', fontSize: '14px' }}>
                      {account.name || (() => { try { return new URL(account.portal_url).hostname; } catch { return 'Unknown Portal'; } })()}
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
        </div>
      )}


      {/* ============ MAPPINGS TAB ============ */}
      {activeTab === 'mappings' && (
        <div>
          {mappings.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                {(() => {
                  const uniqueChannels = new Set(mappings.map(m => m.our_channel_id)).size;
                  return `${uniqueChannels} channels mapped (${mappings.length} total account-channel pairs)`;
                })()}
              </div>
              <button style={styles.btn('danger')} onClick={handleDeleteAllMappings}>
                <Trash2 size={16} /> Delete All Mappings
              </button>
            </div>
          )}
          {mappings.length === 0 ? (
            <div style={{ ...styles.card, textAlign: 'center' }}>
              <p style={{ color: '#64748b', margin: 0 }}>No channel mappings yet. Use "Map All Channels" in the Accounts tab to auto-map all accounts to all channels.</p>
            </div>
          ) : (
            (() => {
              const grouped = mappings.reduce((acc, m) => {
                if (!acc[m.our_channel_id]) {
                  acc[m.our_channel_id] = {
                    channelId: m.our_channel_id,
                    channelName: m.our_channel_name,
                    stalkerChannelName: m.stalker_channel_name,
                    accounts: [],
                    totalSuccess: 0,
                    totalFailure: 0,
                  };
                }
                acc[m.our_channel_id].accounts.push(m);
                acc[m.our_channel_id].totalSuccess += m.success_count;
                acc[m.our_channel_id].totalFailure += m.failure_count;
                return acc;
              }, {} as Record<string, { channelId: string; channelName: string; stalkerChannelName: string; accounts: ChannelMapping[]; totalSuccess: number; totalFailure: number }>);
              
              const sortedChannels = Object.values(grouped).sort((a, b) => a.channelName.localeCompare(b.channelName));
              
              return sortedChannels.map(channel => (
                <div key={channel.channelId} style={styles.mappingRow}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#f8fafc', fontWeight: '500' }}>{channel.channelName}</span>
                    <span style={{ color: '#64748b', margin: '0 8px' }}>→</span>
                    <span style={{ color: '#7877c6' }}>{channel.stalkerChannelName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ 
                      background: 'rgba(120, 119, 198, 0.2)', 
                      color: '#a78bfa', 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {channel.accounts.length} account{channel.accounts.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: '#22c55e', fontSize: '12px' }}>✓ {channel.totalSuccess}</span>
                    <span style={{ color: '#ef4444', fontSize: '12px' }}>✗ {channel.totalFailure}</span>
                  </div>
                </div>
              ));
            })()
          )}
        </div>
      )}

      {/* ============ ADD ACCOUNT MODAL ============ */}
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

      {/* ============ CHANNEL MAPPING MODAL ============ */}
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
                Map Channels - {selectedAccount.name || (() => { try { return new URL(selectedAccount.portal_url).hostname; } catch { return 'Unknown Portal'; } })()}
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
                <div>
                  <h4 style={{ color: '#f8fafc', margin: '0 0 12px 0' }}>Our Channels ({filteredOurChannelsForMapping.length})</h4>
                  <div style={{ marginBottom: '12px' }}>
                    <input 
                      style={styles.input}
                      placeholder="Search our channels..."
                      value={ourChannelSearch}
                      onChange={e => setOurChannelSearch(e.target.value)}
                    />
                  </div>
                  <div style={styles.channelList}>
                    {filteredOurChannelsForMapping.slice(0, 100).map(ch => {
                      const isMapped = mappings.some(m => m.our_channel_id === ch.streamId);
                      const isSelected = selectedOurChannel?.streamId === ch.streamId;
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
                
                <div>
                  <h4 style={{ color: '#f8fafc', margin: '0 0 12px 0' }}>All Stalker Channels ({filteredStalkerChannels.length})</h4>
                  <div style={{ marginBottom: '12px' }}>
                    <input 
                      style={styles.input}
                      placeholder="Search stalker channels..."
                      value={stalkerChannelSearch}
                      onChange={e => setStalkerChannelSearch(e.target.value)}
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
