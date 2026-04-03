import React, { useState, useEffect } from 'react';
import { Building2, Search, Filter, Users, Bed, ChevronDown, X, Loader2, AlertTriangle, Wrench } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  'Vacant': { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#10b981', label: 'Vacant' },
  'Partially Occupied': { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#f59e0b', label: 'Partial' },
  'Occupied': { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#ef4444', label: 'Full' },
  'Under Maintenance': { bg: 'rgba(107,114,128,0.15)', border: '#6b7280', text: '#6b7280', label: 'Maint.' },
};

export default function RoomAllocation() {
  const [grid, setGrid] = useState({});
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchReg, setSearchReg] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gridRes, vacRes] = await Promise.all([
        api.get('/rooms/grid?block=A Block'),
        api.get('/rooms/vacancies'),
      ]);
      setGrid(gridRes.grid || {});
      setVacancies(vacRes.vacancies || []);
    } catch (err) {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const currentFloorRooms = (grid['A Block']?.[selectedFloor] || []).filter(room => {
    if (typeFilter === 'all') return true;
    if (typeFilter === 'ac') return room.room_type?.includes('AC') && !room.room_type?.includes('NAC');
    if (typeFilter === 'nac') return room.room_type?.includes('NAC');
    return true;
  });

  const floorVacancy = vacancies.find(v => v._id?.floor === selectedFloor && v._id?.block === 'A Block');

  const handleAssign = async (roomId, bedId) => {
    if (!searchReg.trim()) { toast.error('Enter a register number'); return; }
    setAssigning(true);
    try {
      // Find student by register number
      const usersRes = await api.get('/users?register_number=' + searchReg.toUpperCase());
      const student = usersRes.users?.[0];
      if (!student) { toast.error('Student not found: ' + searchReg); setAssigning(false); return; }
      await api.post('/rooms/assign', { room_id: roomId, bed_id: bedId, student_id: student._id });
      toast.success(`Assigned ${searchReg} to Bed ${bedId}`);
      setSearchReg('');
      setSelectedRoom(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12, color: 'var(--text-muted)' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading rooms...
      </div>
    );
  }

  const totalFloors = Object.keys(grid['A Block'] || {}).map(Number).sort((a, b) => a - b);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={24} /> Room Allocation
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>A Block — Visual Grid & Bed Assignment</p>
        </div>
      </div>

      {/* Vacancy Summary Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Total Rooms', val: currentFloorRooms.length, color: '#6366f1' },
            { label: 'Vacant', val: floorVacancy?.vacant || 0, color: '#10b981' },
            { label: 'Partial', val: floorVacancy?.partial || 0, color: '#f59e0b' },
            { label: 'Full', val: floorVacancy?.occupied || 0, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Floor Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px 6px', overflowX: 'auto' }}>
          {totalFloors.map(f => (
            <button
              key={f}
              onClick={() => setSelectedFloor(f)}
              style={{
                padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                background: selectedFloor === f ? 'var(--grad-brand)' : 'transparent',
                color: selectedFloor === f ? 'white' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              F{f}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px 6px' }}>
          {[
            { val: 'all', label: 'All' },
            { val: 'ac', label: 'AC' },
            { val: 'nac', label: 'NAC' },
          ].map(t => (
            <button
              key={t.val}
              onClick={() => setTypeFilter(t.val)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                background: typeFilter === t.val ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: typeFilter === t.val ? '#6366f1' : 'var(--text-muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {currentFloorRooms.map(room => {
          const sc = STATUS_COLORS[room.occupancy_status] || STATUS_COLORS['Vacant'];
          const occupiedCount = room.beds?.filter(b => b.is_occupied).length || 0;
          return (
            <div
              key={room._id}
              onClick={() => setSelectedRoom(room)}
              className="card"
              style={{
                padding: 12, cursor: 'pointer', border: `1px solid ${sc.border}33`,
                background: sc.bg, transition: 'all 0.2s', position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 20px ${sc.border}22`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>{room.room_number}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: sc.text, background: `${sc.border}22`, padding: '2px 6px', borderRadius: 4 }}>
                  {sc.label}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>{room.room_type}</div>
              {/* Bed dots */}
              <div style={{ display: 'flex', gap: 4 }}>
                {room.beds?.map(bed => (
                  <div key={bed.bed_id} title={bed.is_occupied ? `${bed.register_number} (${bed.student_name})` : `Bed ${bed.bed_id} — Vacant`}
                    style={{
                      width: 20, height: 20, borderRadius: 4, fontSize: '0.6rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: bed.is_occupied ? '#ef444433' : '#10b98133',
                      color: bed.is_occupied ? '#ef4444' : '#10b981',
                      border: `1px solid ${bed.is_occupied ? '#ef444455' : '#10b98155'}`,
                    }}
                  >
                    {bed.bed_id}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
                {occupiedCount}/{room.total_beds} beds
              </div>
            </div>
          );
        })}
      </div>

      {currentFloorRooms.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          No rooms found for this floor/filter.
        </div>
      )}

      {/* Room Detail Drawer */}
      {selectedRoom && (
        <>
          <div onClick={() => setSelectedRoom(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border)', zIndex: 201, overflowY: 'auto', padding: 24,
            animation: 'slideIn 0.2s ease-out',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Room {selectedRoom.room_number}</h2>
              <button onClick={() => setSelectedRoom(null)} className="btn btn-ghost btn-icon"><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Floor</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{selectedRoom.floor_no}</div>
              </div>
              <div className="card" style={{ padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Type</div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedRoom.room_type}</div>
              </div>
            </div>

            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bed size={16} /> Bed Status
            </h3>

            {selectedRoom.beds?.map(bed => (
              <div key={bed.bed_id} style={{
                padding: 12, marginBottom: 8, borderRadius: 'var(--radius-md)',
                border: `1px solid ${bed.is_occupied ? '#ef444433' : '#10b98133'}`,
                background: bed.is_occupied ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, fontWeight: 800, fontSize: '0.8rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: bed.is_occupied ? '#ef444422' : '#10b98122',
                      color: bed.is_occupied ? '#ef4444' : '#10b981',
                    }}>
                      {bed.bed_id}
                    </div>
                    <div>
                      {bed.is_occupied ? (
                        <>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{bed.student_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bed.register_number}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>Available</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Assign to vacant bed */}
            {selectedRoom.beds?.some(b => !b.is_occupied) && (
              <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 10 }}>Assign Student to Bed</h4>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    placeholder="Register Number (e.g. 24BCE1234)"
                    value={searchReg}
                    onChange={e => setSearchReg(e.target.value.toUpperCase())}
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {selectedRoom.beds?.filter(b => !b.is_occupied).map(bed => (
                    <button
                      key={bed.bed_id}
                      className="btn btn-primary btn-sm"
                      disabled={assigning || !searchReg.trim()}
                      onClick={() => handleAssign(selectedRoom._id, bed.bed_id)}
                      style={{ fontSize: '0.8rem' }}
                    >
                      {assigning ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : `Assign Bed ${bed.bed_id}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}
