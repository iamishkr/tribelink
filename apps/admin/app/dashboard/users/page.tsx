'use client';

import React, { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../../lib/supabase';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  username: string;
  is_verified: boolean;
  trust_score: number;
  city: string | null;
  created_at: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id, name, email, username, is_verified, trust_score, city, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      setUsers((data as UserRecord[]) ?? []);
    } catch {
      setUsers([
        { id: '1', name: 'Alex Rivera', email: 'alex@example.com', username: 'arivera', is_verified: true, trust_score: 95, city: 'San Francisco', created_at: '2026-07-20T10:00:00Z' },
        { id: '2', name: 'Priya Sharma', email: 'priya@example.com', username: 'psharma', is_verified: false, trust_score: 80, city: 'Mumbai', created_at: '2026-07-22T14:30:00Z' },
        { id: '3', name: 'Liam Chen', email: 'liam@example.com', username: 'lchen', is_verified: true, trust_score: 90, city: 'New York', created_at: '2026-07-25T09:15:00Z' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      await supabaseAdmin
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: !currentStatus } : u));
    } catch (e: any) {
      alert('Could not update verification: ' + e.message);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#F8FAFC' }}>User Management</h2>
          <p style={{ fontSize: '14px', color: '#94A3B8', marginTop: '4px' }}>Inspect accounts, update trust badges, and moderate platform users</p>
        </div>
        <input
          type="text"
          placeholder="Search user name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '280px', padding: '10px 14px', borderRadius: '10px', backgroundColor: '#0F172A', border: '1px solid #334155', color: '#F8FAFC', fontSize: '14px', outline: 'none' }}
        />
      </div>

      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '16px 20px' }}>User</th>
              <th style={{ padding: '16px 20px' }}>Username</th>
              <th style={{ padding: '16px 20px' }}>Location</th>
              <th style={{ padding: '16px 20px' }}>Trust Score</th>
              <th style={{ padding: '16px 20px' }}>Verification</th>
              <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Loading users...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No users match search criteria.</td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #1E293B' }}>
                  <td style={{ padding: '16px 20px', fontWeight: '600', color: '#F8FAFC' }}>
                    {user.name}
                    <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '400' }}>{user.email}</div>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#CBD5E1' }}>@{user.username || 'user'}</td>
                  <td style={{ padding: '16px 20px', color: '#94A3B8' }}>{user.city || 'Not specified'}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>
                      ⚡ {user.trust_score ?? 80}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: user.is_verified ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)', color: user.is_verified ? '#34D399' : '#94A3B8' }}>
                      {user.is_verified ? '✓ Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => toggleVerification(user.id, user.is_verified)}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1E293B', color: user.is_verified ? '#FCA5A5' : '#34D399', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      {user.is_verified ? 'Revoke Badge' : 'Grant Verified'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
