# Site Redesign (front page + reader + images) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the one long page into a scrollable front page plus a swipeable reader. Tiles replace the market wall of text, rankings show what changed, stories get images, and the model writes shorter fields.

**Architecture:** The static site stays dependency-free (ES modules), with three new modules:
- `site/js/shape.js`: pure data shaping, with fallbacks for old editions;
- `site/js/front.js`: front-page markup;
- `site/js/reader.js`: reader markup and a small scroll-snap controller.

The n8n relay gets small changes in existing stages:
- `select` extracts `og:image`;
- `front` attaches images and writes the new short fields;
- `profiles` fetches Wikimedia Commons images with their credits.

A one-off workflow backfills images for existing profiles.

**Tech Stack:** Vanilla JS/CSS on GitHub Pages, `node --test`, n8n Cloud (Workflow SDK via MCP), Wikipedia/Commons APIs.

**Spec:** `docs/specs/2026-11-19-site-redesign-design.md` (approved 2026-11-19).

## Global Constraints

- All rules in `docs/superpowers/plans/2026-11-18-poranna-prasa-ai.md` → Global Constraints still apply. In short:
  - nothing global, zero npm dependencies;
  - commits authored by the owner, a one-sentence subject plus a short summary body, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  - public repo, so no secrets and no owner e-mail;
  - each n8n execution ≤ 180 s.
- Run tests with `.tools/node/node.exe --test` from the project root. Code-node tests use `tests/helpers/code-node.js`, which already removes `URL`, `URLSearchParams` and `structuredClone`.
- Deploying a changed n8n workflow:
  1. Build with `node scripts/inline-lib.mjs --build <file>`.
  2. For changed Code nodes or prompts, generate operations with `node .superpowers/build/ops.mjs <workflow> "<node>" "system:<node>:<prompt>"` and apply them with `update_workflow`.
  3. A new workflow is created as a skeleton (short placeholder jsCode), validated, then filled in with `setNodeParameter /jsCode`.
- CSP in `site/index.html` becomes exactly: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'; base-uri 'none'; form-action 'none'`.
- Every data string goes through `escapeHtml`. Any `src`/`href` taken from data must start with `https://` (source links keep the existing http/https rule).
- Images are only ever linked, never copied into the repo.
- Wikipedia images are accepted only from `https://upload.wikimedia.org/wikipedia/commons/`.
- Old editions (`2026-11-18`, `2026-11-19`) must render without errors:
  - no `market.mood` → first sentence of `market.commentary`;
  - no `why_short` → first sentence of `why`;
  - no `rankings.notes` → `rankings.commentary`;
  - no images → no image frames.
- Lengths written by the model:
  - `greeting`: 1–2 sentences;
  - `lede`: at most 2 short sentences, ~35 words;
  - lead body 400–550 words, other stories 200–300 words;
  - `market.mood`: one sentence;
  - `big_moves[].why_short`: at most ~12 words;
  - `rankings.notes`: one sentence per board.
- Layout values:
  - front-page thumbnail ~72×58 px;
  - lead image 16:9 with `object-fit: cover`;
  - at most 4 market tiles;
  - two columns from 900 px;
  - reader page max width ~680 px;
  - `prefers-reduced-motion` turns off smooth scrolling.
- Routes:
  - `#/` and `#/RRRR-MM-DD` → front page;
  - `#/RRRR-MM-DD/n` → reader page n (1 = lead, then stories, then weekly, then monthly);
  - `#/archiwum` unchanged.
- The supplement reading time is shown separately: `ok. N min` plus `+ dodatek M min` when there is a weekly/monthly.

## Review Focus

