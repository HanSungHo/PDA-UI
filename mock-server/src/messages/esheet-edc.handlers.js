import { readXmlTag } from '../utils/xml.js';
import { fail, pass } from '../utils/response.js';

export function createESheetEdcHandlers(store) {
  return {
    GETEDCDATA: ({ payload }) => {
      const sendMessage = payload.sMsg || payload.SMSG || '';
      const lotId = readXmlTag(sendMessage, 'LOTID');
      const result = store.getEdcData(lotId);
      return result ? pass(result) : fail('EDC DATA 조회에 실패하였습니다.');
    },
  };
}
