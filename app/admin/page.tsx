/**
 * Admin Dashboard Page
 */

import { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard - Flyx Admin',
  description: 'Flyx admin dashboard',
};

export default function AdminDashboard() {
  return <DashboardClient />;
}
