// Runs an n8n Code node's jsCode (from a built workflow) locally with a fake $ / $input / $today.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildWorkflow } from '../../scripts/inline-lib.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// Returns the jsCode string of the Code node named nodeName in a workflow source file.
export function codeNodeSource(workflowFile, nodeName) {
  const built = buildWorkflow(readFileSync(path.join(ROOT, workflowFile), 'utf8'));
  const at = built.indexOf(`name: '${nodeName}'`) >= 0 ? built.indexOf(`name: '${nodeName}'`) : built.indexOf(`name: "${nodeName}"`);
  if (at < 0) throw new Error(`node not found: ${nodeName}`);
  const rest = built.slice(at);
  const start = rest.indexOf('jsCode:');
  const end = rest.indexOf('\n    },\n', start);
  const expr = rest.slice(start + 'jsCode:'.length, end).trim().replace(/,\s*$/, '');
  return new Function(`return (${expr});`)();
}

// nodes: { 'Node name': [json, json, ...] } ; input: [json, ...]
// globals: names to shadow inside the code, e.g. { URL: undefined } to mimic the n8n sandbox.
export function runCodeNode(code, { nodes = {}, input = [], today = new Date(), globals = {} } = {}) {
  const $ = (name) => {
    if (!(name in nodes)) throw new Error(`unexpected node reference: ${name}`);
    const items = nodes[name].map((json) => ({ json }));
    return { all: () => items, first: () => items[0], item: items[0] };
  };
  const inputItems = input.map((json) => ({ json }));
  const $input = { all: () => inputItems, first: () => inputItems[0] };
  const names = Object.keys(globals);
  const fn = new Function('$', '$input', '$today', '$runIndex', ...names, code);
  return fn($, $input, today, 0, ...names.map((n) => globals[n]));
}
