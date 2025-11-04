'use client';

/**
 * Export Data Component
 * Allows downloading analytics data in CSV or JSON format
 */

import { useState } from 'react';

interface ExportDataProps {
  timeRange: '24h' | '7d' | '30d' | '90d';
}

type ExportFormat = 'csv' | 'json';
type DataType = 'events' | 'metrics' | 'content';

export default function ExportData({ timeRange }: ExportDataProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [dataType, setDataType] = useState<DataType>('events');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);

      // Calculate time range
      const now = Date.now();
      const ranges: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
      };
      const duration = ranges[timeRange];
      const start = now - duration;
      const end = now;

      // Fetch export data
      const response = await fetch(
        `/api/analytics/export?format=${format}&type=${dataType}&start=${start}&end=${end}`
      );

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Get the blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `analytics-${dataType}-${timeRange}.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{
      padding: '24px',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '20px',
      }}>
        {/* Data Type Selection */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            color: '#888',
          }}>
            Data Type
          </label>
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value as DataType)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="events">Events</option>
            <option value="metrics">Metrics</option>
            <option value="content">Content Stats</option>
          </select>
        </div>

        {/* Format Selection */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            color: '#888',
          }}>
            Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
        </div>
      </div>

      {/* Export Info */}
      <div style={{
        padding: '16px',
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        marginBottom: '20px',
      }}>
        <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>
          Export Configuration
        </div>
        <div style={{ fontSize: '14px', color: '#fff' }}>
          <strong>{dataType === 'events' ? 'Analytics Events' : dataType === 'metrics' ? 'Daily Metrics' : 'Content Statistics'}</strong>
          {' '}in <strong>{format.toUpperCase()}</strong> format
        </div>
        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
          Time range: {timeRange === '24h' ? 'Last 24 hours' : timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '14px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        style={{
          width: '100%',
          padding: '14px',
          background: exporting ? 'rgba(59, 130, 246, 0.5)' : '#3b82f6',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: exporting ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!exporting) {
            e.currentTarget.style.background = '#2563eb';
          }
        }}
        onMouseLeave={(e) => {
          if (!exporting) {
            e.currentTarget.style.background = '#3b82f6';
          }
        }}
      >
        {exporting ? 'Exporting...' : 'Export Data'}
      </button>

      {/* Description */}
      <div style={{
        marginTop: '16px',
        fontSize: '12px',
        color: '#888',
        lineHeight: '1.6',
      }}>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Events:</strong> Raw analytics events including page views, searches, and playback events
        </p>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Metrics:</strong> Aggregated daily metrics including views, watch time, and sessions
        </p>
        <p style={{ margin: '0' }}>
          <strong>Content Stats:</strong> Per-content statistics including view counts and completion rates
        </p>
      </div>
    </div>
  );
}
