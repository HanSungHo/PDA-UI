import type { RawMessageResponse, SplitMessageName } from '../types/split.types';

/** Fake data to run the UI without a server (VITE_USE_MOCK=true) */

const WAFERS_25 = Array.from({ length: 25 }, (_, i) => String(i + 1).padStart(2, '0')).join(',');

const baseLot: Record<string, string> = {
  PRODUCT: 'PROD-A100',
  OPERATION: '1000',
  SUBOPERATION: 'A',
  PROCESSSTEP: 'STEP01',
  QUANTITY: '25',
  STATE: 'WIP',
  STATUS: 'WAIT',
  HOLDSTATUS: '',
  BATCHID: '',
  WAFERLIST: WAFERS_25,
  SAMPLEFLAG: '',
  ROOTLOTNAME: 'ABC1234',
  CHILDLOTSEQUENCE: '0',
};

const lots: Record<string, Record<string, string>> = {
  ABC1234X: { ...baseLot },
  HOLD0001: { ...baseLot, HOLDSTATUS: 'ONHOLD' },
  BATCH001: { ...baseLot, BATCHID: 'BT-0001' },
  SAMPLE01: { ...baseLot, SAMPLEFLAG: 'S' },
  SCRAP001: { ...baseLot, STATE: 'SCRAPPED' },
  CUSTLOT1: { ...baseLot, PRODUCT: 'PROD-CUST' },
  OLDLOT6: { ...baseLot, ROOTLOTNAME: 'OLDLOT', CHILDLOTSEQUENCE: '2' },
};

const ok = (body: Record<string, string> = {}): RawMessageResponse => ({
  isSuccessful: true,
  body,
  errorMessage: '',
});

const fail = (errorMessage: string): RawMessageResponse => ({
  isSuccessful: false,
  body: {},
  errorMessage,
});

export async function mockSendMessage(
  name: SplitMessageName,
  params: Record<string, unknown>,
): Promise<RawMessageResponse> {
  await new Promise((r) => setTimeout(r, 300));

  switch (name) {
    case 'SLOTINFO': {
      const lot = lots[String(params.lotId)];
      return lot ? ok(lot) : fail('LOT 정보를 찾을 수 없습니다.');
    }
    case 'CALLCUSTOMER':
      // product "PROD-CUST" is simulated as belonging to a customer
      return ok({ CUSTOMER: params.product === 'PROD-CUST' ? 'CUSTOMER-X' : '' });
    case 'SPLIT':
      return ok();
    default:
      return fail('Unknown message');
  }
}
