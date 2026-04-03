import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_COLOR = { Vacant: '#10b981', 'Partially Occupied': '#f59e0b', Occupied: '#6366f1', 'Under Maintenance': '#ef4444' };
const STATUS_CLASS = { Vacant: 'room-vacant', 'Partially Occupied': 'room-partial', Occupied: 'room-occupied', 'Under Maintenance': 'room-maintenance' };

export default function RoomAllocation() {
  const [grid, setGrid] = useState({});
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState('A Block');
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [bedId, setBedId] = useState('A');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [gridRes, vacRes] = await Promise.allSettled([
        api.get('/rooms/grid'),
        api.get('/rooms/vacancies'),
      ]);
      if (gridRes.value) setGrid(gridRes.value.grid || {});
      if (vacRes.value) setVacancies(vacRes.value.vacancies || []);
    } catch {}
    setLoading(false);
  };

  const blockData = grid[selectedBlock] || {};
  const floors = Object.keys(blockData).map(Number).sort((a, b) => a - b);
  const floorRooms = selectedFloor ? (blockData[selectedFloor] || []) : [];

  const handleAssign = async () => {
    if (!assignModal || !studentId || !bedId) { toast.error('Fill all fields'); return; }
    setAssigning(true);
    try {
      await api.post('/rooms/assign', { room_id: assignModal._id, bed_id: bedId, student_id: studentId });
      toast.success('Student assigned successfully!');
      setAssignModal(null); setStudentId(''); setBedId('A');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Assignment failed');
    } finally { setAssigning(false); }
  };

  // Summary
  const totalVacant = vacancies.filter((v) => v._id.block === selectedBlock).reduce((s, v) => s + v.vacant, 0);
  const totalOccupied = vacancies.filter((v) => v._id.block === selectedBlock).reduce((s, v) => s + v.occupied, 0);
  const totalRooms = vacancies.filter((v) => v._id.block === selectedBlock).reduce((s, v) => s + v.total_rooms, 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>Room Allocation</h1><p>Visual room grid — 15 floors × 60 rooms per block</p></div>

      {/* Block selector + summary */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        {['A Block', 'B Block', 'C Block', 'D1 Block'].map((b) => (
          <button key={b} onClick={() => setSelectedBlock(b)} className={`btn ${selectedBlock === b ? 'btn-primary' : 'btn-secondary'} btn-sm`}>{b}</button>
        ))}
        <div style={{ display: 'flex', gap: 16, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {[['Vacant', '#10b981'], ['Partial', '#f59e0b'], ['Occupied', '#6366f1'], ['Maintenance', '#ef4444']].map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} /> {label}
            </div>
          ))}
        </div>
      </div>

      {/* Vacancy summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Vacant Rooms', val: totalVacant, color: '#10b981' },
          { label: 'Occupied Rooms', val: totalOccupied, color: '#6366f1' },
          { label: 'Total Rooms', val: totalRooms, color: '#94a3b8' },
        ].map(({ label, val, color }) => (
          <div key={label} className="glass-card stat-card">
            <div className="stat-value" style={{ background: color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{val || '—'}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Floor selector */}
      <div className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>Select Floor</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {loading ? <div className="skeleton" style={{ height: 32, width: 300 }} /> : floors.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No room data — seed the database first</div>
          ) : floors.map((f) => (
            <button key={f} onClick={() => setSelectedFloor(selectedFloor === f ? null : f)}
              className={`btn ${selectedFloor === f ? 'btn-primary' : 'btn-secondary'} btn-sm`}>Floor {f}</button>
          ))}
        </div>
      </div>

      {/* Room grid for selected floor */}
      {selectedFloor && (
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Floor {selectedFloor} — {selectedBlock}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
            {floorRooms.map((room) => (
              <button
                key={room._id}
                onClick={() => { setSelectedRoom(room); setAssignModal(room); }}
                className={STATUS_CLASS[room.occupancy_status]}
                style={{
                  padding: '10px 6px', borderRadius: 8, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  background: 'none',
                }}
              >
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{room.room_number}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {room.beds?.filter((b) => b.is_occupied).length}/{room.total_beds}
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[room.occupancy_status] || '#475569' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setAssignModal(null)}>
          <div className="glass-card" style={{ maxWidth: 420, width: '100%', padding: 28 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Assign Room {assignModal.room_number}</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              {assignModal.block_name} · Floor {assignModal.floor_no} · {assignModal.room_type}
            </div>
            {/* Beds status */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>Current beds:</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(assignModal.beds || []).map((b) => (
                  <div key={b.bed_id} style={{ padding: '6px 12px', borderRadius: 6, background: b.is_occupied ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)', border: `1px solid ${b.is_occupied ? '#6366f1' : '#10b981'}`, fontSize: '0.8rem', fontWeight: 600 }}>
                    Bed {b.bed_id} {b.is_occupied ? `— ${b.student_name?.split(' ')[0]}` : '— Free'}
                  </div>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Student ID (MongoDB ObjectId)</label>
              <input className="input" placeholder="Paste student _id from database" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Bed</label>
              <select className="select" value={bedId} onChange={(e) => setBedId(e.target.value)}>
                {(assignModal.beds || []).filter((b) => !b.is_occupied).map((b) => (
                  <option key={b.bed_id} value={b.bed_id}>Bed {b.bed_id}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAssign} disabled={assigning}>
                {assigning ? 'Assigning...' : 'Assign →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
