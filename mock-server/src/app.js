import express from 'express';

import { createStore } from './data/store.js';
import { createMessageRegistry } from './messages/registry.js';
import { createCommentRouter } from './routes/comment.routes.js';
import { createHifosRouter } from './routes/hifos.routes.js';
import { createUpdateRouter } from './routes/update.routes.js';
export function createApp() {
  const app = express();
  const store = createStore();
  const registry = createMessageRegistry(store);

  app.use((request, response, next) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Accept, MESSAGENAME, ORIGIN, ACK',
    );
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (request.method === 'OPTIONS') {
      response.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use(express.text({ type: ['application/xml', 'text/xml', 'text/plain'], limit: '1mb' }));

  app.get('/health', (_request, response) => response.json({ ok: true }));
  app.post('/mock/reset', (_request, response) => {
    store.reset();
    response.json({ ok: true });
  });
  app.use('/api', createCommentRouter({ registry, store }));
  app.use(createUpdateRouter({ store }));
  app.use(createHifosRouter({ registry, store }));

  return app;
}
