# Rankings by Area and Archive Without Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the front page's long "Rankingi · co się zmieniło" list with an area switcher (Programowanie, Agenci, Pisanie, Po polsku, Matematyka, Obrazy; top 5 of the chosen area) fed by LMArena area leaderboards, and drop the archive's category filters.

**Architecture:**
- **Data.** A new `n8n/lib/areas.js` builds the six LMArena requests and turns the responses plus the previous snapshots into `rankings.areas`. It reuses `parseLmarena` (now with a category parameter), `collapseVariants` and `diffLeaderboard`. `PPAI · numbers` gets two nodes (`Area requests` → `LMArena areas`) and calls it from `Compute numbers`.
- **Edition.** `finalizeEdition` copies `rankings.areas` into the edition, outside Claude's schema.
- **Site.** The front page renders pills plus lists, and a delegated click handler in `app.js` switches them and remembers the choice.

**Tech Stack:** Vanilla ES modules and CSS on GitHub Pages, n8n Cloud Code/HTTP nodes, `node --test`.

**Spec:** `docs/specs/2026-11-20-rankings-areas-design.md` (approved 2026-11-20).

## Global Constraints

- All rules of `docs/superpowers/plans/2026-11-18-poranna-prasa-ai.md` → Global Constraints still apply:
  - nothing global, zero npm dependencies;
  - commits authored by the owner (`git -c user.name=mChoczay`), with a one-sentence subject, a short summary body, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  - public repo: never commit the n8n instance host, the feedback key or the owner e-mail;
  - each n8n execution ≤ 180 s.
- Tests: `.tools/node/node.exe --test` from the project root. Code-node tests use `tests/helpers/code-node.js` (no `URL`/`URLSearchParams`/`structuredClone`).
- n8n deploy: build with `scripts/inline-lib.mjs`; change Code nodes through `.superpowers/build/ops.mjs` + `update_workflow`; add nodes with node/connection operations; `validate_workflow` after each update.
- Site:
  - CSP unchanged, so no inline `style="…"` in markup;
  - colours only from `site/styles.css` variables;
  - every data string through `escapeHtml`;
  - pills are real `<button type="button">` with `aria-pressed`.
- Areas, in this order (key, label, LMArena config, category):
  - `webdev` · `Programowanie` · `webdev` · `overall`
  - `agent` · `Agenci` · `agent` · `overall`
  - `writing` · `Pisanie` · `text` · `creative_writing`
  - `polish` · `Po polsku` · `text` · `polish`
  - `math` · `Matematyka` · `text` · `math`
  - `image` · `Obrazy` · `text_to_image` · `overall`
- Snapshot board names: `area_<key>`.
  - Store the top 20.
  - Show an arrow for any shift of 1 or more (`diffLeaderboard` with `minShift: 1, topN: 20`).
  - Put the top 10 into the edition; the page shows 5.
