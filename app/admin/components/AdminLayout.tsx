'use client';

import { ReactNode } from 'react';
import { AdminProvider } from '../context/AdminContext';
import { StatsProvider } from '../context/StatsContext';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import UnifiedStatsBar from './UnifiedStatsBar';
import ResponsiveLayout from './ResponsiveLayout';

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <AdminProvider>
            <StatsProvider>
                <ResponsiveLayout
                    sidebar={<AdminSidebar />}
                >
                    <AdminHeader />
                    <UnifiedStatsBar />
                    <main 
                        style={{
                            flex: 1,
                            padding: '32px',
                            overflowY: 'auto',
                            minWidth: 0, // Prevent overflow
                        }}
                        role="main"
                        aria-label="Admin panel main content"
                    >
                        {children}
                    </main>
                </ResponsiveLayout>
            </StatsProvider>
        </AdminProvider>
    );
}
