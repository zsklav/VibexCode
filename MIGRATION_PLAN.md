# Mongo → Firestore Migration Plan

## TL;DR

- **11 models** + **30 API routes** + **17 client pages** to migrate
- API contracts stay identical → **zero UI changes**
- 6 phases, ~3 focused work sessions
- One real schema redesign needed: `Users.solvedQuestions[]` (Firestore subdoc array hits 1MB limit eventually)
- Topics endpoint needs a **denormalized counter collection** (Firestore has no aggregation pipeline)
- Existing Mongo data: ~50 questions + your test users. Backfill script needed if you want to preserve them, else drop and recreate.

---

## Collection Map

| Mongo Model | Firestore Collection | Doc ID strategy | Notes |
|---|---|---|---|
| `Users` | `users/{email}` | email (lowercase) | Keep `solvedQuestions` as array UNTIL it grows past ~500 items. After that → subcollection `users/{email}/solved/{questionId}`. Streak logic uses `runTransaction`. |
| `Questions` | `questions/{autoId}` | Firestore auto | Same fields. Need composite index `(tags array-contains, difficulty)` if we filter. |
| `Submissions` | `submissions/{autoId}` | Firestore auto | Composite indexes: `(userEmail asc, submittedAt desc)` and `(userEmail, questionId, passed)`. |
| `Quizzes` | `quizzes/{autoId}` | Firestore auto | Index `(date desc)`. |
| `Follows` | `follows/{followerEmail__followingEmail}` | composite ID | Natural uniqueness via doc ID — no compound unique index needed. |
| `Tasks` | `tasks/{autoId}` | Firestore auto | Index `(userId asc, createdAt desc)`. |
| `Clans` | `clans/{autoId}` | Firestore auto | Index `ownerEmail`, `name`. |
| `ClanMembers` | `clans/{clanId}/members/{email}` | **subcollection** | Natural fit — query members by clan = `collection(clans/X/members)`. |
| `Convo` | `conversations/{slug}` | slug | |
| `Messages` | `conversations/{convId}/messages/{autoId}` | **subcollection** | Order by `createdAt`. |
| `Polls` | `polls/{autoId}` | Firestore auto | `votes` Map → use Firestore Map field. |

**New helper collection:**

| Collection | Doc ID | Purpose |
|---|---|---|
| `topics/{tag}` | tag string | Denormalized `{count: number}` updated on Questions write/delete. Replaces the `$unwind/$group` aggregation. |
| `leaderboard/{email}` | email | **Already exists.** Continue using as denormalized view (totalSolved, easyCount, etc.). Updated on `/api/submit` via transaction. |

---

## Breaking Points (need real thought)

1. **`User.addSolvedQuestion()` method** — does atomic: add to array + bump stats + update streak.
   - Firestore: wrap in `runTransaction(db, async (tx) => { ... })`. Read `users/{email}`, compute new state, write back.
   - Streak logic stays identical — just moved out of Mongoose method into a plain helper in `lib/users.ts`.

2. **`Users.getLeaderboard()` static** — sort by `stats.totalSolved DESC`.
   - Firestore: `query(users, orderBy("stats.totalSolved", "desc"), limit(N))`. Need single-field index (auto). **Already have `leaderboard` collection** — just use that, it's already denormalized.

3. **`/api/topics` aggregation** (`$unwind tags, $group, $sum`) — **no Firestore equivalent**.
   - Solution: maintain `topics/{tag}` collection. On `POST /api/questions`, `tx.set(topics/{tag}, {count: increment(1)})` for each tag. On DELETE, decrement. On PATCH with tag change, diff old vs new.

4. **Username uniqueness check** in `PATCH /api/user/profile`.
   - Firestore: query `where("username", "==", X)`. Slower than Mongo unique index but fine at small scale. OR add `usernames/{username}` reservation collection for atomic claim.

5. **Submission queries** — fetch user's submissions sorted by date desc, optionally filter by passed.
   - Firestore composite index needed: `(userEmail asc, submittedAt desc)`. Auto-prompted by Firebase console on first query.

6. **`/api/dev/users` (admin: list all users)** — full collection scan.
   - Fine at small scale. Add `limit(200)` to be safe.

7. **Search by username** (network widget) — Mongo regex.
   - Firestore prefix search: `where("username", ">=", q), where("username", "<", q + "")`. Case-sensitive, prefix-only. Good enough for now.

8. **Heartbeat (writes every 30s per active user)** — Firestore charges per write. At ~120 writes/hour/user × N users, costs add up.
   - Mitigation: keep heartbeat in Firestore but batch to once per 2 minutes (reduce client interval). OR drop heartbeat entirely and use Firebase Auth's `onIdTokenChanged` for presence approximation.

9. **Moderation warnings array** — small (5-20 items per user max). Keep as array field on `users/{email}.moderation.warnings`. No subcollection needed.

10. **`pages/api/socketio.ts`** — uses Mongo for message persistence + moderation lookup. Will rewrite to Firestore. Real-time updates already handled by socket.io itself — Firestore listeners are an alternative but not required.

---

## Phased Execution

### **Phase 0: Prep** (30 min)
- [ ] Add Firebase Admin SDK for server-side writes: `npm i firebase-admin`
- [ ] Create `lib/firebase-admin.ts` (service account or use Application Default Credentials)
- [ ] Add `FIREBASE_SERVICE_ACCOUNT_JSON` env var (or use ADC on Netlify)
- [ ] Decide: keep existing Mongo data and write backfill script, OR drop and start fresh