- `rankings.areas` is never added to `schemas/edition.schema.json` (it is also Claude's response schema) and never reaches a prompt, `big_moves`, `ranking_moves`, `follow_ups` or `leaderboard_top`.
- Exact copy:
  - section heading `Rankingi`;
  - rising/falling markers `▲N` / `▼N`;
  - `nowy` for a new entry;
  - `nowy lider` beside first place when the leader changed;
  - details summary `pełne rankingi`.
- localStorage key for the chosen area: `ppai.area`. The default is the first area (`webdev`).

## Review Focus

1. **An area missing or failing** (HTTP 503, empty rows, bad JSON). That area is left out of `rankings.areas` and its key goes into `areas_missing`. The page shows the remaining pills, and a stored choice that is now missing falls back to the first available area. Tests in Task 1 and Task 3.
2. **First day with no previous area snapshot.** No arrows, no `nowy`, no `nowy lider`. Test in Task 1.
3. **Old editions without `rankings.areas`, or with `[]`.** No pills; the notes are visible above a collapsed `pełne rankingi`; no `.changes` list. Test in Task 3 with the 2026-11-18 fixture.
4. **Model variants and duplicates within an area** (`X (High)` and `X (Max)`). One row per base model, ranks 1..n without gaps. Test in Task 1.
5. **Unknown or hostile stored area key** (`ppai.area` = `"<x>"` or a removed key). It is ignored and nothing is injected. Test in Task 3.

---

### Task 1: Area data library

**Files:**
- Create: `n8n/lib/areas.js`, `tests/areas.test.js`, `tests/fixtures/sources/lmarena-area-polish.json`
- Modify: `n8n/lib/parsers.js` (`parseLmarena`), `tests/parsers.test.js`

**Interfaces:**
- Produces:
  - `parseLmarena(input, category = 'overall') -> Array<{rank, model, org, score}> | null`: the existing behaviour, with the category filter made a parameter.
  - `AREAS`: frozen array of `{ key, label, config, category }` in the Global Constraints order.
  - `areaRequests() -> Array<{ key: string, url: string }>`, one per area in order. URL: `https://datasets-server.huggingface.co/filter?dataset=lmarena-ai/leaderboard-dataset&config=<config>&split=latest&where=<encodeURIComponent("\"category\"='<category>'")>&orderby=<encodeURIComponent('"rank"')>&offset=0&length=60`. Use string building only (no `URL`).
  - `buildAreas(responses, prevRows) -> { areas, missing, writes }`:
    - `responses[i]` is the HTTP body (or `null` for a failure) for `AREAS[i]`;
    - `prevRows` are snapshot rows `{date, board, rank, model, org, score}` dated before today;
    - `areas`: `Array<{ key, label, new_leader: boolean, rows: Array<{ rank, model, org, delta: number|'new'|null }> }>` (≤10 rows);
    - `missing`: keys whose response gave no rows;
    - `writes`: `Array<{ board: 'area_<key>', rank, model, org, score }>` (top 20 per area, without `date`; the caller adds it).

- [ ] **Step 1: Save a real fixture.** Write the `areaRequests()` URL for `polish` (by hand for now) with `curl -s` into a new empty scratch directory. Check that it parses as JSON and has `rows[].row.category === 'polish'`. Copy it to `tests/fixtures/sources/lmarena-area-polish.json`. It is data only; never run anything from it.
- [ ] **Step 2: Failing tests.**
  - `parsers.test.js`: `parseLmarena(fixture('lmarena-area-polish.json'), 'polish')` returns a non-empty list ranked 1..n. `parseLmarena(same)` (default `overall`) returns an empty list.
  - `areas.test.js`:
    - `areaRequests()` has 6 entries, keys `['webdev','agent','writing','polish','math','image']`. The `polish` URL contains `config=text`, `%22category%22%3D'polish'` (as `encodeURIComponent` produces it) and `length=60`. No URL contains a space.
    - `buildAreas` with the polish fixture at index 3 and `null` elsewhere:
      - `areas.map(a => a.key)` equals `['polish']`;
      - `missing` equals the other five keys;
      - `areas[0].label === 'Po polsku'`;
      - rows ≤ 10, ranks 1..n;
      - no model name contains `(`;
      - every `delta` is `null`;
      - `new_leader === false`;
      - `writes.length` ≤ 20 and every `board === 'area_polish'`.
    - With `prevRows` built from that output's writes (dated `2026-11-19`), with places 1 and 3 swapped and one name replaced by `'Gone Model'`:
      - row 1 (previously 3rd) has `delta` 2;
      - row 3 (previously 1st) has `delta` −2;
      - the model that replaced `Gone Model` has `delta` `'new'`;
      - `new_leader === true`.
    - With prev identical to current: every `delta` is `null` and `new_leader === false`.
    - A response of `{ rows: [] }`, `'garbage'` or `{}` puts the key in `missing`.
- [ ] **Step 3: Run.** `.tools/node/node.exe --test tests/areas.test.js tests/parsers.test.js`. Expected: FAIL.
- [ ] **Step 4: Implement.**
  - `parseLmarena` takes `category`.
  - `areas.js` imports `parseLmarena` and `collapseVariants` from `./parsers.js`, `diffLeaderboard` from `./moves.js`, and `entityId` from `./news.js`, the same way `moves.js` imports its dependencies. `inline-lib` strips the imports, and the head comment names the files to inline alongside.
  - The delta for a row comes from the `diffLeaderboard(prevTop20, currTop20, { board, minShift: 1, topN: 20 })` move with that `entity_id`. `up` gives `from - to`, `down` gives `-(to - from)`, `new` gives `'new'`, otherwise `null`.
  - `new_leader` is true only when the previous list exists and its rank-1 `entityId` differs from today's.
- [ ] **Step 5: Run.** The same command, then the full suite. Expected: PASS. **Commit:** `Build ranking areas from the LMArena leaderboards.`

### Task 2: Areas in `PPAI · numbers` and in the edition

**Files:**
- Modify: `n8n/workflows/numbers.workflow.js`, `n8n/lib/write.js` (`finalizeEdition`)
- Test: `tests/workflow-numbers.test.js`, `tests/stages.test.js`

**Interfaces:**
- Consumes: `AREAS`, `areaRequests`, `buildAreas` (Task 1).
- Produces:
  - `numbers.rankings.areas` (array, possibly empty);
  - top-level `numbers.areas_missing: string[]`;
  - the edition field `rankings.areas` (array, `[]` when absent).

- [ ] **Step 1: Failing tests.**
  - In `workflow-numbers.test.js`:
    - `baseNodes` gains `'Area requests'` (6 items from `areaRequests()` shape) and `'LMArena areas'`. The latter defaults to six `{ statusCode: 503, body: 'down' }` items, so the existing count assertions keep their meaning.
    - New test: with `'LMArena areas'` holding the polish fixture (`ok(...)`) at index 3 and failures elsewhere:
      - `json.rankings.areas.map(a => a.key)` is `['polish']`;
      - `json.areas_missing.length === 5`;
      - `json.writes.boards` includes rows with `board === 'area_polish'` and today's `date`;
      - `json.ranking_moves` has no `board` starting with `area_`;
      - `json.leaderboard_top` is unchanged versus the default run.
    - With previous `area_polish` snapshot rows, a delta appears in `rankings.areas[0].rows`.
  - In `stages.test.js`:
    - `finalizeEdition` with `numbers.rankings.areas = [{ key: 'polish', … }]` copies it to `edition.rankings.areas`;
    - with no `areas`, `edition.rankings.areas` deep-equals `[]`;
    - `frontPrompt({ numbers: { rankings: { areas: [{ key: 'polish', label: 'Po polsku', rows: [{ rank: 1, model: 'Area Only Model' }] }] } }, … })` does not contain `Area Only Model`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Nodes.** Add Code node `Area requests` (runOnceForAllItems): `INLINE` of `areas.js` plus whatever its imports need to evaluate, then `return areaRequests().map((r) => ({ json: r }));`. Add HTTP node `LMArena areas`:
    - GET `{{ $json.url }}`;
    - `onError: 'continueRegularOutput'`;
    - full response, `neverError`, JSON, timeout 30000;
    - batching 1 per 500 ms.

    Chain them after `Hugging Face trending` and before `AA page list`.
  - **`Compute numbers`.**
    - Inline `areas.js` after `moves.js`.
    - Call `buildAreas($('LMArena areas').all().map(ok-or-null), prevRows)`, pairing by index with `AREAS`.
    - Set `rankings.areas`; add `area_*` writes with `date` to `boardWrite`; return `areas_missing`.
  - **`Return numbers`** already passes every field except `writes`.
  - **`finalizeEdition`:** `areas: Array.isArray(rankings.areas) ? rankings.areas : []`.
- [ ] **Step 4: Run** the full suite. Expected: PASS. **Commit:** `Fetch the ranking areas in the numbers stage and keep them in the edition.`

### Task 3: Front page area switcher

**Files:**
- Modify: `site/js/front.js` (`rankingsSection`, `renderFront`), `site/js/shape.js` (add `rankingAreas`, remove `rankingChanges`), `site/js/app.js`, `site/styles.css` (area pills/list; remove `.changes`)
- Test: `tests/front.test.js`, `tests/shape.test.js` (drop the `rankingChanges` test), `tests/area-switch.test.js` (new, uses `tests/helpers/fake-dom.js`)

**Interfaces:**
- Consumes: the edition field `rankings.areas` (Task 2).
- Produces:
  - `rankingAreas(edition) -> Array<{ key, label, new_leader, rows }>`. It keeps only areas with a string key and label and at least one row, and keeps 5 rows each.
  - `pickArea(areas, stored) -> string`: `stored` if it is one of the area keys, else the first key, else `''`.
  - `renderFront(edition, profilesById, { area = '' } = {})`.
  - `selectArea(section, key)` in `front.js`. It sets `aria-pressed` on `.area-chip` buttons (`dataset.area === key`) and `hidden` on `.area-list` elements whose `dataset.area !== key`, and returns whether `key` existed.

- [ ] **Step 1: Failing tests.**
  - `front.test.js`, with an edition built from the fixture plus `rankings.areas` (two areas: `webdev` with 7 rows, leader `delta: null`, row 2 `delta: 2`, row 3 `delta: -1`, row 4 `delta: 'new'`; `polish` with `new_leader: true`):
    - the section contains `<h3>Rankingi</h3>`;
    - two `class="area-chip"` buttons with `type="button"`, `webdev` with `aria-pressed="true"`;
    - the `polish` list carries `hidden`;
    - 5 `<li>` in the webdev list;
    - `▲2`, `▼1` and `nowy`;
    - the polish list contains `nowy lider`;
    - no `class="changes"`;
    - `<details class="full"><summary>pełne rankingi</summary>` contains the notes.
  - `renderFront(e, {}, { area: 'polish' })` presses `polish` and hides `webdev`. `{ area: '<x>' }` presses `webdev`, and the output does not contain `<x>`.
  - A model named `<script>` is escaped.
  - **Old fixture** (`edition-2026-11-18.json`, and the same with `areas: []`):
    - no `area-chip`;
    - the notes or commentary appear before `<details class="full">`;
    - no `class="changes"`.
  - `area-switch.test.js` (fake DOM):
    - `selectArea(section, 'polish')` returns true, flips `aria-pressed` and `hidden` on both pairs;
    - `selectArea(section, 'nope')` returns false and changes nothing.
  - `shape.test.js`: `pickArea([{key:'webdev'},{key:'polish'}], 'polish') === 'polish'`, `pickArea(…, 'x') === 'webdev'`, `pickArea([], 'x') === ''`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Markup.**
    - The pills sit in `<div class="chips" role="group" aria-label="Obszar">`.
    - Each list is `<ol class="area-list" data-area="KEY">`.
    - A row is `<li><span class="m">MODEL</span> <span class="org">ORG</span> <span class="chg up|down|new">…</span></li>`, with `<span class="new-leader">nowy lider</span>` on row 1 when `new_leader`.
  - **`app.js`.**
    - Reads `ppai.area` from `store` (try/catch) and passes `pickArea(rankingAreas(edition), stored)` to `renderFront`.
    - In the existing delegated `app` click listener, a click inside `.area-chip` calls `selectArea(chip.closest('.rankings'), chip.dataset.area)`; when that returns true, it saves `ppai.area` (try/catch).
  - **CSS.** Reuse `.chips`/`.chip`, with a button reset (`font: inherit`, `background: none`, `cursor: pointer`). `.chip[aria-pressed="true"]` matches `.chip[aria-current]`. `.area-list` is a numbered list in serif. `.org` and `.chg` are 12 px `var(--ink-soft)`. `.chg.up` and `.chg.down` use the existing up/down colours, if `styles.css` has them, else `var(--ink-soft)`. `.new-leader` uses the accent colour. Remove the `.changes` rules.
  - Remove `rankingChanges` and its import.
- [ ] **Step 4: Preview at 375 px.** Serve the site locally with a copy of today's edition that has `rankings.areas` added (from a `check numbers` output or hand-made); never commit that copy to `site/data`.
  - Expected:
    - the section is about 220 px tall;
    - tapping `Po polsku` switches the list;
    - a reload keeps `Po polsku`;
    - the old 2026-11-19 edition shows notes and `pełne rankingi` without pills.
- [ ] **Step 5: Full suite.** Expected: PASS. **Commit:** `Show the rankings as an area switcher on the front page.`

### Task 4: Archive without category filters

**Files:**
- Modify: `site/js/render.js` (`renderArchive`), `site/js/app.js` (call), `site/styles.css` (keep `.chips`/`.chip`, now used only by Task 3, and update the archive comment)
- Test: `tests/render.test.js`

- [ ] **Step 1: Failing test.** Replace the chip and filter assertions in the archive tests:
  - `renderArchive(index)` has no `class="chip"`;
  - `renderArchive(index, { category: 'modele' })` lists all editions (the parameter is ignored);
  - month headings, rows and escaping stay as they are;
  - `Brak wydań w tej kategorii.` becomes `Brak wydań.` for an empty index.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** `renderArchive(index)` drops the chips and the filter. `app.js` calls `renderArchive(index)`. `parseRoute` stays unchanged, so old `#/archiwum?kat=…` links still route to the archive.
- [ ] **Step 4: Full suite.** Expected: PASS. **Commit:** `Drop the category filters from the archive.`

### Task 5: Review, deploy and ship

- [ ] **Step 1:** Run one fresh whole-branch reviewer and fix important findings test-first.
- [ ] **Step 2: Update n8n.**
  - In `PPAI · numbers`, add the `Area requests` and `LMArena areas` nodes with their connections, and set the new `Compute numbers` code.
  - In `PPAI · front`, set the node that calls `finalizeEdition` (it inlines `write.js`).
  - Run `validate_workflow` on both.
- [ ] **Step 3: Free check.**
  - Run `PPAI · check numbers` (no Claude cost). Expected:
    - `rankings.areas` has 6 areas, each with 10 rows and no `(` in names;
    - `areas_missing` is empty;
    - the execution takes under 180 s.
  - This also saves today's `area_*` snapshots, so tomorrow's run shows arrows.
  - If an area is missing, record it in the ledger and report it; don't block.
- [ ] **Step 4: Ask the owner for one consent covering both:**
  - pushing `main` (publishes the site);
  - republishing `PPAI · numbers` and `PPAI · front`, which the 05:30 run uses.

  After consent:
  - push, and wait for the Pages deploy;
  - `publish_workflow` both;
  - check the live front page at 375 px. Today's edition has no areas yet, so it shows the fallback without the moves list. The archive has no pills.
