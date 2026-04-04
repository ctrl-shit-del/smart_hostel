import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import {
  MessageCircle, ArrowBigUp, ArrowBigDown, Search, Plus, X,
  Eye, Clock, Send, AlertTriangle, TrendingUp, Hash, Flame,
  Sparkles, BookOpen, HelpCircle, Laugh, MessageSquare, Shield,
  ChevronDown, ChevronUp, Trash2, CornerDownRight, Star, Megaphone,
  Tag, Zap, Award, Users,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'All', 'General', 'Lost & Found', 'Book Exchange', 'Events',
  'Questions', 'Memes', 'Rant', 'Hostel Feedback',
];

const SORT_OPTIONS = [
  { value: 'hot', label: 'Hot', icon: Flame },
  { value: 'new', label: 'New', icon: Sparkles },
  { value: 'top', label: 'Top', icon: TrendingUp },
];

const CATEGORY_META = {
  'General':        { icon: MessageCircle, color: '#6366f1', emoji: '💬' },
  'Lost & Found':   { icon: Search,        color: '#f59e0b', emoji: '🔍' },
  'Book Exchange':  { icon: BookOpen,       color: '#10b981', emoji: '📚' },
  'Events':         { icon: Award,          color: '#ec4899', emoji: '🎉' },
  'Questions':      { icon: HelpCircle,     color: '#3b82f6', emoji: '❓' },
  'Memes':          { icon: Laugh,          color: '#f97316', emoji: '😂' },
  'Rant':           { icon: AlertTriangle,  color: '#ef4444', emoji: '😤' },
  'Hostel Feedback':{ icon: Megaphone,      color: '#a855f7', emoji: '📢' },
};

function getCatMeta(cat) {
  return CATEGORY_META[cat] || { icon: Hash, color: '#6366f1', emoji: '💬' };
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

// ─── Avatar Component ─────────────────────────────────────────────────────────
function PseudoAvatar({ pseudonym, color, size = 28 }) {
  const initials = pseudonym?.slice(0, 2).toUpperCase() || '??';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}, ${color}bb)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 800, color: 'white',
      flexShrink: 0, boxShadow: `0 0 8px ${color}44`,
      letterSpacing: '-0.5px',
    }}>
      {initials}
    </div>
  );
}

