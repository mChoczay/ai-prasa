# Tab Title, Icon and Article Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Short tab titles with date, an initial-"P" icon, and quiet per-story ratings and notes that reach the Sonnet editors through a private n8n webhook.

**Architecture:**
- Site: a new `site/js/feedback.js` with pure helpers and a small browser controller. `reader.js` renders the rating block only when this device has a saved webhook config, and `shape.js` gets `tabTitle()`.
- n8n: a new `n8n/lib/feedback.js` (validation and the digest for the editors) and a new webhook workflow `PPAI · oceny` that appends rows to a new data table.
- Relay: `daily` reads the table and puts the digest into the payload. `select`, `write` and `front` add it to their prompts, and `publish` puts the enabling link in the mail footer.

**Deviation from the spec (planning ruling):** spec 5.2 puts the webhook URL and key in new `pipeline_state` columns. The n8n MCP tools can add rows to a data table but cannot update one. So the URL and key go into a separate one-row table, `feedback_settings` (`url`, `key`), and the webhook and `publish` read it. Same visibility (n8n only), same behaviour. To rotate the key, change that row in n8n.

**Tech Stack:** Vanilla JS/CSS on GitHub Pages, `node --test`, n8n Cloud (Workflow SDK via MCP), n8n data tables.

**Spec:** `docs/specs/2026-11-20-feedback-title-icon-design.md` (approved 2026-11-20).

## Global Constraints

- All rules of `docs/superpowers/plans/2026-11-18-poranna-prasa-ai.md` → Global Constraints still apply:
  - nothing global, zero npm dependencies;
  - commits authored by the owner (`git -c user.name=mChoczay`): a one-sentence subject, a short summary body, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  - public repo: never commit the n8n instance host, the feedback key or the owner e-mail;
  - each n8n execution ≤ 180 s.
- Tests: `.tools/node/node.exe --test` from the project root. Code-node tests use `tests/helpers/code-node.js`, where `URL`, `URLSearchParams` and `structuredClone` are undefined.
- n8n deploy as in the previous plan:
  - build with `scripts/inline-lib.mjs`;
  - change Code nodes and prompts through `.superpowers/build/ops.mjs` + `update_workflow`;
  - create a new workflow as a skeleton, then fill in `/jsCode`.
- CSP in `site/index.html` becomes exactly: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self' https:; base-uri 'none'; form-action 'none'`.
- Every data string in HTML goes through `escapeHtml`.
- Exact copy (Polish UI):
  - question label: `Jak dla Ciebie?`;
  - buttons: `więcej takich` / `w sam raz` / `mniej takich` with values `more` / `ok` / `less`;
  - note link: `dodaj uwagę`;
  - note placeholder: `np. za dużo o giełdzie, a za mało o tym, jak tego użyć`;
  - save button: `Zapisz`;
  - hint under the note: `trafi do jutrzejszego wydania`;
  - after a saved note the link becomes: `uwaga zapisana · dodaj kolejną`;
  - send error: `Nie zapisano, spróbuj jeszcze raz`;
  - device messages: `Oceny włączone na tym urządzeniu`, `Oceny wyłączone na tym urządzeniu`, `Oceny wyłączone, włącz je linkiem z maila`;
  - mail footer link: `Włącz oceny na tym urządzeniu`.
- Limits:
  - note at most 1000 chars after trim; title 300; category 40;
  - `n` an integer 1–20;
  - rating debounce 2000 ms;
  - digest window 30 days by edition `date`; at most 10 rating examples and 10 notes; each note cut to 300 chars.
- `localStorage` keys: `ppai.feedback` (JSON `{url, key}`) and `ppai.rating.<date>.<n>` (rating value).
- Webhook CORS origin: `https://mchoczay.github.io`. The site sends `fetch(url, {method: 'POST', headers: {'Content-Type': 'text/plain'}, body: JSON.stringify(...)})`.
- Responses:
  - saved: 200 `{"ok":true}`;
  - bad data: 400 `{"ok":false}`;
  - wrong key: 401 `{"ok":false,"reason":"key"}`.

## Review Focus

