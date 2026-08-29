import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const PRODUCTS = {
  'leroy-merlin': {
    url: 'https://www.leroymerlin.fr/produits/climatiseur-split-mobile-reversible-portasplit-midea-par-optimea-93857579.html',
  },
};

const STATE_PATH = '.github/stock-watch/state.json';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPageText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status}`);
  }

  return stripTags(await response.text()).slice(0, 12000);
}

async function classifyStock(apiKey, pageText) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 8,
      temperature: 0,
      system:
        'You determine whether a product is currently purchasable on a French e-commerce product page, ' +
        'given its extracted page text. Reply with exactly one word and nothing else: ' +
        'in_stock, out_of_stock, or unknown.',
      messages: [{ role: 'user', content: `Page text:\n${pageText}` }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API call failed with status ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const answer = (data.content?.[0]?.text ?? '').trim().toLowerCase();

  if (answer.includes('out_of_stock')) return 'out_of_stock';
  if (answer.includes('in_stock')) return 'in_stock';
  return 'unknown';
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

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function main() {
  const webhookUrl = process.env.STOCK_WEBHOOK_URL;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!webhookUrl) throw new Error('STOCK_WEBHOOK_URL environment variable is not set.');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set.');

  const state = await readState();
  let stateChanged = false;

  for (const [key, product] of Object.entries(PRODUCTS)) {
    const previousStatus = state[key]?.status ?? 'unknown';

    let newStatus;
    try {
      const pageText = await fetchPageText(product.url);
      newStatus = await classifyStock(apiKey, pageText);
    } catch (err) {
      console.error(`[${key}] Failed to check stock: ${err.message}`);
      continue;
    }

    console.log(`[${key}] previous: ${previousStatus}, current: ${newStatus}`);

    if (newStatus === 'in_stock' && previousStatus === 'out_of_stock') {
      console.log(`[${key}] Back in stock, sending webhook alert.`);
      await sendWebhook(webhookUrl, key);
    }

    if (newStatus !== previousStatus && newStatus !== 'unknown') {
      state[key] = { status: newStatus, checkedAt: new Date().toISOString() };
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
