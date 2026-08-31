require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./config');
const { connectDB, closeDB } = require('./db');
const { listWatches, seedFromConfig } = require('./watches');
const { checkWatch } = require('./watch-runner');
const { scheduleAll } = require('./scheduler');
const { createServer } = require('./server');

const CONFIG_PATH = process.env.CONFIG_PATH || 'config/config.json';
const PORT = process.env.PORT || 3000;

async function seedIfConfigured() {
  const resolvedPath = path.resolve(CONFIG_PATH);
  if (!fs.existsSync(resolvedPath)) return;

  const config = loadConfig(CONFIG_PATH);
  await seedFromConfig(config.watches);
}

async function runOnce() {
  await connectDB();
  await seedIfConfigured();

  const watches = await listWatches();
  for (const watch of watches) {
    await checkWatch(watch);
  }

  await closeDB();
}

async function runScheduled() {
  await connectDB();
  await seedIfConfigured();

  const watches = await listWatches();
  scheduleAll(watches);

  const app = createServer();
  app.listen(PORT, () => {
    console.log(`Watch management API listening on port ${PORT}`);
  });

  console.log('watcher is running. Press Ctrl+C to stop.');
}

async function main() {
  const once = process.argv.includes('--once');

  if (once) {
    await runOnce();
    return;
  }

  await runScheduled();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
