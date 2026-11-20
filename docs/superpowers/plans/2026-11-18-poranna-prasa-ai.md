# Poranna prasa AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every morning, one n8n Cloud run gathers AI news and numbers, has Claude write a ~15-minute Polish "morning paper", publishes it as JSON to a static newspaper site on GitHub Pages, and sends a Gmail teaser, without ever overspending the Claude API.

**Architecture:**
- The deterministic logic lives in dependency-free JS modules under `n8n/lib/`: budget gate, cost, moves, dedupe, edition rules, parsers and e-mail HTML. They are unit-tested locally with `node --test` and inlined into n8n Code nodes with `scripts/inline-lib.mjs`.
- n8n holds seven workflows (`PPAI · …`). Every Claude call goes through one sub-workflow, `PPAI · claude`, which owns accounting and error handling.
- The site is a no-build static page in `site/` that renders `site/data/*.json`. n8n writes only those JSON files, through the GitHub API.

**Tech Stack:** n8n Cloud (workflow SDK via the n8n MCP tools, Data Tables, HTTP Request, RSS, GitHub, Gmail, Code nodes), Anthropic Messages API over raw HTTP (`claude-haiku-5-5`, `claude-sonnet-5-5`), vanilla HTML/CSS/JS, portable Node.js v26.13.1 LTS and portable MinGit 2.56.1 inside the project (`.tools/`), zero npm dependencies, GitHub Pages via Actions.

**Spec:** `docs/specs/2026-11-18-ai-news-digest-design.md` (Polish). Executors read the spec and this plan together.

## Global Constraints

- **GitHub:** repo `mChoczay/ai-prasa` (public, `main`), site URL `https://mchoczay.github.io/ai-prasa/`. Wherever this plan says `{{GH_OWNER}}`/`{{GH_REPO}}`, use these values. n8n credentials (all ready 2026-11-18): `Anthropic account 2`, `GitHub account`, `Gmail account`.
- **Execution limit (found 2026-11-19):** the instance caps one execution at **180 s**. The pipeline is therefore a **relay**: `PPAI · daily` (gate + numbers + news, ~2 min) hands its result to the next stage through an Execute Workflow node with `waitForSubWorkflow: false`, and every stage does the same (select & fetch → write → profiles & period → publish). Each stage is its own execution under 180 s and has `PPAI · errors` as its error workflow. Long waits/loops inside one execution are not allowed.
  - **As built (2026-11-19):** `daily` (gate, numbers, news, ~75 s) → `select` (Sonnet picks, pages fetched, ~10 s) → `write` (Sonnet: stories + rumors, ~65 s) → `front` (Sonnet: greeting, lead, rubrics, "Dlaczego?", closing; edition assembled and checked, ~35 s) → `period` (Sundays and the 1st only) → `profiles` (≤ 10 cards via Wikipedia search + Haiku, spotlight) → `publish` (one Git Data API commit, mail, history rows). Writing is split in two calls because one long Sonnet call would not fit in 180 s.
  - Every stage passes one JSON payload (Execute Workflow Trigger in passthrough mode). `relay: true` hands it on; `stop_after: '<stage>'` ends the relay at that stage for tests.
  - The n8n Code sandbox has no `URL`, `URLSearchParams` or `structuredClone`; the node tests run without them. Code nodes get only the library functions they reach (`scripts/inline-lib.mjs`).
  - Claude calls whose failure may be skipped (profiles, supplements) continue on error, but a `CREDITS:`/`AUTH:` stop still ends the stage so the pause mail goes out.
