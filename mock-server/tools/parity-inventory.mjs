// Phase 0 inventory: legacy Kotlin (hifos2) message contracts vs mock server vs Vue usage.
// Read-only. Usage: node tools/parity-inventory.mjs [--legacy <hifos2 path>] [--out <dir>]
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createMessageRegistry } from '../src/messages/registry.js';
import { createStore } from '../src/data/store.js';

// Write generated files already formatted, so `npm run lint:check` passes without hand edits.
const prettier = await import('prettier');
async function writeFormatted(file, content) {
  const options = (await prettier.resolveConfig(file)) ?? {};
  fs.writeFileSync(file, await prettier.format(content, { ...options, filepath: file }));
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const args = process.argv.slice(2);
const argValue = (flag, fallback) =>
  args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;

const legacyRoot = path.resolve(argValue('--legacy', path.join(repoRoot, '..', 'hifos2')));
const outDir = path.resolve(argValue('--out', path.join(repoRoot, 'docs', 'mock-parity')));
const kotlinRoot = path.join(
  legacyRoot,
  'app',
  'src',
  'main',
  'java',
  'com',
  'keyfoundry',
  'hifos',
);

function walk(dir, ext, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(full, ext, files);
    } else if (ext.some((e) => entry.name.endsWith(e))) files.push(full);
  }
  return files;
}

const norm = (name) =>
  String(name || '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
const read = (file) => fs.readFileSync(file, 'utf8');
const rel = (base, file) => path.relative(base, file).replaceAll('\\', '/');

// ---- legacy: MessageName constants (const name -> route value) -------------------------------
const messageNameFile = path.join(kotlinRoot, 'config', 'const', 'MessageName.kt');
const routeConsts = {};
for (const m of read(messageNameFile).matchAll(/const val (\w+)\s*=\s*"([^"]+)"/g)) {
  routeConsts[m[1]] = m[2];
}

