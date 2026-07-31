'use client';

import React, { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../../lib/supabase';

interface CommunityRecord {
  id: string;
  name: string;
  category: string;
  type: string;
  member_count: number;
  post_count: number;
  created_at: string;
}

export default function CommunitiesManagementPage() {
  const [communities, setCommunities] = useState<CommunityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunities();
  }, []);

  async function fetchCommunities() {
    setLoading(true);
    try {
      const { data } = await supabaseAdmin
        .from('communities')
        .select('id, name, category, type, member_count, post_count, created_at')
        .order('member_count', { ascending: false });

      setCommunities((data as CommunityRecord[]) ?? []);
    } catch {
      setCommunities([
        { id: 'c1', name: 'React Native Builders', category: 'tech', type: 'public', member_count: 420, post_count: 85, created_at: '2026-07-15T08:00:00Z' },
        { id: 'c2', name: 'Mumbai Founders Club', category: 'startup', type: 'private', member_count: 180, post_count: 42, created_at: '2026-07-18T11:20:00Z' },
        { id: 'c3', name: 'UI/UX Design Tribe', category: 'creative', type: 'public', member_count: 310, post_count: 64, created_at: '2026-07-20T16:40:00Z' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteCommunity = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove community "${name}"?`)) return;

    try {
      await supabaseAdmin.from('communities').delete().eq('id', id);
      setCommunities(prev => prev.filter(c => c.id !== id));
    } catch (e: any) {
      alert('Failed to delete community: ' + e.message);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#F8FAFC' }}>Community Moderation</h2>
        <p style={{ fontSize: '14px', color: '#94A3B8', marginTop: '4px' }}>Inspect active tribes, member counts, and enforce community standards</p>
      </div>

      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '16px 20px' }}>Community Name</th>
              <th style={{ padding: '16px 20px' }}>Category</th>
              <th style={{ padding: '16px 20px' }}>Privacy</th>
              <th style={{ padding: '16px 20px' }}>Members</th>
              <th style={{ padding: '16px 20px' }}>Posts</th>
              <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Loading communities...</td>
              </tr>
            ) : communities.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No communities found.</td>
              </tr>
            ) : (
              communities.map(comm => (
                <tr key={comm.id} style={{ borderBottom: '1px solid #1E293B' }}>
                  <td style={{ padding: '16px 20px', fontWeight: '600', color: '#F8FAFC' }}>{comm.name}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', backgroundColor: 'rgba(59,130,246,0.15)', color: '#60A5FA', textTransform: 'capitalize' }}>
                      {comm.category}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#CBD5E1', textTransform: 'capitalize' }}>{comm.type}</td>
                  <td style={{ padding: '16px 20px', color: '#F8FAFC', fontWeight: '600' }}>{(comm.member_count ?? 0).toLocaleString()}</td>
                  <td style={{ padding: '16px 20px', color: '#94A3B8' }}>{(comm.post_count ?? 0).toLocaleString()}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDeleteCommunity(comm.id, comm.name)}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.1)', color: '#FCA5A5', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Delete Community
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
