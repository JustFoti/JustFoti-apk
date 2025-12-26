'use client';

import { useState, useEffect, useCallback } from 'react';

interface BannerConfig {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  enabled: boolean;
  dismissible: boolean;
  linkText?: string;
  linkUrl?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_BANNER: BannerConfig = {
  id: 'main-banner',
  message: '',
  type: 'info',
  enabled: false,
  dismissible: true,
  linkText: '',
  linkUrl: '',
  expiresAt: '',
};

export default function BannerManagementPage() {
  const [banner, setBanner] = useState<BannerConfig>(DEFAULT_BANNER);
  const [originalBanner, setOriginalBanner] = useState<BannerConfig>(DEFAULT_BANNER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(banner) !== JSON.stringify(originalBanner);
    setHasChanges(changed);
  }, [banner, originalBanner]);

  const fetchBanner = useCallback(async () => {
    try {
      // Use admin=true to get banner even if disabled (for editing)
      const response = await fetch('/api/admin/banner?admin=true');
      const data = await response.json();
      if (data.banner) {
        setBanner(data.banner);
        setOriginalBanner(data.banner);
      }
    } catch (error) {
      console.error('Failed to fetch banner:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanner();
  }, [fetchBanner]);

  // Update banner field helper
  const updateBanner = useCallback((field: keyof BannerConfig, value: any) => {
    setBanner(prev => ({ ...prev, [field]: value }));
    setMessage(null); // Clear any previous messages when editing
  }, []);

  const saveBanner = async () => {
    if (!banner.message.trim()) {
      setMessage({ type: 'error', text: 'Banner message is required' });
      return;
    }

    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/admin/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(banner),
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: 'Banner saved successfully!' });
        if (data.banner) {
          setBanner(data.banner);
          setOriginalBanner(data.banner);
        }
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save banner' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const disableBanner = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/admin/banner', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        const updatedBanner = { ...banner, enabled: false };
        setBanner(updatedBanner);
        setOriginalBanner(updatedBanner);
        setMessage({ type: 'success', text: 'Banner disabled!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to disable banner' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setBanner(originalBanner);
    setMessage(null);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', color: '#94a3b8' }}>
        Loading banner settings...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '24px', fontWeight: '600' }}>
          📢 Site Banner Management
        </h2>
        <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '16px' }}>
          Display announcements and notifications to all users
        </p>
      </div>

      {/* Preview */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '16px' }}>
          Live Preview
          {hasChanges && <span style={{ marginLeft: '8px', color: '#f59e0b', fontSize: '12px' }}>(unsaved changes)</span>}
        </h3>
        {banner.message ? (
          <div style={{
            padding: '12px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '500',
            color: 'white',
            background: banner.type === 'info' ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(99, 102, 241, 0.95))' :
                        banner.type === 'warning' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(234, 88, 12, 0.95))' :
                        banner.type === 'success' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))' :
                        'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))',
            opacity: banner.enabled ? 1 : 0.5,
          }}>
            <span>
              {banner.type === 'info' && 'ℹ️'}
              {banner.type === 'warning' && '⚠️'}
              {banner.type === 'success' && '✅'}
              {banner.type === 'error' && '🚨'}
            </span>
            <span>{banner.message}</span>
            {banner.linkText && banner.linkUrl && (
              <span style={{ textDecoration: 'underline', fontWeight: '600' }}>
                {banner.linkText} →
              </span>
            )}
            {!banner.enabled && (
              <span style={{ marginLeft: '10px', opacity: 0.7 }}>(Disabled)</span>
            )}
          </div>
        ) : (
          <div style={{
            padding: '20px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px dashed rgba(255, 255, 255, 0.2)',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '14px',
          }}>
            Enter a message below to see the preview
          </div>
        )}
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
        {/* Enable Toggle */}
        <div style={{ 
          padding: '16px', 
          background: banner.enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)', 
          border: `1px solid ${banner.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`, 
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <label style={{ display: 'block', color: '#f8fafc', fontWeight: '600', marginBottom: '4px' }}>
              Banner Status
            </label>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>
              {banner.enabled ? '🟢 Banner is visible to all users' : '⚫ Banner is hidden'}
            </span>
          </div>
          <button
            onClick={() => updateBanner('enabled', !banner.enabled)}
            style={{
              padding: '8px 20px',
              background: banner.enabled ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            aria-label={banner.enabled ? 'Disable banner' : 'Enable banner'}
          >
            {banner.enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Message */}
        <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
          <label style={{ display: 'block', color: '#f8fafc', fontWeight: '500', marginBottom: '8px' }}>
            Message *
          </label>
          <textarea
            value={banner.message}
            onChange={(e) => updateBanner('message', e.target.value)}
            placeholder="Enter your announcement message..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '14px',
              resize: 'vertical',
            }}
            aria-label="Banner message"
          />
          <div style={{ marginTop: '6px', color: '#64748b', fontSize: '12px' }}>
            {banner.message.length} characters
          </div>
        </div>

        {/* Type */}
        <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
          <label style={{ display: 'block', color: '#f8fafc', fontWeight: '500', marginBottom: '8px' }}>
            Banner Style
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['info', 'warning', 'success', 'error'] as const).map((type) => (
              <button
                key={type}
                onClick={() => updateBanner('type', type)}
                style={{
                  padding: '8px 16px',
                  background: banner.type === type ? 
                    (type === 'info' ? 'rgba(59, 130, 246, 0.3)' :
                     type === 'warning' ? 'rgba(245, 158, 11, 0.3)' :
                     type === 'success' ? 'rgba(16, 185, 129, 0.3)' :
                     'rgba(239, 68, 68, 0.3)') : 
                    'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${banner.type === type ? 
                    (type === 'info' ? 'rgba(59, 130, 246, 0.5)' :
                     type === 'warning' ? 'rgba(245, 158, 11, 0.5)' :
                     type === 'success' ? 'rgba(16, 185, 129, 0.5)' :
                     'rgba(239, 68, 68, 0.5)') : 
                    'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '8px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s ease',
                }}
                aria-pressed={banner.type === type}
                aria-label={`Select ${type} style`}
              >
                {type === 'info' && 'ℹ️ Info'}
                {type === 'warning' && '⚠️ Warning'}
                {type === 'success' && '✅ Success'}
                {type === 'error' && '🚨 Error'}
              </button>
            ))}
          </div>
        </div>

        {/* Link (Optional) */}
        <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
          <label style={{ display: 'block', color: '#f8fafc', fontWeight: '500', marginBottom: '8px' }}>
            Link (Optional)
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={banner.linkText || ''}
              onChange={(e) => updateBanner('linkText', e.target.value)}
              placeholder="Link text (e.g., Learn more)"
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '14px',
              }}
              aria-label="Link text"
            />
            <input
              type="text"
              value={banner.linkUrl || ''}
              onChange={(e) => updateBanner('linkUrl', e.target.value)}
              placeholder="URL (e.g., /about)"
              style={{
                flex: 2,
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '14px',
              }}
              aria-label="Link URL"
            />
          </div>
        </div>

        {/* Options */}
        <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
          <label style={{ display: 'block', color: '#f8fafc', fontWeight: '500', marginBottom: '12px' }}>
            Options
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={banner.dismissible}
                onChange={(e) => updateBanner('dismissible', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#7877c6' }}
                aria-label="Allow users to dismiss the banner"
              />
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                Allow users to dismiss the banner
              </span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Expires at:</span>
              <input
                type="datetime-local"
                value={banner.expiresAt ? banner.expiresAt.slice(0, 16) : ''}
                onChange={(e) => updateBanner('expiresAt', e.target.value ? new Date(e.target.value).toISOString() : '')}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '14px',
                }}
                aria-label="Banner expiration date and time"
              />
              {banner.expiresAt && (
                <button
                  onClick={() => updateBanner('expiresAt', '')}
                  style={{
                    padding: '6px 10px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    color: '#ef4444',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                  aria-label="Clear expiration date"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '12px',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            fontSize: '14px'
          }}>
            {message.text}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={saveBanner}
            disabled={saving || !banner.message.trim()}
            style={{
              padding: '12px 24px',
              background: '#7877c6',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: saving || !banner.message.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !banner.message.trim() ? 0.6 : 1,
              transition: 'all 0.2s ease',
            }}
            aria-label="Save banner"
          >
            {saving ? 'Saving...' : 'Save Banner'}
          </button>
          {hasChanges && (
            <button
              onClick={resetChanges}
              disabled={saving}
              style={{
                padding: '12px 24px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '14px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                transition: 'all 0.2s ease',
              }}
              aria-label="Reset changes"
            >
              Reset Changes
            </button>
          )}
          {banner.enabled && (
            <button
              onClick={disableBanner}
              disabled={saving}
              style={{
                padding: '12px 24px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                transition: 'all 0.2s ease',
              }}
              aria-label="Disable banner"
            >
              Disable Banner
            </button>
          )}
        </div>

        {/* Last Updated */}
        {banner.updatedAt && (
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>
            Last updated: {new Date(banner.updatedAt).toLocaleString()}
            {banner.id && banner.id !== 'main-banner' && (
              <span style={{ marginLeft: '12px' }}>
                Banner ID: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{banner.id}</code>
              </span>
            )}
          </div>
        )}
        <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px', padding: '12px', background: 'rgba(120, 119, 198, 0.1)', borderRadius: '8px', border: '1px solid rgba(120, 119, 198, 0.2)' }}>
          💡 <strong>Tip:</strong> Each time you save the banner, a new unique ID is generated. This means users who dismissed an older banner will see the new one.
        </div>
      </div>
    </div>
  );
}
