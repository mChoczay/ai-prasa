// Quiet per-story ratings and notes. Shown only on devices enabled by the link in the morning mail,
// which stores the private webhook address and key in localStorage. Nothing here is in the public code.
import { escapeHtml } from './render.js';

const CONFIG_KEY = 'ppai.feedback';
const RATINGS = ['more', 'ok', 'less'];
const LABELS = Object.freeze({ more: 'więcej takich', ok: 'w sam raz', less: 'mniej takich' });
const DEBOUNCE_MS = 2000;
const NOTE_MAX = 1000;

const ratingKey = (date, n) => `ppai.rating.${date}.${n}`;
const isHttps = (url) => typeof url === 'string' && url.startsWith('https://');

export function loadConfig(storage) {
  try {
    const c = JSON.parse(storage.getItem(CONFIG_KEY) || 'null');
    return c && isHttps(c.url) && typeof c.key === 'string' && c.key ? { url: c.url, key: c.key } : null;
  } catch {
    return null;
  }
}

// Storage can refuse writes (full, private mode); none of these may throw into the page.
export function saveConfig(storage, url, key) {
  if (!isHttps(url) || typeof key !== 'string' || !key) return false;
  try {
    storage.setItem(CONFIG_KEY, JSON.stringify({ url, key }));
    return true;
  } catch {
    return false;
  }
}

export function clearConfig(storage) {
  try {
    storage.removeItem(CONFIG_KEY);
  } catch {
    /* nothing stored */
  }
}

export function storedRating(storage, date, n) {
  try {
    const v = storage.getItem(ratingKey(date, n));
    return RATINGS.includes(v) ? v : '';
  } catch {
    return '';
  }
}

export function rememberRating(storage, date, n, rating) {
  try {
    if (RATINGS.includes(rating)) storage.setItem(ratingKey(date, n), rating);
    else storage.removeItem(ratingKey(date, n));
  } catch {
    /* the rating is still sent; it just is not remembered on this device */
  }
}

export function feedbackBlock(n, rating) {
  const buttons = RATINGS.map(
    (r) => `<button type="button" class="fb-rate" data-rate="${r}" aria-pressed="${r === rating}">${LABELS[r]}</button>`,
  ).join('');
  return `<div class="feedback" data-n="${escapeHtml(n)}">
<p class="fb-row"><span class="fb-q">Jak dla Ciebie?</span>${buttons}</p>
<button type="button" class="fb-note-toggle">dodaj uwagę</button>
<div class="fb-note" hidden><textarea maxlength="${NOTE_MAX}" rows="3" placeholder="np. za dużo o giełdzie, a za mało o tym, jak tego użyć"></textarea>
<p class="fb-actions"><span class="fb-hint">trafi do jutrzejszego wydania</span><button type="button" class="fb-save">Zapisz</button></p></div>
<p class="fb-msg" role="status"></p>
</div>`;
}

export function buildRequest(config, { date, n, title, category, rating, note }) {
  const body = { k: config.key, date, n, title, category };
  if (note !== undefined) body.note = note;
  else body.rating = rating;
  // keepalive: a rating sent while the tab is closing still reaches the server.
  return { url: config.url, init: { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body), keepalive: true } };
}

const DISABLED_MESSAGE = 'Oceny wyłączone, włącz je linkiem z maila';

