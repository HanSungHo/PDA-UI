import { readPayloadField } from '../utils/xml.js';
import { fail, pass } from '../utils/response.js';

const EEN_FIELDS = [
  'LOTNAME',
  'USERID',
  'FACILITY',
  'PRODUCT',
  'OPERATION',
  'ACTIONPOINT',
  'PROCESSFLOW',
  'TAGCOMMENT',
  'TAGID',
];

/**
 * EEN Setting / Add / Modify / Delete. GETEENLIST, GETPROCESSFLOW, GETPROCESSOPERATION, UPDATEEEN
 * and DELETEEEN arrive on /hifos/message; GETTAGID, GETTAGPOSITION and INSERTEEN on their own routes.
 */
export function createEENModifyHandlers(store) {
  return {
    GETPROCESSFLOW: () =>
      pass({
        PROCESSFLOWNAME: 'PHOTO-DEMO',
        ITEMS: { ITEM: [{ PROCESSFLOWNAME: 'PHOTO-DEMO' }, { PROCESSFLOWNAME: 'ROUTE-B' }] },
      }),
    GETPROCESSOPERATION: () =>
      pass({
        ITEMS: {
          ITEM: [
            { PROCESSOPERATIONNAME: '1200', PODESC: 'PHOTO-EXPOSURE-DESC' },
            { PROCESSOPERATIONNAME: '1300', PODESC: 'ETCH-MAIN-DESC' },
          ],
        },
      }),
    GETTAGPOSITION: () =>
      pass({ ITEMS: { ITEM: [{ POSITION: '01' }, { POSITION: '05' }, { POSITION: '12' }] } }),
    INSERTEEN: ({ payload }) => {
      const request = Object.fromEntries(
        EEN_FIELDS.map((field) => [field, readPayloadField(payload, field)]),
      );
      if (!request.LOTNAME || !request.TAGCOMMENT) return fail('입력된 정보를 확인하세요');
      return pass({ EENID: store.insertEEN(request) });
    },
    GETEENLIST: ({ payload }) => {
      const lotName = readPayloadField(payload, 'LOTNAME');
      if (lotName.toUpperCase().includes('ERROR')) return fail('GETEENLIST mock error');
      return pass({ ITEMS: { ITEM: store.getEENList(lotName) } });
    },
    DELETEEEN: ({ payload }) => {
      const lotName = readPayloadField(payload, 'LOTNAME');
      const eenId = readPayloadField(payload, 'EENID');
      if (!store.deleteEEN(lotName, eenId)) return fail('EEN 정보를 찾을 수 없습니다.');
      return pass({ RESULT: 'OK' });
    },
    GETTAGID: ({ payload }) => {
      const facility = readPayloadField(payload, 'FACTORYNAME');
      if (facility === 'FAIL-TAGS') return fail('GETTAGID mock error');

      const tags = store.getEENModifyTags(facility);
      return pass({ TAGLIST: tags.map((row) => row.join('\t')).join('\n') });
    },
    UPDATEEEN: ({ payload }) => {
      const fields = [
        'LOTNAME',
        'USERID',
        'FACILITY',
        'PRODUCT',
        'OPERATION',
        'ACTIONPOINT',
        'EENID',
        'PROCESSFLOW',
        'TAGCOMMENT',
        'TAGID',
        'OLDTAGCOMMENT',
        'CHANGECAUSE',
      ];
      const request = Object.fromEntries(
        fields.map((field) => [field, readPayloadField(payload, field)]),
      );
      if (
        !store.updateEENModifyItem(request.EENID, {
          actionPoint: request.ACTIONPOINT,
          tagId: request.TAGID === 'null' ? '' : request.TAGID,
          tagComment: request.TAGCOMMENT,
          changeCause: request.CHANGECAUSE,
        })
      ) {
        return fail('EEN 정보를 찾을 수 없습니다.');
      }

      return pass({ RESULT: 'OK' });
    },
  };
}
