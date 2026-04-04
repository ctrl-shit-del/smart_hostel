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
    <div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 8, background: 'var(--grad-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        Welcome back, {user?.name?.split(' ')[0]}
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{user?.register_number} | Room {user?.room_no} | {user?.block_name}</p>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: '0.8rem' }}><ClipboardCheckIcon/> Attendance</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: (data?.attSummary?.percentage || 100) < 75 ? '#ef4444' : '#10b981' }}>
            {data ? Math.round(data.attSummary.percentage || 100) : '--'}%
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: '0.8rem' }}><MessageSquare size={14}/> Open Complaints</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{data ? data.openComplaints : '--'}</div>
        </div>
        <div className="card" style={{ padding: 20, background: data?.activeGp ? 'var(--grad-brand)' : 'var(--bg-card)', color: data?.activeGp ? 'white' : 'var(--text-primary)' }}>
          <div style={{ color: data?.activeGp ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', marginBottom: 8, fontSize: '0.8rem' }}><DoorOpen size={14}/> Gatepass</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{data?.activeGp ? data.activeGp.status : 'None Active'}</div>
        </div>
      </div>

      {/* Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <a href="/student/gatepass/apply" className="card" style={{ padding: 24, textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 16, transition: 'transform 0.2s' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}><DoorOpen size={24}/></div>
          <div>
            <h3 style={{ fontWeight: 800 }}>Apply Gatepass</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Request for outing or leave</div>
          </div>
        </a>
        <a href="/student/complaint/new" className="card" style={{ padding: 24, textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 16, transition: 'transform 0.2s' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><MessageSquare size={24}/></div>
          <div>
            <h3 style={{ fontWeight: 800 }}>Raise Complaint</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Report a room or facility issue</div>
          </div>
        </a>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 14 }}>Announcements & Polls</h2>
        <div style={{ display: 'grid', gap: 14 }}>
          {announcements.length === 0 && (
            <div className="card" style={{ padding: 20, color: 'var(--text-muted)' }}>No active announcements right now.</div>
          )}

          {announcements.map((announcement) => (
            <div key={announcement._id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ fontWeight: 800 }}>{announcement.title}</h3>
                    <span className={`badge ${announcement.priority === 'Critical' ? 'badge-danger' : announcement.priority === 'High' ? 'badge-warning' : 'badge-info'}`}>
                      {announcement.priority}
                    </span>
                    <span className={`badge ${announcement.announcement_type === 'Poll' ? 'badge-brand' : 'badge-info'}`}>
                      {announcement.announcement_type}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 8 }}>{announcement.content}</div>
                </div>
              </div>

              {announcement.announcement_type === 'Poll' && announcement.poll && (
                <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: 'rgba(15, 23, 42, 0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontWeight: 700 }}>{announcement.poll.question}</div>
                  <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                    {(announcement.poll.options || []).map((option) => {
                      const totalVotes = announcement.poll.totalVotes || 0;
                      const share = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                      return (
                        <button
                          key={option.label}
                          className={`btn ${option.hasVoted ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ justifyContent: 'space-between' }}
                          disabled={Boolean(votingId)}
                          onClick={() => handleVote(announcement._id, option.label)}
                        >
                          <span>{option.label}</span>
                          <span>{option.votes} votes · {share}%</span>
                        </button>
                      );
                    })}
                  </div>
                  {announcement.poll.userVote && (
                    <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginTop: 12 }}>
                      Your current choice: {announcement.poll.userVote}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ClipboardCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:-2, marginRight:4}}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="m9 14 2 2 4-4"/></svg>;
