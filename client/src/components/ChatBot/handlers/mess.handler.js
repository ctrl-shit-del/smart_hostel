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

export function messHandler(ctx) {
  const { message, now, session, user } = ctx;
  const lowerMsg = message.toLowerCase();

  // Migration logic
  if (lowerMsg.includes('switch') || lowerMsg.includes('migrate') || lowerMsg.includes('change')) {
    const caterer = session.mess?.caterer || user.mess_information || 'N/A';
    return {
      type: 'text',
      text: `Room migration for mess changes requires warden approval.\nYour current caterer: **${caterer}**.\nWould you like me to help raise a mess migration request?`,
      actions: [
        { label: 'Yes, raise request', value: 'raise mess migration request' },
        { label: 'No, thanks', value: 'cancel' }
      ]
    };
  }

  // Crowd Simulation
  const hour = now.getHours();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;

  let basePct = 10;
  let meal = 'Off Peak';

  if (hour >= 7 && hour < 9) { basePct = 65; meal = 'Breakfast'; }
  else if (hour >= 9 && hour < 12) { basePct = 10; meal = 'Post-Breakfast'; }
  else if (hour >= 12 && hour < 13) { basePct = 90; meal = 'Lunch Peak'; }
  else if (hour >= 13 && hour < 14) { basePct = 70; meal = 'Lunch'; }
  else if (hour >= 14 && hour < 19) { basePct = 15; meal = 'Off Peak'; }
  else if (hour >= 19 && hour < 20) { basePct = 75; meal = 'Dinner'; }
  else if (hour >= 20 && hour < 21) { basePct = 85; meal = 'Dinner Peak'; }
  else if (hour >= 21 || hour < 7) { basePct = 20; meal = 'Night Mess'; }

  let finalPct = basePct + (isWeekend ? 10 : 0);
  if (finalPct > 100) finalPct = 100;

  let crowdResponse = '';
  if (finalPct > 70) {
    crowdResponse = '🔴 Mess is currently at peak crowd. Expected queue: 15–20 mins.';
  } else if (finalPct >= 40) {
    crowdResponse = '🟡 Moderate crowd. Best to go within 30 minutes.';
  } else {
    crowdResponse = '🟢 Mess is clear right now. Good time to head over!';
  }

  const caterer = session.mess?.caterer || user.mess_information || 'N/A';

  return {
    type: 'text',
    text: `**${meal} (${caterer})**\n\n${crowdResponse}`
  };
}

export function roomHandler(ctx) {
  const { message, user } = ctx;
  const lowerMsg = message.toLowerCase();

  // Extract requested room type
  let requestedType = 'the requested room type';
  if (lowerMsg.includes('ac room') || lowerMsg.includes('3ac') || lowerMsg.includes('2ac') || lowerMsg.includes('4ac')) {
     requestedType = lowerMsg.match(/\d*ac( room)?/)?.[0] || 'AC room';
  } else if (lowerMsg.includes('nac room')) {
     requestedType = 'NAC room';
  }

  // Simulate availability
  const seed = (user.room_no || 101) + new Date().getDate();
  const state = seed % 3;

  if (state === 0 || state === 1) {
    // 1 represents Available, 0 Limited (still say available for simplicity or specify limited)
    const availabilityStr = state === 1 ? 'currently available' : 'available, but limited';
    return {
      type: 'text',
      text: `✅ **${requestedType.toUpperCase()}** rooms are ${availabilityStr} in your block.\nRoom migration requires warden approval. Would you like to apply?`,
      actions: [
        { label: 'Apply', value: 'apply room migration' },
        { label: 'Cancel', value: 'cancel' }
      ]
    };
  } else {
    // 2 represents None
    return {
      type: 'text',
      text: `❌ No **${requestedType.toUpperCase()}** rooms available currently.\nAlternatives available: 2 Bed AC (moderate availability).`
    };
  }
}
