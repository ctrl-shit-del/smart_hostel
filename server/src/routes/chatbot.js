const express = require('express');
const axios = require('axios');

const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Complaint = require('../models/Complaint');
const Gatepass = require('../models/Gatepass');
const Attendance = require('../models/Attendance');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'qwen/qwen3.6-plus:free';

let openRouterModulePromise;

function getOpenRouterModule() {
  if (!openRouterModulePromise) {
    openRouterModulePromise = import('@openrouter/sdk');
  }

  return openRouterModulePromise;
}

async function createOpenRouterClient(apiKey) {
  const { OpenRouter } = await getOpenRouterModule();

  return new OpenRouter({
    apiKey,
    httpReferer: process.env.CLIENT_URL || 'http://localhost:5173',
    appTitle: 'SmartHostel AI',
    timeoutMs: 30000,
  });
}

function sanitizeActions(actions) {
  if (!Array.isArray(actions)) return [];

  return actions
    .filter((action) => action && typeof action === 'object')
    .map((action) => ({
      label: typeof action.label === 'string' ? action.label : 'Continue',
      value: typeof action.value === 'string' ? action.value : action.label || 'Continue',
    }));
}

function parseChatbotResponse(content) {
  const fallback = {
    type: 'text',
    text: 'I could not format that reply cleanly, but I am still here to help with hostel questions.',
    actions: [],
  };

  if (!content) return fallback;

  let parsed = content;

  if (typeof content === 'string') {
    const cleaned = content
      .replace(/```json\s*/ig, '')
      .replace(/```/g, '')
      .trim();

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
        } catch {
          return {
            type: 'text',
            text: cleaned,
            actions: [],
          };
        }
      } else {
        return {
          type: 'text',
          text: cleaned,
          actions: [],
        };
      }
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fallback;
  }

  const normalized = {
    type: typeof parsed.type === 'string' ? parsed.type : 'text',
    text: typeof parsed.text === 'string' ? parsed.text : fallback.text,
    actions: sanitizeActions(parsed.actions),
  };

  if (parsed.preview && typeof parsed.preview === 'object' && !Array.isArray(parsed.preview)) {
    normalized.preview = parsed.preview;
  }

  if (Array.isArray(parsed.sections)) {
    normalized.sections = parsed.sections;
  }

  if (Array.isArray(parsed.slots)) {
    normalized.slots = parsed.slots;
  }

  return normalized;
}

