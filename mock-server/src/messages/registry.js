import { createActivityMainHandlers } from './activity-main.handlers.js';
import { createBatchHandlers } from './batch.handlers.js';
import { createCommentHandlers } from './comment.handlers.js';
import { createDiffInstParameterHandlers } from './diff-inst-parameter.handlers.js';
import { createEENModifyHandlers } from './een-modify.handlers.js';
import { createMoveOutHandlers } from './move-out.handlers.js';
import { createRcpInquireHandlers } from './rcp-inquire.handlers.js';
import { createRemoteCvdHandlers } from './remote-cvd.handlers.js';
import { createSettingHandlers } from './setting.handlers.js';
import { createSampleReleaseHandlers } from './sample-release.handlers.js';

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
    createRemoteCvdHandlers(store),
    createSettingHandlers(store),
    createEENModifyHandlers(store),
    createSampleReleaseHandlers(),
  ]) {
    for (const [name, handler] of Object.entries(group)) {
      const key = normalizeMessageName(name);
      if (handlers.has(key)) throw new Error(`Duplicate mock message handler: ${key}`);
      handlers.set(key, handler);
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
