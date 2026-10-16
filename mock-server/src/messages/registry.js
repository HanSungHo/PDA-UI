import { createActivityMainHandlers } from './activity-main.handlers.js';
import { createBatchHandlers } from './batch.handlers.js';
import { createCommentHandlers } from './comment.handlers.js';
import { createDiffInstParameterHandlers } from './diff-inst-parameter.handlers.js';
import { createEENModifyHandlers } from './een-modify.handlers.js';
import { createMoveOutHandlers } from './move-out.handlers.js';
import { createRcpInquireHandlers } from './rcp-inquire.handlers.js';
import { createSettingHandlers } from './setting.handlers.js';

export function normalizeMessageName(messageName) {
  return String(messageName || '')
    .trim()
    .toUpperCase();
}

export function createMessageRegistry(store) {
  const handlers = new Map();

  for (const group of [
    createMoveOutHandlers(store),
    createBatchHandlers(store),
    createActivityMainHandlers(store),
    createCommentHandlers(store),
    createDiffInstParameterHandlers(store),
    createRcpInquireHandlers(store),
    createSettingHandlers(store),
    createEENModifyHandlers(store),
  ]) {
    for (const [name, handler] of Object.entries(group)) {
      handlers.set(normalizeMessageName(name), handler);
    }
  }

  return {
    has(messageName) {
      return handlers.has(normalizeMessageName(messageName));
    },
    handle(messageName, payload = {}) {
      const key = normalizeMessageName(messageName);
      const handler = handlers.get(key);
      if (!handler) return undefined;
      return handler({ payload, store });
    },
  };
}
