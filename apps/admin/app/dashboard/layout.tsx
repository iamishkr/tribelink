'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Overview', icon: '📊', href: '/dashboard' },
  { label: 'Users', icon: '👥', href: '/dashboard/users' },
  { label: 'Communities', icon: '🏘️', href: '/dashboard/communities' },
  { label: 'Moderation Reports', icon: '🚨', href: '/dashboard/reports' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    const isAuth = localStorage.getItem('tribelink_admin_auth');
    if (!isAuth) {
      router.replace('/login');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('tribelink_admin_auth');
    router.push('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0B0F19' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: '#0F172A', borderRight: '1px solid #1E293B', display: 'flex', flexDirection: 'column', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '12px', paddingRight: '12px', marginBottom: '32px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #7C3AED, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#FFF' }}>
            🛡️
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#F8FAFC' }}>TribeLink</h2>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Console</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: active ? '700' : '500',
                  color: active ? '#FFF' : '#94A3B8',
                  backgroundColor: active ? '#7C3AED' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ paddingTop: '16px', borderTop: '1px solid #1E293B' }}>
          <button
            onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#1E293B', color: '#EF4444', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: '70px', borderBottom: '1px solid #1E293B', backgroundColor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '32px', paddingRight: '32px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#F8FAFC' }}>
            {NAV_ITEMS.find(n => n.href === pathname)?.label ?? 'Dashboard'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>Logged in as <strong style={{ color: '#F8FAFC' }}>admin@tribelink.app</strong></span>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', color: '#FFF' }}>
              A
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
