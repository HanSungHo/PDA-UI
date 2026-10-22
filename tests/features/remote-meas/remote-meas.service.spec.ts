import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import {
  isRemoteMeasMockMode,
  remoteMeasService,
  setRemoteMeasMockMode,
} from 'src/features/remote-meas/services/remote-meas.service';
import apiClient from 'src/services/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('remoteMeasService (mock mode)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setRemoteMeasMockMode(true);

    const main = useMainStore();
    main.facility = 'FAB2';
    main.operatorId = 'OP_TEST';
    main.operatorName = 'Test Operator';
  });

  afterEach(() => {
    setRemoteMeasMockMode(false);
  });

  it('isRemoteMeasMockMode returns current flag', () => {
    expect(isRemoteMeasMockMode()).toBe(true);
    setRemoteMeasMockMode(false);
    expect(isRemoteMeasMockMode()).toBe(false);
    setRemoteMeasMockMode(true);
  });

  describe('fetchLotInfo', () => {
    it('returns ok:true with mock lot data', async () => {
      const result = await remoteMeasService.fetchLotInfo('LOT-MEAS-01', 'FAB2');
      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.product).toBe('PRD-MEAS-100');
      expect(result.data?.operation).toBe('3100');
      expect(result.data?.subOperation).toBe('00');
    });

    it('returns mock data for any requested lot', async () => {
      const result = await remoteMeasService.fetchLotInfo('CUSTOM-LOT', 'FAB2');
      expect(result.ok).toBe(true);
      expect(result.data?.jobCode).toBe('JOB-M01');
    });
  });

  describe('fetchEqpInfo', () => {
    it('returns eqp data for machine query', async () => {
      const result = await remoteMeasService.fetchEqpInfo({
        lotId: 'LOT-MEAS-01',
        operation: '5100',
        subOperation: '01',
        product: 'PRD-MEAS-01',
        eqpId: 'MEQP-01',
        opType: 'M',
        facility: 'FAB2',
      });
      expect(result.ok).toBe(true);
      expect(result.data?.procEqpId).toBe('MEQP-01');
      expect(result.data?.portName).toContain('PORT1');
      expect(result.data?.recipeName).toBe('RCP-MEAS-01');
    });
  });

  describe('fetchPortStatus', () => {
    it('returns port status details', async () => {
      const result = await remoteMeasService.fetchPortStatus('MEQP-01', 'PORT-1');
      expect(result.ok).toBe(true);
      expect(result.data?.portStateName).toBe('READY');
    });
  });

  describe('clearPort', () => {
    it('returns ok:true on clear command', async () => {
      const result = await remoteMeasService.clearPort('MEQP-01', 'PORT-1');
      expect(result.ok).toBe(true);
    });
  });

  describe('fetchSlotInfo', () => {
    it('returns slot wafer list and count', async () => {
      const result = await remoteMeasService.fetchSlotInfo('LOT-MEAS-01', 'FAB2');
      expect(result.ok).toBe(true);
      expect(result.data?.waferList).toBe('01,02,03,04,05');
      expect(result.data?.quantity).toBe(5);
    });
  });

  describe('startRemoteMeas', () => {
    it('returns ok:true when starting remote meas', async () => {
      const result = await remoteMeasService.startRemoteMeas({
        machineName: 'MEQP-01',
        machineType: 'MEAS',
        lotName: 'LOT-MEAS-01',
        portName: 'PORT-1',
        recipeName: 'RCP-MEAS-STD',
        procQty: '5',
        measFlag: 'T',
        prodMachine: 'PROD-01',
        reworkFlag: 'N',
        eventUser: 'Test Operator',
        wfList: '01,02,03,04,05',
        product: 'PRD-MEAS-01',
        operation: '5100-01',
      });
      expect(result.ok).toBe(true);
    });
  });
});

describe('remoteMeasService (live client mode with mocks)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setRemoteMeasMockMode(false);

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
