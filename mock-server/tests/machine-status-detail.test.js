import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createApp } from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

async function postAif(messageName, fields) {
  const body = Object.entries(fields)
    .map(([name, value]) => `<${name}>${value}</${name}>`)
    .join('');
  const response = await fetch(`${baseUrl}/hifos/${messageName.toLowerCase()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sMsg: `<AIFMSG><MSGNAME>${messageName}</MSGNAME><MSGBODY>${body}</MSGBODY></AIFMSG>`,
    }),
  });

  return {
    response,
    result: response.status === 200 ? JSON.parse((await response.json()).result) : null,
  };
}

describe('Machine Status Detail mock AIF flow', () => {
  it('returns usable status, down-code, and down-comment bodies for EQP-DEMO', async () => {
    const status = await postAif('EQPSTATUS', { EQPID: 'EQP-DEMO', FACILITY: 'FAB1' });
    assert.equal(status.response.status, 200);
    assert.equal(status.result.STATUS, 'PASS');
    assert.equal(status.result.MSGBODY.EQPSTATUSCODE, 'R');
    assert.ok(status.result.MSGBODY.STATUSITEMS.ITEM.length > 0);

    const downCode = await postAif('EQPDOWNCODE', {
      EQPID: 'EQP-DEMO',
      FACILITY: 'FAB1',
      EQPSTATUSCODE: 'R',
    });
    assert.equal(downCode.response.status, 200);
    assert.equal(downCode.result.STATUS, 'PASS');
    assert.equal(downCode.result.MSGBODY.DOWNCODEITEMS.ITEM[0].EQPDOWNCODE, 'RN001');

    const downComment = await postAif('EQPDOWNCOMMENT', {
      FACILITY: 'FAB1',
      DOWNCODE: 'RN001',
    });
    assert.equal(downComment.response.status, 200);
    assert.equal(downComment.result.STATUS, 'PASS');
    assert.ok(downComment.result.MSGBODY.DOWNCOMMENTITEMS.ITEM.length > 0);
  });
});
