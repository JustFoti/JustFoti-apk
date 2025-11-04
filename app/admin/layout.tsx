/**
 * Admin Layout with Authentication Guard
 */

import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/utils/auth';
import AdminNav from './AdminNav';
import styles from './admin.module.css';

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Get auth token from cookies
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token');
  
  // Verify authentication
  const user = authToken ? verifyToken(authToken.value) : null;
  
  // If not authenticated and not on login page, redirect to login
  if (!user) {
    redirect('/admin/login');
  }
  
  return (
    <div className={styles.adminLayout}>
      <AdminNav username={user.username} />
      <main className={styles.adminMain}>
        {children}
      </main>
    </div>
  );
}
