import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createStore } from '../src/data/store.js';
import { createMessageRegistry } from '../src/messages/registry.js';

// docs/mock-parity/legacy-messages.json is generated from the hifos2 Kotlin sources by
// tools/parity-inventory.mjs. This test keeps the mock server from silently drifting.
const inventoryUrl = new URL('../../docs/mock-parity/legacy-messages.json', import.meta.url);
const allowlistUrl = new URL('./legacy-parity.allowlist.json', import.meta.url);
const inventory = JSON.parse(fs.readFileSync(fileURLToPath(inventoryUrl), 'utf8'));
const allowlist = new Set(JSON.parse(fs.readFileSync(fileURLToPath(allowlistUrl), 'utf8')).missing);
const registry = createMessageRegistry(createStore());
const has = (key) => registry.has(key) || registry.has(key.replace(/[^a-z0-9]/gi, ''));
// Use the real header spelling (e.g. FURNACE_KJCHECK); the router also tries the underscore-free form.
const legacyKeys = [...new Set(inventory.rows.map((row) => row.message.toUpperCase()))];

describe('legacy message parity', () => {
  it('has a mock handler for every legacy message that is not allowlisted', () => {
    const newGaps = legacyKeys.filter((key) => !has(key) && !allowlist.has(key));
    assert.deepEqual(newGaps, [], 'add a handler, or regenerate the inventory if hifos2 changed');
  });

  it('keeps the allowlist honest: every entry is still a real gap', () => {
    const stale = [...allowlist].filter((key) => !legacyKeys.includes(key) || has(key));
    assert.deepEqual(stale, [], 'remove these entries from legacy-parity.allowlist.json');
  });
});
