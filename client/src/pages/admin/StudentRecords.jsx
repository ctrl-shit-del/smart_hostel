import React, { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Flag,
  Loader2,
  PhoneCall,
  Search,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { usePortalCallStore } from '../../store/callStore';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'late', label: 'Late Returners' },
  { key: 'risk', label: 'High Risk' },
  { key: 'leave', label: 'On Leave' },
  { key: 'violations', label: 'Violations' },
];

const SORTS = [
  { key: 'name', label: 'Sort: Name' },
  { key: 'score', label: 'Sort: Score' },
  { key: 'violations', label: 'Sort: Violations' },
  { key: 'recent', label: 'Sort: Recent Activity' },
];

const KPI_CONFIG = [
  { key: 'totalStudents', label: 'Total Hostel Students', color: '#8b5cf6', filter: 'all' },
  { key: 'currentlyOnLeave', label: 'Currently On Leave', color: '#3b82f6', filter: 'leave' },
  { key: 'frequentLateReturners', label: 'Frequent Late Returners', color: '#f59e0b', filter: 'late' },
  { key: 'suspiciousFlaggedStudents', label: 'Suspicious / Flagged Students', color: '#ef4444', filter: 'risk' },
  { key: 'activeViolations', label: 'Active Violations', color: '#f97316', filter: 'violations' },
];

function getRiskTheme(level) {
  if (level === 'high') return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.26)', label: 'High Risk' };
  if (level === 'watchlist') return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.26)', label: 'Watchlist' };
  return { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.26)', label: 'Normal' };
}

function getStatusTheme(status) {
  if (status === 'Late') return { color: '#ef4444', bg: 'rgba(239,68,68,0.14)' };
  if (status === 'On Leave') return { color: '#3b82f6', bg: 'rgba(59,130,246,0.14)' };
  return { color: '#10b981', bg: 'rgba(16,185,129,0.14)' };
}

