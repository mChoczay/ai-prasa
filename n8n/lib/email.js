// Morning and error e-mails. Dependency-free: inlined into n8n Code nodes.

const _MAIL_WEEKDAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const _MAIL_MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

// "niedziela, 22 listopada 2026" for 2026-11-22; anything else as given.
function _mailDate(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ''));
  if (!m) return String(dateStr || '');
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const day = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return `${_MAIL_WEEKDAYS[day]}, ${d} ${_MAIL_MONTHS[mo - 1]} ${y}`;
}

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const _STATUS_STYLE = Object.freeze({
  potwierdzone: 'background:#e4efd7;color:#27500a;',
  plotka: 'background:#faeeda;color:#633806;',
  opinia: 'background:#ebe9e2;color:#444441;',
});

function _shell(inner) {
  return `<!doctype html><html lang="pl"><body style="margin:0;padding:0;background:#faf8f3;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Georgia,'Times New Roman',serif;color:#1f1d1a;font-size:16px;line-height:1.6;">
${inner}
</div></body></html>`;
}

const _MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const _MONTHS_FULL = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
const _WEEKDAYS = ['pn', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];

// "Kto czytał": visitors last week (Mon–Sun) and/or last month, from visitSummary() in visits.js.
function _visitsBlock(visits) {
  if (!visits || (!visits.week && !visits.month)) return '';
  const lines = [];
  const w = visits.week;
  if (w) {
    const [, fm, fd] = w.first.split('-').map(Number);
    const [, lm, ld] = w.last.split('-').map(Number);
    const span = fm === lm ? `${fd}–${ld} ${_MONTHS_SHORT[lm - 1]}` : `${fd} ${_MONTHS_SHORT[fm - 1]} – ${ld} ${_MONTHS_SHORT[lm - 1]}`;
    lines.push(`Tydzień ${span}: ${escapeHtml(w.total)} odwiedzających`);
    lines.push((w.days || []).map((n, i) => `${_WEEKDAYS[i]} ${escapeHtml(n)}`).join(' · '));
  }
  const m = visits.month;
  if (m) lines.push(`${_MONTHS_FULL[m.month - 1] || ''} ${escapeHtml(m.year)}: ${escapeHtml(m.total)} odwiedzających`);
  return `\n<div style="font:13px/1.6 Arial,sans-serif;color:#5b5750;border-top:1px solid #d9d4c7;margin:24px 0 0;padding-top:12px;"><p style="margin:0 0 4px;font-weight:bold;">Kto czytał</p>${lines
    .map((l) => `<p style="margin:0;">${l}</p>`)
    .join('')}</div>`;
}

function renderEmailHtml(edition, siteUrl, { feedbackUrl = '', feedbackKey = '', visits = null } = {}) {
  const stories = [edition.lead_story, ...(edition.stories || [])].filter(Boolean);
  const items = stories
    .map(
      (s) =>
        `<li style="margin:0 0 8px;"><span style="font:11px/1.6 Arial,sans-serif;padding:1px 8px;border-radius:6px;${_STATUS_STYLE[s.status] || ''}">${escapeHtml(s.status)}</span> ${escapeHtml(s.title)}</li>`,
    )
    .join('');
  const href = `${siteUrl}#/${edition.date}`;
  const html = _shell(`<h1 style="text-align:center;font-size:30px;margin:0 0 4px;">Poranna prasa AI</h1>
<p style="text-align:center;font:13px Arial,sans-serif;color:#5b5750;margin:0 0 20px;">${escapeHtml(_mailDate(edition.date))}${edition.minutes ? ` · ok. ${escapeHtml(edition.minutes)} min czytania` : ''}</p>
<p style="font-style:italic;">${escapeHtml(edition.greeting)}</p>
<ul style="padding-left:18px;">${items}</ul>
<p style="text-align:center;margin:28px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#2f4a7a;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:8px;font:15px Arial,sans-serif;">Czytaj wydanie</a></p>${_visitsBlock(visits)}${
    feedbackUrl && feedbackKey
      ? `\n<p style="text-align:center;font:12px Arial,sans-serif;margin:24px 0 0;"><a href="${escapeHtml(`${siteUrl}#/oceny?u=${encodeURIComponent(feedbackUrl)}&k=${encodeURIComponent(feedbackKey)}`)}" style="color:#8a857a;">Włącz oceny na tym urządzeniu</a></p>`
      : ''
  }`);
  return { subject: `Poranna prasa AI: ${edition.lead_story ? edition.lead_story.title : edition.date}`, html };
}

function renderErrorEmail({ step, message, kind }) {
  let subject;
  let body;
  if (kind === 'credits') {
    subject = 'Poranna prasa AI: wstrzymane – brak kredytów API';
    body = `<p>Pipeline zatrzymał się, bo na koncie API Anthropic skończyły się kredyty. Nie będzie ponawiał prób.</p>
<ol><li>Doładuj kredyty w Console (platform.claude.com → Billing).</li>
<li>W n8n uruchom ręcznie workflow <strong>PPAI · odblokuj</strong> (ustawia <code>pipeline_state.paused</code> na <code>false</code>).</li></ol>`;
  } else if (kind === 'auth') {
    subject = 'Poranna prasa AI: wstrzymane – klucz API nieważny';
    body = `<p>Pipeline zatrzymał się, bo klucz API został odrzucony (prawdopodobnie wygasł). Nie będzie ponawiał prób.</p>
<ol><li>W Console utwórz nowy klucz w workspace używanym przez n8n.</li>
<li>Wklej go do credentiala <code>Anthropic account 2</code> w n8n.</li>
<li>Uruchom ręcznie workflow <strong>PPAI · odblokuj</strong> (ustawia <code>pipeline_state.paused</code> na <code>false</code>).</li></ol>`;
  } else if (kind === 'budget') {
    subject = 'Poranna prasa AI: wstrzymane – miesięczny budżet wyczerpany';
    body = `<p>Wydatki na Claude'a w tym miesiącu doszły do limitu z <code>pipeline_state.monthly_budget_usd</code>. Wydania wrócą 1. dnia następnego miesiąca albo po podniesieniu limitu i ustawieniu <code>paused</code> na <code>false</code>.</p>`;
  } else {
    subject = `Poranna prasa AI: błąd w kroku ${step}`;
    body = `<p>Dzisiejsze wydanie nie powstało przez błąd w kroku <strong>${escapeHtml(step)}</strong>.</p>`;
  }
  const details = message ? `<p style="font:13px monospace;color:#5b5750;">${escapeHtml(message)}</p>` : '';
  return { subject, html: _shell(`<h2 style="margin-top:0;">${escapeHtml(subject)}</h2>${body}${details}`) };
}

export { escapeHtml, renderEmailHtml, renderErrorEmail };
