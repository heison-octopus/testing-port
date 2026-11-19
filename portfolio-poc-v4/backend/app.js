import express from 'express';
import { openStore } from './repositories/store.js';
import { foundation } from './services/foundation.js';
import { api } from './routes/api.js';
export function createApp({
  file = new URL('../data/stage1.sqlite', import.meta.url).pathname,
  sessionTtl
} = {}) {
  const store = openStore(file);
  store.seed();
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({
    limit: '64kb'
  }));
  app.use('/api', api(foundation(store), {
    sessionTtl
  }));
  app.use('/api', (_req, res) => res.status(404).json({
    error: {
      message: 'Endpoint not found'
    }
  }));
  app.use((error, _req, res, _next) => {
    const constraint = String(error.code || '').includes('SQLITE');
    const status = error.status || (constraint ? 409 : 500);
    if (status === 500) console.error(error);
    res.status(status).json({
      error: {
        message: status === 500 ? 'Internal error' : constraint ? 'Record conflicts with existing data' : error.message
      }
    });
  });
  return {
    app,
    store
  };
}
