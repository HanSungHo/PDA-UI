import { sampleReleaseInfoFixture } from '../data/fixtures.js';
import { fail, pass } from '../utils/response.js';

export function createSampleReleaseHandlers() {
  return {
    SAMPLERELEASEINFO: ({ payload }) => {
      const lotId = String(payload.LOTID || '');
      if (lotId.includes('ERROR')) return fail('LOT ID 조회 실패하였습니다.');

      const item = { ...sampleReleaseInfoFixture, SLOTNAME: lotId };
      if (lotId.includes('MISMATCH')) item.MOPER = '9999';
      if (lotId.includes('NOTWAIT')) item.MPROCESSSTATE = 'RUN';
      if (lotId.includes('EMPTYMAIN')) item.MLOTNAME = '';

      return pass({ ITEMS: [item] });
    },
    SAMPLERELEASEEXECUTION: ({ payload }) => {
      if (String(payload.SAMPLELOTNAME || '').includes('FAIL')) {
        return fail('Sample Release 실행 중 오류가 발생하였습니다.');
      }

      return pass({ SUCESSMSG: 'Sample Release 실행이 정상적으로 완료되었습니다.' });
    },
  };
}