1. **Article image is blocked or 404s (hotlink protection).** Expected: the reader sees the story's fallback image, otherwise no frame at all, never a broken icon. Test: Task 2, the `imageFigure` attributes test, plus the Task 8 manual check with a blocked URL.
2. **The story's sources match no fetched article** (the model cited a related candidate). Expected: no image, an `image_fallback` from Commons if an entity has one, and no error. Test: Task 5, `attachImages` with no match.
3. **`og:image` is relative, protocol-relative (`//cdn…`) or `http:`.** Expected: relative and `//` URLs are resolved to `https:`; `http:` is rejected. Test: Task 5, `extractOgImage` cases.
4. **Deep link past the end** (`#/2026-11-19/12` on a 7-story day) or `#/2026-11-19/0`. Expected: clamped to the last or first page, no blank screen. Test: Task 3, `parseRoute` + `clampPage`.
5. **Wikimedia artist field containing HTML/links or empty.** Expected: plain text credit (`Unknown author` → `autor nieznany`) plus a license name, escaped. Test: Task 6, `parseCommonsCredit`.

---

### Task 1: Data shaping with fallbacks, and the real edition as a fixture

**Files:**
- Create: `site/js/shape.js`
- Create: `tests/fixtures/edition-2026-11-19.json` (copy of `origin/main:site/data/2026-11-19.json`)
- Test: `tests/shape.test.js`

**Interfaces:**
- Produces (all pure functions; inputs are an edition object as stored in `site/data/*.json`):
  - `firstSentence(text: string): string`. Text up to and including the first `.`, `!` or `?` followed by a space or the end. Empty string for empty input.
  - `marketMood(market): string`. Returns `market.mood`, or else `firstSentence(market.commentary)`.
  - `whyShort(move): string`. Returns `move.why_short`, or else `firstSentence(move.why)`.
  - `marketTiles(edition, max = 4): Array<{ticker, name, change: number, period: '1d'|'7d', why_type, why_short, why, sources}>`:
    - only `big_moves` with `board === 'market'`, matched to `market.rows` by `ticker.toLowerCase() === entity_id`;
    - `change` is `change_1d` when |1d| ≥ 3, else `change_7d`;
    - sorted by |change| desc, one tile per ticker.
  - `rankingChanges(edition): Array<{board, model, org, rank, delta: number|'new', why_short, why}>`:
    - rows of `rankings.lmarena|aa|hf_trending` where `delta === 'new'` or |delta| ≥ 2;
    - `why_short`/`why` come from a `big_moves` entry with that board whose `entity_id` equals `slug(model)` (lowercase, diacritics folded, non-alphanumerics → `-`, trimmed); `''` if none.
  - `rankingNotes(edition): Array<{board, text}>`. Returns `rankings.notes`, or else `[{board: null, text: rankings.commentary}]` when commentary is non-empty.
  - `readerPages(edition): Array<{kind: 'story'|'weekly'|'monthly', story?, n: number}>`. The lead first, then stories, then weekly, then monthly; `n` is 1-based.
  - `minutesLabel(edition): string`. Returns `ok. ${minutes} min`, plus ` + dodatek ${supplement_minutes} min` when `supplement_minutes > 0`.

- [ ] **Step 1: Copy the fixture.** Run `git show origin/main:site/data/2026-11-19.json > tests/fixtures/edition-2026-11-19.json`. Expected: valid JSON whose `lead_story.title` starts with `Anthropic debiutuje`.
- [ ] **Step 2: Write failing tests** in `tests/shape.test.js`, using the fixture and `site/data/2026-11-18.json`:
  - `firstSentence('Rynek spadał. Potem rósł.') === 'Rynek spadał.'` and `firstSentence('') === ''`;
  - `marketMood` returns `mood` when present, and for the 2026-11-19 fixture returns the first sentence of its commentary;
  - `marketTiles(fixture)` gives length 4; the first tile is `CRWV` with `change === -21.29` and `period === '7d'`; every tile has a non-empty `why_short`;
  - `rankingChanges` on a hand-made edition with deltas `[null, 'new', 1, -3]` returns the `'new'` and `-3` rows, with `why_short` taken from a matching `big_moves` entry (`board: 'lmarena'`, `entity_id: 'gemini-4-neon'` for model `Gemini 4 Neon`);
  - `rankingNotes` returns the commentary fallback for the fixture;
  - `readerPages` on an edition with a lead, 2 stories and a weekly returns kinds `['story','story','story','weekly']` and n `[1,2,3,4]`;
  - `minutesLabel({minutes: 15, supplement_minutes: 6}) === 'ok. 15 min + dodatek 6 min'` and `minutesLabel({minutes: 19}) === 'ok. 19 min'`.
