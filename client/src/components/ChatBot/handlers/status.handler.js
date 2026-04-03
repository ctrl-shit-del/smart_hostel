/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  FEATURE: Personal Status Dashboard                     ║
 * ║  OWNER: Dev-C                                           ║
 * ║  BRANCH: feature/chatbot-status                         ║
 * ║  CONTRACT: Must export `statusHandler(ctx)` → Response  ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * INTENT TRIGGERS (matched by router.js — do NOT modify router):
 *   'my status', 'what is going on', "what's going on", 'overview',
 *   'dashboard', 'summary', 'tell me about', 'how am i doing'
 *
 * CONTEXT SHAPE (ctx): see leave.handler.js for full shape
 *   ctx.session has:
 *     complaints[]  — user's active complaints
 *     gatepass[]    — recent gatepass history
 *     attendance    — { present, absent, rate, last7days[] }
 *     laundry       — { chota_dhobi: {day, time}, profab: {day, pickup, delivery} }
 *     mess          — { crowd_level, recommendation, meal }
 *
 * RESPONSE FORMAT — use type: 'dashboard':
 * {
 *   type: 'dashboard',
 *   text: 'Here is your current status:',
 *   sections: [
 *     {
 *       icon: '📋',
 *       title: 'Complaints',
 *       items: ['Fan issue — Open', 'Water leak — Resolved'],
 *       alert: null | 'You have 1 unresolved urgent complaint!'
 *     },
 *     {
 *       icon: '🚪',
 *       title: 'Leave / Gatepass',
 *       items: ['No active leave'],
 *       alert: null
 *     },
 *     {
 *       icon: '📅',
 *       title: 'Attendance',
 *       items: ['Present: 22 / 30 nights (73%)'],
 *       alert: 'Attendance below 75% — warden may be notified' | null
 *     },
 *     {
 *       icon: '🍽️',
 *       title: 'Mess',
 *       items: ['Caterer: XYZ Mess', 'Currently: Moderate crowd'],
 *       alert: null
 *     },
 *     {
 *       icon: '🧺',
 *       title: 'Laundry',
 *       items: ['Chota Dhobi: Wednesday 9AM', 'Profab Pickup: Friday'],
 *       alert: null
 *     },
 *   ]
 * }
 *
 * ALERTS to generate:
 *   - Unresolved urgent complaints
 *   - Active overdue gatepass (is_overdue: true)
 *   - Attendance rate < 75%
 *   - Upcoming laundry slot (within 24hrs)
 */

// ─── STUB — Replace with full implementation ──────────────────────────────────

export function statusHandler(ctx) {
  const { session } = ctx;
  const sections = [];

  // 1. Complaints
  const complaints = session.complaints || [];
  const activeComplaints = complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed');
  const urgentComplaints = activeComplaints.filter(c => c.severity === 'Urgent' || c.severity === 'High');
  
  sections.push({
    icon: '📋',
    title: 'Complaints',
    items: complaints.length === 0 
      ? ['No recent complaints'] 
      : complaints.slice(0, 2).map(c => `${c.title || c.category} — ${c.status}`),
    alert: urgentComplaints.length > 0 ? `You have ${urgentComplaints.length} unresolved urgent complaint(s)!` : null
  });

  // 2. Leave / Gatepass
  const gatepass = session.gatepass || [];
  const activeGatepass = gatepass.find(g => ['Pending', 'Approved', 'Out'].includes(g.status));
  const overdueGatepass = gatepass.find(g => g.is_overdue);

  sections.push({
    icon: '🚪',
    title: 'Leave / Gatepass',
    items: activeGatepass 
      ? [`${activeGatepass.type} to ${activeGatepass.destination} — ${activeGatepass.status}`] 
      : ['No active leave'],
    alert: overdueGatepass ? '⚠️ You have an overdue gatepass. Return immediately!' : null
  });

  // 3. Attendance
  const attendance = session.attendance || { present: 0, total: 30, rate: 0 };
  const attRate = attendance.rate || 0;
  
  sections.push({
    icon: '📅',
    title: 'Attendance',
    items: [`Present: ${attendance.present} / ${attendance.total} days (${attRate}%)`],
    alert: attRate < 75 ? 'Attendance below 75% — warden may be notified' : null
  });

  // 4. Mess
  const mess = session.mess || {};
  sections.push({
    icon: '🍽️',
    title: 'Mess',
    items: [`Caterer: ${mess.caterer || 'N/A'}`, `Currently: ${mess.crowd_level || 'Unknown'} crowd`],
    alert: null
  });

  // 5. Laundry
  const laundry = session.laundry || {};
  let laundryAlert = null;
  const todayStr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  if (laundry.chota_dhobi?.day === todayStr || laundry.profab?.day === todayStr) {
    laundryAlert = 'You have a laundry slot today!';
  }

  sections.push({
    icon: '🧺',
    title: 'Laundry',
    items: [
      `Chota Dhobi: ${(laundry.chota_dhobi && laundry.chota_dhobi.day) ? laundry.chota_dhobi.day + ' ' + laundry.chota_dhobi.time : 'N/A'}`, 
      `Profab Pickup: ${(laundry.profab && laundry.profab.day) ? laundry.profab.day : 'N/A'}`
    ],
    alert: laundryAlert
  });

  return {
    type: 'dashboard',
    text: 'Here is your current status dashboard:',
    sections
  };
}
