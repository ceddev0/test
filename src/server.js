const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const { listWatches, getWatch, createWatch, updateWatch, deleteWatch } = require('./watches');
const { scheduleWatch, unscheduleWatch } = require('./scheduler');

const router = new Router({ prefix: '/watches' });

router.get('/', async (ctx) => {
  ctx.body = await listWatches();
});

router.get('/:id', async (ctx) => {
  const watch = await getWatch(ctx.params.id);
  if (!watch) {
    ctx.status = 404;
    ctx.body = { error: 'Watch not found.' };
    return;
  }
  ctx.body = watch;
});

router.post('/', async (ctx) => {
  try {
    const watch = await createWatch(ctx.request.body || {});
    scheduleWatch(watch);
    ctx.status = 201;
    ctx.body = watch;
  } catch (err) {
    ctx.status = 400;
    ctx.body = { error: err.message };
  }
});

router.put('/:id', async (ctx) => {
  try {
    const watch = await updateWatch(ctx.params.id, ctx.request.body || {});
    if (!watch) {
      ctx.status = 404;
      ctx.body = { error: 'Watch not found.' };
      return;
    }
    scheduleWatch(watch);
    ctx.body = watch;
  } catch (err) {
    ctx.status = 400;
    ctx.body = { error: err.message };
  }
});

router.delete('/:id', async (ctx) => {
  const deleted = await deleteWatch(ctx.params.id);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'Watch not found.' };
    return;
  }
  unscheduleWatch(ctx.params.id);
  ctx.status = 204;
});

function createServer() {
  const app = new Koa();
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());
  return app;
}

module.exports = { createServer };