- [ ] **Step 3: Run them.** `node --test tests/shape.test.js`. Expected: FAIL (module missing).
- [ ] **Step 4: Implement** `site/js/shape.js` with the functions above (named exports, no DOM).
- [ ] **Step 5: Run them again.** Expected: PASS.
- [ ] **Step 6: Commit.** Subject: "Add data shaping for the new front page with fallbacks for old editions."

### Task 2: Front page, images and CSP

**Files:**
- Create: `site/js/front.js`
- Modify: `site/js/render.js` (export the shared helpers below; drop `renderEdition` once `front.js` replaces it)
- Modify: `site/js/app.js` (front route uses `renderFront`; image error handling)
- Modify: `site/index.html` (CSP from Global Constraints)
- Modify: `site/styles.css`
- Test: `tests/front.test.js`; update `tests/render.test.js` (remove `renderEdition` tests that `tests/front.test.js` now covers)

**Interfaces:**
- Consumes: Task 1 `shape.js`.
- Produces:
  - `render.js` exports, in addition to the current ones: `imageFigure(image: {url, credit, link}|null, fallback: same|null, {size: 'hero'|'thumb'|'round'}): string`, `statusBadge`, `categoryBadge`, `sourcesList`, `paragraphs`, `longDate`, `pct`.
  - `imageFigure` returns `''` when neither image has an `https://` URL. When only the fallback is valid, it uses the fallback as `src`. Otherwise it renders `<figure class="img img-${size}"><img src loading="lazy" decoding="async" alt="" data-fallback="…"></figure>`, plus `<figcaption>` with the escaped credit (linked when `link` is https) for `hero`.
  - `front.js`: `renderFront(edition, profilesById): string`, with the sections in the order of spec §5.1:
    - winieta with `minutesLabel`;
    - greeting;
    - lead card linking to `#/<date>/1` with a hero image;
    - story list linking to `#/<date>/<n>` with thumbs;
    - market (mood, tiles as `<details>` with `whyShort` in the summary and the full `why` plus sources inside, `<details class="basket">` holding the table and `market.commentary`, disclaimer);
    - Sprawdzamy;
    - rankings (`rankingNotes`, `rankingChanges`, `<details>` with full top 10);
    - rumors (`<details>` each);
    - Poznaj (round image from `profile.image`, opens the dialog);
    - supplement cards linking to their reader page;
    - closing;
    - CREDITS.
  - `app.js`: one capture-phase `error` listener on `document`. For an `img` inside `figure.img`:
    - if `data-fallback` is set and not yet used, swap `src` to it and clear the attribute;
    - otherwise add class `no-img` to the figure (CSS hides it).

- [ ] **Step 1: Write failing tests** in `tests/front.test.js`:
  - `renderFront(fixture2026_11_19, {})` contains the lead title inside an `<a href="#/2026-11-19/1">` and every story title with links `#/2026-11-19/2`…;
  - exactly 4 `class="tile` occurrences;
  - the text `To nie jest porada inwestycyjna.`;
  - `<details class="basket"` holding a `<table`;
  - no `<figure` (the old edition has no images);
  - `renderFront(site/data/2026-11-18.json)` renders without throwing, and `rankingNotes` text appears;
  - an edition whose story has `image: {url: 'https://img.example/a.jpg', credit: 'CNBC', link: 'https://cnbc.com/x'}` renders `src="https://img.example/a.jpg"` and the caption `fot. CNBC`;
  - `image.url` `javascript:alert(1)` or `http://x` yields no `<img`;
  - a fallback-only image (`image: null`, `image_fallback: {url: 'https://upload.wikimedia.org/wikipedia/commons/a.png'}`) renders that src;
  - a story title `<b>x</b>` is escaped;
  - `minutesLabel` text `ok. 19 min` appears for the fixture.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement** `imageFigure` and the helper exports in `render.js`, `renderFront` in `front.js`, the front route and the error listener in `app.js`, and the CSP in `index.html`.
