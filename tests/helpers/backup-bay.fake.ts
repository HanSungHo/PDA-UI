// Test-only stand-in for the mock server's backup-bay handlers
// (mock-server/src/messages/backup-bay.handlers.js); specs mock postAifMessage with it so the real
// services run without hitting the network.

const pass = (body: unknown) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }),
});
const BAYS: Record<string, string[]> = { '1F': ['BAY-A01', 'BAY-A02'], '2F': ['BAY-B01'] };
const LOTS: Record<string, string[]> = {
  WA2409001: ['WAIT', 'NotOnHold', 'Released', 'JOB-8821', '25', 'PHOTO ETCHING PROCESS'],
  WA2409002: ['RUN', 'NotOnHold', 'Released', 'JOB-8822', '25', 'DIFFUSION OXIDATION'],
  WA2409003: ['WAIT', 'OnHold', 'Released', 'JOB-8823', '20', 'ION IMPLANTATION'],
  WA2409004: ['WAIT', 'NotOnHold', 'Created', 'JOB-8824', '25', 'CHEMICAL VAPOR DEPOSITION'],
};

// Same answers as the mock server's backup-bay handlers.
export function fakeBackupBayServer(
  _route: string,
  name: string,
  fields: readonly (readonly [string, unknown])[],
) {
  const value = (tag: string) => String(fields.find(([key]) => key === tag)?.[1] ?? '');
  if (name === 'GETFLOORDATA') {
    return Promise.resolve(pass({ FABS: { ITEM: ['1F', '2F'].map((FLOOR) => ({ FLOOR })) } }));
  }
  if (name === 'GETBAYDATA') {
    const bays = BAYS[value('FLOOR')] ?? [];
    return Promise.resolve(pass({ FABS: { ITEM: bays.map((AREANAME) => ({ AREANAME })) } }));
  }
  if (name === 'GETPROCESSFACTORYLOT') {
    const [process, hold, state, jobCode, quantity, operation] =
      LOTS[value('LOTID')] ?? LOTS.WA2409001;
    return Promise.resolve(
      pass({
        LOTPROCESSSTATE: process,
        LOTHOLDSTATE: hold,
        LOTSTATE: state,
        JOBCODE: jobCode,
        PRODUCTQUANTITY: quantity,
        OPERATIONDESCRIPTION: operation,
      }),
    );
  }
  const filled = fields.filter(([key, v]) => key.startsWith('CHANGEFACTORY') && v).length;
  return Promise.resolve(pass({ SUCCESSLOT: String(filled) }));
}
