'use client';

import { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';

interface FeedbackItem {
  id: number;
  type: 'bug' | 'feature' | 'general' | 'content';
  message: string;
  email: string | null;
  url: string | null;
  user_agent: string | null;
  ip_address: string | null;
  status: 'new' | 'reviewed' | 'resolved' | 'archived';
  created_at: string;
  updated_at: string;
}

interface FeedbackStats {
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

const typeConfig = {
  bug: { label: 'Bug Report', icon: '🐛', color: '#ef4444' },
  feature: { label: 'Feature Request', icon: '✨', color: '#8b5cf6' },
  content: { label: 'Content Issue', icon: '🎬', color: '#f59e0b' },
  general: { label: 'General', icon: '💬', color: '#3b82f6' },
};

const statusConfig = {
  new: { label: 'New', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  reviewed: { label: 'Reviewed', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  resolved: { label: 'Resolved', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  archived: { label: 'Archived', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
};

export default function AdminFeedbackPage() {
  useAdmin();
  
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({ byStatus: {}, byType: {} });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);


  useEffect(() => {
    fetchFeedback();
  }, [filterStatus, filterType]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterType !== 'all') params.set('type', filterType);
      
      const response = await fetch(`/api/admin/feedback?${params}`);
      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback || []);
        setStats(data.stats || { byStatus: {}, byType: {} });
      }
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      setUpdating(id);
      const response = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      
      if (response.ok) {
        setFeedback(prev => prev.map(item => 
          item.id === id ? { ...item, status: newStatus as FeedbackItem['status'] } : item
        ));
        if (selectedItem?.id === id) {
          setSelectedItem({ ...selectedItem, status: newStatus as FeedbackItem['status'] });
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(null);
    }
  };

  const deleteFeedback = async (id: number) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    
    try {
      const response = await fetch(`/api/admin/feedback?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setFeedback(prev => prev.filter(item => item.id !== id));
        if (selectedItem?.id === id) setSelectedItem(null);
      }
    } catch (err) {
      console.error('Failed to delete feedback:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const totalFeedback = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);
  const newCount = stats.byStatus.new || 0;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading feedback...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '24px', fontWeight: '600' }}>
          💬 User Feedback
          {newCount > 0 && (
            <span style={{ 
              marginLeft: '12px', padding: '4px 10px', borderRadius: '12px', fontSize: '14px',
              background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e'
            }}>
              {newCount} new
            </span>
          )}
        </h2>
        <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '16px' }}>
          Review and manage user feedback submissions
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard title="Total" value={totalFeedback} icon="📊" color="#7877c6" />
        <StatCard title="New" value={stats.byStatus.new || 0} icon="🆕" color="#22c55e" />
        <StatCard title="Bug Reports" value={stats.byType.bug || 0} icon="🐛" color="#ef4444" />
        <StatCard title="Feature Requests" value={stats.byType.feature || 0} icon="✨" color="#8b5cf6" />
        <StatCard title="Content Issues" value={stats.byType.content || 0} icon="🎬" color="#f59e0b" />
        <StatCard title="General" value={stats.byType.general || 0} icon="💬" color="#3b82f6" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="archived">Archived</option>
        </select>
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Types</option>
          <option value="bug">Bug Reports</option>
          <option value="feature">Feature Requests</option>
          <option value="content">Content Issues</option>
          <option value="general">General</option>
        </select>
        <button onClick={fetchFeedback} style={refreshButtonStyle}>
          🔄 Refresh
        </button>
      </div>


      {/* Feedback List */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.03)', 
        borderRadius: '16px', 
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px' }}>
            Feedback ({feedback.length})
          </h3>
        </div>

        {feedback.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            No feedback found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {feedback.map((item) => {
              const typeInfo = typeConfig[item.type];
              const statusInfo = statusConfig[item.status];
              
              return (
                <div 
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    background: selectedItem?.id === item.id ? 'rgba(120, 119, 198, 0.1)' : 'transparent',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = selectedItem?.id === item.id ? 'rgba(120, 119, 198, 0.1)' : 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{typeInfo.icon}</span>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontSize: '11px', 
                          fontWeight: '500',
                          background: `${typeInfo.color}20`,
                          color: typeInfo.color
                        }}>
                          {typeInfo.label}
                        </span>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontSize: '11px', 
                          fontWeight: '500',
                          background: statusInfo.bg,
                          color: statusInfo.color
                        }}>
                          {statusInfo.label}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '12px' }}>
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>
                      <p style={{ 
                        margin: 0, 
                        color: '#e2e8f0', 
                        fontSize: '14px',
                        lineHeight: '1.5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {item.message}
                      </p>
                      {item.email && (
                        <div style={{ marginTop: '6px', color: '#64748b', fontSize: '12px' }}>
                          📧 {item.email}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <select
                        value={item.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateStatus(item.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={updating === item.id}
                        style={{
                          padding: '6px 10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#e2e8f0',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="new">New</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="resolved">Resolved</option>
                        <option value="archived">Archived</option>
                      </select>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFeedback(item.id);
                        }}
                        style={{
                          padding: '6px 10px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '6px',
                          color: '#ef4444',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Detail Modal */}
      {selectedItem && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setSelectedItem(null)}
        >
          <div 
            style={{
              background: '#1e293b',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{typeConfig[selectedItem.type].icon}</span>
                <div>
                  <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px' }}>
                    {typeConfig[selectedItem.type].label}
                  </h3>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>
                    {formatDate(selectedItem.created_at)}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '28px',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px' }}>
              {/* Status */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
                  Status
                </label>
                <select
                  value={selectedItem.status}
                  onChange={(e) => updateStatus(selectedItem.id, e.target.value)}
                  disabled={updating === selectedItem.id}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  <option value="new">🆕 New</option>
                  <option value="reviewed">👀 Reviewed</option>
                  <option value="resolved">✅ Resolved</option>
                  <option value="archived">📦 Archived</option>
                </select>
              </div>

              {/* Message */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
                  Message
                </label>
                <div style={{
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}>
                  {selectedItem.message}
                </div>
              </div>

              {/* Contact Info */}
              {selectedItem.email && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
                    Email
                  </label>
                  <a 
                    href={`mailto:${selectedItem.email}`}
                    style={{
                      color: '#7877c6',
                      textDecoration: 'none',
                      fontSize: '14px',
                    }}
                  >
                    {selectedItem.email}
                  </a>
                </div>
              )}

              {/* Meta Info */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '16px',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '10px',
                marginTop: '20px',
              }}>
                {selectedItem.url && (
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>
                      Page URL
                    </label>
                    <span style={{ color: '#94a3b8', fontSize: '12px', wordBreak: 'break-all' }}>
                      {selectedItem.url}
                    </span>
                  </div>
                )}
                {selectedItem.ip_address && (
                  <div>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>
                      IP Address
                    </label>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                      {selectedItem.ip_address}
                    </span>
                  </div>
                )}
                {selectedItem.user_agent && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>
                      User Agent
                    </label>
                    <span style={{ color: '#94a3b8', fontSize: '11px', wordBreak: 'break-all' }}>
                      {selectedItem.user_agent}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                {selectedItem.email && (
                  <a
                    href={`mailto:${selectedItem.email}?subject=Re: Your Feedback on FlyX`}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'rgba(120, 119, 198, 0.2)',
                      border: '1px solid rgba(120, 119, 198, 0.3)',
                      borderRadius: '10px',
                      color: '#a5b4fc',
                      textAlign: 'center',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    📧 Reply via Email
                  </a>
                )}
                <button
                  onClick={() => deleteFeedback(selectedItem.id)}
                  style={{
                    padding: '12px 20px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '10px',
                    color: '#ef4444',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Stat Card Component
function StatCard({ title, value, icon, color }: { title: string; value: number | string; icon: string; color: string }) {
  return (
    <div style={{
      padding: '16px 20px',
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <span style={{ color: '#94a3b8', fontSize: '13px' }}>{title}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color }}>
        {value}
      </div>
    </div>
  );
}

// Styles
const selectStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '14px',
  cursor: 'pointer',
};

const refreshButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: 'rgba(120, 119, 198, 0.15)',
  border: '1px solid rgba(120, 119, 198, 0.3)',
  borderRadius: '8px',
  color: '#a5b4fc',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};