- [ ] **Step 4: Rewrite `site/styles.css`** for the front page per the approved mockup (`.superpowers/brainstorm/1083-1795125238/content/layout-b-images.html`):
  - greeting and lede in regular weight (no bold italic blocks);
  - a 16:9 hero, a 72×58 thumbnail and a round 44 px Poznaj image, all `object-fit: cover`;
  - a 2×2 tile grid;
  - two columns from 900 px;
  - keep dark mode;
  - `.no-img{display:none}`.
- [ ] **Step 5: Run all tests.** `node --test`. Expected: all PASS.
- [ ] **Step 6: Preview.** Run `node scripts/serve.mjs`, open `http://127.0.0.1:8080/#/2026-11-19` after copying the fixture to `site/data/2026-11-19.json` locally (do not commit that copy). Check widths 375 px and 1280 px:
  - no bold walls;
  - tiles readable;
  - the basket opens;
  - links go to `#/2026-11-19/n`.
- [ ] **Step 7: Commit.** Subject: "Rebuild the front page as a scannable overview with tiles, images and short rankings."

### Task 3: Reader with swipeable pages

**Files:**
- Create: `site/js/reader.js`
- Modify: `site/js/app.js` (routing), `site/styles.css`
- Test: `tests/reader.test.js`

**Interfaces:**
- Consumes: Task 1 `readerPages`; Task 2 `imageFigure`, badges, `sourcesList`, `paragraphs`, `entityChip`.
- Produces:
  - `parseRoute(hash: string): {view: 'front'|'reader'|'archive', date: string|null, page: number|null, category: string|null}`;
  - `clampPage(page: number, count: number): number` (1…count);
  - `renderReader(edition, profilesById, page: number): string`. It renders:
    - `<div class="reader"><header>` with `← pierwsza strona` linking to `#/<date>` and the date;
    - `<div class="pages">` with one `<section class="page" data-n="n">` per `readerPages` entry, each holding:
      - hero `imageFigure` (story `image`, `image_fallback`);
      - meta `kategoria · status · n / count`;
      - `<h2>` title, lede, body paragraphs;
      - `Dla Ciebie` box, Może dotyczyć chips, disclaimer, sources;
      - a footer with prev/next buttons carrying the neighbouring titles;
    - weekly/monthly pages show title, body, takeaways and race map.
  - `initReader(root: HTMLElement, {date, page, onPage(n)})` (browser only):
    - scrolls `.pages` to the page without animation;
    - updates the page through `IntersectionObserver` (threshold 0.6) and calls `onPage`;
    - ArrowLeft/ArrowRight and the prev/next buttons call `scrollTo` on the neighbouring page.

  `app.js` calls `history.replaceState(null, '', '#/' + date + '/' + n)` in `onPage`, without triggering `hashchange` routing.

- [ ] **Step 1: Write failing tests:**
  - `parseRoute('#/2026-11-19/3')` → `{view:'reader', date:'2026-11-19', page:3, category:null}`;
  - `parseRoute('#/')` → front with date null;
  - `parseRoute('#/archiwum?kat=modele')` → archive with category `modele`;
  - `parseRoute('#/2026-11-19/abc')` → front for that date;
  - `clampPage(12, 7) === 7` and `clampPage(0, 7) === 1`;
  - `renderReader(fixture, {}, 2)` has 7 `class="page"` sections, `2 / 7` in the second, a next button titled with story 3, no prev button on page 1, no next button on the last page, and the escaped title.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement** `reader.js` and the routing in `app.js` (front, reader, archive; the reader clamps the page and keeps scroll position per page).
