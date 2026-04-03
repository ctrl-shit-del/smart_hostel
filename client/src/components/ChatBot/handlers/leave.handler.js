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

/**
 * @param {object} ctx
 * @returns {object} Response
 */
export function leaveHandler(ctx) {
  // TODO: implement
  return {
    type: 'text',
    text: '📋 Leave handler — not yet implemented.',
  };
}
