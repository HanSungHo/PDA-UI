import { Router } from 'express';

import { handleXmlMessage } from '../messages/xml.handlers.js';
import { httpError } from '../utils/response.js';
import { normalizeAifMessageName, parseAifMessage } from '../utils/xml.js';

// Android MessageSender routes whose AIFMSG MSGNAME differs from the route; the request is
// dispatched by the AIFMSG name.
const LEGACY_ROUTE_ALIASES = {
  // EQPspc / Recipe Interlock / PR Empty send INTLKPOPUPCHECK through SetGasusage.
  SETGASUSAGE: 'INTLKPOPUPCHECK',
  // Mask Location and Multi Mask Location: location detail and the location change.
  MASKLOCGROUPINFO: 'MASKLOCATIONINFO',
  CHECKPELLICLE: 'CHANGEMASKLOCATION',
};

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
    if (typeof request.body?.sMsg === 'string') {
      const message = parseAifMessage(request.body.sMsg);
      if (!message) {
        httpError(response, 400, 'INVALID_MESSAGE', 'Invalid AIFMSG request envelope.');
        return;
      }
      const result = registry.handle(message.messageName, message.payload);
      if (!result) {
        httpError(
          response,
          404,
          'MESSAGE_NOT_FOUND',
          `Unsupported message: ${message.messageName}`,
        );
        return;
      }
      response.json(result);
      return;
    }

    const message = parseAifMessage(request.body?.sMsg);
    if (message?.messageName === 'SHELFCALL') {
      response.json(registry.handle(message.messageName, message.payload));
      return;
    }
    const xml = handleXmlMessage(request.header('MESSAGENAME'), request.body, store);
    response.type('application/xml').send(xml);
  });

  router.post('/hifos/:messageName', (request, response) => {
    const body = request.body || {};
    let payload = body;
    let dispatchName = request.params.messageName;

    if (typeof body.sMsg === 'string' && /^\s*<AIFMSG(?:\s|>)/i.test(body.sMsg)) {
      const message = parseAifMessage(body.sMsg);
      if (!message) {
        httpError(response, 400, 'INVALID_MESSAGE', 'Invalid AIFMSG request envelope.');
        return;
      }
      const routeMsgName = normalizeAifMessageName(request.params.messageName);
      const payloadMsgName = normalizeAifMessageName(message.messageName);
      const isLegacyAlias = LEGACY_ROUTE_ALIASES[routeMsgName] === payloadMsgName;
      if (routeMsgName !== payloadMsgName && !isLegacyAlias) {
        httpError(response, 400, 'MESSAGE_NAME_MISMATCH', 'AIFMSG name does not match the route.');
        return;
      }
      payload = message.payload;
      if (isLegacyAlias) dispatchName = payloadMsgName;
    }

    const result = registry.handle(dispatchName, payload);
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