1. **Activation link with a non-https `u` or an empty `k`** (forged or mangled link). Expected: nothing is saved and the reader shows no rating block. Test in Task 2.
2. **The webhook body arrives as a string, not an object.** n8n can hand over a `text/plain` body either way. Expected: `validateFeedback` parses both, and rejects broken JSON with 400 instead of throwing. Test in Task 3.
3. **Re-rating the same story.** The owner taps `więcej`, then `mniej`, then clears it. Expected: the digest counts only the last row for that `date + n`, and a cleared rating counts as none. Test in Task 3.
4. **Arrow keys while typing a note.** Expected: the page does not turn and the cursor moves in the text. Test in Task 2.
5. **Feedback text with prompt-breaking or HTML content** (backticks, `##`, `<script>`). Expected: the site escapes it, and the digest keeps it as quoted plain text on one line per note, never as a markdown heading. Tests in Tasks 2 and 3.

---

### Task 1: Tab titles and the icon

**Files:**
- Modify: `site/js/shape.js` (add `tabTitle`), `site/js/app.js` (use it in all views and on page turns), `site/index.html` (icon links)
- Create: `site/icon.svg`, `site/apple-touch-icon.png`
- Test: `tests/shape.test.js`

**Interfaces:**
- Produces: `tabTitle(view: 'front'|'reader'|'archive'|'error', edition?: object, page?: number): string` in `site/js/shape.js`.

- [ ] **Step 1: Write the failing tests** in `tests/shape.test.js`:

```js
test('tabTitle gives name and short Polish date, reader page and archive', () => {
  const e = { date: '2026-11-19', lead_story: { title: 'Genie 4' }, stories: [{ title: 'PostgreSQL 19' }] };
  assert.equal(tabTitle('front', e), 'Prasa AI · czw 19 lis');
  assert.equal(tabTitle('reader', e, 2), '2/2 · PostgreSQL 19');
  assert.equal(tabTitle('archive'), 'Archiwum · Prasa AI');
  assert.equal(tabTitle('error'), 'Poranna prasa AI');
  assert.equal(tabTitle('front', { date: '2026-03-01' }), 'Prasa AI · ndz 1 mar');
  assert.equal(tabTitle('reader', { date: '2026-11-19', lead_story: { title: 'A' }, weekly: { title: 'Tydzień' } }, 2), '2/2 · Tydzień');
});
```

- [ ] **Step 2: Run** `.tools/node/node.exe --test tests/shape.test.js`. Expected: FAIL, `tabTitle` is not exported.
- [ ] **Step 3: Implement `tabTitle`.**
  - Day names come from a fixed table: `ndz pon wt śr czw pt sob`. Months: `sty lut mar kwi maj cze lip sie wrz paź lis gru`. Parse the `RRRR-MM-DD` string by hand, not through `Intl`.
  - Reader pages come from `readerPages(edition)`; the page title is the story title or the supplement `title`.
  - Unknown view → `'Poranna prasa AI'`.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Wire it into `app.js`.**
  - Every `document.title = …` uses `tabTitle`.
  - The reader `onPage` callback also sets `tabTitle('reader', edition, n)`.
  - `showError()` and "no edition" set `tabTitle('error')`.
- [ ] **Step 6: Add the icon.**
  - `site/icon.svg`: viewBox 0 0 180 180, rect with `rx="36"` and fill `#1f1d1a`, a serif capital P as a `<path>` with fill `#faf8f3`. No `<text>`.
  - `site/apple-touch-icon.png`: 180×180, rendered from the same SVG with PowerShell `System.Drawing` or the in-app browser canvas. No new tools.
  - In `index.html` after `<title>`: `<link rel="icon" href="icon.svg" type="image/svg+xml">` and `<link rel="apple-touch-icon" href="apple-touch-icon.png">`.
- [ ] **Step 7: Check in the local preview.**
  - Use `scripts/serve.mjs` at 375 px.
  - Expected: the tab shows the icon and `Prasa AI · czw 19 lis`, and turning pages updates the title.
- [ ] **Step 8: Full suite and commit.** Subject: `Show the paper name and date in the tab and add the P icon.`

### Task 2: Rating block on the site

**Files:**
- Create: `site/js/feedback.js`
- Modify:
  - `site/js/reader.js`: `parseRoute`, `renderReader` options, key guard;
  - `site/js/app.js`: activation route, controller wiring;
  - `site/styles.css`;
  - `site/index.html`: CSP.
