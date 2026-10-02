import { Router } from 'express';

import { handleXmlMessage } from '../messages/xml.handlers.js';
import { httpError } from '../utils/response.js';

export function createHifosRouter({ registry, store }) {
  const router = Router();

  router.post('/message/send', (request, response) => {
    const { messageName, payload } = request.body || {};
    const result = registry.handle(messageName, payload || {});
    if (!result) {
      httpError(response, 404, 'MESSAGE_NOT_FOUND', `Unsupported message: ${messageName}`);
      return;
    }
    response.json(result);
  });

  router.post('/hifos/message', (request, response) => {
    const xml = handleXmlMessage(request.header('MESSAGENAME'), request.body, store);
    response.type('application/xml').send(xml);
  });

  router.post('/hifos/:messageName', (request, response) => {
    const result = registry.handle(request.params.messageName, request.body || {});
    if (!result) {
      httpError(
        response,
        404,
        'MESSAGE_NOT_FOUND',
        `Unsupported message: ${request.params.messageName}`,
      );
      return;
    }
    response.json(result);
  });

  return router;
}
