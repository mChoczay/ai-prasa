// Inlines n8n/lib modules into n8n Code nodes.
//   node scripts/inline-lib.mjs n8n/lib/budget.js n8n/lib/dates.js   -> prints the combined code
//   node scripts/inline-lib.mjs --build n8n/workflows/claude.workflow.js -> prints SDK code with INLINE(...) expanded
// In workflow sources, write INLINE('n8n/lib/a.js', 'n8n/lib/b.js') where a Code node's jsCode string goes;
// it is replaced by a JSON string literal of the combined code, so `INLINE(...) + 'more code'` works.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

export function inlineLib(files) {
  return files
    .map((file) => {
      const src = readFileSync(path.join(ROOT, file), 'utf8');
      const body = src
        .split(/\r?\n/)
        .filter((line) => !/^\s*import\s.+from\s.+;?\s*$/.test(line) && !/^\s*export\s*\{.*\}\s*;?\s*$/.test(line))
        .join('\n');
      return `// --- ${file} ---\n${body}`;
    })
    .join('\n');
}

export function buildWorkflow(source) {
  return source.replace(/INLINE\(([^)]*)\)/g, (_, args) => {
    const files = [...args.matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] || m[2]);
    return JSON.stringify(`${inlineLib(files)}\n`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--build') {
    process.stdout.write(buildWorkflow(readFileSync(path.resolve(args[1]), 'utf8')));
  } else {
    process.stdout.write(inlineLib(args));
  }
}