- Test: `tests/feedback-site.test.js` (new), `tests/reader.test.js`

**Interfaces:**
- Consumes: `escapeHtml` from `render.js`; `readerPages` from `shape.js`.
- Produces:
  - `parseRoute('#/oceny?u=…&k=…')` returns `{ view: 'feedback', date: null, page: null, category: null, url, key, off }`. `off` is true for `#/oceny` without both params or with `off=1`. All other routes are unchanged.
  - In `site/js/feedback.js`:
    - `loadConfig(storage) -> {url, key} | null`;
    - `saveConfig(storage, url, key) -> boolean` (false and nothing saved unless `url` starts with `https://` and `key` is non-empty);
    - `clearConfig(storage)`;
    - `storedRating(storage, date, n) -> 'more'|'ok'|'less'|''`;
    - `rememberRating(storage, date, n, rating)`;
    - `feedbackBlock(n, rating) -> string` (HTML);
    - `buildRequest(config, {date, n, title, category, rating?, note?}) -> {url, init}`;
    - `initFeedback(root, {config, edition, storage, fetchFn, onDisabled}) -> dispose()`.
  - `renderReader(edition, profilesById, page, {feedback = false, ratings = {}} = {})`: `ratings` maps page `n` → rating. The block is added only to `kind === 'story'` pages, between `sourcesList` and the page nav.
  - `isTypingTarget(el) -> boolean` in `reader.js`: true for `textarea`, `input` and `contenteditable`.

- [ ] **Step 1: Write the failing tests.**

```js
// tests/feedback-site.test.js
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
test('saveConfig keeps only https urls with a key', () => {
  const s = mem();
  assert.equal(saveConfig(s, 'http://x.example/h', 'k'), false);
  assert.equal(saveConfig(s, 'https://x.example/h', ''), false);
  assert.equal(loadConfig(s), null);
  assert.equal(saveConfig(s, 'https://x.example/h', 'k1'), true);
  assert.deepEqual(loadConfig(s), { url: 'https://x.example/h', key: 'k1' });
  clearConfig(s); assert.equal(loadConfig(s), null);
});
test('ratings are remembered per edition page', () => {
  const s = mem(); rememberRating(s, '2026-11-19', 2, 'less');
  assert.equal(storedRating(s, '2026-11-19', 2), 'less'); assert.equal(storedRating(s, '2026-11-19', 3), '');
});
test('feedbackBlock has the three buttons, the note link and marks the chosen rating', () => {
  const html = feedbackBlock(2, 'more');
  assert.match(html, /Jak dla Ciebie\?/);
  assert.match(html, /data-rate="more"[^>]*aria-pressed="true"[^>]*>więcej takich/);
  assert.match(html, /data-rate="less"[^>]*aria-pressed="false"[^>]*>mniej takich/);
  assert.match(html, /dodaj uwagę/);
  assert.match(html, /maxlength="1000"/);
});
test('buildRequest posts text/plain JSON with the key and only known fields', () => {
  const r = buildRequest({ url: 'https://x.example/h', key: 'k1' }, { date: '2026-11-19', n: 2, title: 'T', category: 'modele', rating: 'ok', extra: 1 });
  assert.equal(r.url, 'https://x.example/h');
  assert.equal(r.init.method, 'POST'); assert.equal(r.init.headers['Content-Type'], 'text/plain');
  assert.deepEqual(JSON.parse(r.init.body), { k: 'k1', date: '2026-11-19', n: 2, title: 'T', category: 'modele', rating: 'ok' });
});
// tests/reader.test.js
test('parseRoute reads the feedback activation link', () => {
  assert.deepEqual(parseRoute('#/oceny?u=https%3A%2F%2Fx.example%2Fh&k=abc'), { view: 'feedback', date: null, page: null, category: null, url: 'https://x.example/h', key: 'abc', off: false });
  assert.equal(parseRoute('#/oceny').off, true);
  assert.equal(parseRoute('#/oceny?off=1').off, true);
});
test('the reader shows the rating block only when enabled and only on story pages', () => {
  const e = real(); e.weekly = { title: 'W', body: 'b', takeaways: [] };
  const total = 1 + e.stories.length + 1;
  assert.doesNotMatch(renderReader(e, profiles, 1), /Jak dla Ciebie/);
  const html = renderReader(e, profiles, 1, { feedback: true, ratings: { 1: 'less' } });
  assert.equal(count(html, 'Jak dla Ciebie?'), total - 1);
  assert.match(html.slice(html.indexOf('data-n="1"'), html.indexOf('data-n="2"')), /data-rate="less"[^>]*aria-pressed="true"/);
  assert.doesNotMatch(html.slice(html.indexOf(`data-n="${total}"`)), /Jak dla Ciebie/);
});
test('typing targets do not turn pages', () => {
  assert.equal(isTypingTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isTypingTarget({ tagName: 'BUTTON', isContentEditable: false }), false);
  assert.equal(isTypingTarget(null), false);
});
```

