import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { LayoutDashboard, Users, DoorOpen, MessageSquare, CheckCircle2, CalendarDays, Megaphone, Trophy, Sparkles } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const VTOP_BLUE = '#2455A3';
const VTOP_BLUE_LIGHT = '#3497DB';
const VTOP_PANEL_GRADIENT = 'linear-gradient(180deg, rgba(36,85,163,0.14) 0%, rgba(52,151,219,0.06) 100%)';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [votingId, setVotingId] = useState('');
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1120 : true);

  useEffect(() => {
    Promise.all([
      api.get('/gatepass'),
      api.get('/complaints'),
      api.get('/attendance'),
      api.get('/announcements'),
      api.get('/events'),
    ]).then(([gpRes, compRes, attRes, announcementRes, eventsRes]) => {
      setData({
        activeGp: gpRes.gatepasses?.find(g => g.status === 'Approved' || g.status === 'Active'),
        openComplaints: compRes.complaints?.filter(c => ['Open','Assigned','In Progress'].includes(c.status)).length || 0,
        attSummary: attRes.summary || {},
      });
      setAnnouncements(announcementRes.announcements || []);
      setEvents(eventsRes.events || []);
    }).catch(() => toast.error('Failed to load dashboard data'));
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1120);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const latestAnnouncements = announcements
    .filter((announcement) => !['Spotlight', 'Sports', 'Activity'].includes(announcement.category))
    .slice(0, 4);

  const activityItems = [
    ...events.map((event) => ({ ...event, source: 'event' })),
    ...announcements
      .filter((announcement) => ['Sports', 'Activity'].includes(announcement.category))
      .map((announcement) => ({ ...announcement, source: 'announcement' })),
  ].slice(0, 5);

  const spotlight = announcements.find((announcement) => announcement.category === 'Spotlight') || {
    title: 'Hostel Excellence Spotlight',
    content: 'Block-wise wins, research achievements, and community milestones will appear here as a premium campus highlight.',
  };

  return (
    <div style={{
      display: 'grid',
      gap: 24,
      gridTemplateColumns: isDesktop ? 'minmax(0, 1fr) 320px' : '1fr',
      alignItems: 'start',
    }}>
      <div style={{ minWidth: 0 }}>
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
            <LayoutDashboard size={20} color={VTOP_BLUE} />
            Recent Announcements
          </h2>
          <div style={{ display: 'grid', gap: 14 }}>
            {latestAnnouncements.length === 0 && (
              <div className="card" style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>No general announcements at the moment.</div>
            )}

            {latestAnnouncements.map((announcement) => (
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

      <aside style={{ position: isDesktop ? 'sticky' : 'static', top: 96, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <section className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Megaphone size={18} color={VTOP_BLUE} />
            <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Announcements</h2>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {latestAnnouncements.length > 0 ? latestAnnouncements.map((announcement) => (
              <div key={announcement._id} style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{announcement.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>
                  {announcement.content}
                </div>
              </div>
            )) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>No active announcements.</div>
            )}
          </div>
        </section>

        <section className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <CalendarDays size={18} color={VTOP_BLUE} />
            <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Sports & Activities</h2>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {activityItems.length > 0 ? activityItems.map((item, index) => (
              <div key={item._id || item.id || `${item.title}-${index}`} style={{ padding: 14, borderRadius: 14, background: 'rgba(36,85,163,0.08)', border: '1px solid rgba(52,151,219,0.18)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.title}</div>
                  <span className="badge" style={{ background: 'rgba(36,85,163,0.16)', color: VTOP_BLUE_LIGHT }}>
                    {item.source === 'event' ? 'Event' : item.category}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {item.content || item.description || 'Upcoming hostel activity.'}
                </div>
                {(item.date || item.eventDate || item.startDate) && (
                  <div style={{ fontSize: '0.74rem', color: VTOP_BLUE_LIGHT, marginTop: 8, fontWeight: 700 }}>
                    {new Date(item.date || item.eventDate || item.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
            )) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>No upcoming sports or activities.</div>
            )}
          </div>
        </section>

        <section className="glass-card" style={{ padding: 0, overflow: 'hidden', background: VTOP_PANEL_GRADIENT, border: '1px solid rgba(52,151,219,0.2)' }}>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Trophy size={18} color={VTOP_BLUE_LIGHT} />
              <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Spotlight</h2>
            </div>
            <div style={{
              padding: 16,
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(36,85,163,0.24), rgba(52,151,219,0.12))',
              border: '1px solid rgba(52,151,219,0.18)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#bfdbfe', fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                <Sparkles size={14} /> VTOPCC Highlight
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 8 }}>{spotlight.title}</div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(226,232,240,0.82)', lineHeight: 1.6 }}>
                {spotlight.content}
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

const ClipboardCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:-2, marginRight:4}}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="m9 14 2 2 4-4"/></svg>;
