const PRODUCT_URL =
  'https://www.leroymerlin.fr/produits/climatiseur-split-mobile-reversible-portasplit-midea-par-optimea-93857579.html';
const STATE_PATH = '.github/stock-watch/state.json';

const OUT_OF_STOCK_PATTERNS = [
  /rupture de stock/i,
  /produit indisponible/i,
  /actuellement indisponible/i,
  /indisponible en ligne/i,
  /temporairement indisponible/i,
  /article épuisé/i,
];

const IN_STOCK_PATTERNS = [/ajouter au panier/i];

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

function detectStatus(html) {
  const text = stripTags(html);
  if (OUT_OF_STOCK_PATTERNS.some((pattern) => pattern.test(text))) return 'out_of_stock';
  if (IN_STOCK_PATTERNS.some((pattern) => pattern.test(text))) return 'in_stock';
  return 'unknown';
}

async function fetchPage(url) {
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

  return response.text();
}

async function sendWebhook(webhookUrl) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: `Climatiseur Portasplit Midea is back in stock: ${PRODUCT_URL}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook call failed with status ${response.status}`);
  }
}

async function readPreviousStatus(fs, path) {
  try {
    const raw = await fs.readFile(path, 'utf-8');
    return JSON.parse(raw).status;
  } catch (err) {
    if (err.code === 'ENOENT') return 'unknown';
    throw err;
  }
}

async function main() {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  const webhookUrl = process.env.STOCK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('STOCK_WEBHOOK_URL environment variable is not set.');
  }

  const previousStatus = await readPreviousStatus(fs, STATE_PATH);

  let newStatus;
  try {
    const html = await fetchPage(PRODUCT_URL);
    newStatus = detectStatus(html);
  } catch (err) {
    console.error(`Failed to check stock: ${err.message}`);
    process.exit(0);
  }

  console.log(`Previous status: ${previousStatus}, current status: ${newStatus}`);

  if (newStatus === 'in_stock' && previousStatus === 'out_of_stock') {
    console.log('Back in stock, sending webhook alert.');
    await sendWebhook(webhookUrl);
  }

  if (newStatus !== previousStatus && newStatus !== 'unknown') {
    await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
    await fs.writeFile(
      STATE_PATH,
      JSON.stringify({ status: newStatus, checkedAt: new Date().toISOString() }, null, 2) + '\n'
    );
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
