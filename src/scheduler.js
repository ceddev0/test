const cron = require('node-cron');
const { checkWatch } = require('./watch-runner');

const tasks = new Map();

function scheduleWatch(watch) {
  if (!cron.validate(watch.cron)) {
    throw new Error(`Invalid cron expression "${watch.cron}" for watch "${watch.name || watch.id}".`);
  }

  unscheduleWatch(watch.id);

  const task = cron.schedule(watch.cron, () => {
    checkWatch(watch).catch((err) => {
      console.error(`[${watch.name || watch.id}] Unexpected error: ${err.message}`);
    });
  });

  tasks.set(watch.id, task);
  console.log(`Scheduling "${watch.name || '(unnamed)'}" (${watch.url}) with cron "${watch.cron}"`);
}

function unscheduleWatch(id) {
  const task = tasks.get(id);
  if (task) {
    task.stop();
    tasks.delete(id);
  }
}

function scheduleAll(watches) {
  watches.forEach(scheduleWatch);
}

module.exports = { scheduleWatch, unscheduleWatch, scheduleAll };
