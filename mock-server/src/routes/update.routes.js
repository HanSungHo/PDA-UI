import { Router } from 'express';

import { updateFixtures } from '../data/fixtures';

function createApkChunk(size, isFirstChunk) {
  const chunk = Buffer.alloc(size);
  // ZIP signature so the content looks like an archive
  if (isFirstChunk) chunk.write('PK', 0, 'ascii');
  return chunk;
}

function streamApk(response, scenario) {
  const { sizeBytes, chunkBytes, chunkDelayMs, abortAfterBytes } = scenario;
  let sent = 0;

  const sendNext = () => {
    if (response.destroyed) return;

    if (abortAfterBytes !== undefined && sent >= abortAfterBytes) {
      // Cut the connection without finishing the body
      response.destroy();
      return;
    }

    const size = Math.min(chunkBytes, sizeBytes - sent);
    response.write(createApkChunk(size, sent === 0));
    sent += size;

    if (sent >= sizeBytes) {
      response.end();
      return;
    }
    setTimeout(sendNext, chunkDelayMs);
  };

  sendNext();
}

export function createUpdateRouter({ store }) {
  const router = Router();

  // Legacy: RetrofitUpdateService.API.downloadFile("upload/hifos.apk")
  router.get(updateFixtures.file.route, (_request, response) => {
    const scenario = store.getUpdateScenario();
    store.recordUpdateDownload();

    if (scenario.status !== 200) {
      response.status(scenario.status).type('text/plain').send(scenario.message);
      return;
    }

    response.status(200);
    response.set({
      'Content-Type': updateFixtures.file.contentType,
      // The client needs Content-Length to compute the percentage
      'Content-Length': String(scenario.sizeBytes),
    });

    if (scenario.sizeBytes === 0) {
      response.end();
      return;
    }
    streamApk(response, scenario);
  });

  // Test helpers: choose which branch the download endpoint answers with
  router.post('/mock/update/scenario', (request, response) => {
    const name = request.body?.scenario;
    if (!store.setUpdateScenario(name)) {
      response
        .status(400)
        .json({ ok: false, message: `Unknown scenario: ${name}`, ...store.getUpdateStats() });
      return;
    }
    response.json({ ok: true, ...store.getUpdateStats() });
  });

  router.get('/mock/update/stats', (_request, response) => {
    response.json(store.getUpdateStats());
  });

  return router;
}
