import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createApp } from '../src/app.js';
import { GENERATED_LEGACY_ROUTE_ALIASES } from '../src/routes/legacy-route-aliases.generated.js';
import { LEGACY_ROUTE_ALIASES, mergeLegacyRouteAliases } from '../src/routes/hifos.routes.js';

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

async function postAifMessage(routeName, messageName, fields) {
  const body = Object.entries(fields)
    .map(([name, value]) => `<${name}>${value}</${name}>`)
    .join('');
  const response = await fetch(`${baseUrl}/hifos/${routeName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGNAME>${messageName}</MSGNAME><MSGBODY>${body}</MSGBODY></AIFMSG>`,
    }),
  });
  return { response, json: await response.json() };
}

describe('Legacy route aliases', () => {
  it('unions hand-written aliases with the generated ones', () => {
    assert.deepEqual(
      mergeLegacyRouteAliases({ A: ['X', 'Y'], B: ['Z'] }, { A: 'X', C: ['W', 'W'] }),
      { A: ['X', 'Y'], B: ['Z'], C: ['W'] },
    );
  });

  it('keeps every alias derived from the hifos2 sources', () => {
    for (const [route, names] of Object.entries(GENERATED_LEGACY_ROUTE_ALIASES)) {
      for (const name of [names].flat()) {
        assert.ok(LEGACY_ROUTE_ALIASES[route]?.includes(name), `${route} lost ${name}`);
      }
    }
  });

  it('dispatches ESDMasterActivity ESDINSERT through the SetGasusage route', async () => {
    const { response, json } = await postAifMessage('SetGasusage', 'ESDINSERT', {
      ESDID: 'WTPP01A12345',
    });
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(json.result).STATUS, 'PASS');
  });
});
