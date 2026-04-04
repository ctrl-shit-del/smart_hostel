import React, { useState } from 'react';
import { X, User, Phone, Mail, Bed, AlertTriangle, Loader2, DoorOpen, Wrench } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

/**
 * RoomDetailModal — Centered overlay for room/student details.
 *
 * Shows room info header, student cards per bed, status indicators,
 * complaint badges, and bed assignment form for vacant beds.
 */
export default function RoomDetailModal({ room, onClose, onRefresh }) {
  const [searchReg, setSearchReg] = useState('');
  const [assigning, setAssigning] = useState(false);

  if (!room) return null;

  const occupiedBeds = room.beds?.filter(b => b.is_occupied) || [];
  const vacantBeds = room.beds?.filter(b => !b.is_occupied) || [];

  const handleAssign = async (bedId) => {
    if (!searchReg.trim()) {
      toast.error('Enter a register number');
      return;
    }
    setAssigning(true);
    try {
      const usersRes = await api.get('/users?register_number=' + searchReg.toUpperCase());
      const student = usersRes.users?.[0];
      if (!student) {
        toast.error('Student not found: ' + searchReg);
        setAssigning(false);
        return;
      }
      await api.post('/rooms/assign', {
        room_id: room._id,
        bed_id: bedId,
        student_id: student._id,
      });
      toast.success(`Assigned ${searchReg} to Bed ${bedId}`);
      setSearchReg('');
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-center" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 8, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={e => { e.target.style.color = 'var(--text-primary)'; e.target.style.borderColor = 'var(--border-accent)'; }}
          onMouseLeave={e => { e.target.style.color = 'var(--text-muted)'; e.target.style.borderColor = 'var(--border)'; }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>
            Room {room.room_number}
          </h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-brand">{room.room_type}</span>
            <span className="badge badge-muted">Floor {room.floor_no}</span>
            <span className={`badge ${
              room.occupancy_status === 'Occupied' ? 'badge-danger' :
              room.occupancy_status === 'Partially Occupied' ? 'badge-warning' :
              'badge-success'
            }`}>
              {room.occupancy_status}
            </span>
            {room.maintenance_flag && (
              <span className="badge badge-danger">
                <Wrench size={10} /> Maintenance
              </span>
            )}
          </div>
        </div>

        {/* Room stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20,
        }}>
          <div style={{
            textAlign: 'center', padding: 10,
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-brand-light)' }}>
              {room.total_beds}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Beds</div>
          </div>
          <div style={{
            textAlign: 'center', padding: 10,
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>
              {occupiedBeds.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Occupied</div>
          </div>
          <div style={{
            textAlign: 'center', padding: 10,
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
              {vacantBeds.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Available</div>
          </div>
        </div>

        {/* Student cards */}
        <div style={{ marginBottom: vacantBeds.length > 0 ? 20 : 0 }}>
          <h3 style={{
            fontSize: '0.85rem', fontWeight: 700, marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Bed size={14} /> Residents
          </h3>

          {room.beds?.map((bed) => (
            <div
              key={bed.bed_id}
              style={{
                padding: '14px 16px',
                marginBottom: 8,
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${bed.is_occupied ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)'}`,
                background: bed.is_occupied ? 'rgba(99,102,241,0.04)' : 'rgba(16,185,129,0.04)',
                transition: 'all 200ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Bed indicator */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.85rem',
                  background: bed.is_occupied ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)',
                  color: bed.is_occupied ? '#818cf8' : '#10b981',
                  flexShrink: 0,
                }}>
                  {bed.bed_id}
                </div>

                {bed.is_occupied ? (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700, fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <User size={13} style={{ opacity: 0.5 }} />
                      {bed.student_name}
                    </div>
                    <div style={{
                      fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3,
                      display: 'flex', gap: 12, flexWrap: 'wrap',
                    }}>
                      <span>{bed.register_number}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#10b981' }}>
                      Available
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Bed {bed.bed_id} — Ready for assignment
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Assign to vacant bed */}
        {vacantBeds.length > 0 && (
          <div style={{
            padding: 16,
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10 }}>
              Assign Student to Bed
            </h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                className="input"
                placeholder="Register Number (e.g. 24BCE1234)"
                value={searchReg}
                onChange={e => setSearchReg(e.target.value.toUpperCase())}
                style={{ flex: 1, fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {vacantBeds.map(bed => (
                <button
                  key={bed.bed_id}
                  className="btn btn-primary btn-sm"
                  disabled={assigning || !searchReg.trim()}
                  onClick={() => handleAssign(bed.bed_id)}
                  style={{ fontSize: '0.8rem' }}
                >
                  {assigning ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    `Assign Bed ${bed.bed_id}`
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
