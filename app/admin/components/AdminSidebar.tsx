'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSecurity } from './SecurityProvider';
import {
    LayoutDashboard,
    Users,
    Film,
    Activity,
    Settings,
    LogOut,
    Map,
    History,
    BarChart3,
    TrendingUp,
    MessageSquare,
    Tv,
    Database,
    Megaphone,
    Globe,
    Download,
    Shield,
    Bot
} from 'lucide-react';

export default function AdminSidebar() {
    const pathname = usePathname();
    const { logout } = useSecurity();

    const handleSignOut = async () => {
        try {
            await logout();
            // Redirect to login page
            window.location.href = '/admin';
        } catch (error) {
            console.error('Sign out error:', error);
            // Force redirect even if logout fails
            window.location.href = '/admin';
        }
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
        { icon: TrendingUp, label: 'Insights', href: '/admin/insights' },
        { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
        { icon: Globe, label: 'Traffic', href: '/admin/traffic-unified' },
        { icon: Users, label: 'Users', href: '/admin/users' },
        { icon: Film, label: 'Content', href: '/admin/content' },
        { icon: Map, label: 'Geographic', href: '/admin/geographic' },
        { icon: History, label: 'Sessions', href: '/admin/sessions' },
        { icon: Activity, label: 'Real-time', href: '/admin/live' },
        { icon: Bot, label: 'Bot Detection', href: '/admin/bot-detection' },
        { icon: Download, label: 'Export Data', href: '/admin/export' },
        { icon: MessageSquare, label: 'Feedback', href: '/admin/feedback' },
        { icon: Tv, label: 'IPTV Debug', href: '/admin/iptv-debug' },
        { icon: Database, label: 'IPTV Manager', href: '/admin/iptv-manager' },
        { icon: Megaphone, label: 'Site Banner', href: '/admin/banner' },
        { icon: Shield, label: 'Security', href: '/admin/security' },
        { icon: Settings, label: 'Settings', href: '/admin/settings' },
    ];

    return (
        <aside 
            style={{
                width: '260px',
                height: '100vh',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
                backdropFilter: 'blur(20px)',
                position: 'relative',
                zIndex: 50
            }}
            role="navigation"
            aria-label="Admin panel navigation"
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '40px',
                padding: '0 12px'
            }}>
                <div 
                    style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #7877c6 0%, #9333ea 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        color: 'white'
                    }}
                    aria-hidden="true"
                >
                    F
                </div>
                <span style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>
                    Flyx Admin
                </span>
            </div>

            <nav 
                style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}
                role="menubar"
                aria-label="Main navigation menu"
            >
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            aria-current={isActive ? 'page' : undefined}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                color: isActive ? '#fff' : '#94a3b8',
                                background: isActive ? 'rgba(120, 119, 198, 0.2)' : 'transparent',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                                minHeight: '44px', // Minimum touch target
                                outline: 'none',
                            }}
                            onFocus={(e) => {
                                e.target.style.outline = '2px solid #7877c6';
                                e.target.style.outlineOffset = '2px';
                            }}
                            onBlur={(e) => {
                                e.target.style.outline = 'none';
                            }}
                        >
                            <item.icon 
                                size={20} 
                                color={isActive ? '#fff' : '#94a3b8'} 
                                aria-hidden="true"
                            />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <button 
                onClick={handleSignOut}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    marginTop: 'auto',
                    minHeight: '44px', // Minimum touch target
                    outline: 'none',
                    transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                    e.target.style.outline = '2px solid #ef4444';
                    e.target.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                    e.target.style.outline = 'none';
                }}
                aria-label="Sign out of admin panel"
            >
                <LogOut size={20} aria-hidden="true" />
                Sign Out
            </button>
        </aside>
    );
}
