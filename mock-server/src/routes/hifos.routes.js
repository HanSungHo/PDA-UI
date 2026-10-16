import { Router } from 'express';

import { handleXmlMessage } from '../messages/xml.handlers.js';
import { httpError } from '../utils/response.js';
import { normalizeAifMessageName, parseAifMessage } from '../utils/xml.js';

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
    const body = request.body || {};
    let payload = body;

    if (typeof body.sMsg === 'string' && /^\s*<AIFMSG(?:\s|>)/i.test(body.sMsg)) {
      const message = parseAifMessage(body.sMsg);
      if (!message) {
        httpError(response, 400, 'INVALID_MESSAGE', 'Invalid AIFMSG request envelope.');
        return;
      }
      if (
        normalizeAifMessageName(message.messageName) !==
        normalizeAifMessageName(request.params.messageName)
      ) {
        httpError(response, 400, 'MESSAGE_NAME_MISMATCH', 'AIFMSG name does not match the route.');
        return;
      }
      payload = message.payload;
    }

    const result = registry.handle(request.params.messageName, payload);
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