// Browser only. Handles rating clicks (debounced per page) and notes. Returns a dispose function.
// lifecycle: where pagehide / visibilitychange arrive (the window in the browser).
export function initFeedback(root, { config, edition, pages, storage, fetchFn, onDisabled = () => {}, lifecycle = globalThis }) {
  const timers = new Map();
  let disabled = false;

  // A rejected key turns ratings off. Blocks are removed, except the one just used and any with a
  // typed note: those keep the text and show why nothing more can be sent.
  const disable = (active) => {
    disabled = true;
    clearConfig(storage);
    for (const block of root.querySelectorAll('.feedback')) {
      const area = block.querySelector('textarea');
      const typed = area && area.value.trim();
      if (block !== active && !typed) {
        block.remove();
        continue;
      }
      block.querySelectorAll('.fb-row, .fb-note-toggle, .fb-save').forEach((el) => {
        el.hidden = true;
      });
      const msg = block.querySelector('.fb-msg');
      if (msg) msg.textContent = DISABLED_MESSAGE;
    }
    onDisabled();
  };

  const send = async (fields, block) => {
    const { url, init } = buildRequest(config, fields);
    try {
      const res = await fetchFn(url, init);
      if (res.status === 401) {
        if (!disabled) disable(block);
        return false;
      }
      const json = await res.json().catch(() => null);
      return res.ok && !!json && json.ok === true;
    } catch {
      return false;
    }
  };

  const fieldsFor = (n) => {
    const page = pages[n - 1];
    const story = page && page.story ? page.story : {};
    return { date: edition.date, n, title: String(story.title || ''), category: String(story.category || '') };
  };

  const setPressed = (block, rating) => {
    block.querySelectorAll('.fb-rate').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rate === rating)));
  };

  const message = (block, text) => {
    const el = block.querySelector('.fb-msg');
    if (el) el.textContent = text;
  };

  const onClick = (event) => {
    if (disabled) return;
    const block = event.target.closest('.feedback');
    if (!block) return;
    const n = Number(block.dataset.n);

    const rateBtn = event.target.closest('.fb-rate');
    if (rateBtn) {
      const before = storedRating(storage, edition.date, n);
      const rating = rateBtn.getAttribute('aria-pressed') === 'true' ? '' : rateBtn.dataset.rate;
      setPressed(block, rating);
      rememberRating(storage, edition.date, n, rating);
      message(block, '');
      const pending = timers.get(n);
      const sentBefore = pending ? pending.sentBefore : before;
      if (pending) clearTimeout(pending.id);
      const run = async () => {
        timers.delete(n);
        const ok = await send({ ...fieldsFor(n), rating }, block);
        if (!ok && !disabled) {
          setPressed(block, sentBefore);
          rememberRating(storage, edition.date, n, sentBefore);
          message(block, 'Nie zapisano, spróbuj jeszcze raz');
        }
      };
      timers.set(n, { id: setTimeout(run, DEBOUNCE_MS), run, sentBefore });
      return;
    }

    if (event.target.closest('.fb-note-toggle')) {
      const box = block.querySelector('.fb-note');
      box.hidden = !box.hidden;
      if (!box.hidden) box.querySelector('textarea').focus();
      return;
    }

    const saveBtn = event.target.closest('.fb-save');
    if (saveBtn) {
      const area = block.querySelector('textarea');
      const note = area.value.trim().slice(0, NOTE_MAX);
      if (!note) return;
      saveBtn.disabled = true;
      send({ ...fieldsFor(n), note }, block).then((ok) => {
        saveBtn.disabled = false;
        if (disabled) return;
        if (ok) {
          area.value = '';
          block.querySelector('.fb-note').hidden = true;
          block.querySelector('.fb-note-toggle').textContent = 'uwaga zapisana · dodaj kolejną';
          message(block, '');
        } else {
          message(block, 'Nie zapisano, spróbuj jeszcze raz');
        }
      });
    }
  };

  // Ratings still waiting for the debounce go out now (leaving the reader, closing or hiding the tab).
  const flush = () => {
    for (const t of [...timers.values()]) {
      clearTimeout(t.id);
      t.run();
    }
  };
  const onPageHide = () => flush();
  const onVisibility = () => {
    if (globalThis.document && globalThis.document.visibilityState === 'hidden') flush();
  };

  // While the note field has focus the strip must not scroll sideways (styles: .reader.typing .pages).
  const isNoteField = (el) => !!el && String(el.tagName || '').toUpperCase() === 'TEXTAREA' && !!el.closest && !!el.closest('.feedback');
  const onFocusIn = (event) => {
    if (isNoteField(event.target)) root.classList.add('typing');
  };
  const onFocusOut = (event) => {
    if (isNoteField(event.target)) root.classList.remove('typing');
  };

  root.addEventListener('click', onClick);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  if (lifecycle && lifecycle.addEventListener) {
    lifecycle.addEventListener('pagehide', onPageHide);
    lifecycle.addEventListener('visibilitychange', onVisibility);
  }
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    if (lifecycle && lifecycle.removeEventListener) {
      lifecycle.removeEventListener('pagehide', onPageHide);
      lifecycle.removeEventListener('visibilitychange', onVisibility);
    }
    root.classList.remove('typing');
    flush();
  };
}