function buildChatMessages({ user, history, message, contextSummary }) {
  const systemPrompt = `You are SmartHostel AI, a concise and strictly rule-bound assistant for ${user.name}.
Your job is to process natural language requests for Leaves/Outings, Complaints, and general hostel data.

CRITICAL RULES FOR LEAVES/OUTINGS:
1. Outings: Only allowed between 8:00 AM and 6:00 PM. Weekdays max 2 hours, Weekends max 6 hours. Must be on the same day.
2. Leaves: Must span at least 1 full day (24 hours).
If a user narrative violates these, politely reject them and specify the rule. Output as text.

If the user gives enough info for a Leave/Outing (Type, Destination, Exit Time, Return Time, Reason) and it adheres entirely to the rules, you MUST output a "preview" type message!

JSON OUTPUT FORMAT REQUIRED:
IMPORTANT: You must always respond with valid JSON matching exactly this structure! Do not include markdown codeblocks around the JSON.
{
  "type": "text" | "preview" | "dashboard" | "laundry",
  "text": "Your conversational response",
  "preview": { "Type": "Outing or Leave", "Destination": "...", "From": "...", "To": "...", "Reason": "..." },
  "actions": [ { "label": "Button Name", "value": "button_value" } ]
}
If asking for missing details, use type "text".
If previewing application, use type "preview" and provide "Confirm" and "Cancel" buttons in actions.
Use the verified hostel context when it is available. If the data you need is missing, say so instead of inventing it.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: `Verified hostel context: ${contextSummary}` },
    ...history.map((entry) => ({
      role: entry.from === 'bot' ? 'assistant' : 'user',
      content: entry.text || 'Structured Output',
    })),
    { role: 'user', content: message },
  ];
}

function toGeminiContents(messages) {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
}

function extractGeminiText(responseData) {
  const parts = responseData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';

  return parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

async function requestGemini(messages) {
  const apiKey = process.env.gemini || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key missing in server (.env "gemini").');
  }

  const systemInstruction = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
    {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: toGeminiContents(messages),
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            text: { type: 'string' },
            preview: {
              type: ['object', 'null'],
              additionalProperties: true,
            },
            actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  value: { type: 'string' },
                },
                required: ['label', 'value'],
                additionalProperties: true,
              },
            },
            sections: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
            slots: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
          },
          required: ['type', 'text', 'actions'],
          additionalProperties: true,
        },
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      timeout: 30000,
    }
  );

  return {
    provider: 'gemini',
    raw: extractGeminiText(response.data),
  };
}

async function requestOpenRouter(messages) {
  const apiKey = process.env['openrouter-qwen'] || process.env.openrouter_qwen;
  if (!apiKey) {
    throw new Error('OpenRouter API key missing in server (.env "openrouter-qwen").');
  }

  const openrouter = await createOpenRouterClient(apiKey);
  const chatCompletion = await openrouter.chat.send({
    chatRequest: {
      model: OPENROUTER_MODEL,
      messages,
      temperature: 0.2,
      stream: false,
      responseFormat: { type: 'json_object' },
    },
  });

  return {
    provider: 'openrouter',
    raw: chatCompletion?.choices?.[0]?.message?.content,
  };
}

async function requestBestAvailableAI(messages) {
  const providerErrors = [];

  try {
    return await requestGemini(messages);
  } catch (error) {
    providerErrors.push(`Gemini: ${error?.message || 'Unknown error'}`);
    console.error('Gemini AI Error:', error?.response?.data || error);
  }

  try {
    return await requestOpenRouter(messages);
  } catch (error) {
    providerErrors.push(`OpenRouter: ${error?.message || 'Unknown error'}`);
    console.error('OpenRouter AI Error:', error);
  }

  const failure = new Error('All AI providers are currently unavailable.');
  failure.providerErrors = providerErrors;
  throw failure;
}

router.get('/context', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = req.user;

  const [complaints, gatepasses, attendanceRecords] = await Promise.allSettled([
    Complaint.find({ raised_by: userId })
      .sort({ raised_at: -1 })
      .limit(5)
      .select('title category severity status raised_at is_systemic sla_breached'),

    Gatepass.find({ student_id: userId })
      .sort({ applied_at: -1 })
      .limit(5)
      .select('type destination status expected_exit expected_return is_overdue applied_at'),

    Attendance.find({ student_id: userId })
      .sort({ date: -1 })
      .limit(30)
      .select('date status'),
  ]);

  const attendanceList = attendanceRecords.status === 'fulfilled' ? attendanceRecords.value : [];
  const present = attendanceList.filter((entry) => entry.status === 'Present').length;
  const absent = attendanceList.filter((entry) => entry.status === 'Absent').length;
  const total = attendanceList.length || 1;
  const rate = Math.round((present / total) * 100);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const roomNum = user.room_no || 101;
  const dhobiDayIndex = roomNum % 7;
  const profabDayIndex = (dhobiDayIndex + 2) % 7;

  const laundry = {
    chota_dhobi: {
      day: days[dhobiDayIndex],
      time: '9:00 AM',
    },
    profab: {
      day: days[profabDayIndex],
      pickup: '10:00 AM',
      delivery: `${days[(profabDayIndex + 2) % 7]} 6:00 PM`,
    },
  };

  const hour = new Date().getHours();
  const crowdSchedule = [
    { range: [7, 9], meal: 'Breakfast', level: 'High', pct: 65 },
    { range: [9, 12], meal: 'Post-Breakfast', level: 'Low', pct: 10 },
    { range: [12, 13], meal: 'Lunch Peak', level: 'Very High', pct: 90 },
    { range: [13, 14], meal: 'Lunch', level: 'High', pct: 70 },
    { range: [14, 19], meal: 'Off Peak', level: 'Low', pct: 15 },
    { range: [19, 20], meal: 'Dinner', level: 'High', pct: 75 },
    { range: [20, 21], meal: 'Dinner Peak', level: 'Very High', pct: 85 },
    { range: [21, 24], meal: 'Night Mess', level: 'Low', pct: 20 },
  ];

  const slot = crowdSchedule.find(({ range: [start, end] }) => hour >= start && hour < end)
    || { meal: 'Off Peak', level: 'Low', pct: 10 };

  const mess = {
    meal: slot.meal,
    crowd_level: slot.level,
    fill_percent: slot.pct,
    recommendation:
      slot.pct < 40 ? 'Recommended to visit now' :
      slot.pct > 70 ? 'Peak hours - expect a queue' :
      'Moderate crowd',
    caterer: user.mess_information || 'Not assigned',
  };

  res.json({
    success: true,
    user: {
      name: user.name,
      room_no: user.room_no,
      floor_no: user.floor_no || user.floor,
      floor: user.floor,
      block_name: user.block_name,
      bed_type: user.bed_type,
      bed_id: user.bed_id || user.bed,
      department: user.department,
      mess_information: user.mess_information || user.mess,
    },
    complaints: complaints.status === 'fulfilled' ? complaints.value : [],
    gatepass: gatepasses.status === 'fulfilled' ? gatepasses.value : [],
    attendance: {
      present,
      absent,
      total: attendanceList.length,
      rate,
      last7days: attendanceList.slice(0, 7),
      alert: rate < 75 ? 'Attendance below 75%' : null,
    },
    laundry,
    mess,
  });
}));

router.post('/chat', authenticate, asyncHandler(async (req, res) => {
  const { message, history, context } = req.body;
  const user = req.user;
  const safeHistory = Array.isArray(history) ? history : [];
  const safeContext = context && typeof context === 'object' ? context : {};

  const contextSummary = JSON.stringify({
    user: safeContext.user || {
      name: user.name,
      room_no: user.room_no,
      block_name: user.block_name,
      department: user.department,
      mess_information: user.mess_information || user.mess,
    },
    complaints: Array.isArray(safeContext.complaints) ? safeContext.complaints.slice(0, 5) : [],
    gatepass: Array.isArray(safeContext.gatepass) ? safeContext.gatepass.slice(0, 5) : [],
    attendance: safeContext.attendance || null,
    laundry: safeContext.laundry || null,
    mess: safeContext.mess || null,
  });

  const aiMessages = buildChatMessages({
    user,
    history: safeHistory,
    message,
    contextSummary,
  });

  try {
    const aiResult = await requestBestAvailableAI(aiMessages);
    const botResponse = parseChatbotResponse(aiResult.raw);
    botResponse.provider = aiResult.provider;
    botResponse.timestamp = new Date();
    res.json(botResponse);
  } catch (error) {
    console.error('All AI providers failed:', error);
    res.status(503).json({
      type: 'error',
      text: 'The full AI assistant is taking a quick breather, so I am switching to a lighter help mode for this chat.',
      fallbackMode: 'rule-based',
      providerErrors: error?.providerErrors || [],
    });
  }
}));

module.exports = router;
