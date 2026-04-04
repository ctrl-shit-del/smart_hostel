import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
  MessageSquare, Shield, AlertTriangle, TrendingUp, Trash2,
  BarChart3, Smile, Frown, Meh, Activity, Hash, Ban,
  UserX, UserCheck, Megaphone, Flame, Tag, Calendar,
  ArrowBigUp, Eye, RefreshCw,
} from 'lucide-react';

const CATEGORY_COLORS = {
  'General': '#6366f1', 'Lost & Found': '#f59e0b', 'Book Exchange': '#10b981',
  'Events': '#ec4899', 'Questions': '#3b82f6', 'Memes': '#f97316',
  'Rant': '#ef4444', 'Hostel Feedback': '#a855f7',
};
const CATEGORY_EMOJIS = {
  'General': '💬', 'Lost & Found': '🔍', 'Book Exchange': '📚',
  'Events': '🎉', 'Questions': '❓', 'Memes': '😂', 'Rant': '😤', 'Hostel Feedback': '📢',
};

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TABS = [
  { key: 'overview',  label: 'Overview',      icon: BarChart3    },
  { key: 'flagged',   label: 'Flagged Posts',  icon: AlertTriangle },
  { key: 'bans',      label: 'Ban Management', icon: Ban           },
  { key: 'trending',  label: 'Trending',       icon: Flame         },
];

