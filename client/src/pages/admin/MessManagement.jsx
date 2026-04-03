import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Night Mess'];

export default function MessManagement() {
  const [weekly, setWeekly] = useState({});
  const [form, setForm] = useState({ block_name: 'A Block', day: 'Monday', meal: 'Breakfast', type: 'Veg', caterer: 'Fusion', items: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMenu(); }, []);

  const fetchMenu = async () => {
    try { const res = await api.get('/mess/menu/week'); setWeekly(res.weekly || {}); } catch {}
    setLoading(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const items = form.items.split(',').map((s) => ({ name: s.trim() })).filter((s) => s.name);
    try {
      await api.put('/mess/menu', { ...form, items });
      toast.success('Menu updated!');
      fetchMenu();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>Mess Management</h1><p>Update weekly menu, view crowd predictions</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
        <form onSubmit={handleUpdate} className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'start' }}>
          <h3 style={{ fontSize: '0.95rem' }}>Update Menu</h3>
          {[['Day', 'day', DAYS], ['Meal', 'meal', MEALS], ['Type', 'type', ['Veg', 'Non-Veg', 'Special', 'Both']], ['Caterer', 'caterer', ['Fusion', 'Rassence', 'Proodle', 'Grace', 'Other']]].map(([label, key, opts]) => (
            <div key={key} className="form-group">
              <label className="form-label">{label}</label>
              <select className="select" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
                {opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Items (comma separated)</label>
            <textarea className="textarea" style={{ minHeight: 60 }} placeholder="e.g. Idli, Sambar, Chutney" value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit">Update Menu</button>
        </form>

        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Weekly Menu Overview</h3>
          {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {DAYS.map((day) => (
                <div key={day} style={{ minWidth: 140, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: 8, color: '#818cf8' }}>{day}</div>
                  {(weekly[day] || []).length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</div>
                  ) : (weekly[day] || []).map((m, i) => (
                    <div key={i} style={{ padding: '6px 8px', marginBottom: 6, background: 'var(--bg-elevated)', borderRadius: 6, fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 600 }}>{m.meal}</div>
                      <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{m.items?.slice(0, 2).map((it) => it.name).join(', ')}{m.items?.length > 2 ? '...' : ''}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