- [ ] **Step 2: Run** the two test files. Expected: FAIL, the exports are missing.
- [ ] **Step 3: Implement** the interfaces above.
  - `feedbackBlock` markup:
    - `<div class="feedback" data-n="…">` with a `<span class="fb-q">` label and three `<button class="fb-rate" data-rate=… aria-pressed=…>` buttons;
    - `<button class="fb-note-toggle">dodaj uwagę</button>`;
    - a hidden `<div class="fb-note" hidden>` with `<textarea maxlength="1000" rows="3" placeholder=…>`, `<span class="fb-hint">trafi do jutrzejszego wydania</span>` and `<button class="fb-save">Zapisz</button>`;
    - `<p class="fb-msg" role="status"></p>`.
  - `initFeedback` behaviour:
    - Click on a rating button: toggle off if already pressed; update `aria-pressed` and `rememberRating` at once; send after a 2000 ms debounce per page.
    - On failure: restore the previous rating and show the error copy.
    - On 401: `clearConfig`, remove all `.feedback` blocks and call `onDisabled()`.
    - Note toggle: shows or hides `.fb-note`.
    - `Zapisz`: sends the trimmed note (empty notes do nothing); on success clears and hides the field and changes the toggle text to `uwaga zapisana · dodaj kolejną`; on failure keeps the text.
    - Success means `res.ok` and `(await res.json()).ok === true`.
  - Key guard: in `initReader`'s `onKey`, return early when `isTypingTarget(event.target)`.
- [ ] **Step 4: Wire `app.js`.**
  - Route `feedback`:
    - when `off`: `clearConfig`, then go to `#/` with the message `Oceny wyłączone na tym urządzeniu`;
    - else if `saveConfig` succeeds: `history.replaceState(null, '', '#/')`, render the front page and show `Oceny włączone na tym urządzeniu` once, above the masthead in `<p class="notice">`;
    - else: the front page without a message.
  - Reader:
    - pass `{ feedback: !!loadConfig(localStorage), ratings }`, where `ratings` is built from `storedRating` for every story page;
    - after `initReader`, call `initFeedback` with `fetchFn: fetch.bind(window)`;
    - `onDisabled` shows `Oceny wyłączone, włącz je linkiem z maila`.
  - Dispose it together with the reader.
- [ ] **Step 5: CSS and CSP.**
  - `.feedback`: `border-top: 1px solid var(--rule)`, small margin, 12–13 px sans, colour `var(--ink-soft)`.
  - `.fb-rate`: transparent background, 1px `var(--rule)` border, small padding.
  - `.fb-rate[aria-pressed="true"]`: border and text `var(--accent)`, no fill.
  - `.fb-note-toggle`: link look with a dotted underline.
  - `.notice`: small, muted.
  - CSP exactly as in Global Constraints.
- [ ] **Step 6: Escaping test.** Add a test that `feedbackBlock`'s output and the reader with a `<script>` title contain no raw `<script>`. Run the full suite. Expected: PASS.
- [ ] **Step 7: Check in the local preview at 375 px.**
  - Set the config through `#/oceny?u=https%3A%2F%2Fexample.invalid%2Fh&k=test`.
  - Expected:
    - the block is quiet;
    - the note field opens without a page jump;
    - arrow keys inside the field do not turn pages;
    - a click on a rating shows the error copy (the host is invalid) and restores the rating;
    - `#/oceny` turns ratings off.
