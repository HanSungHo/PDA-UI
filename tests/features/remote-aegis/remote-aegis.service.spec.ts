import {
  extractItemList,
  remoteAegisService,
} from 'src/features/remote-aegis/services/remote-aegis.service';
import * as aifService from 'src/services/aif-message.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/aif-message.service', () => ({
  postAifMessage: vi.fn(),
}));

describe('remote-aegis.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractItemList', () => {
    it('returns empty array for falsy input', () => {
      expect(extractItemList(null)).toEqual([]);
      expect(extractItemList(undefined)).toEqual([]);
    });

    it('returns array as is if input is already an array', () => {
      expect(extractItemList(['A', 'B'])).toEqual(['A', 'B']);
    });

    it('extracts ITEM array or single ITEM from container object', () => {
      expect(extractItemList({ ITEM: [{ id: 1 }, { id: 2 }] })).toEqual([{ id: 1 }, { id: 2 }]);
      expect(extractItemList({ ITEM: { id: 1 } })).toEqual([{ id: 1 }]);
      expect(extractItemList({})).toEqual([]);
    });
  });

  describe('fetchRemoteEqpInfo', () => {
    it('calls postAifMessage with REMOTEEQPINFO and parses result', async () => {
      const mockResult = JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: {
          PCOUNT: 'Y',
          PORTNAME: 'P1,P2',
          PMMESSAGE: 'PM ALERT',
          MAINEQPID: 'AEGIS01',
        },
      });
      vi.mocked(aifService.postAifMessage).mockResolvedValueOnce({
        statusCode: 200,
        result: mockResult,
      });

      const res = await remoteAegisService.fetchRemoteEqpInfo('AEGIS01');
      expect(res.ok).toBe(true);
      expect(res.data).toEqual({
        pCount: 'Y',
        portName: 'P1,P2',
        pmMessage: 'PM ALERT',
        mainEqpId: 'AEGIS01',
      });
      expect(aifService.postAifMessage).toHaveBeenCalledWith('REMOTEEQPINFO', 'REMOTEEQPINFO', [
        ['EQPID', 'AEGIS01'],
      ]);
    });

    it('handles failure when STATUS is not PASS', async () => {
      const mockResult = JSON.stringify({
        STATUS: 'FAIL',
        ERRMSG: '장비 조회 실패',
      });
      vi.mocked(aifService.postAifMessage).mockResolvedValueOnce({
        statusCode: 200,
        result: mockResult,
      });

      const res = await remoteAegisService.fetchRemoteEqpInfo('AEGIS01');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('장비 조회 실패');
    });

    it('handles empty MSGBODY with BODY가 존재하지 않습니다', async () => {
      const mockResult = JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: '',
      });
      vi.mocked(aifService.postAifMessage).mockResolvedValueOnce({
        statusCode: 200,
        result: mockResult,
      });

      const res = await remoteAegisService.fetchRemoteEqpInfo('AEGIS01');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('BODY가 존재하지 않습니다');
    });
  });

  describe('fetchMachinePortStatus', () => {
    it('calls MACHINEPORTSTATUS and parses result', async () => {
      const mockResult = JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: {
          PORTSTATENAME: 'READY',
          ACKMSG: 'ACK MSG',
        },
      });
      vi.mocked(aifService.postAifMessage).mockResolvedValueOnce({
        statusCode: 200,
        result: mockResult,
      });

      const res = await remoteAegisService.fetchMachinePortStatus('AEGIS01', 'P1');
      expect(res.ok).toBe(true);
      expect(res.data).toEqual({
        portStateName: 'READY',
        ackMsg: 'ACK MSG',
      });
      expect(aifService.postAifMessage).toHaveBeenCalledWith(
        'MACHINEPORTSTATUS',
        'MACHINEPORTSTATUS',
        [
          ['EQPID', 'AEGIS01'],
          ['PORTNAME', 'P1'],
        ],
      );
    });
  });

  describe('executeMachinePortClear', () => {
    it('calls MACHINEPORTCLEAR with mainEqpId and portName', async () => {
      const mockResult = JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: {},
      });
      vi.mocked(aifService.postAifMessage).mockResolvedValueOnce({
        statusCode: 200,
        result: mockResult,
      });

      const res = await remoteAegisService.executeMachinePortClear('AEGIS01', 'P1');
      expect(res.ok).toBe(true);
      expect(aifService.postAifMessage).toHaveBeenCalledWith(
        'MACHINEPORTCLEAR',
        'MACHINEPORTCLEAR',
        [
          ['MACHINENAME', 'AEGIS01'],
          ['PORTNAME', 'P1'],
        ],
      );
    });
  });

  describe('executeAegisModeChange', () => {
    it('calls AEGISMODECHANGE with machine, mode, userId, userName', async () => {
      const mockResult = JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: {},
      });
      vi.mocked(aifService.postAifMessage).mockResolvedValueOnce({
        statusCode: 200,
        result: mockResult,
      });

      const res = await remoteAegisService.executeAegisModeChange(
        'AEGIS01',
        'LOCAL',
        'USER1',
        'NAME1',
      );
      expect(res.ok).toBe(true);
      expect(aifService.postAifMessage).toHaveBeenCalledWith(
        'AegisModeChange',
        'AEGISMODECHANGE',
        [
          ['MACHINENAME', 'AEGIS01'],
          ['MODE', 'LOCAL'],
          ['USERID', 'USER1'],
          ['USERNAME', 'NAME1'],
        ],
        { preserveEndpointCase: true },
      );
    });
  });

  describe('fetchAegisLotInfo', () => {
    it('calls AEGISLOTINFO and returns parsed item list', async () => {
      const mockResult = JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: {
          ITEMS: {
            ITEM: {
              LOTHOLDSTATE: 'NotOnHold',
              LOTPROCESSSTATE: 'WAIT',
              JOBCODE: 'JOB01',
              PRODUCTQUANTITY: '25',
              OPERDESC: 'PARTICLE TEST',
              OPERCODE: 'OP1-SUB1',
              PRODUCTSPECNAME: 'SPEC1',
              RECIPE: 'RCP1',
              MACHINENAME: 'PROD_EQP',
              FAB: 'FAB2',
              ENGINEERNAME: 'ENG1',
              OWNERCODE: 'OWN1',
              SAFELAUNCHLOT: 'Y',
              INLINESAMPLEMESSGE: 'SAMPLE MSG',
            },
          },
        },
      });
      vi.mocked(aifService.postAifMessage).mockResolvedValueOnce({
        statusCode: 200,
        result: mockResult,
      });

      const res = await remoteAegisService.fetchAegisLotInfo('LOT01', 'AEGIS01');
      expect(res.ok).toBe(true);
      expect(aifService.postAifMessage).toHaveBeenCalledWith(
        'AegisLotInfo',
        'AEGISLOTINFO',
        [
          ['LOTID', 'LOT01'],
          ['MACHINE', 'AEGIS01'],
        ],
        { preserveEndpointCase: true },
      );
      expect(res.data).toHaveLength(1);
      expect(res.data?.[0]).toEqual({
        lotHoldState: 'NotOnHold',
        lotProcessState: 'WAIT',
        jobCode: 'JOB01',
        productQuantity: '25',
        operDesc: 'PARTICLE TEST',
        operCode: 'OP1-SUB1',
        productSpecName: 'SPEC1',
        recipe: 'RCP1',
        machineName: 'PROD_EQP',
        fab: 'FAB2',
        engineerName: 'ENG1',
        ownerCode: 'OWN1',
        safeLaunchLot: 'Y',
        inlineSampleMessage: 'SAMPLE MSG',
      });
    });
  });

  describe('fetchCommentList', () => {
    it('calls COMMENTLIST and returns COMMENTITEMS item list', async () => {
      const mockResult = JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: {
          COMMENTITEMS: {
            ITEM: [
              { ISCHECK: 'N', TRACKTYPE: 'MOVEIN' },
              { ISCHECK: 'Y', TRACKTYPE: 'MOVEIN' },
            ],
          },
        },
      });
      vi.mocked(aifService.postAifMessage).mockResolvedValueOnce({
        statusCode: 200,
        result: mockResult,
      });

      const res = await remoteAegisService.fetchCommentList('LOT01', 'FAB2', 'OP1', 'SUB1', '');
      expect(res.ok).toBe(true);
      expect(res.data).toHaveLength(2);
      expect(res.data).toEqual([
        { isCheck: 'N', trackType: 'MOVEIN' },
        { isCheck: 'Y', trackType: 'MOVEIN' },
      ]);
    });

    it('returns parseError: true when COMMENTITEMS is missing or malformed', async () => {
      const mockResult = JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: {
          ITEMS: [{ ISCHECK: 'N' }], // missing COMMENTITEMS container
        },
      });
      vi.mocked(aifService.postAifMessage).mockResolvedValueOnce({
        statusCode: 200,
        result: mockResult,
      });

      const res = await remoteAegisService.fetchCommentList('LOT01', 'FAB2', 'OP1', 'SUB1', '');
      expect(res.ok).toBe(true);
      expect(res.parseError).toBe(true);
      expect(res.data).toEqual([]);
    });
  });

  describe('fetchSlotInfo', () => {
    it('calls SLOTINFO and returns waferList', async () => {
      const mockResult = JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: {
          WAFERLIST: '01,02,03',
        },
      });
      vi.mocked(aifService.postAifMessage).mockResolvedValueOnce({
        statusCode: 200,
        result: mockResult,
      });

      const res = await remoteAegisService.fetchSlotInfo('LOT01', 'FAB2');
      expect(res.ok).toBe(true);
      expect(res.data?.waferList).toBe('01,02,03');
    });
  });

  describe('executeAegisRemoteStart', () => {
    it('calls AEGISREMOTESTART with all required payload fields', async () => {
      const mockResult = JSON.stringify({
        STATUS: 'PASS',
        MSGBODY: {},
      });
      vi.mocked(aifService.postAifMessage).mockResolvedValueOnce({
        statusCode: 200,
        result: mockResult,
      });

      const res = await remoteAegisService.executeAegisRemoteStart({
        machineName: 'AEGIS01',
        recipe: 'RCP1',
        portName: 'P1',
        runNo: 'LOT01',
        prodEqp: 'PEQP',
        slot: '01,02',
        userId: 'U1',
        userName: 'N1',
      });
      expect(res.ok).toBe(true);
      expect(aifService.postAifMessage).toHaveBeenCalledWith(
        'AegisRemoteStart',
        'AEGISREMOTESTART',
        [
          ['MACHINENAME', 'AEGIS01'],
          ['RECIPE', 'RCP1'],
          ['PORTNAME', 'P1'],
          ['RUN_NO', 'LOT01'],
          ['PRODEQP', 'PEQP'],
          ['SLOT', '01,02'],
          ['USERID', 'U1'],
          ['USERNAME', 'N1'],
        ],
        { preserveEndpointCase: true },
      );
    });
  });
});
