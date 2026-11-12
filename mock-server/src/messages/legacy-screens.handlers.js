import { readPayloadField } from '../utils/xml.js';
import { fail, pass } from '../utils/response.js';

// hifos2 messages of screens that have no Vue page yet. Each answer carries the MSGBODY keys the legacy
// Activity reads (see docs/mock-parity), so a migrated screen can be built against the mock server.
//
// Scenario IDs (substring match, case-insensitive): an ID containing FAIL makes the message FAIL;
// EMPTY returns an empty list where the screen reads one.
const upper = (payload, tag) => readPayloadField(payload, tag).trim().toUpperCase();

function required(payload, tag, message) {
  const value = upper(payload, tag);
  if (!value) return { error: fail(message) };
  if (value.includes('FAIL')) return { error: fail(`${value} 처리에 실패하였습니다.`) };
  return { value };
}

function command(tag, message) {
  return ({ payload }) => {
    const { error } = required(payload, tag, message);
    return error ?? pass({});
  };
}

const aitLot = (lotId) => ({
  LOTID: lotId,
  FAB: 'FAB1',
  FACTORYNAME: 'KFAB',
  MACHINENAME: 'AIT-01',
  EQP: 'AIT-01',
  ENGINEERNAME: 'ENGR-01',
  JOBCODE: 'JOB-AIT-01',
  LOTHOLDSTATE: 'NotOnHold',
  LOTPROCESSSTATE: 'WAIT',
  LOTSTATE: 'Released',
  OPERCODE: '3100',
  OPERDESC: 'AIT MEASURE',
  OPERATIONDESCRIPTION: 'AIT MEASURE',
  PROCESSOPERATIONNAME: '3100',
  PRODUCTQUANTITY: '25',
  PRODUCTSPECNAME: 'PRD-AIT-100',
  RECIPE: 'AIT-RCP-01',
  RCP: 'AIT-RCP-01',
});

