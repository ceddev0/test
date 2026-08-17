require('dotenv').config();

const cron = require('node-cron');
const { loadConfig } = require('./config');
const { fetchXPathContent } = require('./scraper');
const { readState, writeState } = require('./storage');
const { sendChangeAlert } = require('./mailer');

const CONFIG_PATH = process.env.CONFIG_PATH || 'config/config.json';
const STATE_PATH = process.env.STATE_PATH || 'data/state.json';

async function checkWatch(watch, state) {
  const { name, url, xpath: xpathExpression } = watch;

  let newValue;
  try {
    newValue = await fetchXPathContent(url, xpathExpression);
  } catch (err) {
    console.error(`[${name}] Failed to fetch/extract: ${err.message}`);
    return;
  }

  const previousValue = state[name];

  if (previousValue !== undefined && previousValue !== newValue) {
    console.log(`[${name}] Change detected, sending alert.`);
    try {
      await sendChangeAlert({ name, url, previousValue, newValue });
    } catch (err) {
      console.error(`[${name}] Failed to send alert email: ${err.message}`);
    }
  } else if (previousValue === undefined) {
    console.log(`[${name}] Baseline captured.`);
  } else {
    console.log(`[${name}] No change.`);
  }

  state[name] = newValue;
  writeState(STATE_PATH, state);
}

async function runOnce() {
  const config = loadConfig(CONFIG_PATH);
  const state = readState(STATE_PATH);

  for (const watch of config.watches) {
    await checkWatch(watch, state);
  }
}

function runScheduled() {
  const config = loadConfig(CONFIG_PATH);

  config.watches.forEach((watch) => {
    if (!cron.validate(watch.cron)) {
      throw new Error(`Invalid cron expression "${watch.cron}" for watch "${watch.name}".`);
    }

    console.log(`Scheduling "${watch.name}" (${watch.url}) with cron "${watch.cron}"`);

    cron.schedule(watch.cron, () => {
      const state = readState(STATE_PATH);
      checkWatch(watch, state).catch((err) => {
        console.error(`[${watch.name}] Unexpected error: ${err.message}`);
      });
    });
  });
}

async function main() {
  const once = process.argv.includes('--once');

  if (once) {
    await runOnce();
    return;
  }

  runScheduled();
  console.log('webpage-watcher is running. Press Ctrl+C to stop.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