- [ ] **Step 8: Commit.** Subject: `Add quiet ratings and notes under each story in the reader.`

### Task 3: Feedback library for n8n

**Files:**
- Create: `n8n/lib/feedback.js`
- Test: `tests/feedback.test.js`

**Interfaces:**
- Consumes: `daysBetween(a, b)` from `n8n/lib/dates.js` (inline `dates.js` first).
- Produces:
  - `validateFeedback(body: object|string, key: string) -> {ok: true, row: {date, n, title, category, rating, note}} | {ok: false, status: 400|401}`
    - `rating` is `''` when only a note was sent, and `note` is `''` for a rating row.
    - A row must have either a valid `rating` key (`'more'|'ok'|'less'|''`, where `''` means cleared) or a non-empty `note`.
  - `feedbackDigest(rows: Array<{date, n, title, category, rating, note, createdAt}>, today: 'RRRR-MM-DD') -> string` (English; `''` when nothing is in the window).

- [ ] **Step 1: Write the failing tests.**

```js
const K = 'secret-key';
const ok = { k: K, date: '2026-11-19', n: 2, title: 'T', category: 'modele', rating: 'more' };
test('validateFeedback accepts a rating, a cleared rating and a note, as object or string', () => {
  assert.deepEqual(validateFeedback(ok, K), { ok: true, row: { date: '2026-11-19', n: 2, title: 'T', category: 'modele', rating: 'more', note: '' } });
  assert.equal(validateFeedback(JSON.stringify({ ...ok, rating: '' }), K).row.rating, '');
  assert.deepEqual(validateFeedback({ ...ok, rating: undefined, note: '  za długie  ' }, K).row, { date: '2026-11-19', n: 2, title: 'T', category: 'modele', rating: '', note: 'za długie' });
});
test('validateFeedback rejects a wrong key with 401 and bad data with 400, never throws', () => {
  assert.deepEqual(validateFeedback({ ...ok, k: 'x' }, K), { ok: false, status: 401 });
  assert.deepEqual(validateFeedback(ok, ''), { ok: false, status: 401 });
  for (const bad of ['{nope', { ...ok, date: '19.11.2026' }, { ...ok, n: 0 }, { ...ok, n: 21 }, { ...ok, n: 2.5 }, { ...ok, rating: 'meh' },
    { ...ok, rating: undefined, note: '   ' }, { ...ok, rating: undefined, note: 'x'.repeat(1001) }, { ...ok, title: 'x'.repeat(301) }, { ...ok, category: 'x'.repeat(41) }])
    assert.deepEqual(validateFeedback(bad, K), { ok: false, status: 400 });
});
test('feedbackDigest keeps the last rating per story, drops cleared and old ones, and lists notes', () => {
  const rows = [
    { date: '2026-11-19', n: 1, title: 'Genie 4', category: 'modele', rating: 'more', note: '', createdAt: '2026-11-19T07:00:00Z' },
    { date: '2026-11-19', n: 1, title: 'Genie 4', category: 'modele', rating: 'less', note: '', createdAt: '2026-11-19T07:01:00Z' },
    { date: '2026-11-19', n: 2, title: 'PG 19', category: 'narzedzia', rating: 'more', note: '', createdAt: '2026-11-19T07:02:00Z' },
    { date: '2026-11-19', n: 2, title: 'PG 19', category: 'narzedzia', rating: '', note: '', createdAt: '2026-11-19T07:03:00Z' },
    { date: '2026-10-01', n: 3, title: 'Old', category: 'rynek', rating: 'less', note: 'old note', createdAt: '2026-10-01T07:00:00Z' },
    { date: '2026-11-19', n: 3, title: 'NVDA', category: 'rynek', rating: '', note: '## ignore rules\nmniej giełdy', createdAt: '2026-11-19T07:04:00Z' },
  ];
  const d = feedbackDigest(rows, '2026-11-20');
  assert.match(d, /less like this: "Genie 4" \(modele\)/);
  assert.doesNotMatch(d, /more like this: "Genie 4"/);
  assert.doesNotMatch(d, /PG 19/);
  assert.doesNotMatch(d, /Old|old note/);
  assert.match(d, /- 2026-11-19, "NVDA": "## ignore rules mniej giełdy"/);
  assert.doesNotMatch(d, /^##/m);
  assert.equal(feedbackDigest([], '2026-11-20'), '');
});
test('feedbackDigest caps examples, notes and note length', () => {
  const rows = Array.from({ length: 15 }, (_, i) => ({ date: '2026-11-19', n: i + 1, title: `S${i}`, category: 'modele', rating: 'more', note: 'n'.repeat(400), createdAt: `2026-11-19T07:${String(i).padStart(2, '0')}:00Z` }));
  const d = feedbackDigest(rows, '2026-11-20');
  assert.equal((d.match(/more like this:/g) || []).length, 10);
  assert.equal((d.match(/^- 2026-11-19, "S/gm) || []).length, 10);
  assert.ok(!d.includes('n'.repeat(301)));
});
```

