import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import { remoteMeasService } from 'src/features/remote-meas/services/remote-meas.service';
import apiClient from 'src/services/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('remoteMeasService', () => {
  beforeEach(() => {
    setActivePinia(createPinia());

    const main = useMainStore();
    main.facility = 'FAB2';
    main.operatorId = 'OP_TEST';
    main.operatorName = 'Test Operator';
  });

  it('posts LOTINFO XML message via apiClient', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      status: 200,
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            PRODUCT: 'PRD-LIVE-01',
            OPERATION: '5200',
            SUBOPERATION: '02',
            NWCOMMENTQTY: '0',
          },
        }),
      },
    });

    const res = await remoteMeasService.fetchLotInfo('LOT-LIVE', 'FAB2');
    expect(postSpy).toHaveBeenCalled();
    expect(res.ok).toBe(true);
    expect(res.data?.product).toBe('PRD-LIVE-01');
    expect(res.data?.operation).toBe('5200');
  });

  it('handles API error envelope correctly', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      status: 200,
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'FAIL',
          ERRMSG: 'Invalid Lot',
        }),
      },
    });

    const res = await remoteMeasService.fetchLotInfo('BAD-LOT', 'FAB2');
    expect(res.ok).toBe(false);
    expect(res.message).toBe('Invalid Lot');
  });

  it('posts REMOTEMEASEQPINFO and parses response', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      status: 200,
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            MAINEQPID: 'M-MEQP-01',
            PROCEQPID: 'MEQP-01',
            EQPAREA: 'MEAS',
            EQPTYPE: 'THICKNESS',
            PMMESSAGE: 'PM ALERT',
            PORTNAME: 'PORT1,PORT2',
            RECIPENAME: 'RCP-01',
          },
        }),
      },
    });

    const res = await remoteMeasService.fetchEqpInfo({
      lotId: 'LOT-LIVE',
      operation: '5100',
      subOperation: '01',
      product: 'PRD-01',
      eqpId: 'MEQP-01',
      opType: 'M',
      facility: 'FAB2',
    });

    expect(res.ok).toBe(true);
    expect(res.data?.mainEqpId).toBe('M-MEQP-01');
    expect(res.data?.pmMessage).toBe('PM ALERT');
  });

  it('posts MACHINEPORTSTATUS and parses response', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      status: 200,
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            PORTSTATENAME: 'IDLE',
            PORTLOTNAME: '',
            ACKMSG: '',
          },
        }),
      },
    });

    const res = await remoteMeasService.fetchPortStatus('MEQP-01', 'PORT1');
    expect(res.ok).toBe(true);
    expect(res.data?.portStateName).toBe('IDLE');
  });

  it('posts MACHINEPORTCLEAR and returns ok:true', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      status: 200,
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {},
        }),
      },
    });

    const res = await remoteMeasService.clearPort('MEQP-01', 'PORT1');
    expect(res.ok).toBe(true);
  });

  it('posts SLOTINFO and parses response', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      status: 200,
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            WAFERLIST: '1,2,3',
            QUANTITY: '3',
            CHECKETCH: 'N',
          },
        }),
      },
    });

    const res = await remoteMeasService.fetchSlotInfo('LOT-01', 'FAB2');
    expect(res.ok).toBe(true);
    expect(res.data?.waferList).toBe('1,2,3');
    expect(res.data?.quantity).toBe(3);
  });

  it('posts MEASREMOTESTART and returns ok:true', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      status: 200,
      data: {
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {},
        }),
      },
    });

    const res = await remoteMeasService.startRemoteMeas({
      machineName: 'MEQP-01',
      machineType: 'MEAS',
      lotName: 'LOT-01',
      portName: 'PORT1',
      recipeName: 'RCP-01',
      procQty: '3',
      measFlag: 'T',
      prodMachine: 'PROD-01',
      reworkFlag: 'N',
      eventUser: 'Tester',
      wfList: '1,2,3',
      product: 'PRD-01',
      operation: '5100',
    });

    expect(res.ok).toBe(true);
  });
});
