import React from 'react';
import DataExportPanel from '../components/DataExportPanel';

export default function ExportPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Export & Reporting</h1>
        <p className="text-gray-600 mt-2">
          Export analytics data in multiple formats with custom date ranges and comprehensive metadata.
        </p>
      </div>
      
      <DataExportPanel />
    </div>
  );
}