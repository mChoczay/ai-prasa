# Data sources

Checked 2026-11-18. Every source is free and read without bypassing any bot protection.

## News feeds (`news_sources` table)

12 feeds verified to return RSS/Atom: OpenAI News, Google DeepMind Blog, Google AI Blog, NVIDIA Blog, Hugging Face Blog, The Verge AI, TechCrunch AI, Ars Technica AI, MIT Technology Review AI, Simon Willison, CNBC Technology, Hacker News (official `news.ycombinator.com/rss`).

Not used:
- Reddit (r/LocalLLaMA, r/singularity, r/MachineLearning) — 404/429 for unauthenticated reads.
- VentureBeat — 429.
- Anthropic, Mistral, Meta AI — no reachable RSS feed.
- Reuters, Bloomberg, The Information — no public feed or paywalled; their stories arrive through outlets that cite them.

## LMArena

- Source: official dataset `lmarena-ai/leaderboard-dataset` on Hugging Face (license **CC BY 4.0**, not gated, updated daily). The lmarena.ai site itself returns 403 to automated requests, so it is not scraped.
- Request: `GET https://datasets-server.huggingface.co/rows?dataset=lmarena-ai/leaderboard-dataset&config=text&split=latest&offset=0&length=100`. Rows of category `overall` come first. The `/filter` endpoint with `where="category"='overall'` also works but has intermittent HF errors and rejects `orderby`.
- Fields used: `model_name`, `organization`, `rating`, `rank`, `category`, `leaderboard_publish_date`.
- Attribution: credited in the site footer (CC BY 4.0).
- Parser: `parseLmarena`. Fixture: `tests/fixtures/sources/lmarena-text-overall.json` (real response).

## Hugging Face trending

- Request: `GET https://huggingface.co/api/models?sort=trendingScore&limit=20`. No key.
- Fields used: `id` (`org/name`), `trendingScore`.
- Parser: `parseHfTrending`. Fixture: `tests/fixtures/sources/hf-trending.json` (real response).

## Artificial Analysis

- Request: `GET https://artificialanalysis.ai/api/v2/language/models/free`, header `x-api-key`. Free key from the owner's Artificial Analysis account (stored as an n8n Header Auth credential, never in the repo).
- Limit: 100 requests per 24-hour window (one call per day is enough). 429 responses carry `Retry-After`.
- Attribution required on every use: credited in the site footer with a link to https://artificialanalysis.ai/.
- Fields used: `data[].name`, `data[].model_creator.name`, `data[].evaluations.artificial_analysis_intelligence_index`.
- Pagination: 200 models per page, 4 pages (2026-11-19); only ~1 in 4 models carries an Intelligence Index score. The workflow fetches all pages (4 requests/day of the 100 allowed) and passes them to the parser as an array.
- Credential: n8n **Custom Auth** `Artificial Analysis` (`{"headers":{"x-api-key":"…"}}`).
- Parser: `parseAaModels` (one page or an array of pages). Fixture: `tests/fixtures/sources/aa-models-free.json` (real response, trimmed to 30 scored + 5 unscored models).

## Stock prices

- Stooq serves a JavaScript proof-of-work bot check instead of CSV, so it is not used (bypassing it is not allowed).
- Source: **Massive** (formerly Polygon) free plan, owner's key in n8n **Custom Auth** `Massive` (`{"headers":{"Authorization":"Bearer …"}}`).
- Request per ticker: `GET https://api.massive.com/v2/aggs/ticker/{T}/range/1/day/{today-45d}/{yesterday}?adjusted=true&sort=asc&limit=120`. Free tier: 5 requests/min, end-of-day data (`status: DELAYED`), so requests are spaced ~13 s apart (about 4 minutes for the basket).
- Fields used: `results[].t` (bar start, ms) and `results[].c` (close).
- Coverage: US listings and ADRs only. Samsung (005930.KS) and SK hynix (000660.KS) have no free source and are skipped by the numbers workflow (tickers with a dot).
- Parser: `parseMassiveAggs`. Fixture: `tests/fixtures/sources/massive-nvda-daily.json` (real response).

## n8n Gateway credits (Brave Search, Firecrawl)

From docs.n8n.io (Gateway credits pages):
- New Cloud users get a small one-time amount of free credit at sign-up. The docs state no monthly allowance.
- "Nodes using Gateway credits fail when your instance's balance reaches zero." Nodes with your own credentials are not affected.
- The balance can dip slightly below zero within one execution, and n8n deducts the overspend from the next top-up.
- Auto top-up exists, is **off by default**, and charges the saved payment method when enabled.
- Consequence for this project: Brave and Firecrawl are optional extras. Every node using them continues on failure, and the pipeline works without them (RSS plus plain HTTP fetch).
