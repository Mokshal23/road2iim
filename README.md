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
- **Mock test analyzer**: log full SimCAT/Cracku/IMS results (sectional
  attempted/correct/time + overall score/percentile), with percentile and
  score trend charts and a results table, filterable by source.
- **Mentor task board**: your mentor assigns tasks tagged to a section
  (e.g. "3 DILR sets on arrangements"); you check them off on the Today tab
  and contextually on that section's Log tab. Mentor manages the full board
  from their Tasks tab.

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

## Notes

- All scoring assumes CAT's standard +3 / −1 marking; uncheck "Negative
  marking applies" on a row for TITA questions, which aren't penalized.
- Mistake tags cap at 3 per row to keep the data clean enough to actually
  analyze — pick the ones that mattered most.
- Goals compare your trailing 7-day average against your target, not the
  whole-history average, so they reflect recent form.
