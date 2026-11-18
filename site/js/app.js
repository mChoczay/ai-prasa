import { renderEdition, renderArchive, renderProfileCard, escapeHtml } from './render.js';

const app = document.getElementById('app');
const dialog = document.getElementById('profile-dialog');
const dialogBody = document.getElementById('profile-body');
let profilesById = {};
let indexCache = null;

async function getJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

function showError() {
  app.innerHTML = '<p class="error">Nie udało się wczytać wydania.</p><p><a href="#/archiwum">Przejdź do archiwum</a></p>';
}

async function loadCommon() {
  if (!indexCache) indexCache = await getJson('data/index.json');
  if (!Object.keys(profilesById).length) {
    try {
      const data = await getJson('data/profiles.json');
      profilesById = Object.fromEntries((data.profiles || []).map((p) => [p.id, p]));
    } catch {
      profilesById = {};
    }
  }
  return indexCache;
}

async function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [pathPart, query = ''] = hash.split('?');
  try {
    const index = await loadCommon();
    if (pathPart === 'archiwum') {
      const category = new URLSearchParams(query).get('kat');
      app.innerHTML = renderArchive(index, { category });
      document.title = 'Archiwum · Poranna prasa AI';
      return;
    }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(pathPart) ? pathPart : index.editions[0] && index.editions[0].date;
    if (!date) {
      app.innerHTML = '<p class="no-data">Pierwsze wydanie jeszcze się nie ukazało.</p>';
      return;
    }
    const edition = await getJson(`data/${date}.json`);
    app.innerHTML = renderEdition(edition, profilesById);
    document.title = `${edition.lead_story ? edition.lead_story.title : date} · Poranna prasa AI`;
    window.scrollTo(0, 0);
  } catch (err) {
    console.warn(err);
    showError();
  }
}

app.addEventListener('click', (event) => {
  const chip = event.target.closest('.entity');
  if (!chip) return;
  const profile = profilesById[chip.dataset.entity];
  dialogBody.innerHTML = profile ? renderProfileCard(profile) : `<p>${escapeHtml(chip.textContent)}</p>`;
  dialog.showModal();
});

window.addEventListener('hashchange', route);
route();
