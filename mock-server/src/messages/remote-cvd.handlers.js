import { fail, pass } from '../utils/response.js';

const REQUIRED_DOWNLOAD_FIELDS = ['LOTID', 'RCP', 'EQP', 'CHM', 'PARAMETER', 'STEP'];

export function createRemoteCvdHandlers(store) {
  return {
    REMOTEEQPINFO: ({ payload }) => {
      const equipment = store.getRemoteCvdEquipment(payload.EQPID);
      return equipment ? pass(equipment) : fail('유효하지 않은 장비입니다.');
    },
    RECIPEINFO: ({ payload }) => {
      // IMP Batch path: CHAMBERYN field present (sent as 'N') with a LOTID.
      // In this case resolve RECIPE from the LOT record, not from CVD equipment.
      if (payload.ISPHOTO === 'N' && payload.LOTID) {
        const lotId = String(payload.LOTID || '')
          .trim()
          .toUpperCase();
        const eqpId = String(payload.EQPID || '').trim();
        if (!lotId) return fail('LOT 정보가 없습니다.');
        if (!eqpId) return fail('진행장비를 입력하세요.');
        const lot = store.getLot(lotId);
        if (!lot) return fail(`존재하지 않는 LOT입니다. [${lotId}]`);
        const recipe = lot.RECIPE ?? lot.WORKEDRECIPE ?? '';
        if (!recipe) return fail('진행Rcp가 조회되지 않았습니다.');
        return pass({ RECIPE: recipe });
      }

      // CVD path (original): resolve recipe info from CVD equipment record.
      const recipeInfo = store.getRemoteCvdRecipeInfo(payload.EQPID);
      return recipeInfo ? pass(recipeInfo) : fail('진행 Rcp 정보를 찾을 수 없습니다.');
    },
    TERCPSELECTION: ({ payload }) => pass(store.getRemoteCvdTeRcp(payload.EQPID)),
    MEMORIZATION: ({ payload }) => {
      // IMP Batch path: AREA === 'IMP' sent in payload.
      // Resolve memorization rule from recipe string, not from equipment.
      if (
        String(payload.EQP_TYPE || '')
          .trim()
          .toUpperCase() === 'IMP'
      ) {
        const recipe = String(payload.RECIPE || '').trim();
        const eqpId = String(payload.EQPID || payload.CHEQPID || '').trim();
        if (!eqpId || !recipe) return fail('ERRORMSG_MSGBODY');
        const rule = store.getMemorizationRule(recipe);
        if (rule.status === 'FAIL') {
          return fail(rule.errorMessage || 'MEMORIZATION 검증에 실패했습니다.');
        }
        return pass({ POPUP: rule.POPUP ?? '' });
      }

      // CVD path (original): resolve memorization from equipment state.
      const result = store.getRemoteCvdMemorization(payload.EQPID);
      return Object.keys(result).length > 0
        ? pass(result)
        : fail('Recipe 정보를 찾을 수 없습니다.');
    },
    MACHINEPORTSTATUS: ({ payload }) => {
      const port = store.getRemoteCvdPort(payload.EQPID, payload.PORTNAME);
      return port ? pass(port) : fail('PORT 정보를 찾을 수 없습니다.');
    },
    MACHINEPORTCLEAR: ({ payload }) => {
      const port = store.clearRemoteCvdPort(payload.MACHINENAME, payload.PORTNAME);
      return port ? pass({}) : fail('PORT 정보를 찾을 수 없습니다.');
    },
    DOOROPEN: ({ payload }) => {
      if (!store.getRemoteCvdEquipment(payload.MACHINENAME))
        return fail('장비 정보를 찾을 수 없습니다.');
      store.recordRemoteCvdDoorOpen(payload);
      return pass({});
    },
    REMOTEINTLKCHECK: ({ payload }) => {
      const lot = store.getLot(payload.LOTID);
      if (!lot) return fail('LOT 정보를 찾을 수 없습니다.');
      if (lot.CHECKINTERLOCK === 'N') return fail('Remote interlock check failed.');
      return pass({ POPUP: '' });
    },
    REMOTESTART: ({ payload }) => {
      const lot = store.startRemoteCvd(payload);
      return lot ? pass({}) : fail('LOT 정보를 찾을 수 없습니다.');
    },
    REMOTERESTART: ({ payload }) => {
      const lot = store.startRemoteCvd(payload);
      return lot ? pass({}) : fail('LOT 정보를 찾을 수 없습니다.');
    },
    ETCHCOMMRCP: ({ payload }) => {
      if (
        !['LOTID', 'RCP', 'EQP', 'PROCESSOPERATIONNAME', 'OPERATIONDESCRIPTION'].every((field) =>
          Object.hasOwn(payload, field),
        )
      ) {
        return fail('RCP 조건 정보가 없습니다.');
      }
      if (!store.getRemoteCvdEquipment(payload.EQP)) return fail('장비 정보를 찾을 수 없습니다.');
      return pass(store.getRemoteCvdEtchCommRcp(payload.EQP));
    },
    ETCHRCPDOWNLOAD: ({ payload }) => {
      const missing = REQUIRED_DOWNLOAD_FIELDS.find(
        (field) => !String(payload[field] || '').trim(),
      );
      if (missing) return fail(`${missing} is required.`);
      return pass({ CHK: store.recordRemoteCvdEtchRcpDownload(payload) });
    },
  };
}
