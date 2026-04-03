import React, { useState, useEffect } from 'react';
import { DoorOpen, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function GatepassManagement() {
  const [gatepasses, setGatepasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => { fetchGPS(); }, []);

  const fetchGPS = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gatepass');
      setGatepasses(res.gatepasses || []);
    } catch { toast.error('Failed to load gatepasses'); }
    finally { setLoading(false); }
  };

  const handleAction = async (id, action) => {
    setUpdatingId(id);
    try {
      if (action === 'approve') await api.put(`/gatepass/${id}/approve`);
      else await api.put(`/gatepass/${id}/reject`, { reason: 'Declined by Warden' });
      toast.success(`Gatepass ${action}d`);
      fetchGPS();
    } catch(err) { toast.error(err.message || 'Action failed'); }
    finally { setUpdatingId(null); }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <DoorOpen size={24} /> Gatepass Approvals
      </h1>

      {loading ? <Loader2 className="spin" /> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {gatepasses.map(gp => (
            <div key={gp._id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800 }}>{gp.student_name} ({gp.register_number}) - Room {gp.room_no}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {gp.type} to {gp.destination}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Exit: {format(new Date(gp.expected_exit), 'dd MMM, HH:mm')} | Return: {format(new Date(gp.expected_return), 'dd MMM, HH:mm')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {gp.status === 'Pending' ? (
                  <>
                    <button className="btn btn-sm" disabled={!!updatingId} style={{ background: '#ef444420', color: '#ef4444' }} onClick={() => handleAction(gp._id, 'reject')}><XCircle size={16}/> Reject</button>
                    <button className="btn btn-sm" disabled={!!updatingId} style={{ background: '#10b98120', color: '#10b981' }} onClick={() => handleAction(gp._id, 'approve')}><CheckCircle2 size={16}/> Approve</button>
                  </>
                ) : (
                  <span className="badge">{gp.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