// ─── Category Chip ─────────────────────────────────────────────────────────────
function CategoryChip({ cat, active, onClick, count }) {
  const meta = getCatMeta(cat);
  const Icon = meta.icon;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 12px', borderRadius: 'var(--radius-full)',
        fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
        border: `1px solid ${active ? meta.color + '60' : 'var(--border)'}`,
        background: active ? meta.color + '1a' : 'transparent',
        color: active ? meta.color : 'var(--text-muted)',
        transition: 'all 200ms', whiteSpace: 'nowrap',
      }}
    >
      {cat !== 'All' && <Icon size={11} />}
      {cat !== 'All' && <span>{meta.emoji}</span>}
      {cat}
      {count !== undefined && (
        <span style={{
          marginLeft: 2, fontSize: '0.7rem',
          color: active ? meta.color : 'var(--text-muted)',
          opacity: 0.8,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CommunityForum() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState(null);
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('hot');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);
  const [strikes, setStrikes] = useState(0);
  const [banned, setBanned] = useState(false);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newTags, setNewTags] = useState('');
  const [creating, setCreating] = useState(false);

  // Reply
  const [replyContent, setReplyContent] = useState({});
  const [replying, setReplying] = useState(null);

  const searchRef = useRef(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ sort, limit: '30' });
      if (category !== 'All') params.set('category', category);
      if (searchQuery) params.set('search', searchQuery);
      const res = await api.get(`/community?${params}`);
      setPosts(res.posts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [category, sort, searchQuery]);

  const fetchMeta = useCallback(async () => {
    try {
      const [strikeRes, trendRes] = await Promise.allSettled([
        api.get('/community/my/strikes'),
        api.get('/community/trending'),
      ]);
      if (strikeRes.value) {
        setStrikes(strikeRes.value.strikes || 0);
        setBanned(strikeRes.value.banned || false);
      }
      if (trendRes.value) setTrending(trendRes.value);
    } catch {}
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) { toast.error('Title and content required'); return; }
    if (banned) { toast.error('You are banned from the community'); return; }

    setCreating(true);
    try {
      const res = await api.post('/community', {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      });

      if (res.flagged) {
        toast('⚠️ Post published but flagged for review.', { icon: '🔍' });
      } else {
        toast.success('Post published! 🎉');
      }
      if (res.strikes !== undefined) setStrikes(res.strikes);
      if (res.banned) setBanned(true);

      setShowCreate(false);
      setNewTitle(''); setNewContent(''); setNewTags(''); setNewCategory('General');
      fetchPosts();
      fetchMeta();
    } catch (err) {
      toast.error(err.message || 'Failed to create post');
      if (err.strikes !== undefined) setStrikes(err.strikes);
      if (err.banned) setBanned(true);
    } finally {
      setCreating(false);
    }
  };

  const handleVote = async (postId, vote) => {
    try {
      const res = await api.post(`/community/${postId}/vote`, { vote });
      setPosts(prev => prev.map(p =>
        p._id === postId
          ? { ...p, upvote_count: res.upvote_count, downvote_count: res.downvote_count, vote_score: res.vote_score, user_vote: res.user_vote }
          : p
      ));
    } catch { toast.error('Vote failed'); }
  };

  const handleReply = async (postId) => {
    const content = replyContent[postId]?.trim();
    if (!content) return;
    setReplying(postId);
    try {
      const res = await api.post(`/community/${postId}/reply`, { content });
      toast.success(res.flagged ? '⚠️ Reply posted but flagged.' : 'Reply posted!');
      setReplyContent(prev => ({ ...prev, [postId]: '' }));
      // Refresh the post
      const postRes = await api.get(`/community/${postId}`);
      setPosts(prev => prev.map(p => p._id === postId ? postRes.post : p));
    } catch (err) {
      toast.error(err.message || 'Reply failed');
    } finally {
      setReplying(null);
    }
  };

  const handleReplyVote = async (postId, replyId, vote) => {
    try {
      const res = await api.post(`/community/${postId}/reply/${replyId}/vote`, { vote });
      setPosts(prev => prev.map(p => {
        if (p._id !== postId) return p;
        return {
          ...p,
          replies: (p.replies || []).map(r =>
            r._id === replyId ? { ...r, upvote_count: res.upvote_count, downvote_count: res.downvote_count, user_vote: res.user_vote } : r
          ),
        };
      }));
    } catch {}
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(`/community/${postId}`);
      setPosts(prev => prev.filter(p => p._id !== postId));
      toast.success('Post deleted');
    } catch { toast.error('Delete failed'); }
  };

  // Category counts from trending data
  const catCounts = {};
  (trending?.hot_categories || []).forEach(c => { catCounts[c._id] = c.count; });

  return (
    <div className="animate-fade-in">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageSquare size={28} />
            Hostel Community
          </h1>
          <p>Anonymous discussions, lost & found, feedback — pseudonymously protected</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {strikes > 0 && (
            <div title={`${strikes}/3 moderation strikes`} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              background: strikes >= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${strikes >= 3 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
              fontSize: '0.8rem', fontWeight: 600,
              color: strikes >= 3 ? '#ef4444' : '#f59e0b',
            }}>
              <Shield size={13} />
              {strikes}/3 strikes {banned && '· BANNED'}
            </div>
          )}
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            disabled={banned}
            id="create-post-btn"
          >
            <Plus size={16} />
            New Post
          </button>
        </div>
      </div>

      {/* ── Banned banner ─────────────────────────────────────────────────── */}
      {banned && (
        <div style={{
          padding: '14px 20px', marginBottom: 20,
          background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={20} color="#ef4444" />
          <div>
            <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9rem' }}>You've been banned from the community</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>3 strikes reached. Contact your warden or floor admin to appeal.</div>
          </div>
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT: Feed ───────────────────────────────────────────────────── */}
        <div>
          {/* Controls bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Sort tabs */}
            <div style={{
              display: 'flex', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', overflow: 'hidden',
            }}>
              {SORT_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSort(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                      background: sort === opt.value ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: sort === opt.value ? '#818cf8' : 'var(--text-secondary)',
                      border: 'none', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600,
                      transition: 'all 200ms',
                    }}
                    id={`sort-${opt.value}`}
                  >
                    <Icon size={13} />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                ref={searchRef}
                className="input"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchPosts()}
                style={{ paddingLeft: 36 }}
                id="search-posts"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Category filter chips */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <CategoryChip
                key={cat}
                cat={cat}
                active={category === cat}
                onClick={() => setCategory(cat)}
                count={cat !== 'All' ? catCounts[cat] : undefined}
              />
            ))}
          </div>

          {/* Posts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 130, borderRadius: 'var(--radius-lg)' }} />
              ))
            ) : posts.length === 0 ? (
              <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
                <MessageCircle size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>No posts yet</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>Be the first to start a conversation!</div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)} disabled={banned}>
                  <Plus size={16} /> Create Post
                </button>
              </div>
            ) : (
              posts.map(post => (
                <PostCard
                  key={post._id}
                  post={post}
                  isExpanded={expandedPost === post._id}
                  onToggle={() => setExpandedPost(expandedPost === post._id ? null : post._id)}
                  onVote={handleVote}
                  onReply={handleReply}
                  onReplyVote={handleReplyVote}
                  onDelete={handleDelete}
                  replyContent={replyContent[post._id] || ''}
                  setReplyContent={(val) => setReplyContent(prev => ({ ...prev, [post._id]: val }))}
                  replying={replying === post._id}
                  banned={banned}
                  currentUserId={user?._id}
                />
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Sidebar ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 88 }}>

          {/* Community rules */}
          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={15} color="#6366f1" />
              Community Rules
            </h3>
            {[
              ['🎭', "Pseudonymous — your identity is hidden from peers"],
              ['🤖', 'AI moderation censors toxic language automatically'],
              ['⚠️', "3 strikes and you're banned — be respectful"],
              ['👁️', 'Admins can trace identity if needed'],
              ['🤝', "Keep it constructive — rants are okay, harassment isn't"],
            ].map(([emoji, rule], i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <span style={{ flexShrink: 0 }}>{emoji}</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>

          {/* Trending tags */}
          {trending?.tag_cloud?.length > 0 && (
            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={15} color="#f59e0b" />
                Trending Tags
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {trending.tag_cloud.map((tag, i) => (
                  <button
                    key={i}
                    onClick={() => { setSearchQuery(tag._id); fetchPosts(); }}
                    style={{
                      padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 200ms',
                      fontWeight: 500,
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#818cf8'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    #{tag._id}
                    <span style={{ marginLeft: 4, opacity: 0.6 }}>{tag.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hot posts today */}
          {trending?.hot_posts?.length > 0 && (
            <div className="glass-card" style={{ padding: '18px 20px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Flame size={15} color="#ef4444" />
                Hot Today
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {trending.hot_posts.map((post, i) => {
                  const meta = getCatMeta(post.category);
                  return (
                    <div
                      key={post._id}
                      onClick={() => setExpandedPost(prev => prev === post._id ? null : post._id)}
                      style={{ cursor: 'pointer', padding: '8px 10px', borderRadius: 'var(--radius-sm)', transition: 'background 200ms' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', minWidth: 14, marginTop: 1 }}>
                          {i + 1}
                        </span>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 3 }}>
                            {post.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.7rem', color: meta.color }}>{meta.emoji} {post.category}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <ArrowBigUp size={11} />
                              {post.vote_score || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick new post CTA */}
          {!banned && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
              style={{ width: '100%' }}
              id="sidebar-new-post"
            >
              <Plus size={15} />
              Share Something
            </button>
          )}
        </div>
      </div>

      {/* ── Create Post Modal ─────────────────────────────────────────────── */}
      {showCreate && (
        <CreatePostModal
          categories={CATEGORIES.filter(c => c !== 'All')}
          newTitle={newTitle} setNewTitle={setNewTitle}
          newContent={newContent} setNewContent={setNewContent}
          newCategory={newCategory} setNewCategory={setNewCategory}
          newTags={newTags} setNewTags={setNewTags}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          creating={creating}
        />
      )}
    </div>
  );
}

// ─── Create Post Modal ────────────────────────────────────────────────────────
function CreatePostModal({ categories, newTitle, setNewTitle, newContent, setNewContent, newCategory, setNewCategory, newTags, setNewTags, onSubmit, onClose, creating }) {
  const meta = getCatMeta(newCategory);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, backdropFilter: 'blur(8px)',
    }}>
      <div className="glass-card" style={{
        width: '100%', maxWidth: 620, padding: 0, overflow: 'hidden',
        animation: 'fadeInUp 0.3s ease',
        border: `1px solid ${meta.color}33`,
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: `linear-gradient(135deg, ${meta.color}10, transparent)`,
        }}>
          <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>{meta.emoji}</span>
            Create New Post
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} id="close-create-modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Category */}
          <div className="form-group">
            <label className="form-label">Category</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {categories.map(cat => {
                const m = getCatMeta(cat);
                const Icon = m.icon;
                const isActive = newCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                      borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 600,
                      border: `1px solid ${isActive ? m.color + '55' : 'var(--border)'}`,
                      background: isActive ? m.color + '18' : 'transparent',
                      color: isActive ? m.color : 'var(--text-muted)',
                      cursor: 'pointer', transition: 'all 150ms',
                    }}
                  >
                    <Icon size={11} />
                    {m.emoji} {cat}
                  </button>
                );
              })}
            </div>
            {newCategory === 'Hostel Feedback' && (
              <div style={{
                marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
                fontSize: '0.78rem', color: '#a855f7', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Megaphone size={12} />
                Hostel Feedback posts are visible to wardens and floor admins
              </div>
            )}
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="input"
              placeholder="What's on your mind?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={200}
              required
              id="post-title-input"
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'flex-end' }}>{newTitle.length}/200</span>
          </div>

          {/* Content */}
          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea
              className="textarea"
              placeholder="Share your thoughts, find lost items, exchange books, or give the hostel feedback..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              maxLength={3000}
              rows={5}
              required
              id="post-content-input"
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'flex-end' }}>{newContent.length}/3000</span>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label">Tags <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional, comma-separated)</span></label>
            <input
              className="input"
              placeholder="e.g. floor-3, urgent, textbook"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              id="post-tags-input"
            />
            {newTags && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                {newTags.split(',').filter(t => t.trim()).map((t, i) => (
                  <span key={i} style={{
                    padding: '2px 8px', background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-full)', fontSize: '0.7rem',
                    color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
                  }}>
                    #{t.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Moderation notice */}
          <div style={{
            padding: '10px 14px', background: 'rgba(99,102,241,0.06)',
            borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.15)',
            fontSize: '0.78rem', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Shield size={13} color="#6366f1" />
            Posts are AI-moderated. Profanity is auto-censored. Highly toxic content = instant strike. 3 strikes = community ban.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2, background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)` }} disabled={creating}>
              {creating ? 'Publishing...' : `${meta.emoji} Publish Post`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, isExpanded, onToggle, onVote, onReply, onReplyVote, onDelete, replyContent, setReplyContent, replying, banned, currentUserId }) {
  const meta = getCatMeta(post.category);
  const isOwn = post.author_id?.toString() === currentUserId?.toString();

  return (
    <div
      className="glass-card"
      style={{
        padding: 0, overflow: 'hidden',
        borderLeft: `3px solid ${meta.color}55`,
        transition: 'all 200ms',
      }}
      id={`post-${post._id}`}
    >
      <div style={{ display: 'flex' }}>
        {/* Vote column */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
          padding: '14px 6px', minWidth: 48,
          background: 'rgba(0,0,0,0.1)',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); onVote(post._id, post.user_vote === 'up' ? 'none' : 'up'); }}
            style={{
              background: post.user_vote === 'up' ? 'rgba(245,158,11,0.15)' : 'none',
              border: 'none', cursor: 'pointer', padding: '4px 5px',
              color: post.user_vote === 'up' ? '#f59e0b' : 'var(--text-muted)',
              transition: 'all 200ms', borderRadius: 6,
            }}
          >
            <ArrowBigUp size={20} fill={post.user_vote === 'up' ? '#f59e0b' : 'none'} />
          </button>
          <span style={{
            fontSize: '0.85rem', fontWeight: 800, lineHeight: 1, padding: '2px 0',
            color: post.vote_score > 0 ? '#f59e0b' : post.vote_score < 0 ? '#ef4444' : 'var(--text-muted)',
          }}>
            {post.vote_score || 0}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onVote(post._id, post.user_vote === 'down' ? 'none' : 'down'); }}
            style={{
              background: post.user_vote === 'down' ? 'rgba(99,102,241,0.15)' : 'none',
              border: 'none', cursor: 'pointer', padding: '4px 5px',
              color: post.user_vote === 'down' ? '#6366f1' : 'var(--text-muted)',
              transition: 'all 200ms', borderRadius: 6,
            }}
          >
            <ArrowBigDown size={20} fill={post.user_vote === 'down' ? '#6366f1' : 'none'} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '14px 18px 14px 10px', minWidth: 0 }}>
          {/* Meta line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, flexWrap: 'wrap' }}>
            <PseudoAvatar pseudonym={post.pseudonym} color={post.avatar_color || meta.color} size={22} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: post.avatar_color || meta.color }}>
              {post.pseudonym}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>·</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: '0.68rem', fontWeight: 600, padding: '2px 7px',
              borderRadius: 'var(--radius-full)',
              background: meta.color + '18',
              color: meta.color,
            }}>
              {meta.emoji} {post.category}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
              <Clock size={10} />
              {timeAgo(post.created_at)}
            </span>
            {post.flagged && (
              <span style={{
                padding: '1px 6px', fontSize: '0.65rem', fontWeight: 600,
                background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                borderRadius: 'var(--radius-full)', border: '1px solid rgba(245,158,11,0.2)',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <AlertTriangle size={9} /> Flagged
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            onClick={onToggle}
            style={{
              fontSize: '0.97rem', fontWeight: 700, marginBottom: 5, cursor: 'pointer',
              color: 'var(--text-primary)', lineHeight: 1.35,
              transition: 'color 180ms',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = meta.color}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          >
            {post.title}
          </h3>

          {/* Content preview */}
          {!isExpanded ? (
            <div style={{
              fontSize: '0.855rem', color: 'var(--text-secondary)', lineHeight: 1.6,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {post.content}
            </div>
          ) : (
            <div style={{
              fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {post.content}
            </div>
          )}

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {post.tags.map((tag, i) => (
                <span key={i} style={{
                  padding: '2px 7px', borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-elevated)', fontSize: '0.68rem',
                  color: 'var(--text-muted)', border: '1px solid var(--border)',
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Action bar */}
          <div style={{ display: 'flex', gap: 12, marginTop: 10, alignItems: 'center' }}>
            <button
              onClick={onToggle}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
                color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                padding: '3px 7px', borderRadius: 'var(--radius-sm)', transition: 'all 180ms',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              {isExpanded ? <ChevronUp size={13} /> : <MessageCircle size={13} />}
              {post.reply_count || post.replies?.length || 0} {isExpanded ? 'hide' : 'comments'}
            </button>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <Eye size={12} />
              {post.views || 0}
            </span>
            {/* Delete own post */}
            {isOwn && (
              <button
                onClick={() => onDelete(post._id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                  color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer',
                  padding: '3px 7px', borderRadius: 'var(--radius-sm)', transition: 'all 180ms',
                  marginLeft: 'auto',
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
                title="Delete your post"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {/* Expanded: comments section */}
          {isExpanded && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              {/* Replies */}
              {post.replies?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {post.replies.map(reply => (
                    <ReplyCard
                      key={reply._id}
                      reply={reply}
                      postId={post._id}
                      onReplyVote={onReplyVote}
                    />
                  ))}
                </div>
              )}

              {/* Reply input */}
              {!banned && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <textarea
                      className="textarea"
                      placeholder="Write a reply... (AI moderated)"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                      style={{ minHeight: 56, fontSize: '0.875rem' }}
                      id={`reply-input-${post._id}`}
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onReply(post._id)}
                    disabled={replying || !replyContent.trim()}
                    style={{ marginBottom: 1, flexShrink: 0 }}
                  >
                    {replying ? (
                      <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite', display: 'block' }} />
                    ) : (
                      <><Send size={13} /> Reply</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Reply Card ───────────────────────────────────────────────────────────────
function ReplyCard({ reply, postId, onReplyVote }) {
  const accentColor = reply.avatar_color || '#6366f1';

  return (
    <div style={{
      padding: '10px 14px',
      background: 'rgba(0,0,0,0.15)',
      borderRadius: 'var(--radius-md)',
      borderLeft: `2px solid ${accentColor}44`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <CornerDownRight size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <PseudoAvatar pseudonym={reply.pseudonym} color={accentColor} size={18} />
        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: accentColor }}>{reply.pseudonym}</span>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>· {timeAgo(reply.created_at)}</span>
        {reply.flagged && (
          <span style={{ fontSize: '0.62rem', padding: '1px 5px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: 'var(--radius-full)' }}>
            Flagged
          </span>
        )}
      </div>
      <div style={{ fontSize: '0.845rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', paddingLeft: 20 }}>
        {reply.content}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 6, paddingLeft: 20 }}>
        <button
          onClick={() => onReplyVote(postId, reply._id, reply.user_vote === 'up' ? 'none' : 'up')}
          style={{
            background: reply.user_vote === 'up' ? 'rgba(245,158,11,0.1)' : 'none',
            border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4,
            color: reply.user_vote === 'up' ? '#f59e0b' : 'var(--text-muted)',
          }}
        >
          <ArrowBigUp size={14} fill={reply.user_vote === 'up' ? '#f59e0b' : 'none'} />
        </button>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: 14, textAlign: 'center', color: 'var(--text-muted)' }}>
          {(reply.upvote_count || 0) - (reply.downvote_count || 0)}
        </span>
        <button
          onClick={() => onReplyVote(postId, reply._id, reply.user_vote === 'down' ? 'none' : 'down')}
          style={{
            background: reply.user_vote === 'down' ? 'rgba(99,102,241,0.1)' : 'none',
            border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4,
            color: reply.user_vote === 'down' ? '#6366f1' : 'var(--text-muted)',
          }}
        >
          <ArrowBigDown size={14} fill={reply.user_vote === 'down' ? '#6366f1' : 'none'} />
        </button>
      </div>
    </div>
  );
}
