/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  CHATBOT INTENT ROUTER                                  ║
 * ║  OWNER: Lead / Integrator                               ║
 * ║  BRANCH: feature/chatbot-core (base branch)             ║
 * ║  ── DO NOT MODIFY THIS FILE IN FEATURE BRANCHES ──      ║
 * ║     Submit a PR to main if you need a new intent added  ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * This file ONLY routes — it does NOT implement any feature logic.
 * Each handler import points to a separate file owned by a separate dev.
 *
 * HOW TO ADD A NEW INTENT:
 *   1. Create a new handler file in handlers/
 *   2. Export a function matching the contract
 *   3. Add an entry to INTENT_MAP below
 *   4. Submit a PR to merge only this file + your handler file
 */

import { leaveHandler }     from './handlers/leave.handler.js';
import { complaintHandler } from './handlers/complaint.handler.js';
import { statusHandler }    from './handlers/status.handler.js';
import { laundryHandler }   from './handlers/laundry.handler.js';
import { messHandler, roomHandler } from './handlers/mess.handler.js';
import { healthHandler, rulesHandler } from './handlers/health.handler.js';

// ─── Intent Map ───────────────────────────────────────────────────────────────
// Each entry: { keywords: string[], handler: Function }
// Matching: first entry whose ANY keyword appears in the lowercased message wins.
// Order matters — more specific matches should come first.

const INTENT_MAP = [
  // ── Health (highest priority — check before any keyword overlap) ──
  {
    keywords: ['sick', 'fever', 'ill', 'hurt', 'pain', 'emergency',
               'not feeling', 'feeling bad', 'headache', 'vomit',
               'dizzy', 'injury', 'injured', 'sos', 'help me',
               'unconscious', 'bleeding', 'cant breathe'],
    handler: healthHandler,
  },

  // ── Hostel rules / outing eligibility ──
  {
    keywords: ['can i go out', 'go out now', 'allowed out', 'curfew',
               'gate close', 'entry time', 'permission', 'hostel rules',
               'out now', 'timing'],
    handler: rulesHandler,
  },

  // ── Leave / Gatepass ──
  {
    keywords: ['leave', 'gatepass', 'going home', 'go home', 'outing',
               'home town', 'hometown', 'summer vacation', 'emergency leave',
               'with parent', 'campus interview', 'local guardian',
               'gate pass', 'apply gate'],
    handler: leaveHandler,
  },

  // ── Status / Dashboard ──
  {
    keywords: ['my status', 'what is going on', "what's going on",
               'overview', 'dashboard', 'summary', 'how am i doing',
               'tell me about', 'everything'],
    handler: statusHandler,
  },

  // ── Complaint / Issue ──
  {
    keywords: ['complaint', 'issue', 'problem', 'not working', 'broken',
               'fan', 'water', 'light', 'wifi', 'pest', 'cockroach',
               'leak', 'dirty', 'repair', 'fix', 'bulb', 'socket',
               'internet slow', 'no water', 'crack', 'mold', 'rat',
               'electric', 'plumb'],
    handler: complaintHandler,
  },

  // ── Room migration ──
  {
    keywords: ['room', 'migrate', 'shift', 'change room', 'ac room',
               'nac room', '3ac', '2ac', '4ac', 'available room',
               'room available'],
    handler: roomHandler,
  },

  // ── Mess ──
  {
    keywords: ['mess', 'food', 'lunch', 'dinner', 'breakfast', 'eat',
               'crowded', 'crowd', 'caterer', 'switch mess', 'migrate mess',
               'canteen', 'menu'],
    handler: messHandler,
  },

  // ── Laundry ──
  {
    keywords: ['laundry', 'laundary', 'dhobi', 'wash', 'washing', 'clothes', 'profab',
               'chota dhobi', 'pickup', 'clothes schedule'],
    handler: laundryHandler,
  },
];

// ─── Cross-Module: "Going home" triggers leave + conflict check ───────────────
const CROSS_MODULE_TRIGGERS = [
  { keywords: ['going home', 'go home tomorrow', 'leaving tomorrow', 'home this weekend'],
    primary: leaveHandler },
];

/**
 * Route a message to the correct handler.
 * @param {string} message - Raw user message
 * @param {object} ctx     - Full context object
 * @returns {object} Response from the matched handler
 */
export function routeMessage(message, ctx) {
  const lower = message.toLowerCase().trim();

  // Handle pending multi-step actions first
  if (ctx.pending) {
    return handlePending(lower, ctx);
  }

  // Cross-module check
  for (const cross of CROSS_MODULE_TRIGGERS) {
    if (cross.keywords.some((kw) => lower.includes(kw))) {
      return cross.primary({ ...ctx, crossModule: true });
    }
  }

  // Standard intent matching
  for (const { keywords, handler } of INTENT_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return handler(ctx);
    }
  }

  // Fallback
  return {
    type: 'text',
    text: `I'm not sure I understood that. You can ask me about:\n\n` +
          `• 🏠 **Leave / Gatepass** — "I want to go home this weekend"\n` +
          `• ⚠️ **Complaints** — "Fan not working in my room"\n` +
          `• 📊 **My Status** — "Show my dashboard"\n` +
          `• 🍽️ **Mess** — "Is the mess crowded now?"\n` +
          `• 🧺 **Laundry** — "When is my laundry slot?"\n` +
          `• 🏥 **Health** — "I'm feeling sick"\n` +
          `• 📍 **Rules** — "Can I go out now?"\n`,
  };
}

/**
 * Handle a pending multi-step action (user clicked a quick reply or continued a flow).
 * Delegates back to the owning handler by re-injecting pending context.
 */
function handlePending(message, ctx) {
  const { action } = ctx.pending;

  if (action === 'submit_leave' || action === 'collect_leave')   return leaveHandler(ctx);
  if (action === 'submit_complaint' || action === 'collect_complaint') return complaintHandler(ctx);
  if (action === 'health_followup')                               return healthHandler(ctx);

  // Unknown pending — clear it
  return {
    type: 'text',
    text: 'Let\'s start over. What can I help you with?',
    clearPending: true,
  };
}
