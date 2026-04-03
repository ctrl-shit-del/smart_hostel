import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, DoorOpen, MessageSquare, AlertTriangle, Building2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analytics/overview')
      .then(res => setData(res))
      .catch(() => toast.error('Failed to load dashboard'));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <LayoutDashboard size={28} /> Hostel Overview
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: '0.85rem' }}><Users size={16} style={{verticalAlign:-4}}/> Total Students</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{data?.metrics?.totalStudents || 1661}</div>
        </div>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid #ef4444' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: '0.85rem' }}><MessageSquare size={16} style={{verticalAlign:-4}}/> Active Complaints</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>{data?.metrics?.activeComplaints || 0}</div>
        </div>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: '0.85rem' }}><DoorOpen size={16} style={{verticalAlign:-4}}/> Overdue Gatepass</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>{data?.metrics?.overdueGatepasses || 0}</div>
        </div>
        <div className="card" style={{ padding: 20, background: 'var(--grad-brand)', color: 'white' }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 8, fontSize: '0.85rem' }}>Health Score</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{data?.healthScore || 98}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 24, minHeight: 400 }}>
          <h3 style={{ fontWeight: 800, marginBottom: 16 }}><Building2 size={20} style={{verticalAlign:-4}}/> Area Map (Placeholder)</h3>
          <div style={{ height: 300, background: 'var(--bg-elevated)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
            Interactive Floor Map goes here...
          </div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 800, marginBottom: 16, color: '#ef4444' }}><AlertTriangle size={20} style={{verticalAlign:-4}}/> Action Required</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 12, background: '#ef444415', borderRadius: 8, color: '#ef4444' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>3 Pending Overstays</div>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Gatepass exceeding limits</div>
            </div>
            <div style={{ padding: 12, background: '#f59e0b15', borderRadius: 8, color: '#f59e0b' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>2 Systemic Issues</div>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Plumbing - F1 & F2</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
