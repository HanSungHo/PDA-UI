import { fail, pass } from '../utils/response.js';

function readTag(source, tagName) {
  const match = String(source || '').match(new RegExp(`<${tagName}>(.*?)</${tagName}>`));
  return match?.[1] || '';
}

export function createActivityMainHandlers() {
  return {
    LOGIN: ({ payload }) => {
      const sendMessage = payload.sMsg || payload.SMSG || '';
      // The HTTP router unwraps a complete AIFMSG envelope before dispatching,
      // while older callers can still send the XML-like body directly.
      const operatorId = payload.OPERATORID || readTag(sendMessage, 'OPERATORID') || 'DEMO';
      const password = payload.PASSWORD || readTag(sendMessage, 'PASSWORD');
      if (password !== 'PASS') return fail('아이디 또는 패스워드를 확인해주세요');
      return pass({
        GASINPUT: 'N',
        OPERID: operatorId,
        OPERNAME: 'HiFOS DEMO',
        PERMISSTION: 'H',
      });
    },
  };
}
