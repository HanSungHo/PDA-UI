import { fail, pass } from '../utils/response.js';

function readTag(source, tagName) {
  const match = String(source || '').match(new RegExp(`<${tagName}>(.*?)</${tagName}>`));
  return match?.[1] || '';
}

export function createActivityMainHandlers() {
  return {
    LOGIN: ({ payload }) => {
      const sendMessage = payload.sMsg || payload.SMSG || '';
      const operatorId = readTag(sendMessage, 'OPERATORID') || 'DEMO';
      const password = readTag(sendMessage, 'PASSWORD');
      if (password !== 'PASS') return fail('아이디 또는 패스워드를 확인해주세요');
      return pass({
        GASINPUT: 'N',
        OPERID: operatorId,
        OPERNAME: 'HiFOS DEMO',
        PERMISSTION: 'H',
      });
    },
    CONFIG: () => pass({ CONFIG: 'OK' }),
  };
}
