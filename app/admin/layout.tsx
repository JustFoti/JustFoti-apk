'use client';

import AdminLayout from './components/AdminLayout';
import AdminLogin from './components/AdminLogin';
import { SecurityProvider, useSecurity } from './components/SecurityProvider';
import LoadingSpinner from './components/LoadingSpinner';

function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
    const { loading, isAuthenticated } = useSecurity();

    if (loading) {
        return (
            <LoadingSpinner 
                fullScreen 
                message="Loading admin panel..." 
                size="lg"
            />
        );
    }

    if (!isAuthenticated) {
        return <AdminLogin onLoginSuccess={() => window.location.reload()} />;
    }

    return <AdminLayout>{children}</AdminLayout>;
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <SecurityProvider>
            <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
        </SecurityProvider>
    );
}
