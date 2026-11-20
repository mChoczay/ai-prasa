// Relay stage "publish": the files of one site commit (edition, index, profiles) and the history rows.
// Imports are stripped by scripts/inline-lib.mjs; inline edition.js first.
import { upsertIndex } from './edition.js';

const DATA_DIR = 'site/data';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function indexEntry(edition) {
  const stories = [edition.lead_story, ...(edition.stories || [])].filter(Boolean);
  const categories = [];
  for (const s of stories) if (s.category && !categories.includes(s.category)) categories.push(s.category);
  return {
    date: edition.date,
    kind: edition.edition || 'daily',
    lead_title: edition.lead_story ? edition.lead_story.title : '',
    minutes: edition.minutes || 1,
    categories,
  };
}

function _parseIndex(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && Array.isArray(parsed.editions) ? parsed : { editions: [] };
  } catch {
    return { editions: [] };
  }
}

// Git tree entries for one commit. With removeDate (a test cleanup), that edition's file is deleted and
// its index entry dropped instead of publishing.
function publishTree({ edition, indexRaw, profilesJson, glossaryJson = null, removeDate }) {
  let index = _parseIndex(indexRaw);
  const tree = [];
  const file = (path, data) => ({ path, mode: '100644', type: 'blob', content: `${JSON.stringify(data, null, 1)}\n` });
  if (removeDate) {
    if (!DATE.test(removeDate)) throw new Error(`bad date to remove: ${removeDate}`);
    index = { ...index, editions: index.editions.filter((e) => e.date !== removeDate) };
    tree.push({ path: `${DATA_DIR}/${removeDate}.json`, mode: '100644', type: 'blob', sha: null });
  } else {
    if (!edition || !DATE.test(String(edition.date))) throw new Error('publish: edition without a valid date');
    index = upsertIndex(index, indexEntry(edition));
    tree.push(file(`${DATA_DIR}/${edition.date}.json`, edition));
    if (profilesJson && Array.isArray(profilesJson.profiles)) tree.push(file(`${DATA_DIR}/profiles.json`, profilesJson));
    if (glossaryJson && Array.isArray(glossaryJson.terms)) tree.push(file(`${DATA_DIR}/glossary.json`, glossaryJson));
  }
  tree.push(file(`${DATA_DIR}/index.json`, index));
  const message = removeDate ? `Remove the test edition for ${removeDate}.` : `Publish the edition for ${edition.date}.`;
  return { tree, index, message };
}

export { indexEntry, publishTree };
