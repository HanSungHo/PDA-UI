import { testResultInputFixtures } from '../data/test-result-input.fixtures.js';
import { fail, pass } from '../utils/response.js';

export function createTestResultInputHandlers() {
  return {
    INSPMASKINFO: ({ payload }) => {
      const info = testResultInputFixtures[payload.MASKTAG];
      return info ? pass(info) : fail('MASK 정보를 찾을 수 없습니다.');
    },
    INSPMASKSTATCHECK: ({ payload }) => {
      const tag = payload.RETICLESEQ;
      if (!testResultInputFixtures[tag]) return fail('MASK 정보를 찾을 수 없습니다.');
      if (tag === 'MASKCHECKFAIL') return fail('검사 상태를 확인할 수 없습니다.');
      return pass({
        STATUS: tag === 'MASKRUN' || tag === 'MASKRUNALLOWED' ? 'RUN' : 'READY',
        MASK_TAG: tag === 'MASKRUNALLOWED' ? 'RUN' : tag,
      });
    },
    INSPMASKINSERT: ({ payload }) => {
      if (!testResultInputFixtures[payload.RETICLESEQ]) {
        return fail('MASK 정보를 찾을 수 없습니다.');
      }
      if (payload.RETICLESEQ === 'MASKINSERTFAIL') return fail('검사결과 입력에 실패했습니다.');
      if (!payload.EQPID || !payload.INSPTYPE || !payload.INSPTYPE2 || !payload.INSPRESULT) {
        return fail('검사 정보를 확인해주세요.');
      }
      return pass({});
    },
  };
}
