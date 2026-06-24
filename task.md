# Road2IIM v4 — Task List

## Scope
Features 1–6, 8, plus difficulty rating. Fatigue tracking, skip strategy, session timer deferred.

---

## Group A: Data Layer & Hooks
- [x] `constants.js` — add `DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard']`
- [x] `calc.js` — add `marksLost` to `computeStats()` and `aggregate()`
- [x] `useEntries.js` — persist `vocab`, `difficulty`, `sessionId`, `sessionSeq`
- [x] `useAeonArticles.js` — persist `link`, `timeTaken`, `wordCount`, `readingSpeed`
- [x] `useTodos.js` — new hook for personal to-do list
- [x] `useReminders.js` — new hook for reminders
- [x] `firestore.rules` — add `todos`, `reminders` collections

## Group B: New Components
- [x] `PersonalTodos.jsx` — personal to-do list component
- [x] `Reminders.jsx` — upcoming reminders component
- [x] `ReadingSpeedTrend.jsx` — reading speed trend chart for VARC dashboard

## Group C: Dashboard Restructuring
- [x] `Dashboard.jsx` — add section selector, pass sectionKey to all children
- [x] `WeeklyDigest.jsx` — section-scoped narrative with subsection breakdown
- [x] `WeeklyTrends.jsx` — subsection lines for selected section
- [x] `WeekOverWeek.jsx` — single section card + marksLost row
- [x] `MistakePatterns.jsx` — section-scoped (whole section, not subsection)
- [x] `TopicBreakdown.jsx` — section-scoped with subsection grouping
- [x] `GoalsPanel.jsx` — section-scoped goals
- [x] `DayDrilldown.jsx` — section-scoped + marksLost column
- [x] `FlaggedForDiscussion.jsx` — section-scoped

## Group D: Entry Forms & Aeon
- [x] `EntryForm.jsx` — add difficulty selector + VARC vocab editor
- [x] `QuickLogForm.jsx` — add difficulty selector + collapsed vocab toggle
- [x] `EditEntryModal.jsx` — add difficulty selector + VARC vocab
- [x] `AeonLog.jsx` — add link, timeTaken, wordCount fields; reading speed
- [x] `SectionBalance.jsx` — fold Aeon time into VARC slice
- [x] `csv.js` — add difficulty and marksLost to entry export; add new Aeon fields

## Group E: Integration (Pages)
- [x] `TodayView.jsx` — add SectionBalance, PersonalTodos, Reminders
- [x] `Home.jsx` — add dashboardSection state, pass todos/reminders data
- [x] `Mentor.jsx` — add dashboardSection state, mirror dashboard changes

## Group F: CSS
- [x] `index.css` — styles for PersonalTodos, Reminders, difficulty pills, section selector, reading speed, vocab-in-entries
