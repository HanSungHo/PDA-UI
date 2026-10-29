import type { ESheetInfoResult, ESheetInfoStepResponse } from 'src/features/esheet/esheet.types';
import type { MessageResponseData } from 'src/types/api';

const processNames = [
  'PHOTO',
  'BARC COATING',
  'PR COATING',
  'Exposure',
  'Develop',
  'DI',
  'Develop Inspector',
  'Dummy Banking',
  'Wet Etch',
  'Dry Etch',
  'Ashing',
  'Cleaning',
  'Inspection',
  'Measurement',
  'Annealing',
  'Metal Deposition',
  'Passivation',
  'Final Inspection',
  'Packing',
  'Shipping',
];
const supportedLotIds = new Set(['WP00001', 'WP-COMMENT', 'LOT-RETURNED', 'LOT-KJ-RETURN']);

function createStep(
  index: number,
  currentIndex: number,
  commentIndexes: readonly number[],
): ESheetInfoStepResponse {
  const processName = processNames[index] ?? `PROCESS ${index + 1}`;
  const operation = `${index < 10 ? 'P' : 'S'}${String(index + 1).padStart(5, '0')}`;

  return {
    ACTIONTYPE: '',
    BAY: 'BP04',
    COMMENTCNT: commentIndexes.includes(index) ? '1' : '0',
    ENDTIME: '',
    EQPGROUP: 'PHOTO',
    FUTUREACTIONDESC: '',
    INOPERNAME: '',
    INQTY: '',
    ISCURRENT: index === currentIndex ? 'Y' : 'N',
    ISDCOL: 'N',
    ISREWORK: 'N',
    OPERATION: operation,
    OPERTYPE: operation.slice(0, 1),
    OUTOPERNAME: '',
    OUTQTY: '',
    PROCESSSTEP: processName,
    REALEQPID: '',
    REALRECIPE: '',
    REALRETICLE: '',
    RECIPE: processName === 'PHOTO' || processName === 'PR COATING' ? 'BEWH-K69-76-B81' : '',
    SPEC: processName === 'PHOTO' || processName === 'PR COATING' ? 'BEWH-K69-76-B81' : '',
    STARTTIME: '',
    SUBOPERATION: '00',
  };
}

function createResult(lotId: string): ESheetInfoResult {
  const isCommentLot = lotId === 'WP-COMMENT';
  const currentIndex = isCommentLot ? 0 : 1;
  const commentIndexes = isCommentLot ? [1] : [3, 4, 5, 6, 7];

  return {
    AUTOMOTIVEFLAG: 'N',
    CUTOFF: '',
    ENGR: 'PHOTO',
    ENGR2: '',
    ESHEETITEMS: processNames.map((_, index) => createStep(index, currentIndex, commentIndexes)),
    FACILITY: 'GUMI',
    FACTORYNAME: 'GUMI',
    GOLDENPATHEQP: '',
    HOLD_COMMENT: 'SPC OUT HOLD',
    LOTRESUSER: '',
    LASTLOGGEDOUTTIME: '',
    LOTPROCESSSTATE: '',
    MAINTITEM: '',
    PHOTOJOBCODE: '20151115',
    PRIORITY: 'Normal',
    PROCESSOPERATIONTYPE: '',
    PRODUCT: 'P-DM-TEST-6F',
    PRODUCTQUANTITY: '25',
    QTIMECHECK: '',
    REMAINLAYERS: '4P02-51,52,5P02-07~12,1',
    RETICLELIST: 'MASK-001',
    REWORK_BACKCOL: '',
    ROOTLOTNAME: 'ROOT-WP00001',
    SAFELAUNCHLOT: '',
    PROCESSFLOWNAME: 'PHOTO-DEMO',
    STATUS: 'WAIT',
    TAT: '',
  };
}

export function getESheetPageFixture(lotId: string): MessageResponseData {
  if (!supportedLotIds.has(lotId)) {
    return {
      statusCode: 200,
      result: JSON.stringify({
        STATUS: 'FAIL',
        ERRMSG: `LOT ${lotId}을(를) 찾을 수 없습니다.`,
        MSGBODY: {},
      }),
    };
  }

  return {
    statusCode: 200,
    result: JSON.stringify({ STATUS: 'PASS', MSGBODY: createResult(lotId) }),
  };
}
