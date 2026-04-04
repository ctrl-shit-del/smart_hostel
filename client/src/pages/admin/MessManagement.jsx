import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
const MESS_TYPES = ['Veg', 'Non-Veg', 'Special'];

const defaultForm = {
  block_name: 'A Block',
  day: 'Monday',
  meal: 'Breakfast',
  mess_type: 'Veg',
  caterer: 'Fusion',
  menu_name: '',
  items: '',
  nutrition: { calories: '', protein: '', carbs: '', fat: '', fiber: '' },
};

const parseItems = (value) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = '', calories = '0', protein = '0', carbs = '0', fat = '0'] = line.split('|').map((part) => part.trim());
      return {
        name,
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
      };
    })
    .filter((item) => item.name);

export default function MessManagement() {
  const [weekly, setWeekly] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);
  const [nightItems, setNightItems] = useState([]);
  const [nightOrders, setNightOrders] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [nightItemForm, setNightItemForm] = useState({
    block_name: 'A Block',
    name: '',
    description: '',
    category: 'Quick Bites',
    price: '',
    available_qty: '',
    prep_time_mins: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeDay, setActiveDay] = useState('Monday');

  useEffect(() => { fetchMenu(); }, []);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const [menuRes, analyticsRes, feedbackRes, nightMenuRes, nightOrderRes] = await Promise.all([
        api.get('/mess/menu/week'),
        api.get('/mess/attendance/analytics'),
        api.get('/mess/feedback/analytics'),
        api.get('/mess/night-menu'),
        api.get('/mess/night-order/manage'),
      ]);
      setWeekly(menuRes.weekly || {});
      setAnalytics(analyticsRes);
      setFeedbackAnalytics(feedbackRes);
      setNightItems(nightMenuRes.items || []);
      setNightOrders(nightOrderRes.orders || []);
    } catch {
      toast.error('Failed to load mess menu');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put('/mess/menu', {
        ...form,
        items: parseItems(form.items),
      });
      toast.success('Menu updated');
      fetchMenu();
    } catch {
      toast.error('Failed to update menu');
    } finally {
      setSaving(false);
    }
  };

  const loadSuggestedWeek = async () => {
    try {
      await api.post('/mess/menu/seed-defaults', { block_name: form.block_name });
      toast.success('Suggested menu loaded');
      fetchMenu();
    } catch {
      toast.error('Failed to load suggested menu');
    }
  };

  const addNightItem = async (e) => {
    e.preventDefault();
    try {
      await api.post('/mess/night-menu/item', nightItemForm);
      toast.success('Night mess item added');
      setNightItemForm({
        block_name: 'A Block',
        name: '',
        description: '',
        category: 'Quick Bites',
        price: '',
        available_qty: '',
        prep_time_mins: '',
      });
      fetchMenu();
    } catch {
      toast.error('Failed to add night mess item');
    }
  };

  const updateNightOrderStatus = async (orderId, status) => {
    try {
      await api.patch(`/mess/night-order/${orderId}/status`, { status });
      toast.success(`Order marked ${status}`);
      fetchMenu();
    } catch {
      toast.error('Failed to update order');
    }
  };

  const loadMealIntoForm = (entry) => {
    setForm({
      block_name: entry.block_name || 'A Block',
      day: entry.day,
      meal: entry.meal,
      mess_type: entry.mess_type,
      caterer: entry.caterer || '',
      menu_name: entry.menu_name || '',
      items: (entry.items || [])
        .map((item) => `${item.name} | ${item.calories || 0} | ${item.protein || 0} | ${item.carbs || 0} | ${item.fat || 0}`)
        .join('\n'),
      nutrition: {
        calories: entry.nutrition?.calories || '',
        protein: entry.nutrition?.protein || '',
        carbs: entry.nutrition?.carbs || '',
        fat: entry.nutrition?.fat || '',
        fiber: entry.nutrition?.fiber || '',
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Mess Management</h1>
        <p>Plan 3 mess types for 7 days, keep meal nutrition visible, and use actual meal attendance to predict crowd and reduce waste.</p>
      </div>

      {analytics && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Today&apos;s Meal Attendance Insights</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Student self-reported meal attendance from {analytics.block}. Use the prep recommendation to reduce overproduction.
              </div>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Total students: <strong>{analytics.totalStudents || 0}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
            {MEALS.map((meal) => {
              const stat = analytics.meals?.[meal];
              return (
                <div key={meal} style={{ padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontWeight: 700 }}>{meal}</div>
                    <span className={`badge ${stat?.wasteRisk === 'High' ? 'badge-danger' : stat?.wasteRisk === 'Moderate' ? 'badge-warning' : 'badge-success'}`}>
                      {stat?.wasteRisk || 'Low'} waste risk
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 10 }}>Ate: {stat?.ateCount || 0}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Skipped: {stat?.skippedCount || 0}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Pending response: {stat?.pendingCount || 0}</div>
                  <div style={{ marginTop: 10, fontWeight: 700 }}>Prep target: {stat?.recommendedPrep || 0} plates</div>
                  <div style={{ fontSize: '0.78rem', color: '#93c5fd', marginTop: 4 }}>
                    Historical average: {stat?.historicalAverage || 0} diners
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {feedbackAnalytics && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Anonymous Feedback Insights</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Ratings and comments are anonymized. Use this to improve menu quality without exposing student identity.
              </div>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Responses: <strong>{feedbackAnalytics.totalResponses || 0}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 16 }}>
            {MEALS.map((meal) => {
              const stat = feedbackAnalytics.meals?.[meal];
              return (
                <div key={meal} style={{ padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.4)' }}>
                  <div style={{ fontWeight: 700 }}>{meal}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>Overall: {stat?.overall || 0}/5</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Taste: {stat?.avgTaste || 0}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Quality: {stat?.avgQuality || 0}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Quantity: {stat?.avgQuantity || 0}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Hygiene: {stat?.avgHygiene || 0}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Variety: {stat?.avgVariety || 0}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Low Rated Meals</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(feedbackAnalytics.lowRatedMeals || []).length === 0 && <div style={{ color: 'var(--text-muted)' }}>No low-rated meals today.</div>}
                {(feedbackAnalytics.lowRatedMeals || []).map((item, index) => (
                  <div key={`${item.meal}-${index}`} style={{ padding: 12, borderRadius: 12, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ fontWeight: 600 }}>{item.meal} · {item.mess_type}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{item.menu_name}</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Overall rating: {item.overall}/5</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Recent Anonymous Comments</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(feedbackAnalytics.recentComments || []).length === 0 && <div style={{ color: 'var(--text-muted)' }}>No comments yet.</div>}
                {(feedbackAnalytics.recentComments || []).map((item, index) => (
                  <div key={`${item.meal}-${index}`} style={{ padding: 12, borderRadius: 12, background: 'rgba(15, 23, 42, 0.42)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontWeight: 600 }}>{item.meal} · {item.mess_type}</div>
                    <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginTop: 4 }}>{item.menu_name} · {item.overall}/5</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>{item.comment}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
          <form onSubmit={addNightItem} style={{ display: 'grid', gap: 12, alignSelf: 'start' }}>
            <div style={{ fontWeight: 700 }}>Night Mess Catalog</div>
            {[
              ['Name', 'name'],
              ['Description', 'description'],
              ['Category', 'category'],
              ['Price', 'price'],
              ['Available Qty', 'available_qty'],
              ['Prep Time (mins)', 'prep_time_mins'],
            ].map(([label, key]) => (
              <div key={key} className="form-group">
                <label className="form-label">{label}</label>
                <input
                  className="input"
                  value={nightItemForm[key]}
                  onChange={(e) => setNightItemForm({ ...nightItemForm, [key]: e.target.value })}
                />
              </div>
            ))}
            <button className="btn btn-primary" type="submit">Add Night Item</button>
          </form>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Available Night Items</div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
              {nightItems.map((item) => (
                <div key={item._id} style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    <span>{item.price}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {item.category} · {item.available_qty} left · {item.prep_time_mins} mins
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontWeight: 700, marginBottom: 10 }}>Night Mess Orders</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {nightOrders.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No night mess orders yet.</div>}
              {nightOrders.map((order) => (
                <div key={order._id} style={{ padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.36)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{order.order_no}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Room {order.room_no} · {order.items?.map((item) => `${item.name} x${item.qty}`).join(', ')}
                      </div>
                    </div>
                    <span className={`badge ${order.status === 'Ready' || order.status === 'Delivered' ? 'badge-success' : order.status === 'OutOfStock' || order.status === 'NotReady' ? 'badge-danger' : order.status === 'NotCollected' ? 'badge-warning' : 'badge-info'}`}>
                      {order.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {['Preparing', 'Ready', 'Delivered', 'OutOfStock', 'NotReady', 'NotCollected'].map((status) => (
                      <button key={status} type="button" className="btn btn-secondary btn-sm" onClick={() => updateNightOrderStatus(order._id, status)}>
                        {status}
                      </button>
                    ))}
                  </div>
                  {(order.refund_amount > 0 || order.fine_amount > 0) && (
                    <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginTop: 10 }}>
                      Refund: {order.refund_amount || 0} · Fine: {order.fine_amount || 0}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
        <form
          onSubmit={handleUpdate}
          className="glass-card"
          style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'start' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem' }}>Update Menu</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadSuggestedWeek}>
              Load Suggested Week
            </button>
          </div>

          {[['Block', 'block_name', ['A Block', 'B Block', 'C Block']], ['Day', 'day', DAYS], ['Meal', 'meal', MEALS], ['Mess Type', 'mess_type', MESS_TYPES], ['Caterer', 'caterer', ['Fusion', 'Rassence', 'Grace', 'Proodle', 'Other']]].map(([label, key, opts]) => (
            <div key={key} className="form-group">
              <label className="form-label">{label}</label>
              <select className="select" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
                {opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}

          <div className="form-group">
            <label className="form-label">Menu Title</label>
            <input
              className="input"
              value={form.menu_name}
              onChange={(e) => setForm({ ...form, menu_name: e.target.value })}
              placeholder="Example: Rajma Rice Combo"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Items</label>
            <textarea
              className="textarea"
              style={{ minHeight: 120 }}
              placeholder={'One item per line\nFormat: Name | calories | protein | carbs | fat'}
              value={form.items}
              onChange={(e) => setForm({ ...form, items: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {['calories', 'protein', 'carbs', 'fat', 'fiber'].map((key) => (
              <div key={key} className="form-group">
                <label className="form-label" style={{ textTransform: 'capitalize' }}>{key}</label>
                <input
                  type="number"
                  className="input"
                  value={form.nutrition[key]}
                  onChange={(e) => setForm({
                    ...form,
                    nutrition: { ...form.nutrition, [key]: e.target.value },
                  })}
                />
              </div>
            ))}
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Update Menu'}
          </button>
        </form>

        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
            {DAYS.map((day) => (
              <button
                key={day}
                className={`btn ${activeDay === day ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setActiveDay(day)}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>

          {loading ? <div className="skeleton" style={{ height: 240 }} /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {MESS_TYPES.map((messType) => (
                <div key={messType} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>{messType} Mess</div>
                  {(weekly[activeDay]?.[messType] || []).map((entry) => (
                    <button
                      type="button"
                      key={`${entry.day}-${entry.meal}-${messType}`}
                      onClick={() => loadMealIntoForm(entry)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        marginBottom: 8,
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(15, 23, 42, 0.42)',
                        color: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontWeight: 600 }}>{entry.meal}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{entry.nutrition?.calories || 0} kcal</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{entry.menu_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#93c5fd', marginTop: 4 }}>{entry.caterer}</div>
                    </button>
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
