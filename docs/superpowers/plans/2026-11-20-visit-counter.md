# Visit Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Count site visits with GoatCounter (no third-party script, the owner's device excluded) and add a "Kto czytał" summary to the Monday morning mail, plus a month line on the 1st.

**Architecture:**
- **Site.** A new `site/js/visits.js` loads one GoatCounter `/count` pixel per page load from `app.js`.
- **Data library.** A new `n8n/lib/visits.js` computes the Warsaw-week and Warsaw-month UTC ranges and turns GoatCounter `/api/v0/stats/total` responses into a summary. `renderEmailHtml` renders that summary.
- **Pipeline.** `PPAI · publish` gets a ranges Code node, an If node and an HTTP node in front of `Build morning mail`.

**Tech Stack:** Vanilla ES modules, n8n Cloud Code/If/HTTP nodes, `node --test`.

**Spec:** `docs/specs/2026-11-20-visit-counter-design.md`

## Global Constraints

- **Project rules.** All rules of `docs/superpowers/plans/2026-11-18-poranna-prasa-ai.md` → Global Constraints still apply:
  - nothing global, zero npm dependencies;
  - commits by the owner (`git -c user.name=mChoczay`), with a one-sentence subject, a short body and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  - never commit the n8n host, keys or the owner e-mail;
  - each n8n execution ≤ 180 s.
- **Tests.** Run with `.tools/node/node.exe --test`. Code-node tests use `tests/helpers/code-node.js`, where `URL`, `URLSearchParams` and `structuredClone` are undefined.
- **GoatCounter endpoints.**
  - Count: `https://api-prasa.goatcounter.com/count`.
  - API: `https://api-prasa.goatcounter.com/api/v0/stats/total?start=<ISO>&end=<ISO>`, with header `Authorization: Bearer <key>` from an n8n Header Auth credential named `GoatCounter`.
  - Response: `total` (number) and `stats[]` of `{ day: 'YYYY-MM-DD', daily: number }`.
- **Site.**
  - No GoatCounter script and no CSP change; the pixel is an `Image` whose `src` is the count URL.
  - The count URL is exactly `https://api-prasa.goatcounter.com/count?p=%2F&rnd=<random>`.
- **Exact mail copy:**
  - heading `Kto czytał`;
  - week line: `Tydzień D–D MON: N odwiedzających`, e.g. `Tydzień 16–22 lis: 6 odwiedzających`;
  - day row: `pn 2 · wt 0 · śr 1 · czw 3 · pt 0 · sob 1 · nd 2`;
  - month line: `MIESIĄC RRRR: N odwiedzających`, e.g. `Listopad 2026: 23 odwiedzających`.
  - Use the plain word `odwiedzających` for every number; no Polish plural forms.
- **Ranges.** All times are Europe/Warsaw midnights converted to UTC ISO strings ending in `:00:00Z`.
  - Week: on a Monday edition date D, from Monday D−7 00:00 to Monday D 00:00.
  - Month: on the 1st, from the 1st of the previous month 00:00 to the 1st of this month 00:00.
  - Any other day: no ranges.
- **Failure.** A failed or missing stats response leaves the section out; the mail is still sent.

## Review Focus

1. **DST weeks.** The week of 26 Oct 2026 crosses the CEST→CET switch. Week ranges must start at `…T23:00:00Z` or `…T22:00:00Z` as appropriate. Test in Task 2.
2. **1 Feb 2027 falls on a Monday.** Both a week and a month range are produced, and both mail parts appear. Test in Task 2.
3. **GoatCounter answers 401, 403 or 500, or the body has no `total`.** The section is left out and the mail is still built. Tests in Task 2 and Task 3.
4. **Owner device with ratings enabled.** No pixel. A broken or missing `localStorage` still counts the visit and never throws. Test in Task 1.
5. **The `stats[]` days are not exactly the 7 week days** (missing or extra days). Missing days show 0, extra days are ignored. Test in Task 2.

---

### Task 1: Count a visit from the site

**Files:**
- Create: `site/js/visits.js`, `tests/visits-site.test.js`
- Modify: `site/js/app.js` (call once at module start)

