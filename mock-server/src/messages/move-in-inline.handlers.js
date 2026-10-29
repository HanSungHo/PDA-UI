import { moveInInlineFixtures } from '../data/fixtures.js';
import { fail, pass } from '../utils/response.js';

const { errors } = moveInInlineFixtures;

export function createMoveInInlineHandlers() {
  return {
    INLINEINFO: ({ payload }) => {
      const lotId = String(payload.LOTID || '').toUpperCase();
      if (lotId.includes('ERROR')) return fail(errors.info);

      const info = { ...moveInInlineFixtures.info, OPERATION: payload.OPERATION || '1200' };
      if (lotId.includes('CHANGEMASK')) info.CHANGEMASKTAG = 'MT003';

      const items = moveInInlineFixtures.items.map((item) => ({ ...item }));
      if (lotId.includes('COMPLETED') && items[0]) items[0].ISCOMPLETE = 'Y';

      return pass({ ...info, INLINEITEMS: { ITEM: items } });
    },
    MASKINFO: ({ payload }) => {
      const maskTag = String(payload.RETICLEID || '');
      if (!maskTag || maskTag.toUpperCase().includes('ERROR')) return fail(errors.mask);

      return pass({
        ITEMS: { ITEM: [{ ...moveInInlineFixtures.maskLocation, RETICLETAG: maskTag }] },
      });
    },
    INLINESET: ({ payload }) => {
      if (
        String(payload.LOTID || '')
          .toUpperCase()
          .includes('ERROR')
      )
        return fail(errors.set);

      return pass(moveInInlineFixtures.set);
    },
  };
}
