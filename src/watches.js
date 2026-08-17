const { ObjectId } = require('mongodb');
const cron = require('node-cron');
const { connectDB } = require('./db');

async function collection() {
  const db = await connectDB();
  return db.collection('watches');
}

function serialize(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

function assertValidCron(expression) {
  if (!cron.validate(expression)) {
    throw new Error(`Invalid cron expression "${expression}".`);
  }
}

async function listWatches() {
  const col = await collection();
  const docs = await col.find().sort({ createdAt: 1 }).toArray();
  return docs.map(serialize);
}

async function getWatch(id) {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return serialize(doc);
}

async function createWatch({ name, url, xpath, cron: cronExpression } = {}) {
  if (!url || !xpath || !cronExpression) {
    throw new Error('"url", "xpath" and "cron" are required.');
  }
  assertValidCron(cronExpression);

  const col = await collection();
  const now = new Date();
  const doc = {
    name: name || null,
    url,
    xpath,
    cron: cronExpression,
    createdAt: now,
    updatedAt: now,
  };

  const result = await col.insertOne(doc);
  return serialize({ ...doc, _id: result.insertedId });
}

async function updateWatch(id, updates = {}) {
  if (!ObjectId.isValid(id)) return null;
  if (updates.cron !== undefined) assertValidCron(updates.cron);

  const col = await collection();
  const set = { updatedAt: new Date() };
  for (const field of ['name', 'url', 'xpath', 'cron']) {
    if (updates[field] !== undefined) set[field] = updates[field];
  }

  await col.updateOne({ _id: new ObjectId(id) }, { $set: set });
  return getWatch(id);
}

async function deleteWatch(id) {
  if (!ObjectId.isValid(id)) return false;
  const col = await collection();
  const result = await col.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

async function setWatchName(id, name) {
  if (!ObjectId.isValid(id)) return;
  const col = await collection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { name, updatedAt: new Date() } });
}

async function seedFromConfig(watches) {
  if (!watches || watches.length === 0) return;

  const col = await collection();
  const count = await col.countDocuments();
  if (count > 0) return;

  const now = new Date();
  await col.insertMany(
    watches.map((watch) => ({
      name: watch.name || null,
      url: watch.url,
      xpath: watch.xpath,
      cron: watch.cron,
      createdAt: now,
      updatedAt: now,
    }))
  );
}

module.exports = {
  listWatches,
  getWatch,
  createWatch,
  updateWatch,
  deleteWatch,
  setWatchName,
  seedFromConfig,
};
