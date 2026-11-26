// Patterns for things that must never reach the public repo: the n8n instance host, API keys and tokens,
// and real e-mail addresses. Each pattern is built from parts so this file does not match itself.

const ALLOWED_MAIL_DOMAINS = ['example.com', 'example.org', 'anthropic.com', 'users.noreply.github.com'];

const PATTERNS = [
  ['n8n instance host', new RegExp('[a-z0-9-]+\\.(app\\.)?' + 'n8n' + '\\.cloud', 'i')],
  ['Anthropic API key', new RegExp('sk-' + 'ant-[A-Za-z0-9_-]{20,}')],
  ['GitHub token', new RegExp('\\b(gh[pousr]_[A-Za-z0-9]{30,}|github_' + 'pat_[A-Za-z0-9_]{30,})')],
  ['Bearer token', new RegExp('Bearer\\s+[A-Za-z0-9._~+/-]{30,}')],
];

// Organisations' public mailboxes (where to report a bug, the press office) appear in news texts. On a
// free-mail domain the same name could be anyone's private address, so those stay flagged.
const ROLE_MAILBOXES = ['security', 'psirt', 'cert', 'abuse', 'press', 'media', 'info', 'support', 'privacy', 'legal'];
const FREE_MAIL_DOMAINS = ['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'proton.me', 'protonmail.com', 'wp.pl', 'o2.pl', 'onet.pl', 'interia.pl', 'gazeta.pl'];

const MAIL = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;

function _publicRoleMailbox(local, domain) {
  return ROLE_MAILBOXES.includes(local.toLowerCase()) && !FREE_MAIL_DOMAINS.includes(domain);
}

export function findLeaks(text) {
  const s = String(text || '');
  const found = PATTERNS.filter(([, re]) => re.test(s)).map(([kind]) => kind);
  for (const m of s.matchAll(MAIL)) {
    const domain = m[2].toLowerCase();
    if (_publicRoleMailbox(m[1], domain)) continue;
    if (!ALLOWED_MAIL_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))) {
      found.push('e-mail address');
      break;
    }
  }
  return found;
}