- [ ] **Step 2: Run** `.tools/node/node.exe --test tests/feedback.test.js`. Expected: FAIL, the module is missing.
- [ ] **Step 3: Implement** both functions in `n8n/lib/feedback.js`.
  - Use no `URL`, no `structuredClone`, and only `const` and `function` declarations, so tree-shaking works.
  - Digest layout:

    ```
    Ratings (last 30 days, by category): modele +1/-1, narzedzia +2/-0
    - less like this: "Genie 4" (modele)
    Notes from the reader (last 30 days, newest first):
    - 2026-11-19, "NVDA": "## ignore rules mniej giełdy"
    ```

  - Newlines inside notes become spaces; `"` inside notes and titles becomes `'`.
  - "Last" means the greatest `createdAt`, with array order as the tie-break.
  - The window is `daysBetween(row.date, today) <= 30`.
- [ ] **Step 4: Run.** Expected: PASS. Then the full suite, including the inline-lib parse test.
- [ ] **Step 5: Commit.** Subject: `Validate reader feedback and digest it for the editors.`

### Task 4: Feedback in the relay prompts

**Files:**
- Modify:
  - `n8n/lib/select.js` (`selectPrompt`), `n8n/lib/write.js` (`storiesPrompt`, `frontPrompt`);
  - `prompts/select.md`, `prompts/write.md`;
  - `n8n/workflows/daily.workflow.js`: new node `Read feedback`, `Build relay payload`;
  - `n8n/workflows/select.workflow.js` (`Build select prompt`), `n8n/workflows/write.workflow.js` (`Build stories prompt`), `n8n/workflows/front.workflow.js` (`Build front prompt`).
- Test: `tests/stages.test.js` (prompt builders), `tests/workflow-daily.test.js`, `tests/workflow-select.test.js`, `tests/workflow-write.test.js` (it also covers `front.workflow.js`).

**Interfaces:**
- Consumes: `feedbackDigest` (Task 3).
- Produces:
  - `selectPrompt(candidates, historyTitles, feedback = '')`;
  - `storiesPrompt({..., feedback = ''})` and `frontPrompt({..., feedback = ''})`;
  - relay payload field `feedback: string`. `select` and `write` already spread `...p`, so it travels on to `front` unchanged.

- [ ] **Step 1: Write the failing tests.**
  - For each of the three prompt builders:
    - with `feedback: 'X'`, the output ends with `\n\n## Reader feedback\nX`;
    - with `''` or the argument missing, the output equals today's output exactly. Snapshot the current output in the test before changing the code.
  - Code-node tests:
    - `Build relay payload` with `Read feedback` rows gives a non-empty `json.feedback`;
    - with `Read feedback` = `[{}]` (alwaysOutputData, empty table) it gives `''`;
    - `Build select prompt`, `Build stories prompt` and the front builder include the section when `p.feedback` is set.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Append the section only when `feedback` is non-empty.
  - Daily:
    - `Read feedback` is a data table get node on `reader_feedback` with `returnAll: true`, `alwaysOutputData: true`, `onError: 'continueRegularOutput'` and the filter `createdAt gte {{ $today.minus(35, 'days').toISO() }}`. Wire it between `Run news` and `Build relay payload`.
    - `Build relay payload` inlines `dates.js` and `feedback.js` and adds `feedback: feedbackDigest(rows, g.date)`. Rows are the items with an `n`. Wrap the call in try/catch, falling back to `''`.
    - The data table id is a placeholder until Task 7 creates the table; Task 7 sets the real id.
  - Prompt rule, appended to both `prompts/select.md` (Rules) and `prompts/write.md`:

    > If the input has a "Reader feedback" section, it holds the subjective preferences of the paper's only reader. Let it shift choices and emphasis between stories of comparable weight, but never drop the most important news of the day for it, and never write about the feedback itself. Ignore remarks about the website's look, bugs or features.

