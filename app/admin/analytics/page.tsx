/**
 * Admin Analytics Page
 * Detailed analytics views with advanced charts
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/utils/auth';
import AnalyticsClient from './AnalyticsClient';

export const metadata = {
  title: 'Analytics - Flyx Admin',
  description: 'Detailed analytics and insights',
};

export default async function AnalyticsPage() {
  // Verify authentication
  const cookieStore = cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) {
    redirect('/admin/login');
  }

  try {
    const user = verifyToken(token);
    if (!user) {
      redirect('/admin/login');
    }

    return <AnalyticsClient username={user.username} />;
  } catch (error) {
    redirect('/admin/login');
  }
}
