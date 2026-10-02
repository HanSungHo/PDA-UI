import { fail, pass } from '../utils/response.js';

export function createRcpInquireHandlers(store) {
  return {
    METRECIPESEARCH: ({ payload }) => {
      const recipe = store.getRcpRecipe(payload.LOTID);
      return recipe ? pass(recipe) : fail('LOT 정보를 찾을 수 없습니다.');
    },
    CHECKINSPACTION: ({ payload }) => {
      if (payload.TYPE !== 'RCP') return fail('측정 정보가 확인되지 않습니다.');

      const inspection = store.getRcpInspection(payload.LOTID);
      return inspection ? pass(inspection) : fail('LOT 정보를 찾을 수 없습니다.');
    },
  };
}