// ---- legacy: factory functions ---------------------------------------------------------------
const factoryFile = path.join(kotlinRoot, 'config', 'utils', 'MessageFactoryUtil.kt');
const factorySource = read(factoryFile);
const factories = [];
const fnPattern = /fun\s+(\w+)\s*\(([\s\S]*?)\)\s*:\s*String\s*\{/g;
const starts = [...factorySource.matchAll(fnPattern)];
starts.forEach((match, index) => {
  const end = starts[index + 1]?.index ?? factorySource.length;
  const block = factorySource.slice(match.index, end);
  const header = block.match(/SendMessageHeader\(\s*"([^"]+)"/);
  if (!header) return;
  const params = match[2]
    .split(',')
    .map((p) => p.trim().split(':')[0].trim())
    .filter(Boolean);
  const bodyTags = [...new Set([...block.matchAll(/<([A-Z][A-Z0-9_]*)>/g)].map((m) => m[1]))];
  factories.push({
    factory: match[1],
    message: header[1],
    key: norm(header[1]),
    params,
    requestTags: bodyTags,
  });
});

// ---- legacy: activities (callers + response keys) --------------------------------------------
const viewFiles = walk(path.join(kotlinRoot, 'view'), ['.kt']);
const callers = new Map(); // factory -> [{file, responseKeys, listKeys, routes}]
const routeByFactory = new Map(); // factory -> Set(route value used in MessageSender.send)
for (const file of viewFiles) {
  const source = read(file);
  const used = [...source.matchAll(/MessageFactoryUtil\.(\w+)\s*\(/g)].map((m) => m[1]);
  if (used.length === 0) continue;
  const responseKeys = [
    ...new Set(
      [
        ...source.matchAll(
          /\.(?:optString|getString|optInt|optBoolean|optDouble|getInt)\(\s*"([^"]+)"/g,
        ),
      ].map((m) => m[1]),
    ),
  ];
  const listKeys = [
    ...new Set(
      [...source.matchAll(/getMessageBodyList\(\s*\w+\s*,\s*"([^"]+)"/g)].map((m) => m[1]),
    ),
  ];
  const routes = [
    ...new Set([...source.matchAll(/MessageName\.(\w+)/g)].map((m) => routeConsts[m[1]] ?? m[1])),
  ];
  // `MessageFactoryUtil.fn(...)` followed shortly by `MessageName.X` is the route it is sent to.
  for (const m of source.matchAll(
    /MessageFactoryUtil\.(\w+)\s*\([\s\S]{0,600}?MessageName\.(\w+)/g,
  )) {
    if (!routeByFactory.has(m[1])) routeByFactory.set(m[1], new Set());
    routeByFactory.get(m[1]).add(routeConsts[m[2]] ?? m[2]);
  }
  for (const factory of new Set(used)) {
    if (!callers.has(factory)) callers.set(factory, []);
    callers.get(factory).push({
      file: rel(kotlinRoot, file),
      responseKeys,
      listKeys,
      routes,
    });
  }
}

// ---- mock server ------------------------------------------------------------------------------
const registry = createMessageRegistry(createStore());
// The router dispatches on the underscore-free name (ETCH_COMMRCP is served as ETCHCOMMRCP).
const hasHandler = (name) => registry.has(name) || registry.has(norm(name));

// ---- Vue usage ---------------------------------------------------------------------------------
const legacyKeys = new Set(factories.map((f) => f.key));
const vueSrc = path.join(repoRoot, 'src');
const vueUsage = new Map(); // key -> Set(feature)
for (const file of walk(vueSrc, ['.ts', '.vue'])) {
  if (/\.(spec|test|stories)\./.test(file)) continue;
  const source = read(file);
  const names = new Set();
  for (const m of source.matchAll(/buildAifMessage\(\s*['"`]([A-Za-z0-9_]+)['"`]/g))
    names.add(m[1]);
  for (const m of source.matchAll(/<MSGNAME>([A-Za-z0-9_]+)<\/MSGNAME>/g)) names.add(m[1]);
  for (const m of source.matchAll(/MSGNAME\s*[:=]\s*['"`]([A-Za-z0-9_]+)['"`]/g)) names.add(m[1]);
  // Vue builds names through variables, so also accept any string literal equal to a legacy
  // message name (case-insensitive). Short generic names can false-positive; review the table.
  for (const m of source.matchAll(/['"`]([A-Za-z][A-Za-z0-9_]{3,})['"`]/g)) {
    if (legacyKeys.has(norm(m[1]))) names.add(m[1]);
  }
  if (names.size === 0) continue;
  const feature = rel(vueSrc, file)
    .replace(/^features\//, '')
    .split('/')[0];
  for (const name of names) {
    const key = norm(name);
    if (!vueUsage.has(key)) vueUsage.set(key, new Set());
    vueUsage.get(key).add(feature);
  }
}
const hardCoded = walk(vueSrc, ['.ts', '.vue'])
  .filter((f) => /TODO\(BE\)|Backend integration is pending/.test(read(f)))
  .map((f) => rel(vueSrc, f));

// ---- merge -------------------------------------------------------------------------------------
const rows = factories.map((f) => ({
  ...f,
  mockHandler: hasHandler(f.message),
  vueFeatures: [...(vueUsage.get(f.key) ?? [])],
  activities: (callers.get(f.factory) ?? []).map((c) => c.file),
  responseKeys: [...new Set((callers.get(f.factory) ?? []).flatMap((c) => c.responseKeys))],
  listKeys: [...new Set((callers.get(f.factory) ?? []).flatMap((c) => c.listKeys))],
}));
// Routes whose path segment differs from the AIFMSG MSGNAME (legacy posts to /hifos/<route>).
const routeAliases = {};
for (const row of rows) {
  for (const route of routeByFactory.get(row.factory) ?? []) {
    if (norm(route) !== row.key) {
      const targets = (routeAliases[norm(route)] ??= []);
      if (!targets.includes(row.key)) targets.push(row.key);
    }
  }
}
const vueOnly = [...vueUsage.keys()].filter((k) => !legacyKeys.has(k));

const summary = {
  legacyFactories: rows.length,
  legacyDistinctMessages: legacyKeys.size,
  withMockHandler: rows.filter((r) => r.mockHandler).length,
  missingMockHandler: rows.filter((r) => !r.mockHandler).length,
  missingAndUsedByVue: rows.filter((r) => !r.mockHandler && r.vueFeatures.length > 0).length,
  vueMessagesNotInLegacy: vueOnly,
  vueServicesHardCoded: hardCoded,
  legacyRouteAliases: Object.keys(routeAliases).length,
};

await writeFormatted(
  path.join(repoRoot, 'mock-server', 'src', 'routes', 'legacy-route-aliases.generated.js'),
  `// Generated by tools/parity-inventory.mjs from the hifos2 Kotlin sources. Do not edit.\n// Legacy route segment (MessageName value) -> AIFMSG MSGNAMEs sent through it.\nexport const GENERATED_LEGACY_ROUTE_ALIASES = ${JSON.stringify(routeAliases, null, 2)};\n`,
);
fs.mkdirSync(outDir, { recursive: true });
await writeFormatted(
  path.join(outDir, 'legacy-messages.json'),
  `${JSON.stringify({ summary, rows }, null, 2)}\n`,
);

const lines = [
  '# Legacy ↔ mock ↔ Vue message parity',
  '',
  '_Generated by `mock-server/tools/parity-inventory.mjs`. Do not edit by hand._',
  '',
  `- Legacy factories: ${summary.legacyFactories}`,
  `- Missing mock handler: ${summary.missingMockHandler}`,
  `- Missing handler but already used by a Vue screen: ${summary.missingAndUsedByVue}`,
  `- Vue services still hard-coded (TODO(BE)): ${hardCoded.length ? hardCoded.join(', ') : 'none'}`,
  `- Vue messages with no legacy factory: ${vueOnly.join(', ') || 'none'}`,
  '',
  '"Activity response keys" lists every MSGBODY key the calling Activity reads, from all of its',
  'messages; it is not the response contract of that single message.',
  '',
  '| Message | Mock | Vue feature | Legacy activity | Request tags | Activity response keys |',
  '|---|---|---|---|---|---|',
  ...rows
    .sort(
      (a, b) => Number(a.mockHandler) - Number(b.mockHandler) || a.message.localeCompare(b.message),
    )
    .map(
      (r) =>
        `| ${r.message} | ${r.mockHandler ? 'yes' : '**NO**'} | ${r.vueFeatures.join(', ') || '-'} | ${
          r.activities.map((a) => a.split('/').pop()).join(', ') || '-'
        } | ${r.requestTags.join(' ')} | ${[...r.responseKeys, ...r.listKeys.map((k) => `${k}[]`)].join(' ')} |`,
    ),
  '',
];
await writeFormatted(path.join(outDir, 'PARITY.md'), lines.join('\n'));

process.stdout.write(`${JSON.stringify(summary, null, 2)}
`);