export default function CommunitySentiment() {
  const [sentiment, setSentiment] = useState(null);
  const [flagged, setFlagged] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [trending, setTrending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sentRes, flagRes, banRes, trendRes] = await Promise.allSettled([
        api.get('/community/admin/sentiment'),
        api.get('/community/admin/flagged'),
        api.get('/community/admin/banned-users'),
        api.get('/community/trending'),
      ]);
      if (sentRes.value) setSentiment(sentRes.value.sentiment);
      if (flagRes.value) setFlagged(flagRes.value.posts || []);
      if (banRes.value) setBannedUsers(banRes.value.users || []);
      if (trendRes.value) setTrending(trendRes.value);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); fetchData(); };

  const handleRemove = async (postId) => {
    if (!window.confirm('Remove this post and add a strike to the author?')) return;
    try {
      const res = await api.post(`/community/admin/${postId}/remove`, { reason: 'Content policy violation' });
      toast.success(res.message || 'Post removed');
      setFlagged(prev => prev.filter(p => p._id !== postId));
      fetchData();
    } catch {
      toast.error('Failed to remove post');
    }
  };

  const handleUnban = async (userId, name) => {
    if (!window.confirm(`Unban ${name} and reset their strikes?`)) return;
    try {
      const res = await api.post(`/community/admin/${userId}/unban`);
      toast.success(res.message || 'User unbanned');
      setBannedUsers(prev => prev.filter(u => u._id !== userId));
      fetchData();
    } catch {
      toast.error('Failed to unban user');
    }
  };

  const moodColor = (mood) => {
    if (mood >= 80) return '#10b981';
    if (mood >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const MoodIcon = (mood) => {
    if (mood >= 80) return <Smile size={24} color="#10b981" />;
    if (mood >= 50) return <Meh size={24} color="#f59e0b" />;
    return <Frown size={24} color="#ef4444" />;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={28} />
            Community Intelligence
          </h1>
          <p>Monitor student mood, moderate content, manage bans, and track trending topics</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ gap: 6 }}
        >
          <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const badgeCount = t.key === 'flagged' ? flagged.length : t.key === 'bans' ? bannedUsers.length : null;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ gap: 6 }}
              id={`tab-${t.key}`}
            >
              <Icon size={14} />
              {t.label}
              {badgeCount !== null && badgeCount > 0 && (
                <span style={{
                  marginLeft: 2, padding: '1px 7px', borderRadius: 'var(--radius-full)',
                  background: tab === t.key ? 'rgba(255,255,255,0.2)' : 'rgba(239,68,68,0.2)',
                  color: tab === t.key ? 'white' : '#ef4444',
                  fontSize: '0.72rem', fontWeight: 700,
                }}>
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : (
        <>
          {/* ── OVERVIEW TAB ────────────────────────────────────────────────── */}
          {tab === 'overview' && (
            <>
              {/* Stats grid */}
              <div className="stats-grid" style={{ marginBottom: 24 }}>
                {/* Mood Index */}
                <div className="glass-card stat-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="stat-value" style={{
                        background: `linear-gradient(135deg, ${moodColor(sentiment?.mood_index || 0)}, ${moodColor(sentiment?.mood_index || 0)}99)`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      }}>
                        {sentiment?.mood_index || 0}
                      </div>
                      <div className="stat-label">Mood Index</div>
                    </div>
                    {MoodIcon(sentiment?.mood_index || 0)}
                  </div>
                  <div style={{ marginTop: 12, height: 6, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${sentiment?.mood_index || 0}%`,
                      background: `linear-gradient(90deg, ${moodColor(sentiment?.mood_index || 0)}, ${moodColor(sentiment?.mood_index || 0)}88)`,
                      borderRadius: 'var(--radius-full)', transition: 'width 1s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    {sentiment?.mood_index >= 80 ? '✅ Community is healthy' : sentiment?.mood_index >= 50 ? '⚠️ Some concerns detected' : '🔴 High toxicity — review needed'}
                  </div>
                </div>

                {/* Total Posts */}
                <div className="glass-card stat-card" style={{ padding: 20 }}>
                  <div className="stat-value">{sentiment?.total_posts || 0}</div>
                  <div className="stat-label">Total Posts</div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={13} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Active conversations</span>
                  </div>
                </div>

                {/* Flagged */}
                <div className="glass-card stat-card" style={{ padding: 20 }}>
                  <div className="stat-value" style={{
                    background: sentiment?.flagged_count > 0 ? 'linear-gradient(135deg, #ef4444, #f59e0b)' : 'var(--grad-brand)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    {sentiment?.flagged_count || 0}
                  </div>
                  <div className="stat-label">Flagged Posts</div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={13} color="#ef4444" />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Needs review</span>
                  </div>
                </div>

                {/* Banned Users */}
                <div className="glass-card stat-card" style={{ padding: 20 }}>
                  <div className="stat-value" style={{
                    background: (sentiment?.banned_users || 0) > 0 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'var(--grad-brand)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    {sentiment?.banned_users || 0}
                  </div>
                  <div className="stat-label">Banned Users</div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Ban size={13} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>3-strike bans active</span>
                  </div>
                </div>
              </div>

              {/* Charts row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Category Breakdown */}
                <div className="glass-card" style={{ padding: 20 }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Hash size={15} color="#6366f1" />
                    Posts by Category
                  </h3>
                  {sentiment?.category_breakdown?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {sentiment.category_breakdown.map(cat => {
                        const maxCount = Math.max(...sentiment.category_breakdown.map(c => c.count));
                        const color = CATEGORY_COLORS[cat._id] || '#6366f1';
                        const emoji = CATEGORY_EMOJIS[cat._id] || '💬';
                        return (
                          <div key={cat._id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: '0.83rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>{emoji}</span> {cat._id}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{cat.count}</span>
                            </div>
                            <div style={{ height: 7, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${(cat.count / maxCount) * 100}%`,
                                background: `linear-gradient(90deg, ${color}, ${color}88)`,
                                borderRadius: 'var(--radius-full)', transition: 'width 0.8s ease',
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No posts yet</div>
                  )}
                </div>

                {/* Activity trend */}
                <div className="glass-card" style={{ padding: 20 }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={15} color="#06b6d4" />
                    7-Day Activity Trend
                  </h3>
                  {sentiment?.trend_by_day?.length > 0 ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 80, marginBottom: 8 }}>
                        {sentiment.trend_by_day.map(day => {
                          const maxDay = Math.max(...sentiment.trend_by_day.map(d => d.count));
                          const pct = maxDay > 0 ? (day.count / maxDay) * 100 : 0;
                          const tox = (day.avg_tox || 0);
                          const barColor = tox > 0.3 ? '#f59e0b' : '#6366f1';
                          return (
                            <div key={day._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }} title={`${day._id}: ${day.count} posts, toxicity ${(tox * 100).toFixed(0)}%`}>
                              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{day.count}</span>
                              <div style={{
                                width: '100%', height: `${Math.max(pct, 5)}%`, minHeight: 4,
                                background: `linear-gradient(180deg, ${barColor}, ${barColor}88)`,
                                borderRadius: '2px 2px 0 0', transition: 'height 0.8s ease',
                              }} />
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'space-between' }}>
                        {sentiment.trend_by_day.map(day => (
                          <div key={day._id} style={{ flex: 1, textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                            {new Date(day._id).toLocaleDateString('en', { weekday: 'short' })}
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#6366f1', borderRadius: 2, display: 'inline-block' }} /> Normal activity</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: '#f59e0b', borderRadius: 2, display: 'inline-block' }} /> Elevated toxicity</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No activity data</div>
                  )}
                </div>
              </div>

              {/* Recent posts */}
              {sentiment?.recent_posts?.length > 0 && (
                <div className="glass-card" style={{ padding: 20, marginTop: 20 }}>
                  <h3 style={{ fontSize: '0.95rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageSquare size={15} color="#06b6d4" />
                    Recent Community Activity
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sentiment.recent_posts.map(post => (
                      <div key={post._id} style={{
                        padding: '10px 14px', background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.875rem', fontWeight: 600,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {post.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>by {post.pseudonym}</span>
                            <span>· Toxicity: {(post.toxicity_score * 100).toFixed(0)}%</span>
                            <span>· {timeAgo(post.created_at)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {post.flagged && <AlertTriangle size={13} color="#f59e0b" />}
                          <span style={{
                            fontSize: '0.7rem', padding: '2px 7px', borderRadius: 'var(--radius-full)',
                            background: (CATEGORY_COLORS[post.category] || '#6366f1') + '18',
                            color: CATEGORY_COLORS[post.category] || '#818cf8', fontWeight: 600,
                          }}>
                            {CATEGORY_EMOJIS[post.category]} {post.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── FLAGGED TAB ──────────────────────────────────────────────────── */}
          {tab === 'flagged' && (
            <div>
              {flagged.length === 0 ? (
                <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
                  <Shield size={48} color="var(--color-success)" style={{ margin: '0 auto 16px' }} />
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, color: '#10b981' }}>All Clear!</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No flagged posts. Community is healthy.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {flagged.map(post => (
                    <div key={post._id} className="glass-card" style={{
                      padding: 20,
                      borderLeft: `3px solid ${post.toxicity_score > 0.5 ? '#ef4444' : '#f59e0b'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                            <span className={`badge ${post.toxicity_score > 0.5 ? 'badge-danger' : 'badge-warning'}`}>
                              Toxicity {(post.toxicity_score * 100).toFixed(0)}%
                            </span>
                            <span style={{ fontSize: '0.72rem', padding: '2px 7px', borderRadius: 'var(--radius-full)', background: (CATEGORY_COLORS[post.category] || '#6366f1') + '18', color: CATEGORY_COLORS[post.category] || '#818cf8', fontWeight: 600 }}>
                              {CATEGORY_EMOJIS[post.category]} {post.category}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              by {post.pseudonym} · {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>{post.title}</h4>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, wordBreak: 'break-word' }}>{post.content}</p>

                          {post.flag_reason && (
                            <div style={{
                              marginTop: 8, padding: '6px 10px',
                              background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-sm)',
                              fontSize: '0.78rem', color: '#f59e0b',
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                              <AlertTriangle size={12} />
                              {post.flag_reason}
                            </div>
                          )}

                          {/* Admin can see real identity */}
                          {post.author_id && (
                            <div style={{
                              marginTop: 10, padding: '8px 12px',
                              background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)',
                              border: '1px solid rgba(99,102,241,0.15)',
                              fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                              <Shield size={12} color="#818cf8" />
                              <span style={{ color: 'var(--text-muted)' }}>
                                Real identity: <strong style={{ color: '#818cf8' }}>{post.author_id.name}</strong>
                                {' '}({post.author_id.register_number}) · {post.author_id.block_name}
                                {post.author_id.floor_no ? ` Floor ${post.author_id.floor_no}` : ''}
                                {post.author_id.room_no ? ` Room ${post.author_id.room_no}` : ''}
                              </span>
                              {post.author_id.community_banned && (
                                <span style={{ marginLeft: 4, padding: '1px 7px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 'var(--radius-full)', fontSize: '0.68rem', fontWeight: 700 }}>
                                  BANNED
                                </span>
                              )}
                              {post.author_id.community_strikes > 0 && !post.author_id.community_banned && (
                                <span style={{ marginLeft: 4, padding: '1px 7px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: 'var(--radius-full)', fontSize: '0.68rem', fontWeight: 700 }}>
                                  {post.author_id.community_strikes}/3 strikes
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemove(post._id)}
                          style={{ gap: 6, flexShrink: 0 }}
                          id={`remove-post-${post._id}`}
                        >
                          <Trash2 size={13} />
                          Remove + Strike
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BAN MANAGEMENT TAB ───────────────────────────────────────────── */}
          {tab === 'bans' && (
            <div>
              <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(99,102,241,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.15)', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={15} color="#6366f1" />
                Bans are issued automatically after 3 moderation strikes. You can lift bans here after reviewing.
              </div>

              {bannedUsers.length === 0 ? (
                <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
                  <UserCheck size={48} color="var(--color-success)" style={{ margin: '0 auto 16px' }} />
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, color: '#10b981' }}>No Active Bans</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>All students are in good standing.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bannedUsers.map(u => (
                    <div key={u._id} className="glass-card" style={{
                      padding: '16px 20px', borderLeft: '3px solid #ef4444',
                      display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1rem', fontWeight: 800, color: 'white', flexShrink: 0,
                        }}>
                          <UserX size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {u.name}
                            <span style={{ padding: '1px 7px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 'var(--radius-full)', fontSize: '0.68rem', fontWeight: 700 }}>
                              BANNED
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {u.register_number} · {u.block_name}{u.floor_no ? ` Floor ${u.floor_no}` : ''}{u.room_no ? ` Room ${u.room_no}` : ''}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Shield size={11} />
                            {u.community_strikes}/3 strikes
                            <span>· Banned since {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleUnban(u._id, u.name)}
                        style={{ gap: 6, flexShrink: 0 }}
                        id={`unban-${u._id}`}
                      >
                        <UserCheck size={14} />
                        Lift Ban
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TRENDING TAB ─────────────────────────────────────────────────── */}
          {tab === 'trending' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Tag cloud */}
              <div className="glass-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag size={15} color="#f59e0b" />
                  Trending Tags (Last 7 Days)
                </h3>
                {trending?.tag_cloud?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {trending.tag_cloud.map((tag, i) => {
                      const maxCount = trending.tag_cloud[0]?.count || 1;
                      const size = 0.72 + (tag.count / maxCount) * 0.28;
                      return (
                        <span
                          key={i}
                          style={{
                            padding: '4px 10px', borderRadius: 'var(--radius-full)',
                            background: `rgba(99,102,241,${0.05 + (tag.count / maxCount) * 0.2})`,
                            border: `1px solid rgba(99,102,241,${0.1 + (tag.count / maxCount) * 0.3})`,
                            color: `rgba(129,140,248,${0.6 + (tag.count / maxCount) * 0.4})`,
                            fontSize: `${size}rem`, fontWeight: 600, cursor: 'default',
                          }}
                        >
                          #{tag._id}
                          <span style={{ marginLeft: 4, opacity: 0.7, fontSize: '0.65rem' }}>{tag.count}</span>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tags used recently</div>
                )}
              </div>

              {/* Hot posts */}
              <div className="glass-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flame size={15} color="#ef4444" />
                  Top Posts Today
                </h3>
                {trending?.hot_posts?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {trending.hot_posts.map((post, i) => {
                      const color = CATEGORY_COLORS[post.category] || '#6366f1';
                      return (
                        <div key={post._id} style={{
                          padding: '10px 12px', background: 'var(--bg-elevated)',
                          borderRadius: 'var(--radius-sm)', borderLeft: `2px solid ${color}55`,
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                        }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', minWidth: 16, marginTop: 1 }}>
                            {i + 1}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.855rem', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {post.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color }}>{CATEGORY_EMOJIS[post.category]} {post.category}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <ArrowBigUp size={11} /> {post.vote_score || 0}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Eye size={11} /> {post.views || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No activity in last 24 hours</div>
                )}
              </div>

              {/* Active categories */}
              <div className="glass-card" style={{ padding: 20, gridColumn: '1 / -1' }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={15} color="#10b981" />
                  Category Activity Today
                </h3>
                {trending?.hot_categories?.length > 0 ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {trending.hot_categories.map(cat => {
                      const color = CATEGORY_COLORS[cat._id] || '#6366f1';
                      const emoji = CATEGORY_EMOJIS[cat._id] || '💬';
                      return (
                        <div
                          key={cat._id}
                          style={{
                            padding: '10px 16px', borderRadius: 'var(--radius-md)',
                            background: color + '12', border: `1px solid ${color}30`,
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}
                        >
                          <span style={{ fontSize: '1.1rem' }}>{emoji}</span>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color }}>{cat._id}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{cat.count} posts today</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No posts in the last 24 hours</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
