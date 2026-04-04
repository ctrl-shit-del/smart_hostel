import React, { useState, useMemo } from 'react';
import { Flame, Search } from 'lucide-react';

function positionRingRooms(ringRooms, config) {
  const { top: topCount, right: rightCount, bottom: bottomCount, left: leftCount } = config.counts;
  const [top, right, bottom, left] = [
    ringRooms.slice(0, topCount),
    ringRooms.slice(topCount, topCount + rightCount),
    ringRooms.slice(topCount + rightCount, topCount + rightCount + bottomCount),
    ringRooms.slice(topCount + rightCount + bottomCount, topCount + rightCount + bottomCount + leftCount),
  ];

  const positions = [];

  const pushHorizontal = (rooms, y, fromLeft = true) => {
    const spacing = (config.bounds.right - config.bounds.left) / Math.max(rooms.length, 1);
    rooms.forEach((room, index) => {
      const offset = fromLeft ? index : rooms.length - 1 - index;
      positions.push({
        room,
        ring: config.ring,
        x: config.bounds.left + offset * spacing + (spacing - config.roomWidth) / 2,
        y,
        w: config.roomWidth,
        h: config.roomHeight,
      });
    });
  };

  const pushVertical = (rooms, x, fromTop = true) => {
    const spacing = (config.bounds.bottom - config.bounds.top) / Math.max(rooms.length, 1);
    rooms.forEach((room, index) => {
      const offset = fromTop ? index : rooms.length - 1 - index;
      positions.push({
        room,
        ring: config.ring,
        x,
        y: config.bounds.top + offset * spacing + (spacing - config.roomHeight) / 2,
        w: config.roomWidth,
        h: config.roomHeight,
      });
    });
  };

  pushHorizontal(top, config.topY, true);
  pushVertical(right, config.rightX, true);
  pushHorizontal(bottom, config.bottomY, false);
  pushVertical(left, config.leftX, false);

  return positions;
}

function distributeSides(total) {
  const weights = [0.3, 0.2, 0.3, 0.2];
  const counts = weights.map((weight) => Math.floor(total * weight));
  let assigned = counts.reduce((sum, count) => sum + count, 0);
  let index = 0;

  while (assigned < total) {
    counts[index % counts.length] += 1;
    assigned += 1;
    index += 1;
  }

  return {
    top: counts[0],
    right: counts[1],
    bottom: counts[2],
    left: counts[3],
  };
}

/**
 * FloorCanvas — Spatial Room Plan Renderer
 *
 * Renders rooms in a rectangular ring layout around a courtyard.
 * Rooms arranged: Top row, Right column, Bottom row, Left column.
 * Color coded by occupancy. Heatmap toggle for complaint density.
 */