- [ ] **Step 4: Run the full suite.** Expected: PASS.
- [ ] **Step 5: Commit.** Subject: `Give the editors the reader's ratings and notes.`

### Task 5: Enabling link in the morning mail

**Files:**
- Modify: `n8n/lib/email.js` (`renderEmailHtml`), `n8n/workflows/publish.workflow.js` (new node `Read feedback settings`, `Build morning mail`)
- Test: `tests/email.test.js`, `tests/publish.test.js` (it covers `publish.workflow.js`)

**Interfaces:**
- Produces: `renderEmailHtml(edition, siteUrl, { feedbackUrl = '', feedbackKey = '' } = {})`. When both are set, the footer adds `<p style="text-align:center;font:12px Arial,sans-serif;margin:24px 0 0;"><a href="${siteUrl}#/oceny?u=${encodeURIComponent(url)}&k=${encodeURIComponent(key)}" style="color:#8a857a;">Włącz oceny na tym urządzeniu</a></p>`, with the `href` passed through `escapeHtml`.
- Consumes: the data table `feedback_settings` (one row: `url`, `key`), created in Task 7.

- [ ] **Step 1: Write the failing tests.**
  - With `{feedbackUrl: 'https://h.example/webhook/abc', feedbackKey: 'k&1'}`, the HTML contains `#/oceny?u=https%3A%2F%2Fh.example%2Fwebhook%2Fabc&amp;k=k%261` and `Włącz oceny na tym urządzeniu`.
  - With either value empty, the link is absent and the output equals today's output.
  - Code node `Build morning mail` with `Read feedback settings` = `[{ url: 'https://h.example/w', key: 'k' }]` includes the link; with `[{}]` it does not.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `Read feedback settings` is a data table get node with `returnAll: false`, `limit: 1`, `alwaysOutputData: true` and `onError: 'continueRegularOutput'`. Wire it between `Send mail?` (true branch) and `Build morning mail`.
  - Its table id is a placeholder until Task 7.
- [ ] **Step 4: Run the full suite.** Expected: PASS.
- [ ] **Step 5: Commit.** Subject: `Put the enabling link for ratings in the morning mail.`

### Task 6: Webhook workflow `PPAI · oceny`

**Files:**
- Create: `n8n/workflows/feedback.workflow.js`
- Test: `tests/workflow-feedback.test.js`

**Interfaces:**
- Consumes: `validateFeedback` (Task 3); data tables `feedback_settings` and `reader_feedback` (ids are placeholders until Task 7).
- Produces: a published workflow whose production URL the owner's devices store.

- [ ] **Step 1: Write the failing tests** for the Code node `Check feedback`. It reads `$('Feedback in').first().json.body` and `$('Read feedback settings').first().json.key`:
  - a good body gives `{ ok: true, row }`;
  - a wrong key gives `{ ok: false, status: 401 }`;
  - a string body with broken JSON gives `{ ok: false, status: 400 }`;
  - a missing settings row (`[{}]`) gives 401.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Write the workflow.**
  - Nodes, in order:
    1. Webhook `Feedback in`: `httpMethod: 'POST'`; `path` a random 24-char lowercase string generated once and committed; `responseMode: 'responseNode'`; `options.allowedOrigins: 'https://mchoczay.github.io'`.
    2. `Read feedback settings` (data table get, limit 1, `alwaysOutputData`).
    3. Code `Check feedback`, inlining `dates.js` and `feedback.js`.
    4. If `Saved?` on `{{ $json.ok }}`.
    5. True branch: data table insert `Save feedback` into `reader_feedback`, mapping `date`, `n`, `title`, `category`, `rating`, `note` from `$json.row`, with `handled` left empty. Then Respond to Webhook `Respond saved`: JSON `{"ok":true}`, code 200.
    6. False branch: `Respond rejected`: JSON `{{ $json.status === 401 ? {ok:false,reason:'key'} : {ok:false} }}`, code `{{ $json.status }}`.
  - No Claude calls, no error workflow setting.
