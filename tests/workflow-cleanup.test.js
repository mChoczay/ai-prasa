import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../n8n/workflows/cleanup.workflow.js', import.meta.url), 'utf8');
const TABLES = {
  leaderboard_snapshots: '9PHj89xswPDRzjlo',
  market_snapshots: 'vgsxC2Az6D9WXUDC',
  move_log: 'VNLgCQrBHwhYOm3e',
  impact_tags: '4IfcvfENP0VE7sak',
};

test('cleanup runs monthly on the 2nd at 04:00', () => {
  assert.match(src, /field: 'months', monthsInterval: 1, triggerAtDayOfMonth: 2, triggerAtHour: 4, triggerAtMinute: 0/);
});

test('cleanup deletes rows older than 60 days from each growing table, and nothing else', () => {
  for (const [name, id] of Object.entries(TABLES)) {
    const at = src.indexOf(`cachedResultName: '${name}'`);
    assert.ok(at > 0, name);
    const block = src.slice(src.lastIndexOf('node({', at), src.indexOf('});', at));
    assert.ok(block.includes(`value: '${id}'`), `${name} id`);
    assert.match(block, /operation: 'deleteRows'/, name);
    assert.match(block, /keyName: 'createdAt', condition: 'lt', keyValue: expr\("\{\{ \$today\.minus\(60, 'days'\)\.toISO\(\) \}\}"\)/, name);
  }
  for (const keep of ['topics_history', 'cost_ledger', 'reader_feedback', 'entity_profiles', 'glossary_terms', 'vuln_log', 'vuln_runs']) {
    assert.ok(!src.includes(`cachedResultName: '${keep}'`), `${keep} is kept`);
  }
});

test('one failed delete does not stop the others', () => {
  assert.equal((src.match(/onError: 'continueRegularOutput'/g) || []).length, 4);
  assert.equal((src.match(/alwaysOutputData: true/g) || []).length, 4);
});
