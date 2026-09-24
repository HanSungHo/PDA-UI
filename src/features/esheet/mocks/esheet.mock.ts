import type {
  ESheetInfoRequest,
  ESheetInfoResponse,
  ESheetInfoResult,
  ESheetInfoStepResponse,
} from '../esheet.types';

export type ESheetMockErrorCode = 'EMPTY' | 'NOT_FOUND' | 'SERVER_ERROR';

export class ESheetMockError extends Error {
  constructor(
    public readonly code: ESheetMockErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ESheetMockError';
  }
}

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

function createStep(index: number): ESheetInfoStepResponse {
  const processName = processNames[index % processNames.length] ?? `PROCESS ${index + 1}`;

  return {
    ACTIONTYPE: '',
    BAY: 'BP04',
    COMMENTCNT: index === 0 ? '0' : '1',
    ENDTIME: '',
    EQPGROUP: 'PHOTO',
    FUTUREACTIONDESC: '',
    INOPERNAME: '',
    INQTY: '',
    ISCURRENT: index === 1 ? 'Y' : 'N',
    ISDCOL: 'N',
    ISREWORK: 'N',
    OPERATION: `${index < 10 ? 'P' : 'S'}${String(index + 1).padStart(5, '0')}`,
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

function createResponse(stepCount: number): ESheetInfoResult {
  return {
    AUTOMOTIVEFLAG: 'N',
    CUTOFF: '',
    ENGR: 'PHOTO',
    ENGR2: '',
    ESHEETITEMS: Array.from({ length: stepCount }, (_, index) => createStep(index)),
    FACILITY: 'GUMI',
    LOTRESUSER: '',
    MAINTITEM: '',
    PHOTOJOBCODE: '20151115',
    PRIORITY: 'Normal',
    PRODUCT: 'P-DM-TEST-6F',
    PRODUCTQUANTITY: '25',
    REMAINLAYERS: '4P02-51,52,5P02-07~12,1',
    RETICLELIST: 'MASK-001',
    STATUS: 'WAIT',
    TAT: '-3903.4',
  };
}

const mockResponses: Readonly<Record<string, ESheetInfoResult>> = {
  WP00001: createResponse(processNames.length),
  'WP-LARGE': createResponse(10_000),
};

export async function getESheetInfoMock(request: ESheetInfoRequest): Promise<ESheetInfoResponse> {
  await Promise.resolve();

  if (request.lotId === 'WP-ERROR') {
    throw new ESheetMockError('SERVER_ERROR', 'eSheet 조회에 실패하였습니다.');
  }
  if (request.lotId === 'WP-EMPTY') {
    throw new ESheetMockError('EMPTY', 'LOT 공정 데이터가 없습니다.');
  }

  const response = mockResponses[request.lotId];
  if (!response) {
    throw new ESheetMockError('NOT_FOUND', `LOT ${request.lotId}을(를) 찾을 수 없습니다.`);
  }

  return {
    statusCode: 200,
    result: JSON.stringify({ STATUS: 'PASS', MSGBODY: structuredClone(response) }),
  };
}
