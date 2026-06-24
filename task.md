# Road2IIM — Task List (Upgrade Complete)

All analytical upgrades, UI styling changes, robust AI auto-filling, mobile responsiveness adjustments, the AI Coach briefing, vocabulary auto-definer, and mock test AI parser have been built and verified.

---

## Group A: Data Layer & Core Config
- [x] Add `CAT_SYLLABUS_WEIGHTAGE` constant to `constants.js`.
- [x] Set up auto-creation of `[AI Plan]` todos inside `Home.jsx` using `useEffect` for top weekly mistakes.

## Group B: New Analytics Components
- [x] Create [SyllabusTracker.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/SyllabusTracker.jsx) showing weights, attempts, accuracy, and prioritizations.
- [x] Create [TopicMasteryQuadrants.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/TopicMasteryQuadrants.jsx) placing topics in 2x2 grid.
- [x] Create [SlotFatigueTracker.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/SlotFatigueTracker.jsx) charting speed and accuracy drop-off.
- [x] Add WPM Analysis view inside [AeonLog.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/AeonLog.jsx) subtab.

## Group C: UI & Integration
- [x] Integrate new cards inside [Dashboard.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/Dashboard.jsx).
- [x] Shift [TodayView.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/TodayView.jsx) layout to a balanced two-column grid.
- [x] Redesign navigation bar into a fixed floating glass pill navigation bar in [index.css](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/index.css).
- [x] Mute color accents and adjust variables in CSS to implement a cool, calm, sleek dark theme.

## Group D: Robust AI Autofill & Mobile Chrome
- [x] Enhance Gemini prompt in [ai.js](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/utils/ai.js) to normalize Attempts/Correct digits and extract set headings/labels.
- [x] Integrate AI Screenshot Log in [QuickLogForm.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/QuickLogForm.jsx) and add a visible Heading / Label input.
- [x] Integrate label autofill in [EntryForm.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/EntryForm.jsx).
- [x] Make the entire upload zone card in [AIScreenshotLog.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/AIScreenshotLog.jsx) clickable as a single touch target.
- [x] Optimize CSS media queries in [index.css](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/index.css) (48px touch targets, no-zoom 16px inputs on focus, mobile tags scaling, and single-column form grids on narrow screens).

## Group E: AI Coach & Executive Summary
- [x] Create [AICoachSummary.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/AICoachSummary.jsx) to compile 7-day stats, query Gemini API (with fallback), and cache results.
- [x] Integrate `AICoachSummary` at the top of [TodayView.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/TodayView.jsx) spanning across columns.
- [x] Design cohesive glassmorphic styling for all AI-enabled cards (`.ai-card`) in [index.css](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/index.css).

## Group F: AI Vocabulary & Mock Logger
- [x] Implement `defineWordWithGemini` in [ai.js](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/utils/ai.js) to define words in a concise context.
- [x] Add auto-definer state, method, and buttons to [EntryForm.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/EntryForm.jsx) and [QuickLogForm.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/QuickLogForm.jsx).
- [x] Integrate `AIScreenshotLog` in [MockTests.jsx](file:///c:/Users/Mokshal%20Shah/Documents/antigravity-road2iim/road2iim/src/components/MockTests.jsx) to autofill overall score, percentile, and sectional splits.