export default function FloorCanvas({ rooms, floorNo, blockName, heatmapData, onRoomClick }) {
  const [heatmapOn, setHeatmapOn] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRooms = useMemo(() => (
    (rooms || []).filter((room) => {
      if (filterStatus !== 'all') {
        if (filterStatus === 'empty' && room.occupancy_status !== 'Vacant') return false;
        if (filterStatus === 'issues' && !room.maintenance_flag) return false;
        if (filterStatus === 'full' && room.occupancy_status !== 'Occupied') return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchRoom = String(room.room_number).toLowerCase().includes(term);
        const matchStudent = room.beds?.some((bed) =>
          bed.student_name?.toLowerCase().includes(term) ||
          bed.register_number?.toLowerCase().includes(term)
        );
        if (!matchRoom && !matchStudent) return false;
      }
      return true;
    })
  ), [rooms, filterStatus, searchTerm]);

  // Compute room positions in outer + inner ring layout
  const roomLayout = useMemo(() => {
    if (!filteredRooms.length) return [];

    const sortedRooms = [...filteredRooms].sort((a, b) => String(a.room_number).localeCompare(String(b.room_number)));
    const innerStart = sortedRooms.length > 12 ? Math.max(4, Math.round(sortedRooms.length * 0.34)) : 0;
    const innerRooms = innerStart > 0 ? sortedRooms.slice(-innerStart) : [];
    const outerRooms = innerStart > 0 ? sortedRooms.slice(0, sortedRooms.length - innerStart) : sortedRooms;

    const outerCounts = distributeSides(outerRooms.length);
    const innerCounts = distributeSides(innerRooms.length);

    const outerLayout = positionRingRooms(outerRooms, {
      ring: 'outer',
      counts: outerCounts,
      bounds: { left: 4, right: 96, top: 16, bottom: 84 },
      roomWidth: 7.4,
      roomHeight: 8.8,
      topY: 4,
      rightX: 88.6,
      bottomY: 87.2,
      leftX: 4,
    });

    const innerLayout = positionRingRooms(innerRooms, {
      ring: 'inner',
      counts: innerCounts,
      bounds: { left: 20, right: 80, top: 30, bottom: 70 },
      roomWidth: 6.2,
      roomHeight: 7.2,
      topY: 21,
      rightX: 73.8,
      bottomY: 71.6,
      leftX: 20,
    });

    return [...outerLayout, ...innerLayout];
  }, [filteredRooms]);

  // Compute quick stats
  const stats = useMemo(() => {
    if (!filteredRooms.length) return { occupancy: 0, empty: 0, issues: 0, totalRooms: 0 };
    const capacity = filteredRooms.reduce((s, r) => s + (r.total_beds || 0), 0);
    const filled = filteredRooms.reduce((s, r) => s + (r.beds?.filter((b) => b.is_occupied).length || 0), 0);
    const empty = filteredRooms.filter((r) => r.occupancy_status === 'Vacant').length;
    const issues = filteredRooms.filter((r) => r.maintenance_flag).length;
    return {
      occupancy: capacity > 0 ? Math.round((filled / capacity) * 100) : 0,
      empty,
      issues,
      totalRooms: filteredRooms.length,
    };
  }, [filteredRooms]);

  const getStatusClass = (room) => {
    if (room.maintenance_flag) return 'status-maintenance';
    const occupied = room.beds?.filter(b => b.is_occupied).length || 0;
    const total = room.total_beds || 1;
    const free = total - occupied;
    if (free === 0) return 'status-full';
    if (free === 1) return 'status-partial';
    if (occupied === 0) return 'status-empty';
    return 'status-few';
  };

  const getBedCount = (room) => {
    const occupied = room.beds?.filter(b => b.is_occupied).length || 0;
    return `${occupied}/${room.total_beds || 0}`;
  };

  return (
    <div className="floor-canvas canvas-enter canvas-enter-active" style={{ flex: 1 }}>
      {/* Context bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 10,
      }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            {blockName} <span style={{ color: 'var(--text-muted)' }}>›</span> Floor {floorNo}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }} />
            <input
              className="input"
              placeholder="Search room / student"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 32, width: 180, fontSize: '0.8rem', height: 34 }}
            />
          </div>

          {/* Filters */}
          <div style={{
            display: 'flex', gap: 4,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: 3,
          }}>
            {[
              { val: 'all', label: 'All' },
              { val: 'empty', label: 'Empty' },
              { val: 'full', label: 'Full' },
              { val: 'issues', label: 'Issues' },
            ].map(f => (
              <button
                key={f.val}
                onClick={() => setFilterStatus(f.val)}
                style={{
                  padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.7rem',
                  background: filterStatus === f.val ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: filterStatus === f.val ? '#6366f1' : 'var(--text-muted)',
                  transition: 'all 200ms ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Heatmap toggle */}
          <button
            className={`btn btn-sm ${heatmapOn ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setHeatmapOn(!heatmapOn)}
            style={{ height: 34, fontSize: '0.75rem' }}
          >
            <Flame size={14} /> {heatmapOn ? 'Heatmap ON' : 'Heatmap'}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{
        display: 'flex', gap: 20, marginBottom: 16, padding: '10px 16px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.8rem',
      }}>
        <span style={{ color: 'var(--text-muted)' }}>
          Occupancy: <b style={{ color: stats.occupancy >= 80 ? '#10b981' : stats.occupancy >= 50 ? '#f59e0b' : '#ef4444' }}>{stats.occupancy}%</b>
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          Empty Rooms: <b style={{ color: '#10b981' }}>{stats.empty}</b>
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          Issues: <b style={{ color: stats.issues > 0 ? '#ef4444' : '#10b981' }}>{stats.issues}</b>
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          Total: <b style={{ color: 'var(--text-primary)' }}>{stats.totalRooms}</b>
        </span>
      </div>

      {/* Spatial Room Plan */}
      <div className="floor-plan-ring" style={{ minHeight: 420 }}>
        <div className="floor-plan-corridor outer">Corridor</div>
        <div className="floor-plan-corridor inner">Inner Rooms</div>
        {/* Courtyard */}
        <div className="floor-plan-courtyard">
          Courtyard
        </div>

        {/* Rooms positioned absolutely within ring */}
        {roomLayout.map(({ room, ring, x, y, w, h }) => {
          const statusClass = getStatusClass(room);
          const heatLevel = heatmapOn
            ? (heatmapData?.[room.room_number] || heatmapData?.[`floor_${floorNo}`] || 0)
            : 0;

          return (
            <div
              key={room._id || room.room_number}
              className={`room-block ${statusClass} room-ring-${ring}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${w}%`,
                height: `${h}%`,
                flexDirection: 'column',
                gap: 1,
                ...(heatmapOn && heatLevel > 0 ? {
                  boxShadow: `0 0 ${6 + heatLevel * 4}px rgba(239,68,68,${0.2 + heatLevel * 0.15})`,
                  borderColor: `rgba(239,68,68,${0.3 + heatLevel * 0.2})`,
                } : {}),
              }}
              onClick={() => onRoomClick(room)}
              title={`Room ${room.room_number} — ${room.room_type} — ${getBedCount(room)} beds`}
            >
              <span style={{ fontSize: '0.65rem', lineHeight: 1 }}>{room.room_number}</span>
              <span style={{ fontSize: '0.55rem', opacity: 0.7 }}>{getBedCount(room)}</span>
            </div>
          );
        })}
      </div>

      {/* Color legend */}
      <div style={{
        display: 'flex', gap: 16, marginTop: 12, fontSize: '0.7rem',
        color: 'var(--text-muted)', justifyContent: 'center',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.5)' }} />
          Full
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.5)' }} />
          1 Free
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(249,115,22,0.2)', border: '1px solid rgba(249,115,22,0.5)' }} />
          2+ Free
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)' }} />
          Empty
        </span>
      </div>
    </div>
  );
}
