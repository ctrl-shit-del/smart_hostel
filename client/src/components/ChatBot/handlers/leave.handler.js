/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  FEATURE: Leave / Gatepass Application                  ║
 * ║  OWNER: Dev-A                                           ║
 * ║  BRANCH: feature/chatbot-leave                          ║
 * ║  CONTRACT: Must export `leaveHandler(ctx)` → Response   ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * INTENT TRIGGERS (matched by router.js — do NOT modify router):
 *   'leave', 'gatepass', 'going home', 'go out', 'outing',
 *   'hometown', 'home town', 'summer vacation', 'emergency leave'
 *
 * CONTEXT SHAPE (ctx):
 * {
 *   user      : { name, room_no, floor_no, block_name, bed_type },
 *   message   : string,           // raw user message
 *   session   : object,           // full session data (complaints, gatepass[])
 *   pending   : object | null,    // { action, step, data } for multi-step
 *   api       : axios instance,   // pre-authenticated — call api.post('/gatepass/apply', ...)
 *   now       : Date,             // current datetime
 * }
 *
 * RESPONSE SHAPE — return one of:
 * {
 *   text     : string,           // main message to display
 *   type     : 'text'            // simple text bubble
 * }
 * OR
 * {
 *   text     : string,
 *   type     : 'preview',        // shows a structured card
 *   preview  : { label: value }, // key-value pairs shown in preview card
 *   actions  : [                 // quick-reply buttons
 *     { label: '✅ Submit', value: 'confirm_leave' },
 *     { label: '❌ Cancel', value: 'cancel' }
 *   ],
 *   nextPending: { action: 'submit_leave', step: 'confirm', data: {...} }
 * }
 *
 * RULES TO ENFORCE (from gatepass.js server route):
 *   - Outing: return by 6:00 PM, max 6 hours
 *   - Always check for overlapping active gatepass: ctx.session.gatepass[]
 *   - On confirmation: call api.post('/gatepass/apply', payload) [dummy mode: just log]
 *   - NEVER show another student's data
 *
 * LEAVE TYPES (from shared/constants.js GATEPASS_TYPES):
 *   'Outing' | 'Leave' | 'Hospital'
 *
 * TODO: Implement the multi-step flow:
 *   Step 1 → Ask leave type (show quick replies)
 *   Step 2 → Ask destination
 *   Step 3 → Ask from date/time
 *   Step 4 → Ask to date/time
 *   Step 5 → Ask reason
 *   Step 6 → Show preview card + confirm buttons
 *   Step 7 → Dummy submit (log to console, return success message)
 */

// ─── STUB — Replace with full implementation ──────────────────────────────────

// Simple helper to parse times like "9am", "10:00 PM", "14:30" into a 24hr decimal float (e.g. 14.5)
function parseTimeString(str) {
  const t = str.toLowerCase().replace(/\s/g, '');
  const match = t.match(/(\d{1,2})(?::(\d{2}))?([ap]m)?/);
  if (!match) return null;
  let [_, h, m, ampm] = match;
  let hours = parseInt(h, 10);
  let minutes = m ? parseInt(m, 10) : 0;
  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  return hours + (minutes / 60);
}

