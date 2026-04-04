import React, { useEffect, useMemo, useState } from 'react';
import { DoorOpen, Loader2, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import api from '../../lib/api';

const statCardStyle = {
  padding: 20,
  borderRadius: 18,
  border: '1px solid var(--border)',
  background: 'linear-gradient(180deg, rgba(20,184,166,0.08) 0%, rgba(15,23,42,0.06) 100%)',
};

export default function ProctorDashboard() {
  const [gatepasses, setGatepasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get('/gatepass');
        setGatepasses(response.gatepasses || []);
      } catch (_error) {
        toast.error('Failed to load leave requests.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const pending = gatepasses.filter((item) => item.status === 'Pending');
    const approved = gatepasses.filter((item) => item.status === 'Approved');
    const rejected = gatepasses.filter((item) => item.status === 'Rejected');

    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      latestPending: pending.slice(0, 5),
    };
  }, [gatepasses]);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1>Proctor Dashboard</h1>
        <p>Review leave and outing requests, then release approved students through the gatepass flow.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 className="spin" />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={statCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f59e0b', marginBottom: 10 }}>
                <Clock3 size={18} />
                <span style={{ fontWeight: 700 }}>Pending</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.pending}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Requests waiting for proctor action</div>
            </div>

            <div style={statCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#10b981', marginBottom: 10 }}>
                <CheckCircle2 size={18} />
                <span style={{ fontWeight: 700 }}>Approved</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.approved}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Students ready for gatepass processing</div>
            </div>

            <div style={statCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444', marginBottom: 10 }}>
                <XCircle size={18} />
                <span style={{ fontWeight: 700 }}>Rejected</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.rejected}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Requests declined by the proctor</div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <DoorOpen size={20} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Latest Pending Requests</h2>
            </div>

            {stats.latestPending.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No pending requests right now.</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {stats.latestPending.map((gatepass) => (
                  <div key={gatepass._id} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                      <div style={{ fontWeight: 700 }}>{gatepass.student_name}</div>
                      <span className="badge">{gatepass.type}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {gatepass.destination} • {format(new Date(gatepass.expected_exit), 'dd MMM, hh:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
