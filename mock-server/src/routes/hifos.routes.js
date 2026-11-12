import { Router } from 'express';

import { handleXmlMessage } from '../messages/xml.handlers.js';
import { httpError } from '../utils/response.js';
import { normalizeAifMessageName, parseAifMessage } from '../utils/xml.js';
import { GENERATED_LEGACY_ROUTE_ALIASES } from './legacy-route-aliases.generated.js';

// Messages answered by the XML fixture handlers when posted as a raw XML body (MESSAGENAME header).
const XML_FIXTURE_MESSAGES = new Set([
  'GETFLOORDATA',
  'GETBAYDATA',
  'GETPROCESSFACTORYLOT',
  'INFACTORY',
]);

function payloadFromXmlBody(body) {
  const payload = {};
  for (const match of String(body || '').matchAll(/<([A-Z][A-Z0-9_]*)>([^<]*)<\/\1>/gi)) {
    payload[match[1].toUpperCase()] = match[2]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .trim();
  }
  return payload;
}

// Android MessageSender routes whose AIFMSG MSGNAME differs from the route; the request is
// dispatched by the AIFMSG name. A route may alias several message names.
const MANUAL_LEGACY_ROUTE_ALIASES = {
  // EQPspc / Recipe Interlock / PR Empty send INTLKPOPUPCHECK and ESD Master sends ESDINSERT
  // through SetGasusage.
  SETGASUSAGE: ['INTLKPOPUPCHECK', 'ESDINSERT'],
  // Mask Location and Multi Mask Location: location detail and the location change.
  MASKLOCGROUPINFO: 'MASKLOCATIONINFO',
  CHECKPELLICLE: 'CHANGEMASKLOCATION',
  // PR Change posts PRCHANGE through the currentprinfo endpoint.
  CURRENTPRINFO: 'PRCHANGE',
  // Chat list (GETPDAMESSAGE) and Chat room (GETPDAROOMMESSAGEBYROOM) post through the NEWPDALIST
  // endpoint.
  NEWPDALIST: ['GETPDAMESSAGE', 'GETPDAROOMMESSAGEBYROOM'],
  // Etch Inspection: the search and the execution routes carry differently named AIFMSG messages.
  ETCHINSPECTIONINFO: 'ETCHINSPINFO',
  ETCHINSPECTIONEXECUTION: 'ETCHINSPEXCUTION',
};

/**
 * Unions the aliases derived from the hifos2 Kotlin sources (tools/parity-inventory.mjs) with the
 * hand-written ones, so a hand-written entry adds message names and never drops a generated one.
 */
export function mergeLegacyRouteAliases(generated, manual) {
  const merged = {};
  for (const [route, names] of [...Object.entries(generated), ...Object.entries(manual)]) {
    merged[route] = [...new Set([...(merged[route] ?? []), ...[names].flat()])];
  }
  return merged;
}

export const LEGACY_ROUTE_ALIASES = mergeLegacyRouteAliases(
  GENERATED_LEGACY_ROUTE_ALIASES,
  MANUAL_LEGACY_ROUTE_ALIASES,
);

function isLegacyAliasOf(routeMsgName, payloadMsgName) {
  return LEGACY_ROUTE_ALIASES[routeMsgName]?.includes(payloadMsgName) ?? false;
}

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
    // A raw <BODY> XML post (MESSAGENAME header, e.g. Remote Furnace KEC) for a message with a regular
    // handler: answer with the handler's JSON text, the same {STATUS, ERRMSG, MSGBODY} string.
    const headerName = String(request.header('MESSAGENAME') || '')
      .trim()
      .toUpperCase();
    if (
      headerName &&
      typeof request.body === 'string' &&
      !XML_FIXTURE_MESSAGES.has(headerName) &&
      registry.has(headerName)
    ) {
      const handled = registry.handle(headerName, payloadFromXmlBody(request.body));
      response.type('text/plain').send(handled.result);
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
      const isLegacyAlias = isLegacyAliasOf(routeMsgName, payloadMsgName);
      if (routeMsgName !== payloadMsgName && !isLegacyAlias) {
        httpError(response, 400, 'MESSAGE_NAME_MISMATCH', 'AIFMSG name does not match the route.');
        return;
      }
      payload = message.payload;
      if (isLegacyAlias) dispatchName = payloadMsgName;
    }

    store.recordMessageRequest({
      route: `/hifos/${request.params.messageName}`,
      messageName: request.params.messageName,
      payload,
    });

    const result = registry.handle(dispatchName, payload);
    if (!result) {
      httpError(response, 404, 'MESSAGE_NOT_FOUND', `Unsupported message: ${dispatchName}`);
      return;
    }
    response.json(result);
  });

  return router;
}
