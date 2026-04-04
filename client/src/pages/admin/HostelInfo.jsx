import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, ChevronLeft, Loader2, Lock
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import FloorStack from '../../components/hostel/FloorStack';
import FloorCanvas from '../../components/hostel/FloorCanvas';
import RoomDetailModal from '../../components/hostel/RoomDetailModal';

const BLOCKS = [
  { name: 'A Block', label: 'A', available: true },
  { name: 'B Block', label: 'B', available: false },
  { name: 'C Block', label: 'C', available: false },
  { name: 'D1 Block', label: 'D1', available: false },
  { name: 'D2 Block', label: 'D2', available: false },
  { name: 'E Block', label: 'E', available: false },
];

function getBlockSummary(blockGrid) {
  const floorNumbers = Object.keys(blockGrid || {});
  const rooms = floorNumbers.flatMap((floor) => blockGrid[floor] || []);
  const capacity = rooms.reduce((sum, room) => sum + (room.total_beds || 0), 0);
  const filled = rooms.reduce(
    (sum, room) => sum + (room.beds?.filter((bed) => bed.is_occupied).length || 0),
    0,
  );

  return {
    totalFloors: floorNumbers.length,
    totalRooms: rooms.length,
    occupancy: capacity > 0 ? Math.round((filled / capacity) * 100) : 0,
  };
}

export default function HostelInfo() {
  // State: flow step
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Data
  const [grid, setGrid] = useState({});
  const [heatmapData, setHeatmapData] = useState({});
  const [loading, setLoading] = useState(false);

  // Load rooms when block is selected
  useEffect(() => {
    if (!selectedBlock) return;

    setSelectedFloor(null);
    setSelectedRoom(null);

    setLoading(true);
    Promise.all([
      api.get(`/rooms/grid?block=${selectedBlock}`),
      api.get('/analytics/complaints/heatmap').catch(() => ({ heatmap: [] })),
    ])
      .then(([gridRes, heatRes]) => {
        setGrid(gridRes.grid || {});

        // Build heatmap lookup: room_number → complaint count
        const hm = {};
        (heatRes.heatmap || []).forEach(h => {
          // Simplified: use floor-level for now
          if (h._id?.floor) {
            hm[`floor_${h._id.floor}`] = (hm[`floor_${h._id.floor}`] || 0) + h.count;
          }
        });
        setHeatmapData(hm);
      })
      .catch(() => toast.error('Failed to load hostel data'))
      .finally(() => setLoading(false));
  }, [selectedBlock]);

  // Current floor rooms
  const blockGrid = grid[selectedBlock] || {};
  const currentFloorRooms = selectedFloor ? (blockGrid[selectedFloor] || []) : [];
  const blockSummary = useMemo(() => getBlockSummary(blockGrid), [blockGrid]);

  const resetToBlocks = () => {
    setSelectedBlock(null);
    setSelectedFloor(null);
    setSelectedRoom(null);
  };

  const selectBlock = (blockName) => {
    setSelectedBlock(blockName);
    setSelectedFloor(null);
    setSelectedRoom(null);
  };

  const handleRefresh = () => {
    if (selectedBlock) {
      setLoading(true);
      api.get(`/rooms/grid?block=${selectedBlock}`)
        .then(res => setGrid(res.grid || {}))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{
          fontSize: '1.75rem', fontWeight: 900,
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 6,
        }}>
          <Building2 size={26} /> Hostel Information
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Spatial hostel explorer with block, floor, and room-level occupancy details
        </p>
      </div>

      {/* Back navigation */}
      {selectedBlock && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={resetToBlocks}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.85rem', padding: 0,
              transition: 'color 200ms ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ChevronLeft size={16} /> Back to blocks
          </button>
        </div>
      )}

      <div style={{
        flex: 1,
        display: 'flex',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--bg-card)',
        minHeight: 0,
      }}>
        <div style={{ width: '22%', minWidth: 200, maxWidth: 260, flexShrink: 0 }}>
          {!selectedBlock ? (
            <div style={{
              height: '100%',
              padding: 18,
              background: 'var(--bg-surface)',
              borderRight: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Blocks</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Choose a hostel wing to unlock the floor stack
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {BLOCKS.map((block) => (
                  <button
                    key={block.name}
                    type="button"
                    disabled={!block.available}
                    className={`block-chip ${!block.available ? 'disabled' : ''}`}
                    onClick={() => block.available && selectBlock(block.name)}
                  >
                    <span>{block.label}</span>
                    {!block.available && <Lock size={14} />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <FloorStack
              floors={blockGrid}
              selectedFloor={selectedFloor}
              onSelectFloor={setSelectedFloor}
            />
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {!selectedBlock ? (
            <div className="hostel-empty-state">
              <div className="hostel-empty-state-inner">
                <div className="hostel-empty-eyebrow">State 1</div>
                <h2>Select a Block to View Hostel Layout</h2>
                <p>No rooms render until a block and floor are intentionally selected.</p>
                <div className="hostel-block-pill-row">
                  {BLOCKS.map((block) => (
                    <button
                      key={block.name}
                      type="button"
                      className={`hostel-block-pill ${!block.available ? 'disabled' : ''}`}
                      disabled={!block.available}
                      onClick={() => block.available && selectBlock(block.name)}
                    >
                      {block.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : loading && Object.keys(blockGrid).length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 500, gap: 12, color: 'var(--text-muted)',
            }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading floor data...
            </div>
          ) : !selectedFloor ? (
            <div className="hostel-empty-state hostel-empty-state-panel">
              <div className="hostel-empty-state-inner">
                <div className="hostel-empty-eyebrow">State 2</div>
                <h2>Hover and select a floor from the stack</h2>
                <p>The plan appears only after a floor is picked.</p>
                <div className="hostel-summary-grid">
                  <div className="hostel-summary-card">
                    <span>Total floors</span>
                    <strong>{blockSummary.totalFloors}</strong>
                  </div>
                  <div className="hostel-summary-card">
                    <span>Total rooms</span>
                    <strong>{blockSummary.totalRooms}</strong>
                  </div>
                  <div className="hostel-summary-card">
                    <span>Avg occupancy</span>
                    <strong>{blockSummary.occupancy}%</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <FloorCanvas
              key={`${selectedBlock}-${selectedFloor}`}
              rooms={currentFloorRooms}
              floorNo={selectedFloor}
              blockName={selectedBlock}
              heatmapData={heatmapData}
              onRoomClick={setSelectedRoom}
            />
          )}
        </div>
      </div>

      {/* Room Detail Modal */}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
