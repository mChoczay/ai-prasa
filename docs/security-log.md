# Security log

Every tool, version and external dependency adopted by this project, with how it was checked.

| Date | Item | Version | Checks | Verdict |
|---|---|---|---|---|
| 2026-11-18 | Git for Windows (installed system-wide by the owner, not by Claude) | 2.56.1.windows.1 | Latest release (2026-11-10) per GitHub releases API; Authenticode `Valid`, signer `CN=Johannes Schindelin`, issuer Microsoft ID Verified CS EOC CA 03, timestamped. | OK |
| 2026-11-18 | Node.js portable, `.tools/node/` | v26.13.1 LTS "Lithium" (security release 2026-11-10) | nodejs/security-wg `vuln/core/index.json`: 31 entries affect 26.x, all patched at ≤ 26.12.1, 0 open for 26.13.1 (OSV has no ecosystem for the Node binary, so the security-wg index is the authoritative source). Downloaded from `https://nodejs.org/dist/v26.13.1/node-v26.13.1-win-x64.zip`; size 41,166,246 B and SHA-256 `e2edda75bfb089654705cf65a13b58933bfd5f57148e8ebda916f58a2474f1f7` match `SHASUMS256.txt`. Authenticode on `node.exe`: `Valid`, signer `CN=OpenJS Foundation`, issuer Microsoft ID Verified CS AOC CA 04, timestamped. | OK |
| 2026-11-18 | npm dependencies | none | Project uses zero npm packages by design. | OK |
| 2026-11-18 | GitHub Actions in `.github/workflows/pages.yml` | actions/checkout v7.0.1 (`3d3c42e5aac5ba805825da76410c181273ba90b1`), actions/configure-pages v6.0.0 (`45bfe0192ca1faeb007ade9deae92b16b8254a0d`), actions/upload-pages-artifact v5.0.0 (`fc324d3547104276b827a68afc52ff2a11cc49c9`), actions/deploy-pages v5.0.1 (`368f82528645a54fb793d4d04e342629a3f51346`) | Latest releases per GitHub releases API; SHAs from `git ls-remote` (lightweight tags, so the SHA is the commit); repository security advisories API returned none for all four (and for actions/upload-artifact, used inside upload-pages-artifact). Pinned by full SHA. Workflow permissions limited to `contents: read`, `pages: write`, `id-token: write`; checkout with `persist-credentials: false`. | OK |