export function leaveHandler(ctx) {
  const { message, session, pending, now } = ctx;

  // Initial step
  if (!pending || pending.action !== 'collect_leave') {
    const activeGatepass = session.gatepass?.find(g => ['Pending', 'Approved', 'Out'].includes(g.status));
    if (activeGatepass) {
      return { type: 'text', text: `⚠️ You already have an active pass to ${activeGatepass.destination}. You must return and clear it before applying again.` };
    }
    return {
      type: 'text',
      text: 'What kind of leave/gatepass do you want to apply for?',
      actions: [
        { label: 'Outing (Same day)', value: 'Outing' },
        { label: 'Leave (Multiple days)', value: 'Leave' }
      ],
      nextPending: { action: 'collect_leave', step: 'type', data: {} }
    };
  }

  const state = pending.data || {};
  const lowerMsg = message.toLowerCase();

  switch (pending.step) {
    case 'type':
      const actualType = lowerMsg.includes('outing') ? 'Outing' : lowerMsg.includes('leave') ? 'Leave' : null;
      if (!actualType) return { type: 'text', text: 'Please select a valid type (Outing or Leave).', nextPending: pending };
      
      return {
        type: 'text',
        text: `Got it. Applying for an **${actualType}**. Where are you going (Destination)?`,
        nextPending: { action: 'collect_leave', step: 'destination', data: { ...state, type: actualType } }
      };

    case 'destination':
      if (state.type === 'Outing') {
         return {
           type: 'text',
           text: `Destination set to **${message}**. What date is the outing? (e.g. "Today" or "Oct 20")`,
           nextPending: { action: 'collect_leave', step: 'outing_date', data: { ...state, destination: message } }
         };
      } else {
         return {
           type: 'text',
           text: `Destination set to **${message}**. What is your EXIT date & time? (e.g. "Oct 20, 10:00 AM")`,
           nextPending: { action: 'collect_leave', step: 'leave_exit', data: { ...state, destination: message } }
         };
      }

    // --- OUTING FLOW ---
    case 'outing_date':
      return {
        type: 'text',
        text: `Got it. What time will you leave? (e.g. "9:00 AM")\n*Note: Must be between 8 AM and 6 PM.*`,
        nextPending: { action: 'collect_leave', step: 'outing_exit_time', data: { ...state, date: message } }
      };

    case 'outing_exit_time':
      const exitTime = parseTimeString(message);
      if (exitTime === null || exitTime < 8 || exitTime >= 18) {
         return { type: 'text', text: '❌ Invalid exit time or outside allowed hours (8 AM - 6 PM). Letting you start over...', clearPending: true };
      }
      return {
        type: 'text',
        text: `Exit time recorded. What time will you return? (e.g. "2:00 PM")`,
        nextPending: { action: 'collect_leave', step: 'outing_return_time', data: { ...state, exitTimeRaw: message, exitTimeNum: exitTime } }
      };

    case 'outing_return_time':
      const returnTime = parseTimeString(message);
      if (returnTime === null || returnTime < 8 || returnTime > 18) {
         return { type: 'text', text: '❌ Invalid return time or outside allowed hours (8 AM - 6 PM). Letting you start over...', clearPending: true };
      }
      const duration = returnTime - state.exitTimeNum;
      if (duration <= 0) {
         return { type: 'text', text: '❌ Return time must be after exit time. Starting over...', clearPending: true };
      }
      const isWeekend = now?.getDay() === 0 || now?.getDay() === 6;
      const maxAllowed = isWeekend ? 6 : 2;
      if (duration > maxAllowed) {
         return { type: 'text', text: `❌ Duration limit exceeded. You asked for ${duration.toFixed(1)} hrs. Weekdays allow 2 hrs, weekends allow 6 hrs. Starting over...`, clearPending: true };
      }

      return {
        type: 'text',
        text: `Timing looks good! Finally, please provide a reason.`,
        nextPending: { action: 'collect_leave', step: 'reason', data: { ...state, from: `${state.date} ${state.exitTimeRaw}`, to: `${state.date} ${message}` } }
      };

    // --- LEAVE FLOW ---
    case 'leave_exit':
      return {
        type: 'text',
        text: `Exit recorded (**${message}**). What is your RETURN date & time? (e.g. "Oct 24, 5:00 PM")\n*Note: Leaves must be at least 1 full day.*`,
        nextPending: { action: 'collect_leave', step: 'leave_return', data: { ...state, from: message } }
      };

    case 'leave_return':
      // Since it's a chatbot testing natural language, we do a basic prompt validation here instead of hard Date parsing which fails on generic strings.
      // We assume user typed something reasonable, but normally we'd parse this.
      return {
        type: 'text',
        text: `Return recorded (**${message}**). Finally, please provide a reason.`,
        nextPending: { action: 'collect_leave', step: 'reason', data: { ...state, to: message } }
      };

    // --- SHARED REASON + CONFIRM ---
    case 'reason':
      const completeState = { ...state, reason: message };
      return {
        type: 'preview',
        text: 'Here is your completed application:',
        preview: {
          'Type': completeState.type,
          'Destination': completeState.destination,
          'From': completeState.from,
          'To': completeState.to,
          'Reason': completeState.reason
        },
        actions: [
          { label: '✅ Submit Application', value: 'confirm_leave' },
          { label: '❌ Cancel', value: 'cancel' }
        ],
        nextPending: { action: 'collect_leave', step: 'confirm', data: completeState }
      };

    case 'confirm':
      if (lowerMsg.includes('cancel') || lowerMsg === 'no') {
        return { type: 'text', text: 'Application cancelled.', clearPending: true };
      }
      if (lowerMsg.includes('confirm') || lowerMsg.includes('submit') || lowerMsg === 'yes') {
        return { type: 'text', text: '✅ Submitted successfully to your warden. (Simulated)', clearPending: true };
      }
      return { type: 'text', text: 'Please confirm by clicking "Submit Application" or "Cancel".', nextPending: pending };

    default:
      return { type: 'text', text: 'Flow interrupted. Let\'s start over.', clearPending: true };
  }
}
