import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { LayoutDashboard, Users, DoorOpen, MessageSquare, AlertTriangle, CheckCircle2, QrCode } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [votingId, setVotingId] = useState('');

  useEffect(() => {
    // We fetch current gatepass, complaints count, attendance stats
    Promise.all([
      api.get('/gatepass'),
      api.get('/complaints'),
      api.get('/attendance'),
      api.get('/announcements')
    ]).then(([gpRes, compRes, attRes, announcementRes]) => {
      setData({
        activeGp: gpRes.gatepasses?.find(g => g.status === 'Approved' || g.status === 'Active'),
        openComplaints: compRes.complaints?.filter(c => ['Open','Assigned','In Progress'].includes(c.status)).length || 0,
        attSummary: attRes.summary || {}
      });
      setAnnouncements(announcementRes.announcements || []);
    }).catch(() => toast.error('Failed to load dashboard data'));
  }, []);

  const handleVote = async (announcementId, optionLabel) => {
    setVotingId(`${announcementId}:${optionLabel}`);
    try {
      const res = await api.post(`/announcements/${announcementId}/vote`, { optionLabel });
      setAnnouncements((prev) => prev.map((announcement) => (
        announcement._id === announcementId ? res.announcement : announcement
      )));
      toast.success('Vote submitted');
    } catch {
      toast.error('Failed to submit vote');
    } finally {
      setVotingId('');
    }
  };

  return (
    <div style={{ display: 'flex', gap: 24, flexDirection: window.innerWidth < 1024 ? 'column' : 'row' }}>
      {/* Main Content (80%) */}
      <div style={{ flex: '1 1 75%', minWidth: 0 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 8, background: 'var(--grad-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{user?.register_number} | Room {user?.room_no} | {user?.block_name}</p>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardCheckIcon/> Attendance</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: (data?.attSummary?.percentage || 100) < 75 ? '#ef4444' : '#10b981' }}>
              {data ? Math.round(data.attSummary.percentage || 100) : '--'}%
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}><MessageSquare size={14}/> Open Complaints</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{data ? data.openComplaints : '--'}</div>
          </div>
          <div className="card" style={{ padding: 20, background: data?.activeGp ? 'var(--grad-brand)' : 'var(--bg-card)', color: data?.activeGp ? 'white' : 'var(--text-primary)' }}>
            <div style={{ color: data?.activeGp ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', marginBottom: 8, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}><DoorOpen size={14}/> Gatepass</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{data?.activeGp ? data.activeGp.status : 'None Active'}</div>
          </div>
        </div>

        {/* Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          <a href="/student/gatepass/apply" className="card card-hover" style={{ padding: 24, textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(36,85,163,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2455A3' }}><DoorOpen size={24}/></div>
            <div>
              <h3 style={{ fontWeight: 800 }}>Apply Gatepass</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Request for outing or leave</div>
            </div>
          </a>
          <a href="/student/complaint/new" className="card card-hover" style={{ padding: 24, textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(52,151,219,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3497DB' }}><MessageSquare size={24}/></div>
            <div>
              <h3 style={{ fontWeight: 800 }}>Raise Complaint</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Report a room or facility issue</div>
            </div>
          </a>
        </div>

        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <LayoutDashboard size={20} color="var(--brand-primary)" />
            Recent Announcements
          </h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {announcements.filter(a => a.category !== 'Spotlight' && a.category !== 'Sports' && a.category !== 'Activity').length === 0 && (
              <div className="card" style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>No general announcements at the moment.</div>
            )}

            {announcements.filter(a => a.category !== 'Spotlight' && a.category !== 'Sports' && a.category !== 'Activity').map((announcement) => (
              <div key={announcement._id} className="card animation-slide-up" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ fontWeight: 800 }}>{announcement.title}</h3>
                      <span className={`badge ${announcement.priority === 'Critical' ? 'badge-danger' : announcement.priority === 'High' ? 'badge-warning' : 'badge-info'}`}>
                        {announcement.priority}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>{announcement.content}</div>
                  </div>
                </div>

                {announcement.announcement_type === 'Poll' && announcement.poll && (
                  <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>{announcement.poll.question}</div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {(announcement.poll.options || []).map((option) => {
                        const totalVotes = announcement.poll.totalVotes || 0;
                        const share = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                        return (
                          <button
                            key={option.label}
                            className={`btn ${option.hasVoted ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ justifyContent: 'space-between', padding: '10px 16px' }}
                            disabled={Boolean(votingId)}
                            onClick={() => handleVote(announcement._id, option.label)}
                          >
                            <span>{option.label}</span>
                            <span style={{ opacity: 0.8, fontSize: '0.75rem' }}>{option.votes} votes · {share}%</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel (25%) */}
      <div style={{ flex: '0 0 25%', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Spotlight Section */}
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color="#10b981" />
            Hostel Spotlights
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {announcements.filter(a => a.category === 'Spotlight').length > 0 ? (
              announcements.filter(a => a.category === 'Spotlight').map(a => (
                <div key={a._id} className="card" style={{ padding: 16, borderLeft: '4px solid #10b981' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>{a.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.content}</p>
                </div>
              ))
            ) : (
              <div className="card" style={{ padding: 20, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <Users size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                <div>No spotlights today</div>
              </div>
            )}
          </div>
        </section>

        {/* Sports & Activities Section */}
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LayoutDashboard size={18} color="var(--brand-primary)" />
            Sports & Activities
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {announcements.filter(a => ['Sports', 'Activity'].includes(a.category)).length > 0 ? (
              announcements.filter(a => ['Sports', 'Activity'].includes(a.category)).map(a => (
                <div key={a._id} className="card" style={{ padding: 16, borderLeft: `4px solid ${a.category === 'Sports' ? '#ef4444' : '#3b82f6'}` }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, marginBottom: 4, color: a.category === 'Sports' ? '#ef4444' : '#3b82f6', textTransform: 'uppercase' }}>
                    {a.category}
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>{a.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.content}</p>
                </div>
              ))
            ) : (
              <div className="card" style={{ padding: 20, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <LayoutDashboard size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                <div>No upcoming events</div>
              </div>
            )}
          </div>
        </section>

        {/* Quick Links / Info */}
        <div className="card" style={{ padding: 20, background: 'var(--grad-brand)', color: 'white' }}>
          <h4 style={{ fontWeight: 800, marginBottom: 8 }}>Need Help?</h4>
          <p style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: 16 }}>Contact the hostel office for any urgent issues or gatepass queries.</p>
          <button className="btn" style={{ width: '100%', background: 'white', color: 'var(--brand-primary)', fontWeight: 700 }}>Contact Warden</button>
        </div>
      </div>
    </div>
  );
}

const ClipboardCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:-2, marginRight:4}}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="m9 14 2 2 4-4"/></svg>;
