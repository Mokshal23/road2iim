# Road2IIM

A personal CAT prep tracker: log practice sessions across VARC, LRDI, and QA,
auto-calculate accuracy/marks-per-minute, tag what went right or wrong, and
see weekly trends, topic weak-spots, and goal progress on a dashboard. A
second read-only `/mentor` page lets your mentor see everything live and
leave you notes — same idea as your shared Google Sheet, but built for this.

Stack: React + Vite, Firebase Firestore (real-time sync), deployed on Vercel.

---

## Part 1 — Create your Firebase project (~5 min)

1. Go to **console.firebase.google.com** and click **Add project**.
2. Name it anything (e.g. `cat-control-room`). You can skip Google Analytics.
3. Once created, click the **web icon (`</>`)** on the project overview page to
   register a web app. Give it any nickname. You do **not** need Firebase
   Hosting — just register the app.
4. Firebase will show you a `firebaseConfig` object with values like
   `apiKey`, `authDomain`, `projectId`, etc. **Keep this tab open** — you'll
   copy these into Vercel in Part 3.
5. In the left sidebar, go to **Build → Firestore Database → Create
   database**. Choose any region close to you, and start in **production
   mode** (we'll set rules manually next).
6. Go to the **Rules** tab of Firestore and replace the contents with what's
   in `firestore.rules` in this project, then click **Publish**.
   - Heads up: these rules allow anyone with your deployed link to read and
     write data, same trust model as a shared Google Sheet. That's
     intentional for zero-friction mentor sharing — see the note at the top
     of `firestore.rules` if you want to lock it down later.

## Part 2 — Push this code to GitHub (~3 min)

1. Create a new, empty repository on GitHub (e.g. `cat-control-room`). Don't
   initialize it with a README.
2. In a terminal, from this project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/cat-control-room.git
   git push -u origin main
   ```

## Part 3 — Deploy to Vercel (~3 min)

1. Go to **vercel.com**, sign in with GitHub, and click **Add New → Project**.
2. Import the repo you just pushed. Vercel will auto-detect it as a Vite
   app — leave the build settings as default.
3. Before clicking Deploy, open **Environment Variables** and add these six,
   pasting the matching values from your Firebase config (Part 1, step 4):

   | Key | Value comes from |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `VITE_FIREBASE_PROJECT_ID` | `projectId` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `VITE_FIREBASE_APP_ID` | `appId` |

4. Click **Deploy**. After ~1 minute you'll get a live URL like
   `https://cat-control-room.vercel.app`.

## Part 4 — Use it

- **You**: open the live URL, use the **Log session** tab to enter sessions,
  and the **Dashboard** tab to review trends, topics, mistakes, and goals.
- **Your mentor**: send them `https://your-app.vercel.app/mentor` — same
  data, read-only, plus a box to leave you notes that show up on your
  dashboard.

Data syncs in real time through Firestore — no exporting, no re-sharing
links, exactly like the Google Sheet workflow you're used to.

## What's new since v1

- **Today tab** (now the landing screen): live progress bars against your
  daily targets — VARC sets, QA/LRDI hours, Aeon articles — editable in-app,
  plus your study streak and a GitHub-style activity heatmap.
- **Week-over-week comparison** on the Dashboard: this week vs last week,
  per section, with up/down deltas on accuracy, marks/min, and attempts.
- **Aeon article log**: title, topic, your own summary, difficulty, and a
  word+meaning vocab list per article — which rolls up into a searchable
  Vocab Bank tab over time.
- **Mock test analyzer & insights**: log full SimCAT/Cracku/IMS results (sectional
  attempted/correct/time + overall score/percentile), with percentile and
  score trend charts, and a results table, filterable by source. Features a new **Insights & Performance Correlation** section:
  - Tag mocks with success factors ("What went well") and obstacles ("What went wrong").
  - Dynamically analyze behavior frequencies based on a custom target percentile threshold.
  - Automatically detect performance blockers (accuracy penalties), over-attempting risks, and identify your make-or-break section.
- **Mentor task board**: your mentor assigns tasks tagged to a section
  (e.g. "3 DILR sets on arrangements"); you check them off on the Today tab
  and contextually on that section's Log tab. Mentor manages the full board
  from their Tasks tab.
- **Interactive Streak Drilldown**: Clicking on any day in the study streak heatmap opens an interactive popup summarizing all logged practice sessions, mock tests, and Aeon articles read on that day (including sectional metrics, reading speeds, notes, and tags).
- **Auto-Saving Form Drafts**: Integrated sessionStorage persistence across all major forms (Aeon logs, Mock Test scorecards, Quick logs, and Detailed session logs) to prevent accidental data loss when switching tabs.
- **Dynamic Field Auto-Suggestions**: Inputs for labels and custom topics now suggest values matching what you've logged in the past, making repetitive logging effortless.
- **System Portal Helpdesk**: Added a technical support ticket tracker (`🐞` icon in the header) enabling students to raise system bug reports (like decimal time inputs) complete with auto-generated debug specs (OS, resolution, URL).
- **Admin Portal Workspace**: Decoupled Mentor and Admin roles. Created a dedicated Admin Portal (`/admin` path) to let system administrators manage reported tickets, track system issues, and manage registered users and their account roles.

### Redeploying this update

Since you've already deployed once, the same Firebase project and Vercel
project work for this update — no need to start over:

1. Replace your project folder's contents with this updated version (keep
   your existing `.git` folder if you're just copying files over it).
2. **Update Firestore rules**: go to Firebase Console → Firestore Database
   → Rules, and replace the contents with the updated `firestore.rules` from
   this project (it now covers the new `settings`, `aeonArticles`,
   `mockTests`, and `tasks` collections). Click Publish.
3. Commit and push: `git add . && git commit -m "Add streaks, goals, Aeon log, mocks, tasks" && git push`.
4. Vercel will auto-redeploy on push — no new environment variables needed.

New Firestore collections are created automatically the first time you use
each feature, so there's nothing to manually set up in the database itself.



If you want to run it on your own machine before deploying:

```bash
npm install
cp .env.example .env   # then paste your Firebase config values into .env
npm run dev
```

## What's new in v9 (Header Navigation & Elevated AI Vocab Vault)

- **📌 Unified Header Navigation**: Migrated all section selectors (*Today, Log Session, Dashboard, Aeon Log, Mock Tests, Tasks, and Vocab Bank*) from the bottom bar to a sleek, responsive pill-navigation selector in the sticky top header. Legacy subheaders have been removed for a clean, premium visual design.
- **📚 First-Class Vocab Bank**: Elevated the Vocabulary Bank to a top-level tab. It merges logged words from Aeon logs, practice entries, and direct additions into one unified, searchable, filterable list.
- **✨ Direct Add & AI Auto-Define**: Easily log words directly into your vault with a dedicated direct-entry form, featuring one-click Gemini auto-definition support.
- **🧠 AI Daily Recommendations (Word of the Day)**: Get 3 sophisticated, daily-cached, CAT-relevant vocabulary suggestions generated dynamically by Gemini. Includes one-click `+ Add to bank` buttons that disable automatically when a word is already added.
- **📝 Multi-Source Revision Quiz**: Rewrote the Flashcard and MCQ Vocab Revision Quizzes to query a unified pool of words from Aeon articles, practice sessions, and direct additions, with direct Firestore write operations for mastery status.
- **📱 Responsive Mobile Wrapping**: Integrated CSS vertical stacking and horizontal overflow scroll support for header tabs on mobile devices, keeping the interface visually perfect and readable.

## What's new in v8 (Bulletproof Robustness, Security & Performance Upgrades)

- **🛡️ React Error Boundaries**: Custom global and local card boundaries (`GlobalErrorBoundary` and `CardErrorBoundary`) that intercept component crashes (like chart/speech exceptions) and let the rest of the application load normally.
- **🌐 Network Sync Monitor & Toast Sync**: Pulsing connectivity status indicator dot (`🟢 Connected` / `🟡 Working Offline`) in the header that uses window events and Zustand toasts to inform users when they are working offline.
- **💾 Self-Healing Cache (`safeStorage`)**: Overhauled storage wrapper that captures JSON parse errors in local/session storage, automatically heals the key with default values, and prevents client-side boot loops.
- **📐 Zod Pre-Flight Database Write Verification**: Strictly validates every database write payload client-side right before pushing to Firestore, preventing database corruption and alerting users of empty or incorrect fields.
- **⏳ AI Rate-Limit Exponential Backoff Retries**: Integrated intelligent retries with backoff inside the AI Coach and quiz engines, gracefully recovering from `429` rate-limit errors.
- **⛓️ Atomic Firestore Write Batches**: Refactored multi-row writes (like practice session logs) to use atomic Firestore `writeBatch` transactions, keeping database states clean and robust.
- **🛡️ Defensive Chaining Audits**: Overhauled data mapping and filtering loops in dashboard views (`Dashboard.jsx`, `TodayView.jsx`, `AeonLog.jsx`) with defensive chaining (`?.` and fallback `|| []`), eliminating white-screen errors if database collections contain empty records.

## What's new in v7 (Premium Onboarding & Robust UX/UI Upgrades)

- **🔐 Self-Signup & Account Registration**: Direct user signup page with email/password registration, password visibility toggles, and user-friendly translations of Firebase error codes.
- **🎓 Interactive Onboarding Center**: A tabbed interactive walkthrough panel at the top of the landing screen to help new users set up their free Gemini API keys, understand core metrics (Accuracy, Speed/MPM, negative marking, TITA), and discover app features.
- **⚡ Index-Free Queries via Client-Side Sorting**: JavaScript-based sorting on data snapshots, making the database fully index-free. New users can log in and start tracking instantly without encountering Firebase console missing-index crashes.
- **🛡️ Input Validation & Math Guardrails**: Submit-blocking input checks that verify correct answers do not exceed attempts, and restrict entry inputs to valid, non-negative integers.
- **🗑️ Delete Confirmation Dialogs**: Clean browser/custom confirmation warnings before destructive deletes across practice logs, mocks, vocab, tasks, goals, and reminders.
- **💾 sessionStorage Draft Autosave**: Automatically registers and restores notes/descriptions on tab switches or page reloads to prevent lost draft entries.
- **🔊 Speech Synthesis Pronunciation**: Audio speech buttons (`🔊`) in the onboarding card and Vocabulary bank chips to read terms and definitions aloud.
- **🍞 Custom Toast Notifications**: Slide-up success alerts (e.g. `✓ Session saved!`, `✓ API key updated!`) powered by the global Zustand store.
- **💀 Pulsing Skeleton Loaders**: Custom loading placeholder shapes styled to pulse smoothly while data is fetched, replacing plain "Loading..." text.
- **🎨 Smooth Theme transitions**: Sleek 0.3s CSS animations on colors and backgrounds when toggling light/dark mode.

## What's new in v6 (Enterprise SaaS Readiness)

- **🔐 Self-Signup & Direct User Registration**: Added a toggle link on the login screen to allow your friends to register their own accounts directly from the browser.
- **🎓 Interactive Onboarding Walkthrough Center**: Built a beautiful tabbed guide right at the top of the dashboard. It explains core metrics (Accuracy, Speed/MPM, CAT scoring rules), key tracker features (Streak Heatmap, Mock test analyzer, Vocab bank, Fatigue sequence), and walks them through setting up their free Gemini API key.
- **⚡ Zustand High-Performance State Cache & Index-Free Queries**: Consolidated collections into a centralized Zustand global store. Refactored queries to sort snapshots client-side in JavaScript, removing the need for manual composite indexes in the Firebase Console (preventing "missing index" crashes for your friends).
- **👥 Scoped Multi-Tenant Infrastructure & Role Management**: Built scoped tenant paths supporting distinct roles (`student` vs `mentor`). New accounts are greeted with a Role Selection modal to configure access. Mentors can dynamically link and transition between multiple student profiles using a dropdown.
- **🔌 Offline IndexedDB Persistence**: Overhauled `src/firebase.js` to run Firestore with IndexedDB caching (`persistentLocalCache` and `persistentMultipleTabManager`), ensuring offline functionality across multiple browser tabs.
- **🛡️ Secure Scoped Firestore Rules**: Modified security rules to restrict reading and writing only to document owners or authenticated mentors who are explicitly linked to the student via `exists` path checks.
- **🧼 Note Sanitization (DOMPurify)**: Enforced client-side input sanitization via `DOMPurify` to clean notes and comments before committing them to Firestore.
- **🩹 Zod Validation & Self-Healing AI Outputs**: Replaced fragile JSON parsing with strict `Zod` schemas in `src/utils/schemas.js` for quizzes, screenshots, and logs. Includes auto-recovery defaults so rate limits or formatting hiccups don't break the UI.
- **⚙️ Route-Based Code-Splitting**: Implemented React `lazy()` routing for `Home` and `Mentor` pages, decreasing the initial page bundle sizes and speeding up initial application loads.
- **🧪 Local Testing Suite**: Set up a local unit testing framework using **Vitest** to run scoring and aggregation unit tests (`npm test`), securing regression-free math calculations.

## What's new in v5 (High Availability & Enhanced Quizzes)

- **⚙️ Multi-Model API Failover Sequence**: Implemented a robust 10-level fallback chain spanning Google Gemini (7 active models), Groq, DeepSeek, and Z.ai (Zhipu) API endpoints. If Gemini hits daily limits or rate limits, the app automatically fails over to Groq or other configured APIs, ensuring zero downtime.
- **🎓 Test-Format CAT RC Quizzes**: Switched the quiz generation module to use an authentic test format. Answers, correct options, and explanations are hidden during testing, and the overall score is only calculated and revealed after submitting the entire test.
- **📝 Persisted Review & Reflection Logging**: Added a detailed review panel to inspect correct options, understand traps (labeled as OOS, TBI, Extreme, Broad/Narrow, distortion), and save a custom **Self-Identified Error Analysis** directly to Firestore.
- **⚙️ Fallback Keys Panel**: Expand the new fallback settings pane in the **AI Log Zone** to configure your Groq, DeepSeek, and Z.ai API keys.
- **🔧 To-Dos & Reminders Fixes**: Resolved critical loading race conditions and date-shifting string validation bugs. Implemented a `localStorage` lock to ensure the AI Coach's plan todo is generated exactly once per day and doesn't get instantly recreated when deleted by the user.

## What's new in v4 (AI-Enabled Upgrades)

- **🧠 AI Coach & Executive Summary**: Get a personal 3-sentence performance coaching briefing at the top of the **Today** tab, compiled from your recent 7-day study time, mock test results, and mistake tag trends.
- **📷 AI Scorecard Screenshot Logger**: Simply drag and drop or upload a screenshot of your practice scorecard (e.g. from IMS, iQuanta, Cracku). Gemini automatically parses and fills in attempts, corrects, time taken, source, and passage labels.
- **✨ AI Vocabulary Auto-Definer**: Press the `✨` button next to any word input (detailed log, quick log, Aeon log, or edit modals) to automatically fetch a concise definition and synonym (max 14 words).
- **🧠 AI Mistake Patterns Analyzer**: Located in the new `🧠 AI Insights` tab inside the **Mistake patterns** card, this reads your qualitative session notes and mistake tags to identify 2-3 recurring cognitive bottlenecks with strategic remedies.

### 🔑 Setting up the AI features (for Newbies)

The AI features use the **Google Gemini API**. To enable them:
1. Go to [Google AI Studio](https://aistudio.google.com/) and create a free API Key.
2. In the Road2IIM app, on the **Today** tab, locate the **AI Coach & Executive Summary** card.
3. Paste your Gemini API key and click **Save Key**.
4. The key is stored securely in your browser's local storage (`localStorage`). It runs entirely on the client side and is never sent to any external server other than Google's secure Gemini API.
5. All AI features share this same key, so you only need to enter it once. If you ever need to remove it, simply click **Remove Key** at the bottom of the card.

---

## What's new in v3 — read the auth steps carefully

**New features:**
- **Days-to-CAT countdown** on the Today tab, with a 7-day pace check against
  your QA+LRDI daily targets. Exam date is editable (defaults to the
  expected-but-unconfirmed 29 Nov 2026).
- **Edit, not just delete** — practice entries, Aeon articles, and mock
  tests can now be edited in place via a small modal, not just deleted.
- **Mistake trend over time** — toggle on Dashboard between "this week" and
  an all-time weekly trend line for your top recurring mistake tags.
- **What went well** — a parallel, optional tag picker next to mistake tags,
  so a clean session shows up as a win, not a blank. Neither set of tags is
  required anymore — log a perfect session with nothing ticked at all.
- **Quick-log mode** on the Log tab — a stripped-down single-row form,
  pre-filled from your last session in that section.
- **CSV export** for entries, Aeon articles, and mock tests (Dashboard tab).
- **Weekly digest** — auto-generated summary at the top of the Dashboard.
- **Threaded replies** on mentor notes — either side can reply under a note.
- **Mentor "flag for discussion"** — a star toggle on any entry or mock,
  with a standing "flagged for discussion" list on the Dashboard.
- **Install as an app** — your phone/browser should now offer "Add to Home
  Screen" / "Install" for an app-like, full-screen experience.
- **Light/dark toggle** — sun/moon icon in the header, remembers your choice
  per device.
- **Sign-in required** — see below, this is the big one.

**Source list change**: "Aeon article" is gone from the Log tab's source
dropdown (redundant with the dedicated Aeon tab) — replaced with iQuanta,
Cracku, and IMS Portal. Old entries that already say "Aeon article" are
completely untouched; editing one shows it as a clearly-marked legacy option
so saving never silently changes it.

### Sign-in — do these in order, or you'll lock yourself out

The app now requires login so randoms with the URL can't read or write your
data. This does **not** touch any existing document in Firestore — it only
changes who can reach them. But the order you do this in matters:

1. **Firebase Console → Authentication → Sign-in method → enable Email/Password.**
2. **Authentication → Users → Add user** — twice. One email+password for you,
   one for your mentor. Pick anything memorable; there's no verification flow.
3. **Deploy this updated code** (push to GitHub as usual). It now shows a
   login screen before anything else.
4. **Only after step 3 succeeds**, update your Firestore rules with the new
   `firestore.rules` in this project (Firebase Console → Firestore Database
   → Rules → paste → Publish).

If you do step 4 before steps 1-2, nobody — including you — can sign in
yet, so the rules would block everyone. Doing it in the order above means
there's no moment where you're locked out of your own data.

Once both accounts exist, share the relevant email/password with your
mentor for the `/mentor` URL, and use your own for the main app.

## Notes

- All scoring assumes CAT's standard +3 / −1 marking; uncheck "Negative
  marking applies" on a row for TITA questions, which aren't penalized.
- Mistake tags cap at 3 per row to keep the data clean enough to actually
  analyze — pick the ones that mattered most.
- Goals compare your trailing 7-day average against your target, not the
  whole-history average, so they reflect recent form.
