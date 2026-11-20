// Patterns for things that must never reach the public repo: the n8n instance host, API keys and tokens,
// and real e-mail addresses. Each pattern is built from parts so this file does not match itself.

const ALLOWED_MAIL_DOMAINS = ['example.com', 'example.org', 'anthropic.com', 'users.noreply.github.com'];

const PATTERNS = [
  ['n8n instance host', new RegExp('[a-z0-9-]+\\.(app\\.)?' + 'n8n' + '\\.cloud', 'i')],
  ['Anthropic API key', new RegExp('sk-' + 'ant-[A-Za-z0-9_-]{20,}')],
  ['GitHub token', new RegExp('\\b(gh[pousr]_[A-Za-z0-9]{30,}|github_' + 'pat_[A-Za-z0-9_]{30,})')],
  ['Bearer token', new RegExp('Bearer\\s+[A-Za-z0-9._~+/-]{30,}')],
];

const MAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;

export function findLeaks(text) {
  const s = String(text || '');
  const found = PATTERNS.filter(([, re]) => re.test(s)).map(([kind]) => kind);
  for (const m of s.matchAll(MAIL)) {
    const domain = m[1].toLowerCase();
    if (!ALLOWED_MAIL_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))) {
      found.push('e-mail address');
      break;
    }
  }
  return found;
}
