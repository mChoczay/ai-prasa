# Navigation, Archive and Company Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the site's navigation, reader bar, archive and company card as approved, and drop the test edition of 2026-11-18.

**Architecture:** Site-only change (no n8n). Navigation moves into the masthead markup (`render.js` helper used by `front.js` and `renderArchive`). The reader bar gets a short date, a counter and a progress line that `initReader` updates. The company card stays a `<dialog>`, restyled as a bottom sheet with a close cross.

**Tech Stack:** Vanilla ES modules and CSS on GitHub Pages, `node --test`.

**Spec:** `docs/specs/2026-11-20-nav-archive-card-design.md` (approved 2026-11-20).

## Global Constraints

- Existing rules apply:
  - no dependencies, no global installs;
  - commits by the owner, with a one-sentence subject, a short body and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  - every data string goes through `escapeHtml`.
- CSP stays `style-src 'self'`: no inline `style="…"` in rendered markup. Widths set from JS go through `el.style`.
- Colours come only from the CSS variables in `site/styles.css`.
- Links stay `<a>` and buttons stay `<button>`; the current page gets `aria-current="page"`.
- Exact copy:
  - masthead nav: `Wydanie` · `Archiwum`;
  - reader back link: `‹ 20 lis` (day + short month from `shape.js` tables);
  - counter: `n / N`;
  - archive month heading: Polish nominative month and year, lower case in markup (e.g. `listopad 2026`);
  - archive row meta: `ok. N min`, plus ` · Tydzień w AI` / ` · Miesiąc w AI` for `kind` `weekly` / `monthly`;
  - archive filter chips: `wszystkie` plus `CATEGORY_LABELS`;
  - close button: `×` with `aria-label="Zamknij"`.
- Tests: `.tools/node/node.exe --test`.

## Review Focus

1. An archive with editions spanning two months: two month headings, newest month first. Test in Task 3.
2. Opening a reader deep link at page 5: the counter shows `5 / N` and the progress line starts there, not at page 1. Checked in Task 2 (render test + preview).
3. A company card longer than the screen: the cross stays reachable while scrolling (sticky). Preview check in Task 4.
4. Old editions without supplements, or with a `kind` other than daily/weekly/monthly, render the archive meta without `undefined`. Test in Task 3.
5. An archive category filter with no editions keeps the masthead nav and the chips and shows `Brak wydań w tej kategorii.` Test in Task 3.

---

### Task 1: Navigation in the masthead

**Files:**
- Modify: `site/js/shape.js` (export `dateParts`), `site/js/render.js` (add `mastheadNav`), `site/js/front.js` (masthead), `site/index.html` (remove `<nav class="topbar">`), `site/styles.css`
- Test: `tests/front.test.js`, `tests/shape.test.js`

**Interfaces:**
- Produces:
  - `dateParts(dateStr) -> { day: number, month: number, year: number, weekday: string, monthShort: string, monthName: string } | null`, in `shape.js`; `tabTitle` reuses it. `monthName` is the nominative month: `styczeń luty marzec kwiecień maj czerwiec lipiec sierpień wrzesień październik listopad grudzień`.
  - `mastheadNav(active: 'edition'|'archive') -> string`, in `render.js`: `<nav class="mast-nav"><a href="#/"…>Wydanie</a><span aria-hidden="true">·</span><a href="#/archiwum"…>Archiwum</a></nav>`. The active link carries `aria-current="page"`.

- [ ] **Step 1: Failing tests.**
  - `shape.test.js`: `dateParts('2026-11-20')` deep-equals `{ day: 20, month: 11, year: 2026, weekday: 'pt', monthShort: 'lis', monthName: 'listopad' }`; `dateParts('x')` is `null`.
  - `front.test.js`:
    - `renderFront(real())` contains `class="mast-nav"`, matches `/<a href="#\/"[^>]*aria-current="page"[^>]*>Wydanie/`, and contains `href="#/archiwum"`;
    - the meta line has `class="dateline"`;
    - `readFileSync('site/index.html')` no longer contains `topbar`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `dateParts` and `mastheadNav`. In the masthead, put the nav between `<h1>` and the meta line; the meta `<p>` becomes `class="dateline"`. Remove the topbar from `index.html` and its CSS rules (including `body.reading .topbar`).
  - CSS:
    - `.mast-nav`: 11 px sans, letter-spacing .12em, uppercase, `var(--ink-soft)`, centred, no underline;
    - `[aria-current="page"]`: colour `var(--ink)` with a 1.5 px `var(--accent)` bottom border;
    - `.dateline`: top and bottom 1 px `var(--rule)` borders, 4 px vertical padding, 12 px sans, `var(--ink-soft)`.
- [ ] **Step 4: Full suite.** Expected: PASS. **Commit:** `Move the navigation into the masthead.`

### Task 2: Reader bar with counter and progress line

**Files:**
- Modify: `site/js/reader.js` (`renderReader` header, `initReader` updates), `site/styles.css`
- Test: `tests/reader.test.js`

**Interfaces:**
- Consumes: `dateParts` (Task 1).
- Produces: the reader header markup `<header class="reader-bar"><a class="back" href="#/DATE">‹ D MON</a><span class="count">n / N</span></header><div class="progress"><span></span></div>`. `initReader` sets `.count` text and `.progress span` width (`n / N * 100 %`) on start and on every page change.

