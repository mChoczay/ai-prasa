// Inlines n8n/lib modules into n8n Code nodes.
//   node scripts/inline-lib.mjs n8n/lib/budget.js n8n/lib/dates.js   -> prints the combined code
//   node scripts/inline-lib.mjs --build n8n/workflows/claude.workflow.js -> prints SDK code with INLINE(...) expanded
// In workflow sources, write INLINE('n8n/lib/a.js', 'n8n/lib/b.js') where a Code node's jsCode string goes;
// it is replaced by a JSON string literal of the library code that node uses, so
// `INLINE(...) + 'more code'` works.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const IMPORT_LINE = /^\s*import\s.+from\s.+;?\s*$/;
const EXPORT_LINE = /^\s*export\s*\{.*\}\s*;?\s*$/;
const DECLARATION = /^(?:async\s+)?(?:function\s*\*?\s*|const\s+|let\s+)([A-Za-z_$][\w$]*)/;

// Top-level declarations of a lib file: [{ name, text }]. A chunk starts at a column-0 `function`,
// `const` or `let` and runs until the next one.
function chunksOf(file) {
  const lines = readFileSync(path.join(ROOT, file), 'utf8')
    .split(/\r?\n/)
    .filter((line) => !IMPORT_LINE.test(line) && !EXPORT_LINE.test(line));
  const chunks = [];
  for (const line of lines) {
    const m = line.match(DECLARATION);
    if (m) chunks.push({ name: m[1], lines: [line] });
    else if (chunks.length) chunks[chunks.length - 1].lines.push(line);
  }
  return chunks.map((c) => ({ name: c.name, text: c.lines.join('\n') }));
}

// Smaller Code nodes: no comment-only lines, blank lines or indentation. The libs keep multi-line
// template literals flush left, so their text does not change.
function compact(text) {
  return text
    .split('\n')
    .filter((line) => line.trim() && !/^\s*\/\//.test(line))
    .map((line) => line.trimStart())
    .join('\n');
}

const identifiers = (text) => new Set(text.match(/[A-Za-z_$][\w$]*/g) || []);

// Combined code of the lib files. With `roots` (identifiers the node's own code uses), only the
// declarations reachable from them are kept, in their original order.
export function inlineLib(files, roots = null) {
  const chunks = files.flatMap((file) => chunksOf(file).map((c) => ({ ...c, file })));
  let keep = chunks;
  if (roots) {
    const byName = new Map(chunks.map((c) => [c.name, c]));
    const needed = new Set();
    const queue = [...roots];
    while (queue.length) {
      const name = queue.pop();
      if (!byName.has(name) || needed.has(name)) continue;
      needed.add(name);
      for (const id of identifiers(byName.get(name).text)) if (byName.has(id) && !needed.has(id)) queue.push(id);
    }
    keep = chunks.filter((c) => needed.has(c.name));
  }
  return files
    .map((file) => {
      const body = keep
        .filter((c) => c.file === file)
        .map((c) => compact(c.text))
        .join('\n');
      return body ? `// --- ${file} ---\n${body}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

// INLINE('a.js', ...) -> JS string literal of the library code the node uses. The identifiers in the
//                        rest of that jsCode expression (up to the end of its parameters block, or the
//                        next INLINE) are the roots.
// TEXT('file')          -> JS string literal of the file (prompts)
// JSONFILE('file.json') -> the file's JSON as an object literal (schemas)
export function buildWorkflow(source) {
  const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');
  return source
    .replace(/INLINE\(([^)]*)\)/g, (match, args, offset) => {
      const files = [...args.matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] || m[2]);
      const after = source.slice(offset + match.length);
      const stop = after.search(/\n\s*\},?\s*\n|INLINE\(/);
      const rest = stop >= 0 ? after.slice(0, stop) : after;
      return JSON.stringify(`${inlineLib(files, [...identifiers(rest)])}\n`);
    })
    .replace(/TEXT\('([^']+)'\)/g, (_, file) => JSON.stringify(read(file)))
    .replace(/JSONFILE\('([^']+)'\)/g, (_, file) => JSON.stringify(JSON.parse(read(file))));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--build') {
    process.stdout.write(buildWorkflow(readFileSync(path.resolve(args[1]), 'utf8')));
  } else {
    process.stdout.write(inlineLib(args));
  }
}
