import React, { useState, useRef } from 'react';

/**
 * FloorStack — Digital File Stack Component
 *
 * The signature UI element: stacked folder/file tabs for floor navigation.
 * Hover = lift forward with elastic feel, others push back.
 * Click = select floor and trigger canvas render.
 */
export default function FloorStack({ floors, selectedFloor, onSelectFloor }) {
  const [hoveredFloor, setHoveredFloor] = useState(null);
  const tooltipTimeout = useRef(null);
  const [tooltipFloor, setTooltipFloor] = useState(null);

  const handleMouseEnter = (floorNo) => {
    setHoveredFloor(floorNo);
    tooltipTimeout.current = setTimeout(() => setTooltipFloor(floorNo), 350);
  };

  const handleMouseLeave = () => {
    setHoveredFloor(null);
    setTooltipFloor(null);
    clearTimeout(tooltipTimeout.current);
  };

  const getFloorStats = (floorNo) => {
    const rooms = floors[floorNo] || [];
    const total = rooms.length;
    const occupied = rooms.filter(r => r.occupancy_status === 'Occupied').length;
    const partial = rooms.filter(r => r.occupancy_status === 'Partially Occupied').length;
    const vacant = rooms.filter(r => r.occupancy_status === 'Vacant').length;
    const capacity = rooms.reduce((sum, r) => sum + (r.total_beds || 0), 0);
    const filled = rooms.reduce((sum, r) => sum + (r.beds?.filter(b => b.is_occupied).length || 0), 0);
    const occupancyRate = capacity > 0 ? Math.round((filled / capacity) * 100) : 0;

    return { total, occupied, partial, vacant, capacity, filled, occupancyRate };
  };

  const getStatusDot = (occupancyRate) => {
    if (occupancyRate >= 90) return '#10b981'; // green = nearly full
    if (occupancyRate >= 60) return '#f59e0b'; // yellow
    if (occupancyRate >= 30) return '#f97316'; // orange
    return '#ef4444'; // red = very empty
  };

  const floorNumbers = Object.keys(floors).map(Number).sort((a, b) => a - b);
  const overallStats = floorNumbers.reduce((acc, floorNo) => {
    const stats = getFloorStats(floorNo);
    acc.capacity += stats.capacity;
    acc.filled += stats.filled;
    return acc;
  }, { capacity: 0, filled: 0 });
  const overallOccupancy = overallStats.capacity > 0
    ? Math.round((overallStats.filled / overallStats.capacity) * 100)
    : 0;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            Floor Stack
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {floorNumbers.length} floors · {overallOccupancy}% occupied
          </div>
        </div>

      {/* Stacked Tabs */}
      <div className="floor-stack-container" style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
        {floorNumbers.map((floorNo, index) => {
          const stats = getFloorStats(floorNo);
          const isActive = selectedFloor === floorNo;
          const isHovered = hoveredFloor === floorNo;
          const showTooltip = tooltipFloor === floorNo && !isActive;
          const dotColor = getStatusDot(stats.occupancyRate);

          // Z-index: active > hovered > later floors stack on top of earlier
          const zIndex = isActive ? 100 : isHovered ? 50 : floorNumbers.length - index;

          return (
            <div
              key={floorNo}
              className={`floor-tab ${isActive ? 'active floor-selected floor-active' : ''}`}
              style={{
                zIndex,
                marginBottom: isActive ? 2 : -3,
              }}
              onClick={() => onSelectFloor(floorNo)}
              onMouseEnter={() => handleMouseEnter(floorNo)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="floor-label">
                Floor {floorNo}
              </div>

              <div className="floor-meta">
                <span>{stats.occupancyRate}%</span>
                <div
                  className="floor-dot"
                  style={{ background: dotColor }}
                />
              </div>

              {/* Focus-Hover Tooltip */}
              {showTooltip && (
                <div style={{
                  position: 'absolute',
                  left: '105%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  zIndex: 200,
                  minWidth: 160,
                  boxShadow: 'var(--shadow-lg)',
                  animation: 'fadeInUp 0.2s ease both',
                  pointerEvents: 'none',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>
                    Floor {floorNo}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span>Capacity: <b style={{ color: 'var(--text-primary)' }}>{stats.capacity}</b></span>
                    <span>Occupied: <b style={{ color: 'var(--text-primary)' }}>{stats.filled}</b></span>
                    <span>Status: <span style={{
                      color: dotColor,
                      fontWeight: 600,
                    }}>{stats.occupancyRate >= 90 ? 'Full' : stats.occupancyRate >= 60 ? 'Partial' : 'Low'}</span></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          <span>90%+ (Nearly Full)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
          <span>60-89% (Partial)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316' }} />
          <span>30-59% (Low)</span>
        </div>
      </div>
    </div>
  );
}
