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

export function complaintHandler(ctx) {
  const { message, user, pending } = ctx;
  const lowerMsg = message.toLowerCase();

  // Keyword mappings for categories
  const catKeywords = {
    'Electrical': ['fan', 'light', 'bulb', 'socket', 'electric', 'power', 'switch'],
    'Plumbing': ['water', 'leak', 'plumb', 'pipe', 'tap', 'washroom', 'toilet'],
    'Internet': ['wifi', 'internet', 'network', 'slow'],
    'Pest Control': ['pest', 'cockroach', 'rat', 'mosquito', 'bug'],
    'Housekeeping': ['dirty', 'clean', 'sweep', 'dustbin', 'garbage'],
    'Civil': ['crack', 'mold', 'wall', 'door', 'window', 'ceiling']
  };

  // 1. Initial State - process the first message for category and severity
  if (!pending || pending.action !== 'collect_complaint') {
    let category = 'Other';
    for (const [cat, keywords] of Object.entries(catKeywords)) {
      if (keywords.some(kw => lowerMsg.includes(kw))) {
        category = cat;
        break;
      }
    }

    // Dual Severity System
    // User Intent Severity
    let userSeverity = 'Normal';
    if (['urgent', 'not working at all', 'emergency', 'asap'].some(kw => lowerMsg.includes(kw))) {
      userSeverity = 'High';
    } else if (['slow', 'minor', 'small issue'].some(kw => lowerMsg.includes(kw))) {
      userSeverity = 'Low';
    }

    // System Severity
    let systemSeverity = 'Normal';
    const bedType = (user.bed_type || '').toUpperCase();
    if (category === 'Electrical') {
      if (bedType.includes('NAC')) {
        systemSeverity = 'High'; // Fan issue in NAC is high
      } else if (bedType.includes('AC')) {
        systemSeverity = 'Low'; // Fan (or similar) issue in AC is low
      }
      if (['power', 'electric'].some(kw => lowerMsg.includes(kw))) {
         systemSeverity = 'High';
      }
    } else if (category === 'Plumbing' && lowerMsg.includes('leak')) {
      systemSeverity = 'High';
    }

    const finalSeverityLevel = (userSeverity === 'High' || systemSeverity === 'High') ? 'Urgent' : 'Normal';
    const severityReason = systemSeverity === 'High' ? `(System rules escalated this constraint)` : `(User input)`;

    return {
      type: 'text',
      text: `Got it. I've classified this as a **${category}** issue.\n\nCould you please provide a short title for this complaint?`,
      nextPending: { 
        action: 'collect_complaint', 
        step: 'title', 
        data: { 
          description: message, 
          category, 
          severity: finalSeverityLevel,
          severityReason: severityReason
        } 
      }
    };
  }

  // 2. State Machine
  const state = pending.data || {};

  switch (pending.step) {
    case 'title':
      const completeState = { ...state, title: message };
      return {
        type: 'preview',
        text: 'Please review your complaint before submission:',
        preview: {
          'Category': completeState.category,
          'Severity': `${completeState.severity === 'Urgent' ? '🔴' : '🟡'} ${completeState.severity} ${completeState.severityReason}`,
          'Room': `${user.block_name || 'N/A'} · Floor ${user.floor_no || user.floor || 'N/A'} · Room ${user.room_no || 'N/A'}`,
          'Title': completeState.title,
          'Description': completeState.description
        },
        actions: [
          { label: '✅ Submit Complaint', value: 'submit' },
          { label: '❌ Cancel', value: 'cancel' }
        ],
        nextPending: { action: 'collect_complaint', step: 'confirm', data: completeState }
      };

    case 'confirm':
      if (lowerMsg.includes('cancel') || lowerMsg === 'no') {
        return {
          type: 'text',
          text: 'Complaint submission cancelled.',
          clearPending: true
        };
      }
      if (lowerMsg.includes('submit') || lowerMsg === 'yes' || lowerMsg.includes('confirm')) {
        return {
          type: 'text',
          text: '✅ Your complaint has been successfully registered. (Simulated)',
          clearPending: true
        };
      }
      return {
        type: 'text',
        text: 'Please click "Submit Complaint" or "Cancel".',
        nextPending: pending
      };
      
    default:
      return { type: 'text', text: 'Flow interrupted. Let\'s start over.', clearPending: true };
  }
}