**Interfaces:**
- Produces: `countVisit(storage, makeImage = () => new Image(), random = Math.random) -> boolean`.
  - Returns false and does nothing when `loadConfig(storage)` (from `./feedback.js`) gives a config.
  - Otherwise it creates an image, sets `src` to the count URL with `rnd` = `Math.floor(random() * 1e9)` and returns true.
  - Any exception makes it return false.
  - `storage` may be `null`.

- [ ] **Step 1: Failing tests** in `tests/visits-site.test.js`, using a fake image object `{ src: '' }` and a Map-backed storage:
  - with no storage, returns true and `src === 'https://api-prasa.goatcounter.com/count?p=%2F&rnd=500000000'` for `random = () => 0.5`;
  - with storage holding a valid `ppai.feedback` config (as written by `saveConfig`), returns false and creates no image;
  - with a storage whose `getItem` throws, still returns true;
  - with a `makeImage` that throws, returns false.
- [ ] **Step 2: Run.** `.tools/node/node.exe --test tests/visits-site.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `visits.js`. In `app.js`, call `countVisit(store)` once after `store` is defined (not inside `route()`).
- [ ] **Step 4: Full suite.** Expected: PASS.
- [ ] **Step 5: Preview.** Open `http://localhost:8080/`. In `read_network_requests`, filter on `goatcounter`. Expected: one request to `/count?p=%2F&rnd=…` on load and none on hash navigation. After `localStorage.setItem('ppai.feedback', …valid…)` and a reload, none.
- [ ] **Step 6: Commit:** `Count site visits with GoatCounter.`

### Task 2: Visit ranges, summary and mail section

**Files:**
- Create: `n8n/lib/visits.js`, `tests/visits.test.js`
- Modify: `n8n/lib/email.js` (`renderEmailHtml` option `visits`), `tests/email.test.js`

**Interfaces:**
- Produces:
  - `visitRanges(dateStr) -> Array<{ kind: 'week'|'month', start: string, end: string, url: string }>`. The URL is the stats/total URL, with `start` and `end` passed through `encodeURIComponent`.
  - `visitSummary(ranges, bodies) -> { week?: { first: 'YYYY-MM-DD', last: 'YYYY-MM-DD', total: number, days: number[7] }, month?: { year: number, month: number, total: number } } | null`.
    - `bodies[i]` belongs to `ranges[i]`.
    - A range whose body lacks a finite `total` is left out.
    - The result is null if nothing is left.
    - `days` follows the order Mon..Sun from `stats[].day`/`daily`; missing days are 0.
  - `renderEmailHtml(edition, siteUrl, { feedbackUrl, feedbackKey, visits = null })` adds the `Kto czytał` block before the ratings footer when `visits` is set.

- [ ] **Step 1: Failing tests.**
  - `visitRanges('2026-11-23')` (a Monday) returns one `week` range: `2026-11-15T23:00:00Z` → `2026-11-22T23:00:00Z`.
  - `visitRanges('2026-11-24')` returns `[]`.
  - `visitRanges('2026-10-26')`: start `2026-10-18T22:00:00Z`, end `2026-10-25T23:00:00Z`.
  - `visitRanges('2026-12-01')` returns one `month` range: `2026-10-31T23:00:00Z` → `2026-11-30T23:00:00Z`.
  - `visitRanges('2027-02-01')` returns kinds `['week', 'month']`.
  - Every URL starts with `https://api-prasa.goatcounter.com/api/v0/stats/total?start=2026` and has no spaces.
  - `visitSummary` for the 23 Nov week, with body `{ total: 6, stats: [{ day: '2026-11-16', daily: 2 }, { day: '2026-11-19', daily: 3 }, { day: '2026-11-30', daily: 9 }] }`, gives `{ week: { first: '2026-11-16', last: '2026-11-22', total: 6, days: [2,0,0,3,0,0,0] } }`.
  - `visitSummary` with body `null`, `{}` or `{ error: 'x' }` gives `null`.
  - Email:
    - `visits.week` renders `Kto czytał`, `Tydzień 16–22 lis: 6 odwiedzających` and `pn 2 · wt 0 · śr 0 · czw 3 · pt 0 · sob 0 · nd 0`;
    - `visits.month = { year: 2026, month: 11, total: 23 }` renders `Listopad 2026: 23 odwiedzających`;
    - no `visits` means no `Kto czytał`;
    - a week spanning two months shows `Tydzień 28 wrz – 4 paź: …`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Warsaw midnight → UTC with `Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', … })` offset lookup. No `URL`.
  - The email block uses inline styles like the existing mail: 13px Arial, colour `#5b5750`.
