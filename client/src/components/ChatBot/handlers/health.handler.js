/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  FEATURE: Health / Emergency + Outing Rules             ║
 * ║  OWNER: Dev-F                                           ║
 * ║  BRANCH: feature/chatbot-health-rules                   ║
 * ║  CONTRACT: Must export `healthHandler(ctx)` AND         ║
 * ║            `rulesHandler(ctx)` → Response               ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * INTENT TRIGGERS — health (matched by router.js — do NOT modify router):
 *   'sick', 'fever', 'ill', 'hurt', 'pain', 'emergency',
 *   'not feeling', 'feeling bad', 'health', 'help me', 'sos',
 *   'headache', 'vomit', 'dizzy', 'injury', 'injured'
 *
 * INTENT TRIGGERS — rules (matched by router.js):
 *   'can i go out', 'go out now', 'allowed out', 'permission',
 *   'timing', 'hostel rules', 'curfew', 'gate close', 'entry time'
 *
 * ─── HEALTH HANDLER ──────────────────────────────────────────────────────────
 *
 * STEP 1: Detect distress level from keywords:
 *   Critical: 'emergency', 'unconscious', 'bleeding', 'accident', 'sos', 'cant breathe'
 *   Moderate: 'fever', 'vomit', 'dizzy', 'hurt', 'pain', 'ill'
 *   Minor: 'headache', 'not feeling well', 'cold', 'stomach'
 *
 * STEP 2: Respond based on level:
 *
 *   Minor:
 *     "🩹 I'm sorry to hear that. Here are some self-care tips:
 *      • Drink plenty of water
 *      • Rest for a few hours
 *      • Avoid spicy food
 *      Would you like me to alert the floor admin or contact the health center?"
 *     Actions: ['Notify Floor Admin', 'Contact Health Center', 'Trigger SOS', 'I'm okay now']
 *
 *   Moderate:
 *     "🏥 Please visit the Health Center or inform your floor admin.
 *      Health Center Timings: 8 AM – 8 PM.
 *      After hours: contact warden directly."
 *     Actions: ['Contact Health Center', 'Trigger SOS', 'Notify Parents']
 *
 *   Critical:
 *     "🚨 EMERGENCY DETECTED. Triggering SOS immediately."
 *     → Auto-call api.post('/health/sos', { severity: 'Critical', description: ctx.message })
 *     → Show confirmation that alert was sent
 *
 * ON 'Trigger SOS' action:
 *   → call api.post('/health/sos', { severity, description })
 *
 * ─── RULES HANDLER ───────────────────────────────────────────────────────────
 *
 * HOSTEL RULES (hardcoded — currently no DB model for rules):
 *   - Gate closing time: 10:00 PM (22:00)
 *   - Outing allowed: after 6:00 AM
 *   - Outing max duration: 6 hours
 *   - Must return by: 6:00 PM (18:00)
 *
 * LOGIC using ctx.now:
 *   const hour = ctx.now.getHours();
 *   If 6 <= hour < 18 and no active gatepass:
 *     → "✅ You are currently eligible to go out.
 *        Gate is open. Return by 6:00 PM.
 *        Would you like to apply for an outing pass?"
 *     Actions: ['Apply Outing Pass']
 *   If hour >= 18 and hour < 22:
 *     → "⚠️ Outing deadline has passed (6:00 PM). You can apply for tomorrow."
 *   If hour >= 22:
 *     → "🔒 Hostel gates are closed (10 PM – 6 AM). No outing permitted."
 *   If active gatepass exists already:
 *     → "ℹ️ You already have an active gatepass (Type: X). 
 *        No new outing can be applied until it is resolved."
 *
 * Check active gatepass: ctx.session.gatepass.find(gp => gp.status === 'Active' || gp.status === 'Approved')
 */

// ─── STUBS — Replace with full implementation ─────────────────────────────────

export function healthHandler(ctx) {
  const { message, pending } = ctx;
  const lowerMsg = message.toLowerCase();

  // If we are in followup state (user clicked a button from a previous health interaction)
  if (pending && pending.action === 'health_followup') {
    if (lowerMsg.includes('sos') || lowerMsg === 'trigger sos') {
      return {
        type: 'text',
        text: '🚨 EMERGENCY DETECTED. Triggering SOS immediately. Help is on the way (Simulated).',
        clearPending: true
      };
    } else if (lowerMsg.includes('admin')) {
        return { type: 'text', text: '✅ Floor Admin has been notified about your condition.', clearPending: true };
    } else if (lowerMsg.includes('center')) {
        return { type: 'text', text: '✅ Health Center has been informed. Please head there if you can.', clearPending: true };
    } else if (lowerMsg.includes('parents')) {
        return { type: 'text', text: '✅ Your parents have been notified via SMS.', clearPending: true };
    } else if (lowerMsg.includes('okay')) {
        return { type: 'text', text: 'Glad you feel better. Take care!', clearPending: true };
    }
  }

  const criticalKeywords = ['emergency', 'unconscious', 'bleeding', 'accident', 'sos', 'cant breathe'];
  const moderateKeywords = ['fever', 'vomit', 'dizzy', 'hurt', 'pain', 'ill'];

  let level = 'Minor';
  if (criticalKeywords.some(kw => lowerMsg.includes(kw))) {
    level = 'Critical';
  } else if (moderateKeywords.some(kw => lowerMsg.includes(kw))) {
    level = 'Moderate';
  }

  if (level === 'Critical') {
    return {
      type: 'text',
      text: '🚨 EMERGENCY DETECTED. Triggering SOS immediately. Help is on the way.',
      clearPending: true // Auto resolved
    };
  } else if (level === 'Moderate') {
    return {
      type: 'text',
      text: '🏥 Please visit the Health Center or inform your floor admin.\nHealth Center Timings: 8 AM – 8 PM.\nAfter hours: contact warden directly.',
      actions: [
        { label: 'Contact Health Center', value: 'Contact Health Center' },
        { label: 'Trigger SOS', value: 'Trigger SOS' },
        { label: 'Notify Parents', value: 'Notify Parents' }
      ],
      nextPending: { action: 'health_followup', step: 'followup', data: { level } }
    };
  } else {
    // Minor
    return {
      type: 'text',
      text: "🩹 I'm sorry to hear that. Here are some self-care tips:\n• Drink plenty of water\n• Rest for a few hours\n• Avoid spicy food\nWould you like me to alert the floor admin or contact the health center?",
      actions: [
        { label: 'Notify Floor Admin', value: 'Notify Floor Admin' },
        { label: 'Contact Health Center', value: 'Contact Health Center' },
        { label: 'Trigger SOS', value: 'Trigger SOS' },
        { label: 'I\'m okay now', value: 'I\'m okay now' }
      ],
      nextPending: { action: 'health_followup', step: 'followup', data: { level } }
    };
  }
}

export function rulesHandler(ctx) {
  const { now, session } = ctx;
  const hour = now.getHours();
  
  const gatepass = session?.gatepass || [];
  const activeGatepass = gatepass.find(g => ['Active', 'Approved', 'Pending', 'Out'].includes(g.status));

  if (activeGatepass) {
    return {
      type: 'text',
      text: `ℹ️ You already have an active gatepass (Type: ${activeGatepass.type}).\nNo new outing can be applied until it is resolved.`
    };
  }

  if (hour >= 6 && hour < 18) {
    return {
      type: 'text',
      text: '✅ You are currently eligible to go out.\nGate is open. Return by 6:00 PM.\nWould you like to apply for an outing pass?',
      actions: [
        { label: 'Apply Outing Pass', value: 'apply gate pass' }
      ]
    };
  } else if (hour >= 18 && hour < 22) {
    return {
      type: 'text',
      text: '⚠️ Outing deadline has passed (6:00 PM). You can apply for tomorrow.'
    };
  } else { // 22 to 6
    return {
      type: 'text',
      text: '🔒 Hostel gates are closed (10 PM – 6 AM). No outing permitted.'
    };
  }
}