- [ ] **Step 1: Failing test.** `renderReader(real(), profiles, 5)`:
  - matches `/<a class="back" href="#\/2026-11-19">‹ 19 lis<\/a>/`;
  - contains `<span class="count">5 / ${total}</span>`;
  - contains `class="progress"`;
  - no longer contains `pierwsza strona`.

  Adjust the existing test `'the reader has one page per story…'`: it keeps `href="#/2026-11-19"`. Its `2 / total` assertion becomes the header counter for page 2.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Drop the per-page `<p class="page-meta">` (the header counter replaces it). In `initReader`, define a local `mark(n)` that updates the counter and width. Call it in `go()`'s caller path at start and in the observer before `onPage(n)`.
  - CSS:
    - `.reader-bar .back` and `.count`: `var(--ink-soft)`, 13 px, no underline;
    - `.progress`: 2 px, background `var(--rule)`;
    - `.progress span`: block, height 2 px, background `var(--accent)`, width transition 150 ms (none under `prefers-reduced-motion`).
- [ ] **Step 4: Preview at 375 px.** Open `#/2026-11-20/5`. Expected: `5 / 7`; the line is at about 71 %; swiping to 6 updates both.
- [ ] **Step 5: Full suite.** Expected: PASS. **Commit:** `Show the reader's place with a counter and a progress line.`

### Task 3: Archive restyle and test edition removal

**Files:**
- Modify: `site/js/render.js` (`renderArchive`), `site/styles.css`, `site/data/index.json` (drop the `2026-11-18` entry)
- Move: `site/data/2026-11-18.json` → `tests/fixtures/edition-2026-11-18.json`. Update the loaders in `tests/front.test.js:9` and `tests/shape.test.js:18`: it stays the old-format sample.
- Test: `tests/render.test.js`

**Interfaces:**
- Consumes: `mastheadNav('archive')` and `dateParts` (Task 1).
- Produces: `renderArchive(index, { category })` with this markup:
  - masthead: `<header class="masthead"><h1>Poranna prasa AI</h1>` + `mastheadNav('archive')`;
  - chips: `<nav class="chips">` with `<a class="chip" href="#/archiwum…">`; the active one has `aria-current="page"`, and `wszystkie` is active when there is no category;
  - per month: `<h3 class="month">listopad 2026</h3><ul class="days">`;
  - per edition: `<li><a href="#/DATE"><span class="day"><b>20</b><small>pt</small></span><span class="what"><span class="title">LEAD</span><span class="meta">ok. 14 min</span></span></a></li>`.

- [ ] **Step 1: Failing tests** in `render.test.js`, replacing `'renderArchive filters by category'`. Use an index with `2026-11-20` (daily, 14 min), `2026-11-19` (weekly, 13 min, `modele`) and `2026-10-31` (kind `special`, 5 min):
  - two `class="month"` headings in order: `listopad 2026` before `październik 2026`;
  - `<b>20</b><small>pt</small>`;
  - `ok. 13 min · Tydzień w AI`;
  - `ok. 5 min` with no `undefined`;
  - chip `wszystkie` has `aria-current` without a category, and the `modele` chip has it with `{ category: 'modele' }`;
  - the filtered output keeps only `2026-11-19`;
  - a category with no editions shows `Brak wydań w tej kategorii.` and still has `class="mast-nav"` and `class="chips"`;
  - titles are escaped (`<script>` title).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Group by `date.slice(0, 7)`, keeping the index order (newest first). Move the sample file, edit `index.json` and update the two loaders.
  - CSS:
    - `.chips`: flex, no wrap, horizontal scroll, scrollbar hidden;
    - `.chip`: 12 px, 1 px `var(--rule)` border, radius 999 px, padding 4 px 10 px, `var(--ink-soft)`, no underline;
    - `.chip[aria-current]`: background `var(--ink)`, colour `var(--paper)`;
    - `.month`: 11 px uppercase letter-spaced `var(--ink-soft)`;
    - `.days a`: flex, gap 12 px, top border `var(--rule)`, no underline, colour `var(--ink)`;
    - `.day b`: serif 22 px;
    - `.title`: serif 15 px;
    - `.meta`: 12 px `var(--ink-soft)`.
- [ ] **Step 4: Full suite.** Expected: PASS. **Commit:** `Restyle the archive and drop the test edition.`

### Task 4: Company card as a bottom sheet with a close cross

**Files:**
- Modify: `site/index.html` (dialog markup), `site/js/app.js` (close handlers), `site/styles.css`
- Test: `tests/front.test.js`. It already reads `index.html` in Task 1, so add the asserts there.

- [ ] **Step 1: Failing test.** `index.html` contains `<button type="button" class="sheet-close" aria-label="Zamknij">×</button>` inside `<dialog id="profile-dialog"`, and no longer contains `method="dialog"`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Dialog markup: the close button, then `<div id="profile-body"></div>`.
  - `app.js`: a click on `.sheet-close` closes the dialog. A click whose `target === dialog` (the backdrop area) also closes it. Esc stays native.
  - CSS:
    - `.sheet-close`: sticky at the top, floated right, 30 px circle, background `var(--card)`, colour `var(--ink-soft)`, 18 px;
    - mobile (`@media (max-width: 600px)`): `dialog` takes the full width with margin `auto 0 0`, `max-height: 85dvh`, radius `16px 16px 0 0`, and a 6 px slide-up animation, none under `prefers-reduced-motion`;
    - desktop: unchanged centred box with the cross at the top right.
- [ ] **Step 4: Preview at 375 px and on desktop.** Open a card from the reader. Expected:
  - the sheet comes from the bottom;
  - the cross stays visible while scrolling;
  - the cross, a tap outside and Esc all close it.
- [ ] **Step 5: Full suite.** Expected: PASS. **Commit:** `Turn the company card into a bottom sheet with a close cross.`

### Task 5: Review and ship

- [ ] **Step 1:** One fresh reviewer over the branch. Fix important findings test-first.
- [ ] **Step 2:** Ask the owner before merging into `main` and pushing (publishes the site). After the push, check the live site at 375 px: front, reader, archive and card.