export default function StudentRecords() {
  const [summary, setSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [topRiskStudents, setTopRiskStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [flaggingId, setFlaggingId] = useState(null);
  const [callingId, setCallingId] = useState(null);
  const openDialer = usePortalCallStore((state) => state.openDialer);

  const fetchStudents = async (override = {}) => {
    setLoading(true);
    try {
      const query = override.search?.trim()
        ? `/users/search?q=${encodeURIComponent(override.search.trim())}`
        : `/users/all?filter=${override.filter || activeFilter}&sort=${override.sort || sortBy}`;
      const response = await api.get(query);
      setSummary(response.summary || null);
      setStudents(response.students || []);
      setTopRiskStudents(response.topRiskStudents || []);
    } catch (_error) {
      toast.error('Failed to load student intelligence.');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (studentId) => {
    setDetailLoading(true);
    try {
      const response = await api.get(`/users/${studentId}/intelligence`);
      setSelectedStudent(response.student || null);
    } catch (_error) {
      toast.error('Failed to load student details.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents({ filter: activeFilter, sort: sortBy, search: '' });
  }, [activeFilter, sortBy]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchStudents({ filter: activeFilter, sort: sortBy, search });
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const visibleStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.trim().toLowerCase();
    return students.filter((student) => (
      student.name?.toLowerCase().includes(q)
      || student.regNo?.toLowerCase().includes(q)
      || String(student.roomNo || '').includes(q)
    ));
  }, [students, search]);

  const triggerCall = async (student) => {
    if (!student.actionableLeaveId) {
      toast.error('No leave-linked escalation context is available for this student.');
      return;
    }

    setCallingId(student._id);
    try {
      await api.post('/call/initiate', {
        leaveId: student.actionableLeaveId,
        triggerReason: student.actionableTriggerReason || 'manual_review',
      });
      openDialer({ id: student._id, name: student.name, role: 'student' });
    } catch (error) {
      toast.error(error.message || 'Failed to start escalation call.');
    } finally {
      setCallingId(null);
    }
  };

  const toggleFlag = async (student) => {
    setFlaggingId(student._id);
    try {
      await api.post(`/users/${student._id}/flag`, { flagged: !student.isFlagged });
      toast.success(student.isFlagged ? 'Student unflagged.' : 'Student flagged.');
      fetchStudents({ filter: activeFilter, sort: sortBy, search });
      if (selectedStudent?._id === student._id) {
        openDetails(student._id);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update student flag.');
    } finally {
      setFlaggingId(null);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={24} /> Student Intelligence & Records
        </h1>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: 6 }}>
          Centralized student behavior, leave risk, call history, and rapid actions.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        {KPI_CONFIG.map((card) => (
          <button
            key={card.key}
            type="button"
            className="card"
            onClick={() => setActiveFilter(card.filter)}
            style={{
              padding: 16,
              textAlign: 'left',
              cursor: 'pointer',
              border: activeFilter === card.filter ? `1px solid ${card.color}` : '1px solid var(--border)',
              boxShadow: activeFilter === card.filter ? `0 0 0 1px ${card.color} inset` : undefined,
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{card.label}</div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: card.color, marginTop: 8 }}>
              {summary?.[card.key] ?? 0}
            </div>
          </button>
        ))}
      </div>

      <section className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '1 1 320px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by Name / Reg No / Room"
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={activeFilter === filter.key ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              style={{
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                padding: '9px 12px',
              }}
            >
              {SORTS.map((sort) => <option key={sort.key} value={sort.key}>{sort.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: selectedStudent ? 'minmax(0, 1.6fr) minmax(340px, 0.9fr)' : '1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 20 }}>
          <section className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 14 }}>Top 5 Risk Students</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {topRiskStudents.map((student, index) => {
                const risk = getRiskTheme(student.riskLevel);
                return (
                  <div key={student._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: 12, borderRadius: 12, background: risk.bg, border: `1px solid ${risk.border}` }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{index + 1}. {student.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {student.regNo} · Block {student.block} · Room {student.roomNo}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: risk.color, fontWeight: 800 }}>{student.reliabilityScore}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.activeViolations} violations</div>
                    </div>
                  </div>
                );
              })}
              {topRiskStudents.length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 18 }}>No high-risk students right now.</div>
              )}
            </div>
          </section>

          <section className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Student List</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Actionable overview of leave status, reliability, flags, and escalation readiness.
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => fetchStudents({ filter: activeFilter, sort: sortBy, search })}>
                Refresh
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Loader2 className="spin" /></div>
            ) : visibleStudents.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 28 }}>No students found for the current filter.</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {visibleStudents.map((student) => {
                  const risk = getRiskTheme(student.riskLevel);
                  const status = getStatusTheme(student.status);
                  return (
                    <div key={student._id} style={{ padding: 14, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 800, fontSize: '1rem' }}>{student.name}</div>
                            <span className="badge" style={{ background: status.bg, color: status.color }}>{student.status}</span>
                            <span className="badge" style={{ background: risk.bg, color: risk.color }}>{risk.label}</span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>
                            {student.regNo} · Room {student.roomNo} · {student.block} / Floor {student.floor || 'NA'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Reliability Score</div>
                          <div style={{ fontWeight: 900, fontSize: '1.2rem', color: risk.color }}>{student.reliabilityScore}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        {student.flags.length > 0 ? student.flags.map((flag) => (
                          <span key={flag} className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                            {flag}
                          </span>
                        )) : (
                          <span className="badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>Normal</span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 14, fontSize: '0.8rem' }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)' }}>Late count</div>
                          <div style={{ fontWeight: 700, marginTop: 4 }}>{student.lateCount}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)' }}>Open complaints</div>
                          <div style={{ fontWeight: 700, marginTop: 4 }}>{student.openComplaintCount}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)' }}>Call status</div>
                          <div style={{ fontWeight: 700, marginTop: 4, textTransform: 'capitalize' }}>{student.latestCallStatus || 'none'}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)' }}>Recent late</div>
                          <div style={{ fontWeight: 700, marginTop: 4 }}>{student.latestLateDuration || 0} min</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={!student.actionableLeaveId || callingId === student._id}
                          onClick={() => triggerCall(student)}
                          title={student.actionableLeaveId ? 'Call using existing leave escalation context' : 'No leave-linked escalation available'}
                        >
                          <PhoneCall size={15} /> {callingId === student._id ? 'Calling...' : 'Call'}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openDetails(student._id)}>
                          <Eye size={15} /> View Details
                        </button>
                        <button className="btn btn-ghost btn-sm" disabled={flaggingId === student._id} onClick={() => toggleFlag(student)}>
                          <Flag size={15} /> {student.isFlagged ? 'Unflag' : 'Flag'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {selectedStudent && (
          <aside className="card" style={{ padding: 18, position: 'sticky', top: 96 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.08rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserCircle2 size={18} /> {selectedStudent.name}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {selectedStudent.regNo} · {selectedStudent.block} / Floor {selectedStudent.floor || 'NA'} / Room {selectedStudent.roomNo}
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedStudent(null)}>
                <X size={16} />
              </button>
            </div>

            {detailLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Loader2 className="spin" /></div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gap: 8, fontSize: '0.82rem' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> {selectedStudent.phone || 'Not available'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> {selectedStudent.email || 'Not available'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Department:</span> {selectedStudent.department || 'Not available'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Parent:</span> {selectedStudent.parentName || 'Not available'}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Parent Contact:</span> {selectedStudent.parentPhone || 'Not available'}</div>
                </div>

                <div>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Leave History</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(selectedStudent.leaveHistory || []).slice(0, 5).map((leave) => (
                      <div key={leave._id} style={{ padding: 10, borderRadius: 10, background: 'var(--bg-elevated)' }}>
                        <div style={{ fontWeight: 700 }}>{leave.status}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {format(new Date(leave.expected_exit), 'dd MMM, hh:mm a')} to {format(new Date(leave.expected_return), 'dd MMM, hh:mm a')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Late History (Last 5)</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(selectedStudent.lateHistory || []).slice(0, 5).map((leave) => (
                      <div key={leave._id} style={{ padding: 10, borderRadius: 10, background: 'rgba(239,68,68,0.1)' }}>
                        <div style={{ fontWeight: 700 }}>{leave.late_duration_minutes || 0} min late</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{leave.status}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Complaint History</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(selectedStudent.complaintHistory || []).slice(0, 5).map((complaint) => (
                      <div key={complaint._id} style={{ padding: 10, borderRadius: 10, background: 'var(--bg-elevated)' }}>
                        <div style={{ fontWeight: 700 }}>{complaint.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {complaint.status} · {complaint.category}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Call History</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(selectedStudent.callHistory || []).slice(0, 5).map((call) => (
                      <div key={call._id} style={{ padding: 10, borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.18)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{call.callStatus}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{call.triggerReason}</div>
                        </div>
                        {call.summary && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 6, whiteSpace: 'pre-line' }}>
                            {call.summary}
                          </div>
                        )}
                      </div>
                    ))}
                    {(selectedStudent.callHistory || []).length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No call history.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
