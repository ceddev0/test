const fs = require('fs');
const path = require('path');

function readState(statePath) {
  const resolvedPath = path.resolve(statePath);
  if (!fs.existsSync(resolvedPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
}

function writeState(statePath, state) {
  const resolvedPath = path.resolve(statePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, JSON.stringify(state, null, 2));
}

module.exports = { readState, writeState };
