// Test-only stand-in for the mock server's GETSCOPELOTINFO / SLOTINFO / INPUTSCOPEDATA handlers
// (mock-server/src/messages/input-scope-data.handlers.js), used by component specs that mount the
// real store + services but must not hit the network.
import type { AifMessageField } from 'src/services/aif-message.service';

interface FakeResponse {
  statusCode: number;
  result: string;
}

const pass = (body: unknown): FakeResponse => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }),
});
const fail = (message: string): FakeResponse => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: message, MSGBODY: '' }),
});

interface LotInfoOverride {
  isExist?: 'Y' | 'N';
  lotName?: string;
}

let lotInfoOverride: LotInfoOverride | null = null;

export function setFakeScopeLotInfo(override: LotInfoOverride | null): void {
  lotInfoOverride = override;
}

export function resetFakeScope(): void {
  lotInfoOverride = null;
}

const field = (fields: readonly AifMessageField[], name: string): string => {
  const entry = fields.find(([key]) => key === name);
  return typeof entry?.[1] === 'string' ? entry[1] : '';
};

export function fakePostAifMessage(
  _endpoint: string,
  messageName: string,
  fields: readonly AifMessageField[],
): Promise<FakeResponse> {
  const lotId = field(fields, 'LOTID');
  const upper = lotId.toUpperCase();

  if (messageName === 'GETSCOPELOTINFO') {
    if (upper.includes('ERR'))
      return Promise.resolve(fail(`존재하지 않는 LOT ID 입니다. (${lotId})`));
    return Promise.resolve(
      pass({
        ISEXIST: lotInfoOverride?.isExist ?? (upper.includes('EXIST') ? 'Y' : 'N'),
        LOTNAME: lotInfoOverride?.lotName ?? lotId,
        FACTORYNAME: 'FAB1',
        PROCESSOPERATIONNAME: '102030',
        MACHINENAME: 'SCOPE-01',
        LAYERID: 'PHOTO_01',
        FAULTS: {
          FAULT: ['PARTICLE', 'SCRATCH', 'PATTERN DEFECT'].map((TYPEVALUE) => ({ TYPEVALUE })),
        },
      }),
    );
  }

  if (messageName === 'SLOTINFO') {
    const wafers = upper.includes('EMPTY')
      ? ''
      : Array.from({ length: 25 }, (_, i) => `${lotId}.${String(i + 1).padStart(2, '0')}`).join(
          ',',
        );
    return Promise.resolve(pass({ WAFERLIST: wafers }));
  }

  if (messageName === 'INPUTSCOPEDATA') return Promise.resolve(pass({}));

  return Promise.resolve(fail(`Unexpected message ${messageName}`));
}
