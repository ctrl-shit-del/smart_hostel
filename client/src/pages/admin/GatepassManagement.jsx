import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_BADGE = { Pending: 'badge-warning', Approved: 'badge-success', Rejected: 'badge-danger', Active: 'badge-info', Returned: 'badge-muted', Expired: 'badge-danger' };

export default function GatepassManagement() {
  const [passes, setPasses] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [filter, setFilter] = useState('Pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, [filter]);

  const fetchAll = async () => {
    try {
      const [pRes, oRes] = await Promise.allSettled([
        api.get(`/gatepass?status=${filter}&limit=50`),
        api.get('/gatepass/overdue'),
      ]);
      setPasses(pRes.value?.gatepasses || []);
      setOverdue(oRes.value?.overdue || []);
    } catch {}
    setLoading(false);
  };

  const approve = async (id) => {
    try { await api.put(`/gatepass/${id}/approve`); toast.success('Gatepass approved, QR sent to student!'); fetchAll(); }
    catch (err) { toast.error(err.message || 'Failed'); }
  };

  const reject = async (id) => {
    const reason = prompt('Reason for rejection (optional):') || 'Not approved';
    try { await api.put(`/gatepass/${id}/reject`, { reason }); toast.success('Gatepass rejected'); fetchAll(); }
    catch (err) { toast.error(err.message || 'Failed'); }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>Gatepass Management</h1><p>Approve/reject student movement requests</p></div>

      {overdue.length > 0 && (
        <div className="alert-panel" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>⚠️ {overdue.length} student(s) have not returned on time</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {overdue.slice(0, 3).map((o) => o.student_name).join(', ')}{overdue.length > 3 ? ` and ${overdue.length - 3} more` : ''}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['Pending', 'Approved', 'Active', 'Returned', 'Rejected'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}>{s}</button>
        ))}
      </div>

      <div className="glass-card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Student</th><th>Type</th><th>Destination</th><th>Exit</th><th>Return</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center' }}><div className="skeleton" style={{ height: 20 }} /></td></tr>}
              {!loading && passes.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No {filter.toLowerCase()} gatepasses</td></tr>}
              {passes.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.student_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.register_number} · Room {p.room_no}</div>
                  </td>
                  <td><span className="badge badge-brand">{p.type}</span></td>
                  <td style={{ fontSize: '0.875rem' }}>{p.destination}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{format(new Date(p.expected_exit), 'dd MMM h:mm a')}</td>
                  <td style={{ fontSize: '0.8rem', color: p.is_overdue ? '#ef4444' : 'var(--text-muted)', fontWeight: p.is_overdue ? 700 : 400 }}>
                    {format(new Date(p.expected_return), 'dd MMM h:mm a')} {p.is_overdue ? '⚠️' : ''}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[p.status] || 'badge-muted'}`}>{p.status}</span></td>
                  <td>
                    {p.status === 'Pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-success btn-sm" onClick={() => approve(p._id)}>✓ Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => reject(p._id)}>✗ Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
