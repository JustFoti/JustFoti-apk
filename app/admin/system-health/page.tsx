/**
 * System Health Monitoring Page
 * Comprehensive system health dashboard for administrators
 */

import { Metadata } from 'next';
import SystemHealthMonitor from '../components/SystemHealthMonitor';

export const metadata: Metadata = {
  title: 'System Health - Admin Panel',
  description: 'Monitor system performance, API metrics, database health, and traffic patterns',
};

export default function SystemHealthPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SystemHealthMonitor />
    </div>
  );
}