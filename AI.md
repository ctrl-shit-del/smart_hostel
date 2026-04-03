# Smart Hostel System - AI Context Document

## Overview
Smart Hostel is a full-stack MERN (MongoDB, Express, React, Node.js) application built to automate hostel operations such as gatepasses, complaints, attendance tracking, mess schedules, laundry slots, and predictive AI chatbot assistance. 

This file serves as a knowledge base to assist future LLMs in understanding the application architecture, schemas, and logic limits.

## Project Structure
- Frontend (`/client`): React via Vite, styling using customized CSS modules and global CSS (Tailwind mostly avoided per design rules, utilizing raw CSS 'Glassmorphism').
- Backend (`/server`): Express API, MongoDB using Mongoose.
- AI Chatbot feature is located under `/client/src/components/ChatBot/`. 
  - Central `router.js` acts as an intent router mapping keywords to specific `.handler.js` sandboxed files (leave, complaint, status, mess, health).

## Gatepass & Leave System Rules (CRITICAL constraints)
All systems (UI `ApplyGatepass.jsx` and ChatBot `leave.handler.js`) adhere to these hard constraints:
1. **Outing**: 
   - Strict operating hours bounds: Only valid between 08:00 (8 AM) and 18:00 (6 PM).
   - Must occur on a single day.
   - Weekdays (Mon-Fri) duration max: 2 Hours.
   - Weekends (Sat-Sun) duration max: 6 Hours.
2. **Leave**: Must span at least 1 full day (>= 24 hours), but can be extended of any length. Overnight trips MUST be filed as "Leave" with Guardian details.
3. No overlapping Gatepasses/Leaves are permitted. Students must clear their "Out"/return status to apply again.

## Smart Complaint System
Chatbot `complaint.handler.js` calculates dual severity before sending to backend DB.
- **User Intent Severity**: Uses NLP matching on prompt (e.g. "urgent", "not working at all" -> High).
- **System Rule Severity**: Uses DB context logic (e.g., Electrical problem in NAC block -> High; Plumbing leak -> High).
- Takes the `MAX()` of both severities to file complaints.

## Database Schemas Overview

### 1. User `User.js`
- `role`: 'student' | 'warden' | 'admin' | 'security'
- Virtual mappings for derived states: 
  - `floor_no`: floor mapping logic
  - `bed_id`: mapping for determining if NAC / AC rooms
  - `mess_information`: linking to caterers

### 2. Gatepass `Gatepass.js`
- `student_id`, `student_name`, `register_number`, `room_no`
- `type`: Enum ['Outing', 'Leave', 'Hospital']
- `destination`, `reason`, `expected_exit`, `expected_return`
- `guardian_name`, `guardian_phone`, `guardian_relation` (Req. for Leave)
- `status`: Enum ['Pending', 'Approved', 'Rejected', 'Active', 'Returned', 'Expired', 'Recalled']
- QR Tracking constraints (`qr_token`, `actual_exit`, `actual_return`)
- Anomaly flags: `is_overdue`, `late_return_count`

### 3. Complaint `Complaint.js`
- Types: ['Electrical', 'Plumbing', 'Civil', 'Housekeeping', 'Pest Control', 'Internet', 'Other']
- Base mapping is connected to User `bed_id`/type for escalating rule priority.

## Frontend UI Architecture
- **Glassmorphism Aesthetic**: Global UI adopts `background: rgba(255, 255, 255, 0.05)`, heavy blurs (`backdropFilter: blur(20px)`), and radial gradient borders to emulate frosted glass. Default palette relies on deep slates (`#0f172a`), vivid indigos (`#6366f1` for active actions), and emeralds for success states.
- Auth routing maps automatically (Student -> `StudentDashboard`, Warden -> `WardenDashboard`).
- **Chatbot Float Pattern**: `ChatBot.jsx` intercepts the bottom right of `AppShell.jsx` rendering. Uses state injection across standard routes, persisting state machines across component resets to handle its own complex multi-step dialogs.

## Interaction with Future LLMs
- AI models touching the code should always enforce the time bounds in any modified files. 
- Models should test the Vite Proxy configuration (`vite.config.js`) if connecting to new API end points. 
- NEVER overwrite `ChatBot/router.js` completely without ensuring spelling fallbacks (like `laundary`) and Cross-Module checks are securely intact.
