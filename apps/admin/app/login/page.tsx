'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('admin@tribelink.app');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Small delay so the button animation fires
    await new Promise(r => setTimeout(r, 400));

    try {
      const adminEmail    = process.env.NEXT_PUBLIC_ADMIN_EMAIL    || 'admin@tribelink.app';
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'Admin@TribeLink2025';

      if (email.trim().toLowerCase() !== adminEmail.toLowerCase()) {
        throw new Error('Access denied. Wrong admin email.');
      }
      if (password !== adminPassword) {
        throw new Error('Incorrect password. Please try again.');
      }

      // Store session flag in localStorage
      localStorage.setItem('tribelink_admin_auth', 'true');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdmin = () => {
    localStorage.setItem('tribelink_admin_auth', 'true');
    router.push('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0F19', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#1E293B', padding: '36px', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #7C3AED, #6366F1)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
            🛡️
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#F8FAFC' }}>TribeLink Admin</h1>
          <p style={{ fontSize: '14px', color: '#94A3B8', marginTop: '6px' }}>Platform Moderation &amp; Management</p>
        </div>

        {/* Credentials hint */}
        <div style={{ backgroundColor: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: '#C4B5FD' }}>
          <strong>Default credentials:</strong><br />
          📧 admin@tribelink.app<br />
          🔑 Admin@TribeLink2025
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '12px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '20px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', backgroundColor: '#0F172A', border: '1px solid #334155', color: '#F8FAFC', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', backgroundColor: '#0F172A', border: '1px solid #334155', color: '#F8FAFC', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #7C3AED, #6366F1)', color: '#FFF', fontWeight: '700', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '4px' }}
          >
            {loading ? 'Signing in...' : '🔐 Sign In as Admin'}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #334155', textAlign: 'center' }}>
          <button
            onClick={handleDemoAdmin}
            style={{ background: 'transparent', border: '1px solid #475569', color: '#94A3B8', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', width: '100%' }}
          >
            ⚡ Quick Demo Access (Skip Login)
          </button>
        </div>
      </div>
    </div>
  );
}
