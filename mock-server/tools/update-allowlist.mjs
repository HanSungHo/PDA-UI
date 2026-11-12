// Regenerates tests/legacy-parity.allowlist.json from docs/mock-parity/legacy-messages.json
// (run parity-inventory.mjs first). The allowlist may only shrink.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const inventory = JSON.parse(
  fs.readFileSync(
    path.join(here, '..', '..', 'docs', 'mock-parity', 'legacy-messages.json'),
    'utf8',
  ),
);
const names = [
  ...new Set(inventory.rows.filter((r) => !r.mockHandler).map((r) => r.message.toUpperCase())),
].sort();
fs.writeFileSync(
  path.join(here, '..', 'tests', 'legacy-parity.allowlist.json'),
  `${JSON.stringify({ missing: names }, null, 2)}\n`,
);
process.stdout.write(`${names.length} messages still without a handler\n`);