### **Phase 1: User-related routes** (one session, ~2 hr)
Migrate the core identity layer first. UI keeps working.
- [ ] `/api/signup` → write to `users/{email}` instead of Mongo
- [ ] `/api/user/profile` GET + PATCH
- [ ] `/api/user/heartbeat`
- [ ] `/api/user/mark-solved` (with `runTransaction` for streak)
- [ ] `/api/user/solved-questions`
- [ ] `/api/users`, `/api/getUser`
- [ ] `/api/dev/users`, `/api/dev/users/[userId]/status`
- [ ] `/api/follow`
- [ ] Migrate `addSolvedQuestion` method → `lib/users.ts` helper
- [ ] **Drop `/api/login`** (already unused, confirmed)

**Verify**: signup → profile load → mark-solved → leaderboard update all work end-to-end.

### **Phase 2: Content routes** (one session, ~2 hr)
- [ ] `/api/questions` GET, POST
- [ ] `/api/questions/[id]` GET, PATCH, DELETE
- [ ] `/api/topics` — implement counter maintenance on Questions writes
- [ ] `/api/quizzes` GET, POST
- [ ] `/api/quizzes/[id]` DELETE
- [ ] `/api/submit` (write Submission + bump leaderboard in transaction)
- [ ] `/api/user-submissions`
- [ ] `/api/tasks`, `/api/tasks/[id]`

### **Phase 3: Social routes** (one session, ~1.5 hr)
- [ ] `/api/clan` GET, POST
- [ ] `/api/clan/create`, `/join`, `/leave`
- [ ] `/api/clan/[clanId]` GET
- [ ] `/api/clan/[clanId]/kick`
- [ ] `/api/messages/[conversationId]` (with moderation)
- [ ] `/api/message/[id]`
- [ ] `pages/api/socketio.ts` (Mongo refs → Firestore)

### **Phase 4: Backfill (optional)** (~1 hr if needed)
- [ ] Once Atlas access restored (or via mongoexport JSON dump), write `scripts/migrate-to-firestore.ts`
- [ ] Dump each Mongo collection → batch-write to Firestore
- [ ] Recompute `topics/{tag}.count` post-import

### **Phase 5: Cleanup** (30 min)
- [ ] Delete all files in `models/`
- [ ] Delete `lib/mongodb.ts`
- [ ] `npm uninstall mongoose mongodb`
- [ ] Drop `MONGODB_URI` from `.env.local` and Netlify
- [ ] Remove `connectDB` import from any leftover route

### **Phase 6: Firestore Security Rules** (1 hr) — important for prod
- [ ] Write `firestore.rules`:
  - `users/{email}`: read = anyone authed, write = only if `request.auth.token.email == email` OR admin
  - `questions`: read = anyone, write = admin only
  - `submissions`: read = owner or admin, write = backend (or owner with validation)
  - `clans/{clan}/members`: read = anyone authed, write = via API only
  - etc.

---

## Risks / Things That Will Break

- **Composite indexes** — Firestore won't return data on first composite query, just throws an error with a deep link to create the index. Click each link once. (~6 composite indexes total.)
- **Atomic counters** — heavy write to same doc (e.g. leaderboard top user) can hit 1 write/sec limit. Use `increment()` field operation; for true high-throughput, shard the counter. Not a problem at your scale.
- **Cost** — Firestore reads/writes are metered. Free tier = 50K reads + 20K writes per day. Your dev usage is fine. Production with heartbeat every 30s × 100 users = 288K writes/day → over free tier.
- **No transactions across collections in non-blocking way** — `runTransaction` blocks. For the submit → leaderboard update flow, this is fine.
- **No `populate`** — anywhere Mongo `populate("questionId")` is used, must do a second Firestore read manually. Mostly already does in code.

---

## Decision Points (need your input before I start)

1. **Backfill existing Mongo data?**
   - (a) Yes — write the dump+import script (needs Atlas access restored first)
   - (b) No — drop everything, recreate questions manually via admin panel (~30 questions, you have admin access)

2. **Firebase Admin auth method?**
   - (a) Service account JSON in env var (easy, works on Netlify, but secret to manage)
   - (b) Application Default Credentials (works only if deploying to GCP, not Netlify)
   - **Recommended: (a)** — Service account.

3. **Order of execution?**
   - (a) Sequential phases as listed above (safest)
   - (b) All-at-once big-bang rewrite (faster but breaks everything until done)
   - **Recommended: (a)**

4. **Heartbeat — keep or drop?**
   - (a) Keep with reduced interval (2 min) — preserves online/idle indicators
   - (b) Drop entirely — saves Firestore writes, lose presence feature
   - **Recommended: (a)** with 2-minute interval, since presence rail in /community already exists.

---

## Estimated Total Time

- **Best case** (no backfill, smooth sailing): ~8 hours focused = 2 sessions
- **Realistic** (debugging composite indexes, transaction edge cases): ~12 hours = 3 sessions
- **With Aug OAs prep happening in parallel**: spread over 1 week

If Aug OAs are priority, the **Atlas whitelist fix is still the right call for now** — and you migrate to Firestore *after* placements. But you asked for the plan, so here it is, ready when you are.