- [ ] **Step 4: Add reader CSS:**
  - `.pages{display:flex;overflow-x:auto;scroll-snap-type:x mandatory}`;
  - `.page{flex:0 0 100%;scroll-snap-align:start;overflow-y:auto;height:calc(100dvh - header)}`;
  - page content max width 680 px;
  - side arrow buttons from 900 px;
  - drop cap on the first paragraph;
  - `@media (prefers-reduced-motion: reduce)` → `scroll-behavior:auto`.
- [ ] **Step 5: Run all tests.** Expected: PASS.
- [ ] **Step 6: Preview** at 375 px and 1280 px:
  - horizontal swipe changes pages while a long story still scrolls vertically;
  - the hash updates;
  - reloading a deep link opens that page;
  - arrows and keys work on desktop.
- [ ] **Step 7: Commit.** Subject: "Add the reader that turns story pages sideways."

### Task 4: Shorter fields from the model and separate supplement minutes

**Files:**
- Modify: `schemas/edition.schema.json`, `prompts/write.md`
- Modify: `n8n/lib/edition.js` (`readingMinutes` excludes `weekly`/`monthly`; add `supplementMinutes`), `n8n/lib/period.js` (`addPeriods` sets `supplement_minutes`), `n8n/lib/write.js` (`assembleEdition`/`finalizeEdition` carry the new fields)
- Test: `tests/edition.test.js`, `tests/period.test.js`, `tests/stages.test.js`, `tests/schemas.test.js`

**Interfaces:**
- Produces:
  - schema additions:
    - `market.mood: string` (required, "One sentence on the market mood.");
    - `big_moves[].why_short: string` (required, "At most 12 words.");
    - `rankings.notes: array of {board: enum lmarena|aa|hf_trending, text: string}` (required, "One sentence per board, only from the supplied data.");
    - updated descriptions: greeting "1-2 sentences.", lede "At most 2 short sentences (about 35 words).", lead body "400-550 words.", story body "200-300 words.".
  - `write.md` Lengths section uses the same numbers and describes `mood`, `why_short` and `notes`.
  - `finalizeEdition` copies `market.mood` and `rankings.notes`; `assembleEdition` keeps `why_short`.
  - `supplementMinutes(edition): number` (0 without supplements); `addPeriods` sets `e.supplement_minutes = supplementMinutes(e)` and leaves `minutes` unchanged.
- [ ] **Step 1: Write failing tests:**
  - `readingMinutes` of an edition with a 1200-word weekly equals the same edition without it;
  - `addPeriods(...).supplement_minutes === 6` for a 1200-word weekly body;
  - `finalizeEdition` output has `market.mood` and `rankings.notes` from the checked edition;
  - `assembleEdition` keeps `big_moves[].why_short`;
  - `pickSchema(FULL, ['market'])` has `mood` in `required`;
  - the schemas test validates the updated sample.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement** the schema, prompt and lib changes. Update `tests/fixtures/edition.sample.json` with the three new fields so the schema test passes.
- [ ] **Step 4: Run all tests.** Expected: PASS.
- [ ] **Step 5: Deploy:**
  - `PPAI · write`: system prompt only;
  - `PPAI · front`: system prompt, `Build front prompt` (new schema in `FULL`) and `Assemble edition`;
  - `PPAI · period`: `Add supplements`.
- [ ] **Step 6: Commit.** Subject: "Ask the model for shorter texts and the one-line market, move and ranking fields."

### Task 5: Article images (`og:image`) through select and front

