import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const STATE_PATH = '.github/states/stock.json';

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function sendWebhook(webhookUrl, key) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: key }),
  });

  if (!response.ok) {
    throw new Error(`Webhook call failed with status ${response.status}`);
  }
}

async function main() {
  const webhookUrl = process.env.STOCK_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('STOCK_WEBHOOK_URL environment variable is not set.');

  const claudeResult = process.env.CLAUDE_RESULT;
  if (!claudeResult) {
    throw new Error(
      'CLAUDE_RESULT is empty - the "Check stock with Claude" step produced no structured_output ' +
        '(often because claude-code-action skipped the run, e.g. its workflow-file validation check).'
    );
  }

  const { results } = JSON.parse(claudeResult);
  const state = await readState();
  let stateChanged = false;

  for (const { key, status } of results) {
    const previousStatus = state[key]?.status;

    console.log(`[${key}] previous: ${previousStatus ?? '(never checked)'}, current: ${status}`);

    if (status === 'in_stock' && previousStatus === 'out_of_stock') {
      console.log(`[${key}] Back in stock, sending webhook alert.`);
      await sendWebhook(webhookUrl, key);
    }

    if (status !== previousStatus) {
      state[key] = { status, updatedAt: new Date().toISOString() };
      stateChanged = true;
    }
  }

  if (stateChanged) {
    await mkdir(path.dirname(STATE_PATH), { recursive: true });
    await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
