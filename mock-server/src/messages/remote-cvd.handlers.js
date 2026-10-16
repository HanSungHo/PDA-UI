import { fail, pass } from '../utils/response.js';

const REQUIRED_DOWNLOAD_FIELDS = ['LOTID', 'RCP', 'EQP', 'CHM', 'PARAMETER', 'STEP'];

export function createRemoteCvdHandlers(store) {
  return {
    REMOTEEQPINFO: ({ payload }) => {
      const equipment = store.getRemoteCvdEquipment(payload.EQPID);
      return equipment ? pass(equipment) : fail('유효하지 않은 장비입니다.');
    },
    RECIPEINFO: ({ payload }) => {
      const recipeInfo = store.getRemoteCvdRecipeInfo(payload.EQPID);
      return recipeInfo ? pass(recipeInfo) : fail('진행 Rcp 정보를 찾을 수 없습니다.');
    },
    TERCPSELECTION: ({ payload }) => pass(store.getRemoteCvdTeRcp(payload.EQPID)),
    MEMORIZATION: ({ payload }) => {
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
