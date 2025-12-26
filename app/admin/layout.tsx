'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './components/AdminLogin';
import { SecurityProvider, useSecurity } from './components/SecurityProvider';
import LoadingSpinner from './components/LoadingSpinner';

// Key for storing intended destination in sessionStorage
const REDIRECT_KEY = 'admin_redirect_after_login';

function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
    const { loading, isAuthenticated } = useSecurity();
    const pathname = usePathname();

    // Store intended destination when not authenticated
    useEffect(() => {
        if (!loading && !isAuthenticated && pathname && pathname !== '/admin') {
            // Store the intended destination for redirect after login
            sessionStorage.setItem(REDIRECT_KEY, pathname);
        }
    }, [loading, isAuthenticated, pathname]);

    // Handle redirect after successful login
    const handleLoginSuccess = () => {
        const intendedDestination = sessionStorage.getItem(REDIRECT_KEY);
        sessionStorage.removeItem(REDIRECT_KEY);
        
        if (intendedDestination && intendedDestination !== '/admin') {
            // Redirect to intended destination
            window.location.href = intendedDestination;
        } else {
            // Default redirect to dashboard
            window.location.href = '/admin/dashboard';
        }
    };

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
        return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
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
