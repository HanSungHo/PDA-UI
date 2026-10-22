import { fail, pass } from '../utils/response.js';

function extractParam(payload, key) {
  if (payload && payload[key] !== undefined && payload[key] !== '') return payload[key];
  const sMsg = payload?.sMsg || payload?.SMSG || '';
  if (sMsg) {
    const match = sMsg.match(new RegExp(`<${key}>(.*?)</${key}>`, 'i'));
    if (match) return match[1];
  }
  return '';
}

export function createRemoteMeasHandlers(store) {
  return {
    REMOTEMEASEQPINFO: ({ payload }) => {
      const eqpId = extractParam(payload, 'EQPID');
      if (!eqpId || eqpId.includes('FAIL')) {
        return fail('장비 정보를 찾을 수 없습니다.');
      }

      const eqpInfo = store.getRemoteMeasEqp(eqpId);
      return pass(eqpInfo);
    },

    MACHINEPORTSTATUS: ({ payload }) => {
      const eqpId = extractParam(payload, 'EQPID');
      const portName = extractParam(payload, 'PORTNAME');

      if (eqpId.includes('FAIL-EMPTY')) {
        return pass({
          PORTSTATENAME: '',
          PORTLOTNAME: '',
          ACKMSG: '',
        });
      }

      if (eqpId.includes('FAIL')) {
        return fail('PORT 상태 정보를 가져올 수 없습니다.');
      }

      const status = store.getRemoteMeasPortStatus(eqpId, portName);
      return pass(status);
    },

    MACHINEPORTCLEAR: ({ payload }) => {
      const machineName = extractParam(payload, 'MACHINENAME');
      const portName = extractParam(payload, 'PORTNAME');

      if (machineName.includes('FAIL')) {
        return fail('해당 PORT 초기화에 실패하였습니다.');
      }

      store.clearRemoteMeasPort(machineName, portName);
      return pass({});
    },

    MEASREMOTESTART: ({ payload }) => {
      const machineName = extractParam(payload, 'MACHINENAME');
      const lotName = extractParam(payload, 'LOTNAME');
      const portName = extractParam(payload, 'PORTNAME');
      const recipeName = extractParam(payload, 'RECIPENAME');
      const procQty = extractParam(payload, 'PROCQTY');
      const measFlag = extractParam(payload, 'MEASFLAG');
      const prodMachine = extractParam(payload, 'PRODMACHINE');
      const reworkFlag = extractParam(payload, 'REWORKFLAG');
      const eventUser = extractParam(payload, 'EVENTUSER');
      const wfList = extractParam(payload, 'WFLIST');
      const product = extractParam(payload, 'PRODUCT');
      const operation = extractParam(payload, 'OPERATION');

      if (!machineName) return fail('진행장비를 입력하세요.');
      if (!portName) return fail('진행 Port를 선택하세요.');
      if (!recipeName) return fail('진행Rcp를 선택하세요.');
      if (!measFlag) return fail('계측 FLAG를 선택하세요.');
      if (!wfList) return fail('진행 WF를 선택하세요.');
      if (!prodMachine) return fail('생산 장비명을 입력하세요.');

      if (lotName.includes('FAIL') || machineName.includes('FAIL')) {
        return fail('원격 계측 시작 명령 전송에 실패하였습니다.');
      }

      store.recordRemoteMeasStart({
        machineName,
        lotName,
        portName,
        recipeName,
        procQty,
        measFlag,
        prodMachine,
        reworkFlag,
        eventUser,
        wfList,
        product,
        operation,
      });

      return pass({});
    },
  };
}
