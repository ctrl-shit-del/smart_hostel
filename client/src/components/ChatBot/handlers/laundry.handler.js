/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  FEATURE: Laundry Schedule                              ║
 * ║  OWNER: Dev-D                                           ║
 * ║  BRANCH: feature/chatbot-laundry                        ║
 * ║  CONTRACT: Must export `laundryHandler(ctx)` → Response ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * INTENT TRIGGERS (matched by router.js — do NOT modify router):
 *   'laundry', 'dhobi', 'wash', 'washing', 'clothes', 'profab'
 *
 * CONTEXT SHAPE (ctx): see leave.handler.js for full shape
 *   ctx.session.laundry:
 *     { chota_dhobi: { day: 'Wednesday', time: '9:00 AM' },
 *       profab: { day: 'Friday', pickup: '10:00 AM', delivery: 'Saturday 6PM' } }
 *     OR null if not loaded yet
 *
 * IF LAUNDRY DATA MISSING: Generate using this rule-based logic:
 *   - Use room_no % 7 to deterministically assign a weekday slot
 *   - Chota Dhobi: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][room_no % 7]
 *   - Profab Pickup: 2 days after Chota Dhobi day, Delivery: 3 days after pickup
 *
 * RESPONSE FORMAT:
 * {
 *   type: 'laundry',
 *   text: 'Here is your laundry schedule:',
 *   slots: [
 *     { label: 'Chota Dhobi (Free)', day: 'Wednesday', time: '9:00 AM', daysAway: 2 },
 *     { label: 'Profab Pickup (Paid)', day: 'Friday', time: '10:00 AM', daysAway: 4 },
 *   ]
 * }
 *
 * PREDICTIVE: If slot is today → add alert: '🕘 Your Chota Dhobi slot is TODAY at 9 AM!'
 * PREDICTIVE: If slot is tomorrow → add alert: '⏰ Laundry pickup is tomorrow. Prepare your clothes.'
 */

// ─── STUB — Replace with full implementation ──────────────────────────────────

export function laundryHandler(ctx) {
  const { session, user } = ctx;
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayIndex = new Date().getDay();

  let laundry = session.laundry;

  // Fallback generation logic
  if (!laundry || !laundry.chota_dhobi || !laundry.profab) {
    const roomNum = user.room_no || 101;
    const dhobi_day_index = roomNum % 7;
    const profab_day_index = (dhobi_day_index + 2) % 7;
    laundry = {
      chota_dhobi: {
        day: DAYS[dhobi_day_index],
        time: '9:00 AM'
      },
      profab: {
        day: DAYS[profab_day_index],
        pickup: '10:00 AM',
        delivery: `${DAYS[(profab_day_index + 2) % 7]} 6:00 PM`
      }
    };
  }

  const getDaysAway = (targetDayStr) => {
    const targetIndex = DAYS.indexOf(targetDayStr);
    let diff = targetIndex - currentDayIndex;
    if (diff < 0) {
      diff += 7;
    }
    return diff;
  };

  const dhobiDaysAway = getDaysAway(laundry.chota_dhobi.day);
  const profabDaysAway = getDaysAway(laundry.profab.day);

  let dhobiAlert = null;
  if (dhobiDaysAway === 0) dhobiAlert = '🕘 Your Chota Dhobi slot is TODAY at ' + laundry.chota_dhobi.time + '!';
  else if (dhobiDaysAway === 1) dhobiAlert = '⏰ Laundry pickup is tomorrow. Prepare your clothes.';

  let profabAlert = null;
  if (profabDaysAway === 0) profabAlert = '🕘 Your Profab pickup is TODAY at ' + laundry.profab.pickup + '!';
  else if (profabDaysAway === 1) profabAlert = '⏰ Profab pickup is tomorrow. Prepare your clothes.';

  return {
    type: 'laundry',
    text: 'Here is your laundry schedule:',
    slots: [
      { 
        label: 'Chota Dhobi (Free)', 
        day: laundry.chota_dhobi.day, 
        time: laundry.chota_dhobi.time, 
        daysAway: dhobiDaysAway,
        alert: dhobiAlert 
      },
      { 
        label: 'Profab Pickup (Paid)', 
        day: laundry.profab.day, 
        time: laundry.profab.pickup, 
        daysAway: profabDaysAway,
        alert: profabAlert 
      }
    ]
  };
}