- [ ] **Step 4: Run the full suite** (the inline-lib parse test covers the new file). Expected: PASS.
- [ ] **Step 5: Commit.** Subject: `Add the webhook that saves ratings and notes.`

### Task 7: Deploy to n8n

**Files:**
- Modify: the placeholder table ids in `daily`, `publish` and `feedback` workflow files, set to the real ids. Ids are not secret.
- Ledger: `.superpowers/sdd/2026-11-20-feedback/progress.md`

- [ ] **Step 1: Check the execution limit.** Look up the n8n plan's monthly execution limit (n8n account usage page in the in-app browser if signed in; otherwise ask the owner). Record it in the ledger. If ~300 rating executions exceed 10% of the limit, stop and report to the owner.
- [ ] **Step 2: Create the data tables.**
  - `reader_feedback`: columns `date` string, `n` number, `title` string, `category` string, `rating` string, `note` string, `handled` string.
  - `feedback_settings`: columns `url` string, `key` string.
  - Put the table ids into the workflow files and commit (subject: `Point the feedback workflows at their data tables.`).
- [ ] **Step 3: Create and publish the webhook workflow.**
  - Create `PPAI · oceny` (skeleton, then `/jsCode`) and publish it.
  - The production URL is `https://<instance host>/webhook/<path>`; the host comes from the MCP results and is never written to a repo file.
  - Generate the key locally with `.tools/node/node.exe -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"` (32 chars). Insert one `feedback_settings` row with `url` and `key` through `add_data_table_rows`. The key stays only in n8n and in this conversation.
- [ ] **Step 4: Smoke-test the webhook with curl** (key read from an environment variable in the shell, never echoed into files):
  - wrong key → 401;
  - `{..., date: '2026-01-01', n: 1, title: 'TEST', category: 'test', rating: 'ok'}` with the real key → 200, and the row appears in `reader_feedback`. The date is outside the 30-day window, so the digest ignores it.
  - Then put `test` in that row's `handled` column with a one-off update if a tool allows it; otherwise record it in the ledger.
  - Also check a CORS preflight-free POST from the origin with `curl -H 'Origin: https://mchoczay.github.io'` and confirm the `Access-Control-Allow-Origin` header.
- [ ] **Step 5: Update the relay workflows.**
  - `daily`: add `Read feedback` (node + connection operations) and the new `Build relay payload` code.
  - `select`: `Build select prompt` + system prompt.
  - `write`: `Build stories prompt` + system prompt.
  - `front`: its prompt builder node + system prompt.
  - `publish`: add `Read feedback settings` + the new `Build morning mail`.
  - Validate each workflow after update. Do not publish `daily`.
- [ ] **Step 6: Record progress and run the full suite.** Add one ledger line per step and run the suite. Expected: PASS.

### Task 8: Ship and check with the owner

- [ ] **Step 1: Run the final whole-branch review** (fresh reviewer) and fix the important findings, test first.
- [ ] **Step 2: Ask the owner for consent to push `main`.** Pushing publishes the site. After consent, push and wait for the Pages deploy to succeed.
- [ ] **Step 3: Give the owner the activation link in the conversation, never in a file.** The link is `https://mchoczay.github.io/ai-prasa/#/oceny?u=<encoded webhook URL>&k=<key>`. The owner opens it on the phone, rates one story and adds a note.
- [ ] **Step 4: Verify the owner's rows.** `get_data_table_rows` on `reader_feedback` shows the owner's rows.
- [ ] **Step 5: Run one `select` stage on today's date with `stop_after: 'select'`** (≈ $0.05, within the approved $2; ≈ $0.75 spent so far). The execution data must show `## Reader feedback` in the Sonnet user prompt.
- [ ] **Step 6: Live checks in the browser pane at 375 px:**
  - the tab title and icon on the live site;
  - no rating block without the config;
  - the rating block after opening the link.