export function createLegacyScreenHandlers() {
  return {
    // PRIncomingActivity
    SRPRINFO: ({ payload }) => {
      const { error } = required(payload, 'PRID', 'PR ID를 입력하세요');
      return error ?? pass({ PRDESC: 'PR DEMO RESIST', PRCOMP: 'DEMO-CHEM' });
    },
    PRINPUT: command('PRID', 'PR ID를 입력하세요'),

    // LossActivity (no caller in hifos2, kept for parity)
    LOSSINFO: ({ payload }) => {
      const { error } = required(payload, 'LOTID', 'LOT ID을 입력하세요');
      if (error) return error;
      const loss = Object.fromEntries(
        [1, 2, 3, 4, 5].flatMap((n) => [
          [`LOSSCODE${n}`, ''],
          [`LOSS${n}`, ''],
          [`LOSSWAFER${n}`, ''],
        ]),
      );
      return pass({
        BEFOREQTY: '25',
        CURRENTQTY: '25',
        CURRENTEQPID: 'EQP-01',
        WAFERLIST: '01,02,03,04,05',
        ...loss,
        LOSSCODEITEMS: [
          { LOSSCODE: 'L01', LOSSDESC: 'BROKEN' },
          { LOSSCODE: 'L02', LOSSDESC: 'SCRATCH' },
        ],
      });
    },
    FORWARDSTEPS: ({ payload }) => {
      const { error } = required(payload, 'LOTID', 'LOT ID을 입력하세요');
      return error ?? pass({ ITEMS: [] });
    },

    // RemoteFurnaceInitActivity
    FURNACEABORTRECIPE: ({ payload }) => {
      const { error } = required(payload, 'LOTID', 'LOT ID을 입력하세요');
      return error ?? pass({ MACHINERECIPENAME: 'FURNACE-ABORT-RCP' });
    },
    FURNACEDUMMYRCPCHECK: ({ payload }) => {
      const { error } = required(payload, 'MACHINENAME', '장비 ID을 입력하세요');
      return error ?? pass({ RET: '' });
    },

    // RemoteBatchCancelActivity (launch commented out in hifos2)
    WETJOBLIST: ({ payload }) => {
      const { error } = required(payload, 'EQPID', '장비 ID을 입력하세요');
      return (
        error ??
        pass({
          JOB1: 'JOB-01',
          JOB2: '',
          RCP1: 'WET-RCP-01',
          RCP2: '',
          J1STA: 'RUN',
          J2STA: '',
          J1LOT1: 'LOT-WET-01',
          J1LOT2: '',
          J2LOT1: '',
          J2LOT2: '',
        })
      );
    },

    // RemoteXrfActivity
    MEASLOTINFO: ({ payload }) => {
      const { error, value } = required(payload, 'EQPID', '장비 ID을 입력하세요');
      if (error) return error;
      return pass({
        RANDOMFLAG: 'N',
        ITEMS: value.includes('EMPTY')
          ? []
          : [{ LOTID: 'LOT-XRF-01', PORTNAME: upper(payload, 'PORTNAME') || '1' }],
      });
    },
    XRFTABLEINFO: ({ payload }) => {
      const { error } = required(payload, 'PRODEQP', '장비 ID을 입력하세요');
      return error ?? pass({ BAYS: [{ PORTSTATENAME: 'READY', ACKMSG: '' }] });
    },
    XRFTABLELOTINFO: ({ payload }) => {
      const { error } = required(payload, 'EQPID', '장비 ID을 입력하세요');
      if (error) return error;
      const row = {
        CATEGORY: 'THK',
        MDSITEM: 'THICKNESS',
        MEASEQPID: 'XRF-01',
        PARAMETER: 'TH',
        RECIPE: 'XRF-RCP-01',
        SAMPLE: '5',
        SLOT: '01,02,03',
        THICK: '1000',
      };
      return pass({ ...row, ITEMS: [row] });
    },
    XRFREMOTESTART: command('MACHINENAME', '장비 ID을 입력하세요'),

    // RemoteAITActivity
    AITLOTINFO: ({ payload }) => {
      const { error, value } = required(payload, 'LOTID', 'LOT ID을 입력하세요');
      if (error) return error;
      const lot = aitLot(value);
      return pass({ ...lot, ITEMS: [lot] });
    },
    AITRECIPEINFO: ({ payload }) => {
      const { error } = required(payload, 'RECIPE', 'RECIPE를 입력하세요');
      return error ?? pass({ ITEMS: [{ RCP_PATH: '/AIT/RECIPE/AIT-RCP-01' }] });
    },
    AITREMOTESTART: command('MACHINENAME', '장비 ID을 입력하세요'),

    // WaferselectAEGIS_Activity (AEGISLOTINFO / AEGISREMOTESTART / AEGISMODECHANGE live in remote-aegis.handlers.js)
    MEASCHAMBERCOVERAGE: ({ payload }) => {
      const { error } = required(payload, 'LOTID', 'LOT ID을 입력하세요');
      return error ?? pass({ CHAMBERSLOTLIST: 'A:01,03,05;B:02,04' });
    },

    // ESDMasterActivity
    ESDINSERT: command('ESDID', 'ESD ID를 입력하세요'),

    // OperationProgressActivity
    GETMACHINEINFO: ({ payload }) => {
      const { error } = required(payload, 'EQPID', '장비 ID을 입력하세요');
      return error ?? pass({ AREANAME: 'PHOTO', MESSTATE: 'RUN' });
    },
    GETOPERATIONCOUNT: ({ payload }) => {
      const { error } = required(payload, 'LOTNAME', 'LOT ID을 입력하세요');
      return error ?? pass({ COUNT: '1', EVENTTIME: '2026-11-12 09:00:00' });
    },
    INSERTOPERATIONHISTORY: command('LOTNAME', 'LOT ID을 입력하세요'),

    // MessageSender timeout report (no screen)
    TIMEOUTLIST: () => pass({}),
  };
}
