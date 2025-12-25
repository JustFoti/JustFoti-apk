'use client';

import { useState, useEffect } from 'react';
import AdminLayout from './components/AdminLayout';
import AdminLogin from './components/AdminLogin';
import { SecurityProvider } from './components/SecurityProvider';
import LoadingSpinner from './components/LoadingSpinner';

export default function Layout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/admin/me');
            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            }
        } catch (err) {
            console.error('Auth check failed:', err);
        } finally {
            setLoading(false);
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

    if (!user) {
        return <AdminLogin onLoginSuccess={setUser} />;
    }

    return (
        <SecurityProvider>
            <AdminLayout>{children}</AdminLayout>
        </SecurityProvider>
    );
}
