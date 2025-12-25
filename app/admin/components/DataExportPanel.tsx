'use client';

import React, { useState, useEffect } from 'react';
import { Download, Calendar, Filter, FileText, Database, Users, BarChart3, Activity, Clock } from 'lucide-react';

interface ExportRequest {
  exportType: 'analytics' | 'users' | 'content' | 'traffic' | 'system-health';
  format: 'csv' | 'json' | 'pdf';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  filters?: {
    country?: string;
    deviceType?: string;
    contentType?: string;
    includeBots?: boolean;
  };
  includeMetadata: boolean;
}

interface ScheduledReport {
  id: string;
  name: string;
  exportType: string;
  format: string;
  schedule: string;
  nextRun: number;
  enabled: boolean;
}

const DataExportPanel: React.FC = () => {
  const [exportRequest, setExportRequest] = useState<ExportRequest>({
    exportType: 'analytics',
    format: 'json',
    dateRange: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    includeMetadata: true
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    fetchScheduledReports();
  }, []);

  const fetchScheduledReports = async () => {
    try {
      const response = await fetch('/api/admin/export?action=scheduled');
      const data = await response.json();
      if (data.success) {
        setScheduledReports(data.scheduledReports);
      }
    } catch (error) {
      console.error('Failed to fetch scheduled reports:', error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus('Preparing export...');

    try {
      const requestBody = {
        ...exportRequest,
        dateRange: {
          startDate: new Date(exportRequest.dateRange.startDate).getTime(),
          endDate: new Date(exportRequest.dateRange.endDate + 'T23:59:59').getTime()
        }
      };

      setExportStatus('Fetching data...');
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      setExportStatus('Generating file...');
      const blob = await response.blob();
      const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 
                     `export_${exportRequest.exportType}_${Date.now()}.${exportRequest.format}`;

      // Download file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportStatus('Export completed successfully!');
      setTimeout(() => setExportStatus(''), 3000);

    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setExportStatus(''), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const getExportTypeIcon = (type: string) => {
    switch (type) {
      case 'analytics': return <BarChart3 className="w-4 h-4" />;
      case 'users': return <Users className="w-4 h-4" />;
      case 'content': return <FileText className="w-4 h-4" />;
      case 'traffic': return <Activity className="w-4 h-4" />;
      case 'system-health': return <Database className="w-4 h-4" />;
      default: return <Download className="w-4 h-4" />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'csv': return 'Comma-separated values, ideal for spreadsheet analysis';
      case 'json': return 'JavaScript Object Notation, perfect for programmatic use';
      case 'pdf': return 'Portable Document Format, great for reports and sharing';
      default: return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Download className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Data Export & Reporting</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Export Configuration */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Export Configuration</h3>

          {/* Export Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Type
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: 'analytics', label: 'Analytics Data', desc: 'Page views, events, and user interactions' },
                { value: 'users', label: 'User Data', desc: 'User profiles, activity, and engagement metrics' },
                { value: 'content', label: 'Content Performance', desc: 'Watch time, completion rates, and rankings' },
                { value: 'traffic', label: 'Traffic Analysis', desc: 'Geographic distribution and device breakdown' },
                { value: 'system-health', label: 'System Health', desc: 'Performance metrics and system status' }
              ].map((type) => (
                <label key={type.value} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="exportType"
                    value={type.value}
                    checked={exportRequest.exportType === type.value}
                    onChange={(e) => setExportRequest(prev => ({ ...prev, exportType: e.target.value as any }))}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getExportTypeIcon(type.value)}
                      <span className="font-medium text-gray-900">{type.label}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{type.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: 'json', label: 'JSON' },
                { value: 'csv', label: 'CSV' },
                { value: 'pdf', label: 'PDF' }
              ].map((format) => (
                <label key={format.value} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="format"
                    value={format.value}
                    checked={exportRequest.format === format.value}
                    onChange={(e) => setExportRequest(prev => ({ ...prev, format: e.target.value as any }))}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{format.label}</span>
                    <p className="text-sm text-gray-600">{getFormatDescription(format.value)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={exportRequest.dateRange.startDate}
                  onChange={(e) => setExportRequest(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, startDate: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={exportRequest.dateRange.endDate}
                  onChange={(e) => setExportRequest(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, endDate: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          <div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Filter className="w-4 h-4" />
              Advanced Filters
              <span className="text-xs">({showAdvancedFilters ? 'Hide' : 'Show'})</span>
            </button>

            {showAdvancedFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Country</label>
                    <select
                      value={exportRequest.filters?.country || ''}
                      onChange={(e) => setExportRequest(prev => ({
                        ...prev,
                        filters: { ...prev.filters, country: e.target.value || undefined }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All Countries</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Device Type</label>
                    <select
                      value={exportRequest.filters?.deviceType || ''}
                      onChange={(e) => setExportRequest(prev => ({
                        ...prev,
                        filters: { ...prev.filters, deviceType: e.target.value || undefined }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All Devices</option>
                      <option value="desktop">Desktop</option>
                      <option value="mobile">Mobile</option>
                      <option value="tablet">Tablet</option>
                      <option value="tv">TV</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeBots"
                    checked={exportRequest.filters?.includeBots || false}
                    onChange={(e) => setExportRequest(prev => ({
                      ...prev,
                      filters: { ...prev.filters, includeBots: e.target.checked }
                    }))}
                  />
                  <label htmlFor="includeBots" className="text-sm text-gray-700">
                    Include suspected bot traffic
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Option */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeMetadata"
              checked={exportRequest.includeMetadata}
              onChange={(e) => setExportRequest(prev => ({ ...prev, includeMetadata: e.target.checked }))}
            />
            <label htmlFor="includeMetadata" className="text-sm text-gray-700">
              Include export metadata (timestamps, filters, processing info)
            </label>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate Export
              </>
            )}
          </button>

          {exportStatus && (
            <div className={`p-3 rounded-lg text-sm ${
              exportStatus.includes('failed') || exportStatus.includes('error')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : exportStatus.includes('completed')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {exportStatus}
            </div>
          )}
        </div>

        {/* Scheduled Reports */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Scheduled Reports</h3>

          {scheduledReports.length > 0 ? (
            <div className="space-y-3">
              {scheduledReports.map((report) => (
                <div key={report.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getExportTypeIcon(report.exportType)}
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Type: {report.exportType} • Format: {report.format.toUpperCase()}</p>
                        <p>Schedule: {report.schedule}</p>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Next run: {new Date(report.nextRun).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        report.enabled 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {report.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No scheduled reports configured</p>
              <p className="text-sm">Set up automated reports to receive regular data exports</p>
            </div>
          )}

          {/* Quick Export Presets */}
          <div className="mt-8">
            <h4 className="text-md font-medium text-gray-900 mb-3">Quick Export Presets</h4>
            <div className="space-y-2">
              {[
                { label: 'Last 7 Days Analytics', type: 'analytics', days: 7 },
                { label: 'Monthly User Report', type: 'users', days: 30 },
                { label: 'Weekly Content Performance', type: 'content', days: 7 },
                { label: 'Traffic Summary (Last 24h)', type: 'traffic', days: 1 }
              ].map((preset, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const endDate = new Date();
                    const startDate = new Date(endDate.getTime() - preset.days * 24 * 60 * 60 * 1000);
                    setExportRequest(prev => ({
                      ...prev,
                      exportType: preset.type as any,
                      dateRange: {
                        startDate: startDate.toISOString().split('T')[0],
                        endDate: endDate.toISOString().split('T')[0]
                      }
                    }));
                  }}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {getExportTypeIcon(preset.type)}
                    <span className="font-medium">{preset.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExportPanel;