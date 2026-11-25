import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

const onError = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'On pipeline error' },
  output: [{ execution: { id: '123', url: 'https://example/execution/123', error: { message: 'CREDITS: write (claude-sonnet-5-5) HTTP 400' }, lastNodeExecuted: 'Write edition', mode: 'trigger' }, workflow: { id: 'w', name: 'PPAI · daily' } }],
});

const readSettings = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Read settings',
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'g73ONaCkopLd0kpN', cachedResultName: 'pipeline_state' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'id', condition: 'eq', keyValue: '1' }] },
      returnAll: false,
      limit: 1,
    },
  },
  output: [{ id: 1, notify_email: 'owner@example.com', paused: false }],
});

const buildMail = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build error mail',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode:
        INLINE('n8n/lib/email.js') +
        "const ev = $('On pipeline error').first().json;\n" +
        "const exec = ev.execution || {};\n" +
        "const message = String((exec.error && exec.error.message) || 'unknown error');\n" +
        "const kind = message.startsWith('CREDITS:') ? 'credits' : message.startsWith('AUTH:') ? 'auth' : message.startsWith('BUDGET:') ? 'budget' : null;\n" +
        "const step = exec.lastNodeExecuted || (ev.workflow && ev.workflow.name) || 'nieznany';\n" +
        "const mail = renderErrorEmail({ step, message: message + (exec.url ? '\\n' + exec.url : ''), kind });\n" +
        "return [{ json: { to: $input.first().json.notify_email, subject: mail.subject, html: mail.html } }];\n",
    },
  },
  output: [{ to: 'owner@example.com', subject: 'Poranna prasa AI: wstrzymane – brak kredytów API', html: '<p>...</p>' }],
});

const sendMail = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Send error mail',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: expr('{{ $json.to }}'),
      subject: expr('{{ $json.subject }}'),
      emailType: 'html',
      message: expr('{{ $json.html }}'),
      options: { appendAttribution: false, senderName: 'Poranna prasa AI' },
    },
    credentials: { gmailOAuth2: { id: '020mgqxb8eMbVh3H', name: 'ai-mail' } },
  },
  output: [{ id: 'm1', threadId: 't1', labelIds: ['SENT'] }],
});

export default workflow('ppai-errors', 'PPAI · errors')
  .add(onError)
  .to(readSettings)
  .to(buildMail)
  .to(sendMail);
