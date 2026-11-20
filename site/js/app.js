import { renderArchive, renderProfileCard, escapeHtml } from './render.js';
import { renderFront } from './front.js';
import { parseRoute, clampPage, renderReader, initReader } from './reader.js';
import { readerPages, tabTitle } from './shape.js';
import { loadConfig, saveConfig, clearConfig, storedRating, initFeedback } from './feedback.js';

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
  document.title = tabTitle('error');
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

let disposeReader = null;

// localStorage can be missing or throw (private mode); ratings are then simply off.
const store = (() => {
  try {
    window.localStorage.setItem('ppai.probe', '1');
    window.localStorage.removeItem('ppai.probe');
    return window.localStorage;
  } catch {
    return null;
  }
})();

const notice = (text) => `<p class="notice" role="status">${escapeHtml(text)}</p>`;

async function route() {
  let r = parseRoute(location.hash);
  let message = '';
  if (r.view === 'feedback') {
    // The activation link carries the private webhook address and key: store them, then drop them from the address bar.
    if (store && r.off) {
      clearConfig(store);
      message = 'Oceny wyłączone na tym urządzeniu';
    } else if (store && saveConfig(store, r.url, r.key)) {
      message = 'Oceny włączone na tym urządzeniu';
    }
    history.replaceState(null, '', '#/');
    r = parseRoute('#/');
  }
  if (disposeReader) {
    disposeReader();
    disposeReader = null;
  }
  document.body.classList.toggle('reading', r.view === 'reader');
  try {
    const index = await loadCommon();
    if (r.view === 'archive') {
      app.innerHTML = renderArchive(index, { category: r.category });
      document.title = tabTitle('archive');
      return;
    }
    const date = r.date || (index.editions[0] && index.editions[0].date);
    if (!date) {
      app.innerHTML = '<p class="no-data">Pierwsze wydanie jeszcze się nie ukazało.</p>';
      document.title = tabTitle('error');
      return;
    }
    const edition = await getJson(`data/${date}.json`);
    if (r.view === 'reader') {
      const page = clampPage(r.page, readerPages(edition).length);
      const pages = readerPages(edition);
      const config = store ? loadConfig(store) : null;
      const ratings = {};
      if (config) pages.forEach((p) => { if (p.kind === 'story') ratings[p.n] = storedRating(store, edition.date, p.n); });
      app.innerHTML = renderReader(edition, profilesById, page, { feedback: !!config, ratings });
      document.title = tabTitle('reader', edition, page);
      if (page !== r.page) history.replaceState(null, '', `#/${date}/${page}`);
      const root = app.querySelector('.reader');
      const disposePages = initReader(root, {
        page,
        onPage: (n) => {
          history.replaceState(null, '', `#/${date}/${n}`);
          document.title = tabTitle('reader', edition, n);
        },
      });
      const disposeFeedback = config
        ? initFeedback(root, {
            config,
            edition,
            pages,
            storage: store,
            fetchFn: window.fetch.bind(window),
          })
        : () => {};
      disposeReader = () => {
        disposeFeedback();
        disposePages();
      };
      return;
    }
    app.innerHTML = (message ? notice(message) : '') + renderFront(edition, profilesById);
    document.title = tabTitle('front', edition);
    window.scrollTo(0, 0);
  } catch (err) {
    console.warn(err);
    showError();
  }
}

app.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-entity]');
  if (!chip) return;
  const profile = profilesById[chip.dataset.entity];
  dialogBody.innerHTML = profile ? renderProfileCard(profile) : `<p>${escapeHtml(chip.textContent)}</p>`;
  dialog.showModal();
});

// A story image that fails (blocked hotlink, 404) is swapped for its fallback once, then hidden.
document.addEventListener(
  'error',
  (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    const figure = img.closest('figure.img');
    if (!figure) return;
    const fallback = img.dataset.fallback;
    if (fallback) {
      delete img.dataset.fallback;
      const caption = figure.querySelector('figcaption');
      if (caption) caption.textContent = img.dataset.fallbackCredit ? 'fot. ' + img.dataset.fallbackCredit : '';
      img.src = fallback;
      return;
    }
    figure.classList.add('no-img');
  },
  true,
);

window.addEventListener('hashchange', route);
route();
