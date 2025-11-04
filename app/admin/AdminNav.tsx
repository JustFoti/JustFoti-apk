'use client';

/**
 * Admin Navigation Component
 */

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './admin.module.css';

interface AdminNavProps {
  username: string;
}

export default function AdminNav({ username }: AdminNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      // Redirect to login page
      router.push('/admin/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/admin' && pathname === '/admin') return true;
    if (path !== '/admin' && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.navContent}>
        <div className={styles.navBrand}>
          <div className={styles.navLogo}>Flyx</div>
          <span className={styles.navBadge}>Admin</span>
        </div>
        
        <div className={styles.navMenu}>
          <Link
            href="/admin"
            className={`${styles.navLink} ${isActive('/admin') ? styles.navLinkActive : ''}`}
          >
            Dashboard
          </Link>
          <Link
            href="/admin/analytics"
            className={`${styles.navLink} ${isActive('/admin/analytics') ? styles.navLinkActive : ''}`}
          >
            Analytics
          </Link>
        </div>
        
        <div className={styles.navActions}>
          <div className={styles.navUser}>
            <div className={styles.navUserIcon}>
              {username.charAt(0).toUpperCase()}
            </div>
            <span>{username}</span>
          </div>
          
          <button
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
