const { connectDB } = require('./db');

async function collection() {
  const db = await connectDB();
  return db.collection('results');
}

async function getLastResult(watchId) {
  const col = await collection();
  return col.find({ watchId }).sort({ fetchedAt: -1 }).limit(1).next();
}

async function saveResult(watchId, value) {
  const col = await collection();
  await col.insertOne({ watchId, value, fetchedAt: new Date() });
}

module.exports = { getLastResult, saveResult };
