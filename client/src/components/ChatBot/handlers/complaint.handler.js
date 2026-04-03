/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  FEATURE: Smart Complaint System                        ║
 * ║  OWNER: Dev-B                                           ║
 * ║  BRANCH: feature/chatbot-complaint                      ║
 * ║  CONTRACT: Must export `complaintHandler(ctx)` → Response ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * INTENT TRIGGERS (matched by router.js — do NOT modify router):
 *   'complaint', 'issue', 'problem', 'not working', 'broken',
 *   'fan', 'water', 'light', 'wifi', 'pest', 'cockroach',
 *   'leak', 'dirty', 'repair', 'fix'
 *
 * CONTEXT SHAPE (ctx): see leave.handler.js for full shape
 *
 * DUAL SEVERITY SYSTEM (CRITICAL — implement exactly as specified):
 *
 *   A. USER-INTENT SEVERITY (from message wording):
 *      - "urgent", "not working at all", "emergency", "asap" → High
 *      - "slow", "minor", "small issue" → Low
 *      - default → Normal
 *
 *   B. SYSTEM SEVERITY (from room type + complaint category):
 *      Rule table:
 *      | Room Type (ctx.user.bed_type) | Category   | System Severity |
 *      |-------------------------------|------------|-----------------|
 *      | NAC (any NAC type)            | Electrical | HIGH            |
 *      | AC  (any AC type)             | Electrical | LOW             |
 *      | any                           | Plumbing   | HIGH            |
 *      | any                           | Electrical (power) | HIGH   |
 *
 *   C. FINAL severity = MAX(userSeverity, systemSeverity)
 *      Map to COMPLAINT_SEVERITY from shared/constants.js:
 *      High → 'Urgent' | Low/Normal → 'Normal'
 *
 * CATEGORY EXTRACTION (use keyword matching — see ai-service/main.py for reference keywords):
 *   'Electrical' | 'Plumbing' | 'Civil' | 'Housekeeping' | 'Pest Control' | 'Internet' | 'Other'
 *
 * MULTI-STEP FLOW:
 *   Step 1 → Auto-extract category from message, show category to user
 *   Step 2 → Ask for a concise title (if not obvious from message)
 *   Step 3 → Show preview card with: Category, Severity, Room, Description
 *   Step 4 → Confirm buttons → dummy submit (call api.post('/complaints', payload))
 *
 * PREVIEW CARD FORMAT:
 *   Category : Electrical
 *   Severity : 🔴 Urgent (Room type: NAC + Electrical)
 *   Room     : A Block · Floor 2 · Room 204
 *   Issue    : Fan stopped working
 *
 * ON SUBMIT: POST to /complaints — uses real API endpoint
 */

// ─── STUB — Replace with full implementation ──────────────────────────────────

/**
 * @param {object} ctx
 * @returns {object} Response
 */
export function complaintHandler(ctx) {
  // TODO: implement
  return {
    type: 'text',
    text: '⚠️ Complaint handler — not yet implemented.',
  };
}
