import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
const MESS_TYPES = ['Veg', 'Non-Veg', 'Special'];

const typeAccent = {
  Veg: { border: 'rgba(52, 211, 153, 0.45)', chip: 'badge-success' },
  'Non-Veg': { border: 'rgba(248, 113, 113, 0.45)', chip: 'badge-danger' },
  Special: { border: 'rgba(96, 165, 250, 0.45)', chip: 'badge-brand' },
};

const nutritionPill = (label, value, unit = 'g') => (
  <div
    key={label}
    style={{
      padding: '8px 10px',
      borderRadius: 10,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.06)',
      minWidth: 72,
    }}
  >
    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</div>
    <div style={{ fontWeight: 700, marginTop: 2 }}>{value}{unit}</div>
  </div>
);

export default function MessInfo() {
  const [weekly, setWeekly] = useState({});
  const [crowd, setCrowd] = useState(null);
  const [mealAttendance, setMealAttendance] = useState({});
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [feedbackByMeal, setFeedbackByMeal] = useState({});
  const [feedbackForm, setFeedbackForm] = useState({
    meal: 'Lunch',
    mess_type: 'Veg',
    menu_name: '',
    rating_taste: 4,
    rating_quality: 4,
    rating_quantity: 4,
    rating_hygiene: 4,
    rating_variety: 4,
    comment: '',
  });
  const [loading, setLoading] = useState(true);
  const [markingMeal, setMarkingMeal] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [activeDay, setActiveDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => {
    Promise.allSettled([api.get('/mess/menu/week'), api.get('/mess/crowd'), api.get('/mess/attendance/today'), api.get('/mess/feedback/today')]).then(([weeklyRes, crowdRes, attendanceRes, feedbackRes]) => {
      setWeekly(weeklyRes.value?.weekly || {});
      setCrowd(crowdRes.value?.crowd || null);
      setMealAttendance(attendanceRes.value?.attendance || {});
      setAttendanceSummary(attendanceRes.value?.summary || null);
      setFeedbackByMeal(feedbackRes.value?.feedback || {});
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const todayMeals = weekly[todayName]?.[feedbackForm.mess_type] || [];
    const activeMeal = todayMeals.find((item) => item.meal === feedbackForm.meal);
    if (activeMeal && feedbackForm.menu_name !== activeMeal.menu_name) {
      setFeedbackForm((prev) => ({ ...prev, menu_name: activeMeal.menu_name }));
    }
  }, [weekly, todayName, feedbackForm.meal, feedbackForm.mess_type, feedbackForm.menu_name]);

  const handleMealAttendance = async (meal, status, messType) => {
    setMarkingMeal(meal);
    try {
      const res = await api.post('/mess/attendance/mark', { meal, status, mess_type: messType });
      setMealAttendance((prev) => {
        const nextAttendance = {
          ...prev,
          [meal]: {
            status: res.attendance?.status || status,
            mess_type: res.attendance?.mess_type || messType,
            recorded_at: res.attendance?.recorded_at,
          },
        };
        const records = Object.values(nextAttendance).filter(Boolean);
        setAttendanceSummary({
          eatenCount: records.filter((entry) => entry.status === 'Ate').length,
          skippedCount: records.filter((entry) => entry.status === 'Skipped').length,
          respondedMeals: records.length,
          pendingMeals: Math.max(4 - records.length, 0),
        });
        return nextAttendance;
      });
    } finally {
      setMarkingMeal('');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      await api.post('/mess/feedback', feedbackForm);
      setFeedbackByMeal((prev) => ({
        ...prev,
        [feedbackForm.meal]: { ...feedbackForm },
      }));
      setFeedbackForm((prev) => ({ ...prev, comment: '' }));
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Mess Menu Optimizer</h1>
        <p>Compare veg, non-veg, and special mess options with meal-by-meal nutrition for the full week.</p>
      </div>

      {crowd && (
        <div
          className={`alert-panel ${crowd.crowd_level === 'Very High' || crowd.crowd_level === 'High' ? 'warning' : 'info'}`}
          style={{ marginBottom: 20 }}
        >
          <div style={{ fontWeight: 700 }}>Live Crowd: {crowd.crowd_level} - {crowd.estimated_fill_percent}% full</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {crowd.recommendation} · Current meal slot: {crowd.meal}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`btn ${activeDay === day ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ flexShrink: 0 }}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {activeDay === todayName && (
        <div className="glass-card" style={{ padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Today&apos;s Meal Attendance</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Mark whether you actually ate each meal so staff can predict crowd and reduce food waste.
              </div>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Ate: <strong>{attendanceSummary?.eatenCount || 0}</strong> · Skipped: <strong>{attendanceSummary?.skippedCount || 0}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {MESS_TYPES.flatMap((messType) => (weekly[todayName]?.[messType] || []).map((meal) => ({ ...meal, messType })))
              .reduce((acc, meal) => {
                if (!acc.some((entry) => entry.meal === meal.meal)) acc.push(meal);
                return acc;
              }, [])
              .map((meal) => {
                const record = mealAttendance[meal.meal];
                return (
                  <div key={meal.meal} style={{ padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.36)' }}>
                    <div style={{ fontWeight: 700 }}>{meal.meal}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {record ? `Marked ${record.status.toLowerCase()}${record.mess_type ? ` · ${record.mess_type}` : ''}` : 'No response yet'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        className={`btn btn-sm ${record?.status === 'Ate' ? 'btn-primary' : 'btn-secondary'}`}
                        disabled={markingMeal === meal.meal}
                        onClick={() => handleMealAttendance(meal.meal, 'Ate', record?.mess_type || meal.messType)}
                      >
                        Ate
                      </button>
                      <button
                        className={`btn btn-sm ${record?.status === 'Skipped' ? 'btn-primary' : 'btn-secondary'}`}
                        disabled={markingMeal === meal.meal}
                        onClick={() => handleMealAttendance(meal.meal, 'Skipped', record?.mess_type || meal.messType)}
                      >
                        Skipped
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {activeDay === todayName && (
        <div className="glass-card" style={{ padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Anonymous Mess Feedback</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Your name is hidden from staff. Share ratings and comments so the menu can improve.
              </div>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Submitted today: <strong>{Object.keys(feedbackByMeal).length}</strong> meals
            </div>
          </div>

          <form onSubmit={handleFeedbackSubmit} style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Meal</label>
                <select className="select" value={feedbackForm.meal} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, meal: e.target.value }))}>
                  {MEALS.map((meal) => <option key={meal}>{meal}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Mess Type</label>
                <select className="select" value={feedbackForm.mess_type} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, mess_type: e.target.value }))}>
                  {MESS_TYPES.map((messType) => <option key={messType}>{messType}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Menu Name</label>
                <input className="input" value={feedbackForm.menu_name} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, menu_name: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
              {[
                ['Taste', 'rating_taste'],
                ['Quality', 'rating_quality'],
                ['Quantity', 'rating_quantity'],
                ['Hygiene', 'rating_hygiene'],
                ['Variety', 'rating_variety'],
              ].map(([label, key]) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <select className="select" value={feedbackForm[key]} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, [key]: Number(e.target.value) }))}>
                    {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}/5</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Anonymous Comment</label>
              <textarea
                className="textarea"
                style={{ minHeight: 90 }}
                placeholder="Example: Rice was good but curry was too oily."
                value={feedbackForm.comment}
                onChange={(e) => setFeedbackForm((prev) => ({ ...prev, comment: e.target.value }))}
              />
            </div>

            {feedbackByMeal[feedbackForm.meal] && (
              <div style={{ fontSize: '0.8rem', color: '#93c5fd' }}>
                Feedback already submitted for {feedbackForm.meal}. Submitting again will update it anonymously.
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={submittingFeedback}>
              {submittingFeedback ? 'Submitting...' : 'Submit Anonymous Feedback'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 320 }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {MESS_TYPES.map((messType) => {
            const meals = weekly[activeDay]?.[messType] || [];
            const accent = typeAccent[messType];

            return (
              <div
                key={messType}
                className="glass-card"
                style={{
                  padding: 18,
                  border: `1px solid ${accent.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>{messType} Mess</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      4 meals planned for {activeDay}
                    </div>
                  </div>
                  <span className={`badge ${accent.chip}`}>{messType}</span>
                </div>

                {meals.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', padding: '14px 0' }}>Menu not available for this mess type.</div>
                ) : meals.map((meal) => (
                  <div
                    key={`${messType}-${meal.meal}`}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background: 'rgba(15, 23, 42, 0.48)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{meal.meal}</div>
                        <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 4 }}>{meal.menu_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#93c5fd', marginTop: 4 }}>Caterer: {meal.caterer}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Meal energy</div>
                        <div style={{ fontWeight: 700 }}>{meal.nutrition?.calories || 0} kcal</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {meal.items?.map((item) => `${item.name} (${item.calories} kcal)`).join(', ')}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8, marginTop: 14 }}>
                      {nutritionPill('Protein', meal.nutrition?.protein || 0)}
                      {nutritionPill('Carbs', meal.nutrition?.carbs || 0)}
                      {nutritionPill('Fat', meal.nutrition?.fat || 0)}
                      {nutritionPill('Fiber', meal.nutrition?.fiber || 0)}
                      {nutritionPill('Kcal', meal.nutrition?.calories || 0, '')}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
