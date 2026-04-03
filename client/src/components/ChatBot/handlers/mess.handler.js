/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  FEATURE: Mess Intelligence + Room Migration            ║
 * ║  OWNER: Dev-E                                           ║
 * ║  BRANCH: feature/chatbot-mess-rooms                     ║
 * ║  CONTRACT: Must export `messHandler(ctx)` AND           ║
 * ║            `roomHandler(ctx)` → Response                ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * INTENT TRIGGERS — mess (matched by router.js — do NOT modify router):
 *   'mess', 'food', 'lunch', 'dinner', 'breakfast', 'eat',
 *   'crowded', 'crowd', 'caterer', 'switch mess', 'migrate mess'
 *
 * INTENT TRIGGERS — room (matched by router.js):
 *   'room', 'migrate', 'shift', 'change room', 'ac room', 'nac room',
 *   'available', '3ac', '2ac', '4ac'
 *
 * ─── MESS HANDLER ─────────────────────────────────────────────────────────────
 *
 * CROWD SIMULATION — use this exact table (mirrors ai-service/main.py):
 *   7–9   → Breakfast, High (65%)
 *   9–12  → Post-Breakfast, Low (10%)
 *   12–13 → Lunch Peak, Very High (90%)
 *   13–14 → Lunch, High (70%)
 *   14–19 → Off Peak, Low (15%)
 *   19–20 → Dinner, High (75%)
 *   20–21 → Dinner Peak, Very High (85%)
 *   21–24 → Night Mess, Low (20%)
 *   Weekend bonus: +10%
 *   Tip: Use ctx.now.getHours() and ctx.now.getDay()
 *
 * RESPONSES:
 *   > 70% → "🔴 Mess is currently at peak crowd. Expected queue: 15–20 mins."
 *   40–70% → "🟡 Moderate crowd. Best to go within 30 minutes."
 *   < 40% → "🟢 Mess is clear right now. Good time to head over!"
 *
 * MIGRATION: If user asks about switching caterer:
 *   → "Room migration for mess changes requires warden approval.
 *      Your current caterer: [ctx.session.mess.caterer | ctx.user.mess_information].
 *      Would you like me to help raise a mess migration request?"
 *
 * ─── ROOM HANDLER ─────────────────────────────────────────────────────────────
 *
 * Simulate room availability (no real DB call needed — use seeded random):
 *   const seed = ctx.user.room_no + new Date().getDate();
 *   Available types: based on (seed % 3): 0=Limited, 1=Available, 2=None
 *
 * RESPONSE when available:
 *   "✅ 3 Bed AC rooms are currently available in your block.
 *    Room migration requires warden approval. Would you like to apply?"
 *
 * RESPONSE when not available:
 *   "❌ No 3 Bed AC rooms available currently.
 *    Alternatives available: 2 Bed AC (moderate availability)."
 */

// ─── STUBS — Replace with full implementation ─────────────────────────────────

/**
 * @param {object} ctx
 * @returns {object} Response
 */
export function messHandler(ctx) {
  // TODO: implement
  return {
    type: 'text',
    text: '🍽️ Mess handler — not yet implemented.',
  };
}

/**
 * @param {object} ctx
 * @returns {object} Response
 */
export function roomHandler(ctx) {
  // TODO: implement
  return {
    type: 'text',
    text: '🏠 Room handler — not yet implemented.',
  };
}
