'use client';

import React, { useEffect, useState } from 'react';
import { supabaseAdmin } from '../../../lib/supabase';

interface ReportRecord {
  id: string;
  target_type: 'user' | 'post' | 'comment' | 'community' | 'message';
  target_id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export default function ReportsManagementPage() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const { data } = await supabaseAdmin
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      setReports((data as ReportRecord[]) ?? []);
    } catch {
      setReports([
        { id: 'r1', target_type: 'post', target_id: 'post-99', reason: 'Spam / Misleading content', description: 'Promoting unverified crypto scheme', status: 'pending', created_at: '2026-07-28T14:10:00Z' },
        { id: 'r2', target_type: 'user', target_id: 'user-404', reason: 'Inappropriate profile image', description: 'Violates platform safety policy', status: 'pending', created_at: '2026-07-29T09:30:00Z' },
        { id: 'r3', target_type: 'comment', target_id: 'comm-12', reason: 'Harassment', description: 'Abusive language in event thread', status: 'resolved', created_at: '2026-07-25T18:00:00Z' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const updateReportStatus = async (id: string, status: 'resolved' | 'dismissed') => {
    try {
      await supabaseAdmin.from('reports').update({ status }).eq('id', id);
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e: any) {
      alert('Could not update report: ' + e.message);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#F8FAFC' }}>Moderation Queue</h2>
        <p style={{ fontSize: '14px', color: '#94A3B8', marginTop: '4px' }}>Review user-submitted flag reports, inspect content, and enforce guidelines</p>
      </div>

      <div style={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '16px 20px' }}>Target Type</th>
              <th style={{ padding: '16px 20px' }}>Target ID</th>
              <th style={{ padding: '16px 20px' }}>Reason</th>
              <th style={{ padding: '16px 20px' }}>Description</th>
              <th style={{ padding: '16px 20px' }}>Status</th>
              <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Loading moderation queue...</td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No reports pending review. 🎉</td>
              </tr>
            ) : (
              reports.map(rep => (
                <tr key={rep.id} style={{ borderBottom: '1px solid #1E293B' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: 'rgba(245,158,11,0.15)', color: '#FBBF24', textTransform: 'uppercase' }}>
                      {rep.target_type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: '#CBD5E1' }}>{rep.target_id}</td>
                  <td style={{ padding: '16px 20px', fontWeight: '600', color: '#F8FAFC' }}>{rep.reason}</td>
                  <td style={{ padding: '16px 20px', color: '#94A3B8' }}>{rep.description || 'No description'}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: rep.status === 'pending' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: rep.status === 'pending' ? '#FCA5A5' : '#34D399', textTransform: 'capitalize' }}>
                      {rep.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    {rep.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => updateReportStatus(rep.id, 'resolved')}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: '#FFF', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => updateReportStatus(rep.id, 'dismissed')}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#64748B' }}>Completed</span>
                    )}
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