- **Commits (owner's rule):** the owner is the author (repo-local `user.name`/`user.email`, GitHub noreply address). The subject is one short, simple sentence and the body a brief summary of the changes. The `feat: …` messages in the tasks below only suggest the content; rewrite them in this style.
- **Isolation and supply chain (owner's rule):**
  - Nothing is installed globally: no winget, no global npm, no PATH or registry changes, no system settings.
  - Tools live in `<project>/.tools/` (gitignored) and are put on PATH only for the current shell by `. .\scripts\env.ps1`. Git is the owner's own system install (2.56.1, verified 2026-11-18), so MinGit is not downloaded.
  - Every download needs the owner's explicit OK (file name, source, size) and goes into its own empty folder under `.tools/_downloads/`. Before unpacking, verify:
    1. the SHA-256 against the vendor's published checksum (Node: `https://nodejs.org/dist/<ver>/SHASUMS256.txt`; Git for Windows: the release notes table);
    2. after unpacking, `Get-AuthenticodeSignature` on `node.exe` / `git.exe` must be `Valid`, with the signer subject naming the OpenJS Foundation or Johannes Schindelin respectively.

    Any mismatch → delete the files and stop.
  - Before adopting any version, check it against security advisories (the vendor's security page plus `https://osv.dev`) and record the check in `docs/security-log.md`.
  - Zero npm dependencies: tests use `node:test`/`node:assert`, the local server is `scripts/serve.mjs` on `node:http`, and the schema check is a small validator in `tests/helpers/`. Adding any dependency is a plan change that needs the owner's OK and an advisory check.
  - GitHub Actions are pinned to full commit SHAs, not tags.
  - The Anthropic key is short-lived (owner sets a 7-day lifetime). Expiry must stop the pipeline cleanly with a clear mail, never loop.
- n8n instance: the owner's n8n Cloud instance, reached through the connected n8n MCP server. Its address stays out of the repo (public). Workflow names start with `PPAI · `. Data Tables use the exact names in Task 10. Workflow timezone: `Europe/Warsaw`.
- Before creating or changing anything in n8n, call `get_user_preferences` and apply what it returns. Before the first workflow, read `get_workflow_sdk_reference` and `get_workflow_best_practices`. Validate every workflow with `validate_workflow` before `create_workflow_from_code` / `update_workflow`.
- Claude over HTTP only: `POST https://api.anthropic.com/v1/messages`, headers `anthropic-version: 2026-10-21` and `content-type: application/json`, auth through the n8n credential `Anthropic account 2` (predefined type `anthropicApi`, the owner's dedicated short-lived key; look up its id with `list_credentials`). Do not use the older `Anthropic account` credential.
  - Never send `temperature`, `top_p`, `top_k` or `budget_tokens`.
  - Structured output goes through `output_config: {format: {type: "json_schema", schema}}`.
  - Effort goes in `output_config.effort`.
- Models: `claude-haiku-5-5` for filtering and profiles, `claude-sonnet-5-5` for selection and writing. No Opus.
- Prices used for accounting (USD per 1M tokens): Haiku 5.5 input 0.10 / output 0.50 (prompt > 100K tokens: 0.50 / 2.50); Sonnet 5.5 input 2.00 / output 10.00 / cache read 0.10. Cache write is billed at 1.25× input. Re-check these on the Anthropic pricing page in Task 2 Step 1.
- Budget: `monthly_budget_usd = 15`. Pre-run reserve is $0.50: a run starts only if spent + 0.50 ≤ budget (Claude's call, stricter than the spec).
  - Brave: at most 2 queries per run, monthly limit 60 until the real pool is known.
  - Firecrawl: monthly limit 300. It is used only when plain fetching yields < 500 characters of text.
- Error classes:
  - Credit error (HTTP 402, or HTTP 400 whose body contains `credit balance is too low`, case-insensitive) → no retry, pause with reason `credits`.
  - Auth error (HTTP 401 or 403, e.g. expired key) → no retry, pause with reason `auth`.
  - HTTP 429/500–599/529 → at most 2 retries (30 s, then 120 s).
  - Anything else → fail the step.
- Thresholds: big market move = |change_1d| ≥ 3 or |change_7d| ≥ 8 (percent). Ranking move = shift ≥ 2 positions within top 20, or entering/leaving the top 20. Follow-up window is 5 days.
- Limits: 5–7 stories per daily edition (fewer on a quiet day, never padded); max 10 new or refreshed profiles per day; profiles refresh after 90 days; spotlight does not repeat an entity within 60 days.
- Enums (exact strings):
  - category: `modele`, `gielda`, `inwestycje`, `rankingi`, `narzedzia`, `regulacje`, `przecieki`, `inne`;
  - status: `potwierdzone`, `plotka`, `opinia`;
  - why_type: `fakt`, `hipoteza`, `brak`;
  - pause reason: `budget`, `credits`, `auth`, `manual`.
- Fixed copy:
  - Market disclaimer: `To nie jest porada inwestycyjna.`
  - Daily mail subject: `Poranna prasa AI: <tytuł czołówki>`.
  - Error mail subject: `Poranna prasa AI: błąd w kroku <krok>`.
  - Credits-pause mail subject: `Poranna prasa AI: wstrzymane – brak kredytów API`.
  - Auth-pause mail subject: `Poranna prasa AI: wstrzymane – klucz API nieważny`.
  - Missing-data label: `dane niedostępne`.
  - Button: `Czytaj wydanie`.
- Schedule: daily 05:30 Europe/Warsaw. Sunday adds `weekly`, the 1st of the month adds `monthly` (both can happen on the same day).
- The GitHub repo is **public**: no secrets, keys or the owner's e-mail address in any committed file. Recipient and site URL live only in the n8n `config` Set node.
- All site and e-mail text rendered from data goes through `escapeHtml`.

## Review Focus

1. **Quiet news day** (fewer than 5 usable candidates). Expected: the edition publishes with fewer stories, `quiet_day: true` and no padding, and nothing errors. Test: Task 5 `checkEditionRules` quiet case, Task 18 Step 5.
2. **One data source down or changed** (Stooq, AA, LMArena or HF returns an error or an unexpected shape). Expected: that rubric shows `dane niedostępne` and the edition still publishes. Test: Task 11 parser "malformed input returns null", Task 14 Step 4.
3. **Weekend or holiday with no new trading day.** Expected: no repeated or fake 0% moves, and the market table shows the date of the last close. Test: Task 3 `findBigMoves` stale-trade-date case, Task 7 market render shows `last_trade_date`.
4. **Claude output cut off or refused** (`stop_reason` `max_tokens` / `refusal`). Expected: broken JSON is never published, the step retries once with the same input, then sends an error mail. Test: Task 2 `assessResponse`, Task 12 Step 5.
5. **Same-day re-run** (manual rerun after a failure). Expected: the day's JSON is overwritten, `index.json` has no duplicate date, and `topics_history`/`impact_tags` rows for that date are replaced, not doubled. Test: Task 5 `upsertIndex`, Task 18 Step 6.

---

## File Structure

```
ai-news-tiktok/                      (git repo, pushed to public GitHub repo {{GH_REPO}})
  package.json                       type: module; scripts.test = "node --test"
  .github/workflows/pages.yml        deploy site/ to GitHub Pages on push to main
  scripts/inline-lib.mjs             prints lib files with export lines stripped (for Code nodes)
  n8n/lib/budget.js                  costUsd, checkGate, classifyApiError, assessResponse, extractJsonText
  n8n/lib/dates.js                   editionDate, editionFlags, monthKey, daysBetween
  n8n/lib/moves.js                   computeChanges, findBigMoves, diffLeaderboard, findFollowUps
  n8n/lib/news.js                    normalizeUrl, dedupeCandidates, extractArticleText, entityId
  n8n/lib/edition.js                 resolveEntity, checkEditionRules, collectNewEntities, pickSpotlight, readingMinutes, upsertIndex
  n8n/lib/parsers.js                 parseStooqCsv, parseAaModels, parseLmarena, parseHfTrending
  n8n/lib/email.js                   renderEmailHtml, renderErrorEmail, escapeHtml (copy of site helper)
  n8n/workflows/*.workflow.js        workflow SDK sources, one per n8n workflow (source of truth)
  schemas/*.schema.json              Claude structured-output schemas
  prompts/*.md                       system prompts, inlined into workflows
  site/index.html, site/styles.css, site/js/render.js, site/js/app.js
  site/data/                         sample data in repo; n8n overwrites/adds at runtime
  tests/*.test.js, tests/fixtures/   unit tests and fixtures
  docs/sources.md                    verified endpoints for market/rankings/credits
```

---

### Task 0: Isolated tooling and repository

**Files:**
- Create: `.gitignore` (`.tools/`, `node_modules/`), `package.json`, `tests/smoke.test.js`, `docs/security-log.md`, `scripts/env.ps1`

**Interfaces:**
- Produces:
  - `. .\scripts\env.ps1` prepends `.tools\node` and `.tools\git\cmd` to PATH for the current shell only;
  - `node --test` runs every `tests/**/*.test.js`.

Versions (checked 2026-11-18):
- Node **v26.13.1** LTS "Lithium", security release of 2026-11-10: `node-v26.13.1-win-x64.zip`, 41,166,246 bytes, SHA-256 `e2edda75bfb089654705cf65a13b58933bfd5f57148e8ebda916f58a2474f1f7`.
- MinGit **2.56.1** (release 2026-11-10): `MinGit-2.56.1-64-bit.zip`, 39,849,768 bytes, SHA-256 `4a92850b6e917da4fd010669b614b55dccf5b0ec333a534cc4be4700dfefdafd`.

If either version is no longer the newest security release when this runs, re-check and record the newer one.

- [ ] **Step 1: Advisory check.** Look up both versions on the vendor security pages (`https://nodejs.org/en/blog/vulnerability`, Git for Windows release notes / GitHub security advisories) and on `https://osv.dev`. Record the result in `docs/security-log.md` (date, version, source, verdict).
- [ ] **Step 2: Owner approval for the two downloads** (names, sources, sizes as above). Skip MinGit if the owner points to an existing Git (`git.exe` path); in that case still check its version and signature.
- [ ] **Step 3: Download** each file into its own empty folder `.tools/_downloads/node/` and `.tools/_downloads/git/` (`Invoke-WebRequest -OutFile`).
- [ ] **Step 4: Verify the hashes.** `(Get-FileHash <zip> -Algorithm SHA256).Hash` must equal the checksum above, compared case-insensitively. On a mismatch, delete the folder and stop.
- [ ] **Step 5: Unpack** with `Expand-Archive` to `.tools/node/` (flatten the `node-v26.13.1-win-x64` folder) and `.tools/git/`.
- [ ] **Step 6: Verify the signatures.** `Get-AuthenticodeSignature .tools\node\node.exe` must have status `Valid` with a signer subject containing `OpenJS Foundation`. `.tools\git\cmd\git.exe` must be `Valid` with a subject containing `Johannes Schindelin`. Record both in the security log. On anything else, delete the files and stop.
- [ ] **Step 7: Write `scripts/env.ps1`** (session-only PATH prepend, prints `node --version` and `git --version`). Run it. Expected: `v26.13.1` and `git version 2.56.1.windows.1`.
- [ ] **Step 8: Create `package.json`** with name `poranna-prasa-ai`, `"type": "module"`, `"private": true`, `scripts.test: "node --test"` and **no dependencies**. Create `tests/smoke.test.js` asserting `1 + 1 === 2`. Run `node --test`. Expected: 1 passing test.
- [ ] **Step 9: Init the repo** with a local identity (repo-only config), then commit. Keep the e-mail address off the public repo:

```bash
git init -b main
```
```bash
git config user.name "PPAI builder"
```
```bash
git config user.email "ppai-builder@users.noreply.github.com"
```
```bash
git add -A
```
```bash
git commit -m "chore: project skeleton with node test runner"
```

### Task 1: Owner setup (human steps, tracked)

**Interfaces:**
- Produces: n8n credentials of type `gmailOAuth2` and `githubApi`; a public GitHub repo `{{GH_OWNER}}/{{GH_REPO}}` (proposed name `poranna-prasa-ai`); a new Anthropic API key in its own Console workspace with auto-reload off and a workspace spend limit (e.g. $20), replacing the key in the `Anthropic account` credential.

- [ ] **Step 1: Give the owner this checklist** in Polish and wait:
  1. Console: turn off auto-reload, create workspace `n8n`, create a key there, set the spend limit, paste the key into the n8n credential `Anthropic account`.
  2. GitHub: create an account if needed and an empty **public** repo; tell Claude the login and repo name.
  3. n8n: add a GitHub credential (token with `contents: write` on that repo only) and a Gmail OAuth2 credential.

- [ ] **Step 2: Verify** with `list_credentials` (type filters `githubApi`, `gmailOAuth2`). Expected: one of each. Record their ids and the owner/repo names in your notes for Tasks 17–18, but not in committed files.

### Task 2: Budget and Claude-response logic

**Files:**
- Create: `n8n/lib/budget.js`, `tests/budget.test.js`

**Interfaces:**
- Consumes: nothing. The caller computes `currentMonth` with Task 3's `monthKey` and passes it in.
- Produces:
  - `costUsd(model: string, usage: {input_tokens, output_tokens, cache_creation_input_tokens?, cache_read_input_tokens?}) -> number` (rounded to 6 decimals; unknown model throws);
  - `checkGate({state, ledger, currentMonth, reserveUsd = 0.5}) -> {run: boolean, reason: null|'paused_credits'|'paused_auth'|'paused_manual'|'budget', statePatch: object|null, claudeSpentUsd: number, braveAllowed: boolean, firecrawlAllowed: boolean}`. `state` = `pipeline_state` row; `ledger` = `cost_ledger` rows with `month` field;
  - `classifyApiError(status: number, bodyText: string) -> 'credits'|'auth'|'transient'|'fatal'`;
  - `assessResponse(json) -> {ok: true, data: any} | {ok: false, kind: 'truncated'|'refusal'|'bad_json'}`, which parses the concatenated `text` blocks of `content` as JSON and ignores `thinking` blocks;
  - `extractJsonText(json) -> string`.

- [ ] **Step 1: Re-check prices** on the Anthropic pricing page. If they differ from Global Constraints, update both the constraints and the constants below.

- [ ] **Step 2: Write the failing tests** in `tests/budget.test.js`:

```js
test('costUsd sonnet', () => assert.equal(costUsd('claude-sonnet-5-5', {input_tokens: 1_000_000, output_tokens: 100_000}), 3));
test('costUsd haiku long prompt tier', () => assert.equal(costUsd('claude-haiku-5-5', {input_tokens: 200_000, output_tokens: 0}), 0.1));
test('costUsd cache read and write', () => assert.equal(costUsd('claude-sonnet-5-5', {input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000}), 2.6));
test('gate blocks when reserve would exceed budget', () => {
  const r = checkGate({state: {paused:false, monthly_budget_usd:15, monthly_search_limit:60, monthly_firecrawl_limit:300, updated_at:'2026-11-01T05:30:00Z'}, ledger: [{month:'2026-11', service:'claude', cost_usd:14.6}], currentMonth:'2026-11'});
  assert.deepEqual([r.run, r.reason, r.statePatch], [false, 'budget', {paused:true, paused_reason:'budget'}]);
});
test('gate auto-unpauses budget pause in a new month', () => { /* paused budget, updated_at 2026-10-31, currentMonth 2026-11, empty ledger */ /* expect run true, statePatch {paused:false, paused_reason:null} */ });
test('gate never auto-unpauses credits pause', () => { /* paused credits, new month → run false, reason 'paused_credits', statePatch null */ });
test('gate never auto-unpauses auth pause', () => { /* paused auth → run false, reason 'paused_auth', statePatch null */ });
test('gate counts only current month and only claude for budget', () => { /* 2026-10 claude 99 + 2026-11 brave rows → run true */ });
test('gate disables brave at limit but still runs', () => { /* 60 brave calls → run true, braveAllowed false, firecrawlAllowed true */ });
test('classifyApiError', () => {
  assert.equal(classifyApiError(400, '{"error":{"message":"Your credit balance is too low to access the Anthropic API"}}'), 'credits');
  assert.equal(classifyApiError(402, '{}'), 'credits');
  assert.equal(classifyApiError(401, '{"error":{"type":"authentication_error"}}'), 'auth');
  assert.equal(classifyApiError(403, ''), 'auth');
  for (const s of [429, 500, 529]) assert.equal(classifyApiError(s, ''), 'transient');
  assert.equal(classifyApiError(400, '{"error":{"message":"bad schema"}}'), 'fatal');
});
test('assessResponse ok skips thinking', () => { /* content [{type:'thinking',thinking:''},{type:'text',text:'{"a":1}'}], stop_reason end_turn → {ok:true,data:{a:1}} */ });
test('assessResponse truncated / refusal / bad_json', () => { /* stop_reason max_tokens → truncated; refusal → refusal; text 'nope' → bad_json */ });
```
Fill in the commented bodies with literal objects as described in each comment.

- [ ] **Step 3: Run** `node --test` (after `. .\scripts\env.ps1`, as for every test run in this plan). Expected: FAIL (module not found).

- [ ] **Step 4: Implement `n8n/lib/budget.js`** with the signatures above. Prices are a frozen object keyed by model id. Ledger rows with `service !== 'claude'` count as calls (`calls` field, default 1) toward Brave/Firecrawl limits. End the file with a single `export { … }` line, which inlining relies on.

- [ ] **Step 5: Run** `node --test`. Expected: PASS.

- [ ] **Step 6: Commit** `feat: budget gate, cost accounting and Claude response checks`.

### Task 3: Dates

**Files:**
- Create: `n8n/lib/dates.js`, `tests/dates.test.js`

**Interfaces:**
- Produces:
  - `editionDate(now: Date, tz = 'Europe/Warsaw') -> 'YYYY-MM-DD'`;
  - `monthKey(dateOrIso, tz = 'Europe/Warsaw') -> 'YYYY-MM'`;
  - `editionFlags(dateStr) -> {weekly: boolean, monthly: boolean}` (weekly = Sunday, monthly = day 1);
  - `daysBetween(a: 'YYYY-MM-DD', b: 'YYYY-MM-DD') -> integer` (b − a).

- [ ] **Step 1: Write failing tests:**
  - `editionDate(new Date('2026-11-18T23:30:00Z'))` → `'2026-11-19'` (Warsaw is UTC+1);
  - `editionDate(new Date('2026-03-29T00:30:00Z'))` → `'2026-03-29'`;
  - `editionFlags('2026-11-22')` → `{weekly:true, monthly:false}`;
  - `editionFlags('2026-11-01')` → `{weekly:true, monthly:true}`;
  - `editionFlags('2026-12-01')` → `{weekly:false, monthly:true}`;
  - `daysBetween('2026-11-28','2026-12-03')` → `5`;
  - `monthKey('2026-10-31T23:30:00Z')` → `'2026-11'`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** with `Intl.DateTimeFormat('en-CA', {timeZone: tz})` parts (no libraries). `daysBetween` uses UTC midnight of both dates.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat: Warsaw-time edition dates and flags`.

### Task 4: News helpers

**Files:**
- Create: `n8n/lib/news.js`, `tests/news.test.js`

**Interfaces:**
- Produces:
  - `normalizeUrl(url) -> string`: lowercase host, strip `www.`, `utm_*`, `ref`, `fbclid`, hash and trailing slash;
  - `dedupeCandidates(items: {title, url, source, published_at}[]) -> items[]`: keeps the first by normalized URL, then by normalized title (lowercase, no diacritics, no punctuation, collapsed spaces);
  - `extractArticleText(html: string, maxChars = 12000) -> string`: drops `script/style/nav/header/footer/aside`, strips tags, decodes `&amp; &lt; &gt; &quot; &#39; &nbsp;`, collapses whitespace;
  - `entityId(name) -> string`: lowercase, diacritics removed, non-alphanumerics → `-`, trimmed `-`.

- [ ] **Step 1: Write failing tests:**
  - `normalizeUrl('https://www.Example.com/a/?utm_source=x&id=2#top')` → `'https://example.com/a?id=2'`;
  - dedupe keeps 2 of 3 items, where one duplicates by URL with utm and one by title differing only in case and punctuation;
  - `extractArticleText('<html><script>x()</script><nav>menu</nav><p>Ala &amp; kot</p></html>')` → `'Ala & kot'`;
  - `extractArticleText` truncates to `maxChars`;
  - `entityId('Mistral AI')` → `'mistral-ai'`;
  - `entityId('Żabka Łódź 2.0')` → `'zabka-lodz-2-0'`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** using `URL`, `String.prototype.normalize('NFD')` plus combining-mark removal, with an explicit `ł→l` map.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat: news dedupe, article text extraction, entity ids`.

### Task 5: Edition rules

**Files:**
- Create: `n8n/lib/edition.js`, `tests/edition.test.js`, `tests/fixtures/edition.sample.json` (a full valid daily edition, 5 stories, Polish placeholder text, weekly/monthly null)

**Interfaces:**
- Consumes: `entityId` (inline the same function or import from `news.js`; Code nodes get both files inlined).
- Produces:
  - `resolveEntity(name, profiles) -> id|null`: case-insensitive match on `id`, `name` or any of `aliases` (comma-separated string);
  - `checkEditionRules(edition, profiles) -> {edition, errors: string[], newEntityNames: string[]}`, which returns a cleaned copy:
    - drops stories/rumors with zero sources (error message `story without sources: <title>`) and stories with status outside the enum;
    - maps `may_affect_names` to `may_affect` ids through `resolveEntity`, collecting unresolved names in `newEntityNames` (deduped);
    - sets `quiet_day = true` when fewer than 5 stories (lead plus others) remain;
    - adds `disclaimer: 'To nie jest porada inwestycyjna.'` to every story with category `gielda` or `inwestycje` and to `market`;
  - `collectNewEntities({newEntityNames, watchlist, leaderboardTop, profiles, today, maxPerDay = 10}) -> {id, name, type, reason: 'new'|'stale'}[]`, ordered: watchlist without a profile, then today's names, then leaderboard top-20 without a profile, then profiles with `updated_at` > 90 days; capped at `maxPerDay`;
  - `pickSpotlight({profiles, todaysEntityIds, today}) -> {company_id: string|null, model_id: string|null}`: for each type (`company`, `model`), prefer today's entities whose `last_spotlight_at` is null or > 60 days ago, else the profile with the oldest `last_spotlight_at` (null first), else null;
  - `readingMinutes(edition) -> integer`: all prose words / 200, rounded up;
  - `upsertIndex(index: {editions: {date, kind, lead_title, minutes, categories: string[]}[]}, entry) -> index`: replaces the entry with the same `date`, sorts descending by date.

- [ ] **Step 1: Write failing tests** (load the fixture with `JSON.parse(readFileSync(...))`):
  - a story with `sources: []` is dropped and an error is reported;
  - a `gielda` story gets the exact disclaimer;
  - `may_affect_names: ['Nvidia','Nowa Firma']` with profiles `[{id:'nvda', name:'NVIDIA', aliases:'Nvidia,NVDA'}]` → `may_affect ['nvda']`, `newEntityNames ['Nowa Firma']`;
  - **quiet day**: a fixture trimmed to lead + 2 stories → `quiet_day true`, no errors;
  - `collectNewEntities` cap respected and order as specified;
  - `pickSpotlight`: today's entity spotlighted 10 days ago is skipped in favor of one never spotlighted, and the 60-day rule holds;
  - `readingMinutes` of 3000 words → 15;
  - **re-run**: `upsertIndex` twice with the same date → one entry with the second `lead_title`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** with the signatures above. Pure functions only; inputs are never mutated.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat: edition cleanup rules, spotlight, entities, index upsert`.

### Task 6: Schemas and prompts

**Files:**
- Create: `schemas/filter.schema.json`, `schemas/select.schema.json`, `schemas/edition.schema.json`, `schemas/period.schema.json`, `schemas/profile.schema.json`, `tests/schemas.test.js`
- Create: `prompts/filter.md`, `prompts/select.md`, `prompts/write.md`, `prompts/period.md`, `prompts/profile.md`

**Interfaces:**
- Produces: schemas used as `output_config.format.schema` in Task 16. Their shapes:
  - `filter`: `{items: [{idx: integer, category, importance: integer 1–5, keep: boolean}]}`;
  - `select`: `{lead_idx: integer, story_idx: integer[], rumor_idx: integer[], extra_queries: string[] (max 2)}`;
  - `edition`: exactly the shape of spec section 9, where stories carry `may_affect_names: string[]` instead of `may_affect`; nullable fields use `["string","null"]`;
  - `period`: `{title, body, takeaways: string[3], race_map: [{area, leader, note}]}`;
  - `profile`: `{type: 'company'|'model'|'org', name, owner, summary, key_products: string[], why_it_matters, aliases: string[]}`.

- [ ] **Step 1: Write failing tests** in `tests/schemas.test.js`:
  - every schema parses as JSON and uses only the keywords `type, properties, required, additionalProperties, items, enum, minItems, maxItems, minimum, maximum, description` (no external validator; write `tests/helpers/mini-validate.js` supporting exactly these keywords, with its own tests for each keyword);
  - every object node has `additionalProperties: false` and `required` equal to all its property keys (walk recursively);
  - `tests/fixtures/edition.sample.json` (with `may_affect` renamed to `may_affect_names`) validates against `edition.schema.json`;
  - enums for category/status/why_type equal the Global Constraints lists exactly.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Write the schemas.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Write the prompts** (Polish output, English instructions are fine). Each prompt must contain the rules from its spec section:
  - `filter.md`: the category enum, importance meaning, and to keep ~15 candidates useful to an AI developer;
  - `select.md`: 5–7 stories plus a lead, category variety, rumors separately, never padding on a quiet day, and reusing history only as an update with new facts;
  - `write.md`, all of spec sections 7 and 7a:
    - narrator voice, second person, warm and factual, no exclamation marks or clickbait;
    - word counts (greeting 3–4 sentences, lead 500–700, other stories 250–400, Poznaj 80–120, closing 1–2 sentences);
    - the status rules and the rumor rule (≥2 credible sources or a person from `trusted_leakers`);
    - numbers only from the provided sources or data;
    - the "Dlaczego?" fact/hypothesis/none rule, and market-wide moves described as the market;
    - "may affect" without a direction, follow-ups worded as reminders, not forecasts;
    - the disclaimer;
  - `period.md`: weekly 800–1200 words and monthly 1200–1500, built only from the supplied history and snapshots;
  - `profile.md`: 2–4 sentences, only facts from the supplied Wikipedia or official text, and `aliases` (including the ticker).
- [ ] **Step 6: Commit** `feat: structured-output schemas and system prompts`.

### Task 7: Site rendering

**Files:**
- Create: `site/js/render.js`, `tests/render.test.js`

**Interfaces:**
- Consumes: edition JSON (spec section 9, `may_affect` ids), `profiles.json` = `{profiles: [{id, type, name, summary, owner, key_products, why_it_matters, updated_at}]}`, and `index.json` from Task 5's `upsertIndex`.
- Produces (pure, return HTML strings):
  - `escapeHtml(s)`;
  - `renderEdition(edition, profilesById) -> string`;
  - `renderMarket(market) -> string`;
  - `renderRankings(rankings) -> string`;
  - `renderArchive(index, {category = null}) -> string`;
  - `renderProfileCard(profile) -> string`;
  - `entityChip(id, profilesById) -> string`: `<button class="entity" data-entity="id">Name</button>`, or plain escaped text when the profile is unknown.

- [ ] **Step 1: Write failing tests** (import the ES module directly in node):
  - `renderEdition(sample)` contains the masthead `Poranna prasa AI`, the lead title, every story title, badges `potwierdzone`/`plotka` with classes `status-potwierdzone`/`status-plotka`, `Może dotyczyć` chips, `Dlaczego?` lines with a `why-hipoteza` class for hypotheses, the `Sprawdzamy` block when `follow_ups` is non-empty, the `Poznaj` block, and the reading time;
  - a story title `<img src=x onerror=alert(1)>` is escaped;
  - `renderMarket` shows `+2,10%`/`−3,20%` (Polish decimal comma, U+2212 minus) with `up`/`down` classes, `last_trade_date`, and the disclaimer;
  - `renderMarket(null)` and a `renderRankings` section with `null` lists output `dane niedostępne`;
  - `renderArchive` with category `modele` lists only editions whose `categories` include it.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Template literals, no framework, no innerHTML of unescaped data.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat: newspaper renderers`.

### Task 8: Site shell, sample data, Pages deploy

**Files:**
- Create: `site/index.html`, `site/styles.css`, `site/js/app.js`, `site/data/index.json`, `site/data/2026-11-18.json` (copy of fixture), `site/data/profiles.json` (3 sample profiles), `.github/workflows/pages.yml`, `.claude/launch.json`

**Interfaces:**
- Consumes: Task 7 renderers.
- Produces: routes `#/` (latest edition), `#/YYYY-MM-DD` and `#/archiwum` (optional `?kat=<category>`). Clicking `.entity` opens a `<dialog>` with `renderProfileCard`.

- [ ] **Step 1: Write `app.js`**: fetch `data/index.json` and `data/profiles.json` (`cache: 'no-store'`), route on `hashchange`, render into `<main>`, and delegate clicks on `.entity`. When a fetch fails, show `Nie udało się wczytać wydania.` and a link to the archive.
- [ ] **Step 2: Write `styles.css`** to the mockup the owner approved:
  - masthead centered; body text `Georgia, 'Times New Roman', serif`; UI labels sans-serif;
  - two columns ≥ 760px (stories | market, rankings, rumors, Poznaj) and one column below that, with a 16px gutter;
  - light/dark tokens on `:root` plus `@media (prefers-color-scheme: dark)`;
  - status colors: potwierdzone green, plotka amber, opinia gray; `up` green, `down` red.
- [ ] **Step 3: Write `scripts/serve.mjs`.** It is a `node:http` static server for `site/`: bound to `127.0.0.1:8080`, `Cache-Control: no-store`, rejects paths that resolve outside `site/`, and sets MIME types for html/css/js/json/svg. Add a test in `tests/serve.test.js` asserting that `GET /../package.json` returns 403 and `GET /` returns 200. Add `.claude/launch.json` config `site` → runtimeExecutable `.tools/node/node.exe`, args `["scripts/serve.mjs"]`, port 8080. Start it with `preview_start` (name `site`).
- [ ] **Step 4: Verify in the browser pane:**
  - `#/` renders the sample edition, `#/archiwum?kat=modele` filters, and clicking a chip opens the profile;
  - at 375px width there is no horizontal scroll;
  - `read_console_messages` with `onlyErrors` returns none.
- [ ] **Step 5: Write `pages.yml`**: on push to `main` (paths `site/**`), deploy `site/` with `actions/configure-pages`, `actions/upload-pages-artifact` (path `site`) and `actions/deploy-pages`, each pinned to the full commit SHA of its latest release. Look up each SHA with `git ls-remote https://github.com/actions/<name> refs/tags/<tag>`, write the tag in a trailing comment, and check each release for advisories, recording in `docs/security-log.md`. Permissions: `pages: write`, `id-token: write`, `contents: read`; nothing else.
- [ ] **Step 6: Commit, add the remote, push:**

```bash
git add -A
```
```bash
git commit -m "feat: newspaper site shell, sample data, Pages deploy"
```
```bash
git remote add origin https://github.com/{{GH_OWNER}}/{{GH_REPO}}.git
```
```bash
git push -u origin main
```
Then ask the owner to set Settings → Pages → Source to **GitHub Actions**. Verify: `https://{{GH_OWNER}}.github.io/{{GH_REPO}}/` shows the sample edition (navigate in the browser pane).

### Task 9: E-mail HTML

**Files:**
- Create: `n8n/lib/email.js`, `tests/email.test.js`

**Interfaces:**
- Produces:
  - `renderEmailHtml(edition, siteUrl) -> {subject, html}`: the subject is exactly `Poranna prasa AI: ${lead_story.title}`; the html holds the greeting, a list of all story titles with status badges, and a button `Czytaj wydanie` linking to `${siteUrl}#/${date}`. Inline styles only, max width 600px, serif body;
  - `renderErrorEmail({step, message, kind}) -> {subject, html}`:
    - `kind === 'credits'` → subject `Poranna prasa AI: wstrzymane – brak kredytów API`, with a body explaining how to top up in the Console and set `pipeline_state.paused = false`;
    - `kind === 'auth'` → subject `Poranna prasa AI: wstrzymane – klucz API nieważny`, with a body explaining how to create a new key in the `n8n` Console workspace, paste it into the `Anthropic account` credential, and unpause;
    - otherwise the subject is `Poranna prasa AI: błąd w kroku ${step}`.
- [ ] **Step 1: Write failing tests:** exact subjects; the button href; an escaped title with `<script>`; Polish characters preserved in the subject.
- [ ] **Step 2: Run, expect FAIL. Step 3: Implement. Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat: morning and error e-mail templates`.

### Task 10: n8n Data Tables and seed data

**Interfaces:**
- Produces these tables (column: type):
  - `pipeline_state`: paused:boolean, paused_reason:string, monthly_budget_usd:number, monthly_search_limit:number, monthly_firecrawl_limit:number, updated_at:date. One row: false, '', 15, 60, 300, now.
  - `cost_ledger`: date:string, month:string, run_id:string, step:string, service:string, model:string, input_tokens:number, output_tokens:number, calls:number, cost_usd:number.
  - `topics_history`: date:string, title:string, summary:string, category:string, status:string, source_urls:string.
  - `market_watchlist`: ticker:string, stooq_symbol:string, name:string, active:boolean. Seed the 20 names from spec section 7. The Stooq symbols are filled in Task 11.
  - `market_snapshots`: date:string, ticker:string, close:number, change_1d:number, change_7d:number, change_30d:number, last_trade_date:string.
  - `leaderboard_snapshots`: date:string, board:string, rank:number, model:string, org:string, score:number.
  - `move_log`: date:string, entity_id:string, kind:string.
  - `impact_tags`: date:string, story_title:string, entity_id:string.
  - `trusted_leakers`: name:string, platform:string, note:string, active:boolean. Seed 5–10 entries you can justify from public track records; put a one-line justification in `note`.
  - `news_sources`: url:string, kind:string (`rss`/`reddit`/`hn`), label:string, active:boolean. Seed the feeds from spec section 8 step 2; verify each URL returns XML before adding it.
  - `entity_profiles`: id:string, type:string, name:string, aliases:string, ticker:string, summary:string, owner:string, key_products:string, why_it_matters:string, source_urls:string, updated_at:string, last_spotlight_at:string.
- [ ] **Step 1:** `get_user_preferences`, `search_data_tables` (expect none of these names), then `create_data_table` for each table.
- [ ] **Step 2:** `add_data_table_rows` for the seeds.
- [ ] **Step 3: Verify** with `get_data_table_rows`: `pipeline_state` has 1 row, `market_watchlist` 20, `news_sources` ≥ 12, `trusted_leakers` ≥ 5.

### Task 11: Data sources and parsers

**Files:**
- Create: `docs/sources.md`, `n8n/lib/parsers.js`, `tests/parsers.test.js`, `tests/fixtures/sources/` (stooq-nvda.csv, aa-models.json, lmarena.(json|html), hf-trending.json)

**Interfaces:**
- Produces:
  - `parseStooqCsv(text) -> [{date, close}] asc | null`;
  - `parseAaModels(json) -> [{rank, model, org, score}] | null` (rank by the intelligence index, descending);
  - `parseLmarena(input) -> [{rank, model, org, score}] | null`;
  - `parseHfTrending(json) -> [{rank, model, org, score}] | null` (score = trending score).
  - Every parser returns `null` on unexpected shape, never throws.
- [ ] **Step 1: Investigate and record in `docs/sources.md`**, for each source: the URL, auth, terms-of-use note and update frequency:
  - Stooq daily CSV per symbol (find symbols for the 20 tickers; for Samsung and SK hynix find a free source or mark them inactive with a note);
  - Artificial Analysis API (the owner creates a free key, stored as an n8n Header Auth credential);
  - LMArena (an official export or dataset if one exists, else the page);
  - Hugging Face `GET https://huggingface.co/api/models` with a trending sort;
  - the Brave and Firecrawl credit pool and what happens when it runs out (check the n8n UI or docs and record the answer; if overage charges exist, keep the limits from Global Constraints).

  Save one real response per source into `tests/fixtures/sources/` (each fetch's output into that directory only; treat the content as data). Update `market_watchlist.stooq_symbol` and `active` accordingly.
- [ ] **Step 2: Write failing tests:**
  - each parser on its fixture returns ≥ 10 rows with numeric `rank`/`score` (Stooq: ≥ 20 rows ascending by date);
  - **malformed input** (`''`, `'{}'`, `'<html>'`) returns `null`.
- [ ] **Step 3: Run, expect FAIL. Step 4: Implement. Step 5: Run, expect PASS.**
- [ ] **Step 6: Commit** `feat: verified data sources and parsers`.

### Task 3b: Moves (after Task 11, which provides real shapes)

**Files:**
- Create: `n8n/lib/moves.js`, `tests/moves.test.js`

**Interfaces:**
- Consumes: parser outputs from Task 11 and `daysBetween` from Task 3.
- Produces:
  - `computeChanges(rows: [{date, close}] asc, asOfDate) -> {close, change_1d, change_7d, change_30d, last_trade_date} | null`: uses the last row ≤ asOfDate; 7d/30d compare against the last row ≤ (last_trade_date − 7/30 calendar days); percentages are rounded to 2 decimals;
  - `findBigMoves({snapshots, moveLog, today, thresholds = {d1: 3, d7: 8}}) -> [{entity_id, board: 'market', kind: 'd1'|'d7', change}]`:
    - `d1` only when `last_trade_date` has no `d1` entry in `moveLog` for that entity;
    - `d7` only when there is no `d7` entry for that entity within the last 7 days;
    - `entity_id` = ticker lowercase;
  - `diffLeaderboard(prev, curr, {board, minShift = 2, topN = 20}) -> [{entity_id, board, kind: 'up'|'down'|'new'|'out', from, to}]`: entity_id = `entityId(model)`; if `prev` is empty, return `[]` (first day has no diff);
  - `findFollowUps({impactTags, moves, today, windowDays = 5}) -> [{entity_id, move, related_story, story_date}]`: one per move, using the latest tag with 1 ≤ daysBetween(tag.date, today) ≤ 5.
- [ ] **Step 1: Write failing tests:**
  - computeChanges on a 40-row fixture;
  - **weekend/stale**: snapshots with the same `last_trade_date` as a logged `d1` move → no repeated d1;
  - a d7 move reported 3 days ago is not repeated, but 8 days ago it is;
  - leaderboard up/down/new/out and shift-1 ignored;
  - empty prev → `[]`;
  - a follow-up at the 5-day boundary is included, one at 6 days is excluded, and a same-day tag is excluded.
- [ ] **Step 2: Run, expect FAIL. Step 3: Implement. Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat: market and leaderboard move detection with follow-ups`.

### Task 12: Inline helper and `PPAI · claude` sub-workflow

**Files:**
- Create: `scripts/inline-lib.mjs`, `tests/inline-lib.test.js`, `n8n/workflows/claude.workflow.js`

**Interfaces:**
- Consumes: `budget.js`, `dates.js`.
- Produces:
  - `node scripts/inline-lib.mjs n8n/lib/budget.js n8n/lib/dates.js` prints the files concatenated without `export`/`import` lines;
  - sub-workflow `PPAI · claude` (Execute Workflow Trigger). Input `{run_id, step, model, system, user, schema, effort, max_tokens}`; output `{ok: true, data, usage, cost_usd}` or an error thrown with the message prefix `CREDITS:` / `AUTH:` / `TRUNCATED:` / `REFUSAL:` / `FATAL:`.
- [ ] **Step 1: Test for inline-lib:** evaluating the printed code inside `new Function(code + '; return {costUsd, checkGate};')` returns callable functions. Run, FAIL, implement, PASS.
- [ ] **Step 2: Write `claude.workflow.js`** with the workflow SDK:
  - HTTP Request (Global Constraints headers, credential `Anthropic account`, timeout 600 s, never error, full response) with body `{model, max_tokens, system, messages: [{role: 'user', content: user}], output_config: {effort, format: {type: 'json_schema', schema}}}`;
  - a Code node (inlined `budget.js`) running `classifyApiError` / `assessResponse` / `costUsd`;
  - for `transient`: Wait 30 s then 120 s, at most 2 retries. For `truncated`/`refusal`/`bad_json`: one retry, then throw;
  - for `credits` / `auth`: update `pipeline_state` (`paused = true`, `paused_reason = 'credits'` / `'auth'`, `updated_at = now`) and throw `CREDITS: …` / `AUTH: …`;
  - before the first real call, check which headers the `anthropicApi` credential injects (a test call against `GET https://api.anthropic.com/v1/models` with the node's request echo/full response). If it forces its own `anthropic-version` that conflicts with `2026-10-21`, switch this node to a Header Auth credential named `Anthropic PPAI` (header `x-api-key`) and tell the owner;
  - on every HTTP response that carries `usage`, append a `cost_ledger` row (service `claude`, month via `monthKey`), including failed retries that billed tokens.
- [ ] **Step 3:** `validate_workflow`, then `create_workflow_from_code`.
- [ ] **Step 4: Test (spends < $0.01, so tell the owner first):** run `test_workflow` with model `claude-haiku-5-5`, schema `{type:'object', properties:{ok:{type:'boolean'}}, required:['ok'], additionalProperties:false}`, user `Return ok=true.`, effort `low`, max_tokens 1000. Expected: `data.ok === true`, `cost_usd > 0`, and one new `cost_ledger` row.
- [ ] **Step 5: Test the failure paths with pinned data** (`prepare_workflow_pin_data` on the HTTP node):
  - status 400 with a credit-balance body → `pipeline_state.paused` true, reason `credits`, error `CREDITS:`, and exactly 1 HTTP call;
  - status 401 → reason `auth`, error `AUTH:`, and exactly 1 HTTP call;
  - `stop_reason: 'max_tokens'` → 2 attempts, then `TRUNCATED:`.

  Afterwards reset `pipeline_state` to `paused=false`.
- [ ] **Step 6: Commit** `feat: PPAI claude sub-workflow with accounting and pause`.

### Task 13: `PPAI · errors`

**Files:**
- Create: `n8n/workflows/errors.workflow.js`

**Interfaces:**
- Consumes: `renderErrorEmail` (inlined), Gmail credential, `config` values (recipient).
- Produces: an Error Trigger workflow that mails `renderErrorEmail({step: lastNodeExecuted, message, kind})`. `kind = 'credits'` when the message starts with `CREDITS:`, and `'auth'` when it starts with `AUTH:`. The `PPAI · daily` workflow and all its sub-workflows reference it.
- [ ] **Step 1: Write, validate, create.**
- [ ] **Step 2: Test** with `test_workflow` using a pinned error payload whose message starts `CREDITS: x`. Expected: the Gmail node output shows the credits subject. Then test a plain error, expecting the subject `Poranna prasa AI: błąd w kroku <node>`.
- [ ] **Step 3: Commit.**

### Task 14: `PPAI · numbers`

**Files:**
- Create: `n8n/workflows/numbers.workflow.js`

**Interfaces:**
- Consumes: `parsers.js`, `moves.js`, `dates.js`, `news.js` (`entityId`); tables `market_watchlist`, `market_snapshots`, `leaderboard_snapshots`, `move_log`, `impact_tags`.
- Produces: input `{date}`; output `{market: {rows, as_of} | null, rankings: {lmarena, aa, hf_trending} (each list or null), big_moves, ranking_moves, follow_ups, leaderboard_top: string[]}`. Side effects: snapshot rows written for `date` (delete existing rows for that date first), and `move_log` rows for the reported moves.
- [ ] **Step 1: Write the workflow.** Each source runs in its own branch with "continue on fail". A failed or `null` parse sets that part to `null`. A missing source never fails the workflow.
- [ ] **Step 2: Validate, create.**
- [ ] **Step 3: Test** with `test_workflow` for today's date. Expected: `market.rows` length = number of active tickers with data, ranking lists non-empty, snapshot rows present.
- [ ] **Step 4: Source-down test:** pin the AA HTTP node to a 500 response. Expected: `rankings.aa === null`, the rest present, workflow succeeds.
- [ ] **Step 5: Re-run the same date.** Expected: the snapshot row count for that date is unchanged.
- [ ] **Step 6: Commit.**

### Task 15: `PPAI · news`

**Files:**
- Create: `n8n/workflows/news.workflow.js`

**Interfaces:**
- Consumes: `news.js`; tables `news_sources`, `topics_history`; `PPAI · claude` (filter step).
- Produces: input `{date, run_id, braveAllowed}`; output `{candidates: [{idx, title, url, source, published_at, category, importance, snippet}]}` (≤ 15), plus `cost_ledger` rows for Brave calls (service `brave`, calls 1, cost 0).
- [ ] **Step 1: Write the workflow:**
  - RSS Read for each active `news_sources` row; keep items from the last 30 h (24 h + slack);
  - Brave Search (max 2 queries, only if `braveAllowed`);
  - `dedupeCandidates`;
  - drop items whose normalized title matches a `topics_history` title from the last 7 days, unless the history item is passed to the filter prompt as context;
  - call `PPAI · claude` with `filter.md`, `filter.schema.json`, Haiku, effort `low`, max_tokens 8000; keep the 15 kept items with the highest importance.
- [ ] **Step 2: Validate, create. Step 3: Test** for today. Expected: 5–15 candidates, all with a category from the enum and no duplicate normalized URLs.
- [ ] **Step 4: Commit.**

### Task 16: `PPAI · write`

**Files:**
- Create: `n8n/workflows/write.workflow.js`

**Interfaces:**
- Consumes: `PPAI · claude`; `news.js`, `edition.js`, `dates.js`; tables `entity_profiles`, `trusted_leakers`, `topics_history`, `market_snapshots`, `leaderboard_snapshots`; output of `PPAI · numbers` and `PPAI · news`; flags from `editionFlags`.
- Produces: input `{date, run_id, numbers, candidates, flags, firecrawlAllowed}`; output `{edition, errors, newEntities, spotlight}`. The edition matches spec section 9, with `may_affect` ids, `weekly`/`monthly` filled when flagged, and `spotlight` from `pickSpotlight`.
- [ ] **Step 1: Write the workflow:**
  1. Select: Sonnet, effort `low`, `select.md`/`select.schema.json`, input = candidates and history titles.
  2. For each chosen item: HTTP GET the source URL plus up to 2 related candidate URLs, then `extractArticleText`. If the text is under 500 chars and `firecrawlAllowed`, fetch through Firecrawl and log a `cost_ledger` row (service `firecrawl`). Run any `extra_queries` through Brave only if allowed.
  3. Write: Sonnet, effort `medium`, `write.md`/`edition.schema.json`, max_tokens 24000. Input: dated article texts, numbers (big_moves, ranking_moves, follow_ups, market rows, rankings), `trusted_leakers`, and the known entity list (id, name, aliases).
  4. `checkEditionRules`, then `pickSpotlight`; fill the `spotlight` text from the profiles.
  5. If `flags.weekly`/`flags.monthly`: Sonnet, effort `medium`, `period.md`/`period.schema.json`, input = `topics_history` (7/30 days) and snapshot deltas.
  6. Profiles: `collectNewEntities` → for each, fetch the Wikipedia REST summary (`https://en.wikipedia.org/api/rest_v1/page/summary/<title>`), then Haiku with `profile.md`/`profile.schema.json` → upsert into `entity_profiles` (`updated_at` = date).
- [ ] **Step 2: Validate, create.**
- [ ] **Step 3: Test** with pinned `numbers` and `candidates` from Tasks 14–15 outputs (spends roughly $0.30; tell the owner first). Expected:
  - 5–7 stories (or `quiet_day`), each with ≥ 1 source;
  - every `gielda`/`inwestycje` story has the disclaimer;
  - all `may_affect` ids exist in `entity_profiles` after the profile step;
  - the total prose reads in 12–18 minutes per `readingMinutes`.
- [ ] **Step 4: Quiet-day test:** pin `candidates` to 3 items. Expected: `quiet_day: true` and no error.
- [ ] **Step 5: Commit.**

### Task 17: `PPAI · publish`

**Files:**
- Create: `n8n/workflows/publish.workflow.js`

**Interfaces:**
- Consumes: GitHub credential, Gmail credential, `edition.js` (`upsertIndex`, `readingMinutes`), `email.js`, and the `config` values (owner, repo, siteUrl, recipient) passed in.
- Produces: input `{edition, profiles, config}`. It writes `site/data/<date>.json`, `site/data/index.json` (read, `upsertIndex`, write) and `site/data/profiles.json` via the GitHub contents API (create or update with the current sha), then sends `renderEmailHtml` through Gmail. Output `{commitUrls, emailId}`.
- [ ] **Step 1: Write, validate, create.**
- [ ] **Step 2: Test** with the sample edition dated `2099-01-01`. Expected: three files committed, the Pages Action runs, `#/2099-01-01` renders on the live site, and the mail arrives (the owner confirms).
- [ ] **Step 3: Re-run test:** publish the same date again. Expected: `index.json` has one `2099-01-01` entry. Then delete the test file and index entry by publishing an index without it, and remove `2099-01-01.json` through the GitHub API.
- [ ] **Step 4: Commit.**

### Task 18: `PPAI · daily` (main) and end-to-end run

**Files:**
- Create: `n8n/workflows/daily.workflow.js`

**Interfaces:**
- Consumes: all sub-workflows; `budget.js` (`checkGate`), `dates.js`.
- Produces the flow:
  - Schedule trigger at 05:30 Europe/Warsaw;
  - a `config` Set node with `siteUrl`, `ghOwner`, `ghRepo`, `recipient`, `tz`;
  - `run_id = date + '-' + execution id`;
  - read `pipeline_state` and the current month's `cost_ledger`, run `checkGate`, and write the `statePatch` if one is returned;
  - if `!run`, stop silently on `paused_*` and send one budget mail on the first `budget` stop of the month;
  - run numbers → news → write → publish;
  - finally replace the day's rows in `topics_history` and `impact_tags` (delete by date, then insert). Error workflow: `PPAI · errors`.
- [ ] **Step 1: Write, validate, create (inactive).**
- [ ] **Step 2: Ask the owner before the first full paid run** (about $0.30). Run it manually with `execute_workflow`.
- [ ] **Step 3: Verify:**
  - the live site shows today's edition with all rubrics;
  - the mail arrived;
  - the `cost_ledger` total for the run is under $0.60;
  - `topics_history` has today's rows.
- [ ] **Step 4: Owner review:** the owner reads the edition and gives notes. Fold tone and length notes into `prompts/write.md` (and the workflow), then re-run once if they ask.
- [ ] **Step 5: Quiet-day check:** confirmed in Task 16 Step 4. Here, confirm that the site renders a `quiet_day` edition (publish the Task 16 Step 4 output with date `2099-01-02`, check it, delete it).
- [ ] **Step 6: Same-day re-run:** execute again. Expected: one index entry for today, `topics_history` rows for today not doubled, and ledger rows added (real spend).
- [ ] **Step 7: Budget drills:**
  - set `monthly_budget_usd = 0.01` and execute. Expected: no HTTP calls to Anthropic, `pipeline_state.paused = true` with reason `budget`, and one budget mail;
  - restore to 15 and `paused=false`;
  - set `paused=true` with reason `credits` and execute. Expected: immediate stop and no mail; repeat with reason `auth`;
  - restore.
- [ ] **Step 8: Activate** with `publish_workflow`. Commit `feat: PPAI daily pipeline live`.

---

## Self-review notes

- **Spec coverage:**
  - §2 goals: Tasks 14–18.
  - §7 rubrics: Tasks 6 (prompts), 7 (render), 16 (write).
  - §7a rules: Tasks 3b, 5, 6.
  - §8 flow steps 0–11: Tasks 12–18.
  - §9 tables: Task 10.
  - §10 site: Tasks 7–8.
  - §11 cost safety: Tasks 1, 2, 12, 18 Step 7.
  - §15 owner steps: Task 1.
- **Execution order:** 0, 1 (parallel, human), 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 3b, 12, 13, 14, 15, 16, 17, 18.