- [ ] **Step 4: Full suite.** Expected: PASS. **Commit:** `Summarise weekly and monthly visitors for the morning mail.`

### Task 3: Visit stats in `PPAI · publish`

**Files:**
- Modify: `n8n/workflows/publish.workflow.js`, `tests/publish.test.js`

**Interfaces:**
- Consumes: `visitRanges`, `visitSummary`, `renderEmailHtml({ visits })` (Task 2).
- Produces these nodes:
  - Code node `Visit ranges`. It returns one item per range from `visitRanges($('Publish request').first().json.edition.date)`, or one item `{ none: true }` when there are no ranges.
  - If node `Visit stats today?` on `{{ !$json.none }}`.
  - HTTP node `GoatCounter stats`:
    - GET `={{ $json.url }}`;
    - Header Auth credential `GoatCounter`;
    - full response, `neverError`, JSON, timeout 10000;
    - `onError: continueRegularOutput`.
  - `Build morning mail` reads both lists inside `try`/`catch` (empty on error): ranges from `$('Visit ranges').all()` and bodies from `$('GoatCounter stats').all()`, keeping only `statusCode === 200`. It passes `visitSummary(...)` as `visits`.
  - Wiring: `Read feedback settings → Visit ranges → Visit stats today?`. The true branch goes to `GoatCounter stats → Build morning mail` and the false branch to `Build morning mail`. Then `Build morning mail → Send morning mail` runs once.

- [ ] **Step 1: Failing tests** in `publish.test.js`, using `runCodeNode`:
  - `Visit ranges` for edition date `2026-11-23` gives 1 item with a `url`, and for `2026-11-24` gives `[{ none: true }]`.
  - `Build morning mail` with `Visit ranges` = the Monday item and `GoatCounter stats` = `[{ statusCode: 200, body: { total: 6, stats: [] } }]` produces HTML containing `Kto czytał`.
  - With `GoatCounter stats` = `[{ statusCode: 401, body: {} }]`, the HTML contains no `Kto czytał`, and `to` and `subject` are still set.
  - With no `GoatCounter stats` node data (false branch), the same holds.
  - The existing tests stay green.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** If the SDK cannot express two inputs into one node, rule on the smallest wiring that runs `Build morning mail` exactly once per publish, and ledger it.
- [ ] **Step 4: Full suite.** Expected: PASS. **Commit:** `Add the weekly visitor summary to the morning mail.`

### Task 4: Review, deploy and ship

- [ ] **Step 1:** Fresh whole-branch reviewer; fix important findings test-first.
- [ ] **Step 2: Owner actions.** Give these steps in chat, never in a file:
  - In GoatCounter Settings, set the time zone to Europe/Warsaw.
  - Create an API key under user menu → API, with permission to read statistics only.
  - In n8n, create the credential: Credentials → New → Header Auth, named `GoatCounter`, with header `Authorization` and value `Bearer <key>`.
  - Wait for the owner to confirm.
- [ ] **Step 3: Update `PPAI · publish`.**
  - Add the three nodes and the connections, set the new `Build morning mail` code, and bind the `GoatCounter` credential (its id comes from `list_credentials`).
  - Validate.
  - Check `Build morning mail` with `test_workflow` and pin data for a Monday date. Expected: the HTML has `Kto czytał`; no real mail is sent and nothing is committed.
- [ ] **Step 4: Ask the owner for one consent** covering both the push of `main` and the republish of `PPAI · publish`. Then:
  - wait for the Pages deploy;
  - open the live site once from the in-app browser;
  - confirm a `/count` request was sent; the owner sees it in the GoatCounter dashboard.
