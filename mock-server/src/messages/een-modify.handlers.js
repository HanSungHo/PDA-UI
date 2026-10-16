import { readXmlTag } from '../utils/xml.js';
import { fail, pass } from '../utils/response.js';

function readField(xml, name) {
  return readXmlTag(xml, name);
}

export function createEENModifyHandlers(store) {
  return {
    GETTAGID: ({ payload }) => {
      const facility = readField(payload.sMsg, 'FACTORYNAME');
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
        fields.map((field) => [field, readField(payload.sMsg, field)]),
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
