export interface MoveInMockResponse {
  isSuccessFul: boolean;
  result: string;
}

function getTag(message: string, tag: string): string {
  return new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(message)?.[1] ?? '';
}

function makeResponse(fields: Record<string, string> = {}): MoveInMockResponse {
  const body = Object.entries(fields)
    .map(([name, value]) => `<${name}>${value}</${name}>`)
    .join('');

  return {
    isSuccessFul: true,
    result: `<AIFMSG><MSGBODY>${body}</MSGBODY></AIFMSG>`,
  };
}

function lotInfo(message: string): MoveInMockResponse {
  if (message.includes('<MACHINENAME>')) {
    return makeResponse({ NWCOMMENTQTY: '0' });
  }

  const lotId = getTag(message, 'LOTID');
  const isAutomotiveWtLot = lotId === 'LOT-DEMO-AUTOMOTIVE';
  return makeResponse({
    PRODUCT: 'PRODUCT-DEMO',
    JOBCODE: 'JOB-DEMO',
    OPERATION: 'OP-10',
    SUBOPERATION: '01',
    PROCESSSTEP: 'DEMO PROCESS',
    OPTYPE: 'N',
    AREA: 'DIFF',
    CUSTOMER: 'CUSTOMER-DEMO',
    ENGINEER: 'ENGINEER-DEMO',
    QUANTITY: '25',
    GOODCHIPS: '25',
    RECIPE: 'RCP-DEMO-01',
    EQPGROUP: 'EQP-GROUP-DEMO',
    BATCHID: lotId === 'LOT-DEMO-BATCH' ? 'BAT-A260915-001' : '',
    COMMENTQTY: '2',
    PROCESSTYPE: isAutomotiveWtLot ? 'WT' : '',
    AUTOMOTIVEFLAG: isAutomotiveWtLot ? 'Y' : 'N',
    CREATECATEGORY: '',
    SCOPESUB: '',
    OPERSEQUENCE: '0001',
    SKIPALLOWFLAG: 'N',
    AUTOSKIP: 'N',
    PQCSKIPUSER: 'N',
    PHOTOTYPE: 'NN',
    REWORKSKIPFLAG: 'N',
    SORTINGSKIP: 'N',
    REWORKSCRUBBERSKIPFLAG: 'Y',
    MEASSKIPCHECK: 'Y',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BAKECHECK: 'N',
    PROCESSNAME: '',
    NWCOMMENTQTY: '0',
  });
}

export function createMoveInMockResponse(messageName: string, message: string): MoveInMockResponse {
  switch (messageName) {
    case 'lotinfo':
      return lotInfo(message);
    case 'mcfdceqpinfo':
      return makeResponse({ STATUS: 'Local', EQPID: getTag(message, 'EQPID') });
    case 'eqpinfo':
      return makeResponse({
        MAINEQPID: getTag(message, 'EQPID'),
        SUBEQPID: getTag(message, 'EQPID'),
        CHECKINTERLOCK: '',
      });
    case 'recipeinfo':
      return makeResponse({ RECIPE: 'RCP-DEMO-01' });
    case 'loginusercheck':
      return makeResponse({ AREACHECK: 'Y' });
    case 'movein':
    case 'lotinfoend':
    case 'changeeqpstatus':
    case 'checkinspaction':
    case 'probecardset':
      return makeResponse();
    case 'checkdicycle':
      return makeResponse({ DICYCLE: 'N' });
    case 'slotinfo': {
      const lotId = getTag(message, 'LOTID');
      return makeResponse({ WAFERLIST: `${lotId}.01,${lotId}.02` });
    }
    case 'dummyeqpinfo':
      return makeResponse({ EQPID: getTag(message, 'EQPID') });
    case 'dummyeqpinput':
      return makeResponse({ LOTCOMMENT: getTag(message, 'LOTLASTEVENT') });
    case 'probecardinfo':
      return makeResponse({ PROBECARDSTATUS: 'Y', PROBECARDNO: 'PROBECARD-DEMO' });
    case 'probecardvalue':
      return makeResponse({ VALUE_OD: '1.0', VALUE_Z: '1.0' });
    default:
      return makeResponse();
  }
}