**Files:**
- Modify: `n8n/lib/news.js` (add `extractOgImage`), `n8n/lib/select.js` (`buildArticles` adds `image`), `n8n/lib/write.js` (add `attachImages`, used in `assembleEdition`)
- Modify: `n8n/workflows/select.workflow.js` (no structural change; redeploy `Build articles`), `n8n/workflows/front.workflow.js` (redeploy `Assemble edition`)
- Test: `tests/news.test.js`, `tests/stages.test.js`, `tests/workflow-select.test.js`, `tests/workflow-write.test.js`

**Interfaces:**
- Produces:
  - `extractOgImage(html: string, pageUrl: string): string|null`:
    - first `<meta>` with `property="og:image"` or `og:image:url`, then `name="twitter:image"` (attribute order free, single or double quotes);
    - `//host/x` → `https://host/x`; `/x` → `https://<page host>/x`; `https://…` kept; `http:` or anything else → null;
    - HTML entities in the URL decoded (`&amp;`).
  - Articles get `image: {url, credit: source, link: article url}|null`.
  - `attachImages(stories, articles): stories` sets `story.image` to the image of the first article (main or related) whose normalized URL equals one of the story's source URLs, or `null`.
  - `assembleEdition` applies it to the lead and the stories.
- [ ] **Step 1: Write failing tests:**
  - `extractOgImage` handles: `content` before `property`; `//cdn.x/a.jpg`; `/img/a.jpg` with page `https://www.cnbc.com/2026/a.html` → `https://www.cnbc.com/img/a.jpg`; `http://x/a.jpg` → null; no meta → null; `&amp;` decoded; `twitter:image` used when there is no `og:image`;
  - `buildArticles` sets `image` from fetched HTML;
  - `attachImages` sets the image for a matching source with a `utm_` parameter and gives `null` when nothing matches;
  - the `Build articles` and `Assemble edition` node tests pass `image` through in the sandbox.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run all tests.** Expected: PASS.
- [ ] **Step 5: Deploy** `Build articles` (select) and `Assemble edition` (front).
- [ ] **Step 6: Commit.** Subject: "Take the article preview image for each story."

### Task 6: Commons image and credit on profile cards

**Files:**
- Modify: `n8n/lib/profiles.js`, `n8n/workflows/profiles.workflow.js`
- n8n: add columns `image_url`, `image_credit`, `image_page` (string) to `entity_profiles` (`wcapeOXWEzCIt8OK`) with `add_data_table_column`
- Test: `tests/profiles.test.js`, `tests/workflow-profiles.test.js`

**Interfaces:**
- Produces:
  - `wikiSearchUrl(query)` adds `prop=extracts%7Cinfo%7Cpageimages&piprop=thumbnail%7Cname&pithumbsize=800`;
  - `parseWikiSearch(body)` returns `{title, extract, url, image: {thumb, file}|null}`, where `image` is set only when `thumbnail.source` starts with `https://upload.wikimedia.org/wikipedia/commons/`;
  - `commonsCreditUrl(file: string): string` is `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=Artist%7CLicenseShortName&titles=File:` + `encodeURIComponent(file)`;
  - `parseCommonsCredit(body): {credit: string, page: string}|null`:
    - Artist with HTML tags stripped and whitespace collapsed, `autor nieznany` when empty;
    - credit `${artist} / ${license}, Wikimedia Commons`;
    - page `https://commons.wikimedia.org/wiki/File:` + file with spaces → `_`;
  - `profileRow(target, card, wiki, date, credit)` adds `image_url`, `image_credit`, `image_page` (empty strings when none);
  - `profilesJson` adds `image: {url, credit, link}|null`;
  - `finishEdition` sets each story's `image_fallback` to the image of its first `may_affect` profile that has one, otherwise `null`.
- Workflow: insert an HTTP node `Commons credit` between `Profile prompts` and `Profile with Haiku`:
  - one request per prompt item: GET `commonsCreditUrl(file)` when `wiki.image`, otherwise a harmless skipped item;
  - `neverError`, `continueRegularOutput`, `alwaysOutputData`;
  - `Profile rows` pairs the credit by index.

  Simpler alternative allowed: compute the credit request in `Profile prompts` and pass `credit_url`; the HTTP node uses `{{ $json.credit_url || 'https://commons.wikimedia.org/w/api.php?action=query&format=json' }}`.
