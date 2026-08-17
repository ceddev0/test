const fs = require('fs');
const path = require('path');

function loadConfig(configPath) {
  const resolvedPath = path.resolve(configPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Config file not found at ${resolvedPath}. Copy config/config.example.json to config/config.json and edit it.`
    );
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.watches) || parsed.watches.length === 0) {
    throw new Error('Config must contain a non-empty "watches" array.');
  }

  parsed.watches.forEach((watch, index) => {
    for (const field of ['name', 'url', 'xpath', 'cron']) {
      if (!watch[field]) {
        throw new Error(`Watch at index ${index} is missing required field "${field}".`);
      }
    }
  });

  return parsed;
}

module.exports = { loadConfig };