- [ ] **Step 1: Write failing tests:**
  - `parseWikiSearch` with a commons thumbnail returns `image`, and with `/wikipedia/en/` returns `image: null`;
  - `parseCommonsCredit` with Artist `<a href="//x">Jan <b>K</b></a>` and license `CC BY-SA 4.0` returns `Jan K / CC BY-SA 4.0, Wikimedia Commons`;
  - an empty Artist gives `autor nieznany`;
  - `profilesJson` maps the image;
  - `finishEdition` sets `image_fallback` from `may_affect`;
  - the node tests for `Profile rows` include the credit.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement**, add the three table columns, and update the workflow source.
- [ ] **Step 4: Run all tests.** Expected: PASS.
- [ ] **Step 5: Deploy `PPAI · profiles`:**
  - add the node and connections with `update_workflow` (`addNode`, `removeConnection`, `addConnection`);
  - update the `Plan profiles`, `Profile prompts`, `Profile rows` and `Finish edition` code;
  - add `image_url`, `image_credit`, `image_page` to the `Save profiles` schema.
- [ ] **Step 6: Commit.** Subject: "Give profile cards a Commons image with its credit."

### Task 7: One-off image backfill for existing profiles

**Files:**
- Create: `n8n/workflows/backfill-images.workflow.js` (`PPAI · uzupełnij obrazki`, manual schedule trigger like `check-publish`)
- Test: `tests/workflow-backfill.test.js`

**Interfaces:**
- Consumes: Task 6 `wikiSearchUrl`, `parseWikiSearch`, `commonsCreditUrl`, `parseCommonsCredit`, plus `profileTargets`-style queries.
- Flow:
  1. Read all `entity_profiles` with an empty `image_url`.
  2. Code: build the query per row (company → `${name} company ${ticker}`, model → `${name} AI model`, else `${name} artificial intelligence`).
  3. HTTP: Wikipedia search.
  4. Code: keep rows with a commons image.
  5. HTTP: Commons credit.
  6. Code: rows `{entity_id, image_url, image_credit, image_page}`.
  7. DataTable update by `entity_id`.

  No Claude calls.
- [ ] **Step 1: Write a failing node test.** The query code makes `Apple company AAPL` for a company row; the final code pairs search and credit results by index and skips rows without an image.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement**, then create the workflow (skeleton, then code).
- [ ] **Step 4: Execute it once.** Check with `get_data_table_rows`: profiles with a Commons page image now have `image_url` and `image_credit`. List any left empty in the ledger.
- [ ] **Step 5: Commit.** Subject: "Add a one-off workflow that fills in profile images."

### Task 8: End-to-end check and owner review

- [ ] **Step 1:** Run `PPAI · daily` manually with `stop_after: ''` (about $0.18, within the approved test budget). Expected: all stages succeed, and `site/data/<today>.json` on `main` has `market.mood`, `why_short` on market moves, `rankings.notes`, and an `image` on at least half of the stories.
- [ ] **Step 2: Check the live site** in the browser pane at 375 px and 1280 px:
  - front page;
  - the reader swipe and keys;
  - a deep link;
  - the fallback: temporarily set one story image URL to `https://invalid.example/x.jpg` in DevTools, and the fallback or hidden frame appears;
  - dark mode;
  - the old editions `#/2026-11-18` and `#/2026-11-19`.
- [ ] **Step 3:** Show the owner the live edition on the phone, and fold tone/length notes into `prompts/write.md` if asked.
- [ ] **Step 4:** Whole-branch review by a fresh reviewer (Review Focus above and in the 2026-11-18 plan), fix pass, then update the ledger and commit. Subject: "Polish the redesign after the review."
