import type * as JsonMessageService from 'src/services/json-message.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { moveInInlineService } from '~/features/move-in/services/move-in-inline.service';

const postJsonMessage = vi.hoisted(() => vi.fn());

vi.mock('src/features/main/stores/main.store', () => ({
  useMainStore: () => ({ facility: 'MAIN_FACILITY' }),
}));

vi.mock('src/services/json-message.service', async (importOriginal) => ({
  ...(await importOriginal<typeof JsonMessageService>()),
  postJsonMessage,
}));

const pass = (MSGBODY: Record<string, unknown>) => ({ STATUS: 'PASS', MSGBODY });
const fail = (ERRMSG: string) => ({ STATUS: 'FAIL', ERRMSG, MSGBODY: '' });

describe('moveInInlineService', () => {
  beforeEach(() => {
    postJsonMessage.mockReset();
  });

  describe('getInlineInfo', () => {
    it('sends INLINEINFO with the lot, facility and operation', async () => {
      postJsonMessage.mockResolvedValue(pass({}));

      await moveInInlineService.getInlineInfo('LOT001', '1200');

      expect(postJsonMessage).toHaveBeenCalledWith('INLINEINFO', {
        LOTID: 'LOT001',
        FACILITY: 'MAIN_FACILITY',
        OPERATION: '1200',
      });
    });

    it('maps the message body and the ITEM-wrapped inline items', async () => {
      postJsonMessage.mockResolvedValue(
        pass({
          PRODUCT: 'PRODUCT-A',
          OPERATION: '1200',
          PHOTOJOBCODE: 'JOB-01',
          MASKTAG: 'MT001,MT002',
          CHANGEMASKTAG: 'MT003',
          INLINERECIPE: 'RCP-01',
          PROCESSSTEP: 'PHOTO',
          QUANTITY: '25',
          CRITICAL_STEPPER: 'S1',
          CRITICAL_STEPPER2: 'S2',
          CRITICAL_STEPPER3: 'S3',
          INLINEITEMS: {
            ITEM: [
              {
                SUBPROCESSSTEP: 'COAT',
                ISCOMPLETE: 'Y',
                LOCALRECIPE: 'R1',
                WORKEDEQP: 'EQ1',
                IDENTCODE: 'C',
                SUBOPERATION: '01',
              },
            ],
          },
        }),
      );

      const result = await moveInInlineService.getInlineInfo('LOT001', '1200');

      expect(result).toEqual({
        isSuccessful: true,
        info: {
          product: 'PRODUCT-A',
          operation: '1200',
          photoJobCode: 'JOB-01',
          maskTag: 'MT001,MT002',
          changeMaskTag: 'MT003',
          inlineRecipe: 'RCP-01',
          processStep: 'PHOTO',
          quantity: '25',
          criticalStepper: 'S1',
          criticalStepper2: 'S2',
          criticalStepper3: 'S3',
        },
        rows: [
          {
            processName: 'COAT',
            isComplete: 'Y',
            localRecipe: 'R1',
            workedEqp: 'EQ1',
            identCode: 'C',
            subOperation: '01',
          },
        ],
      });
    });

    it('also accepts a flat inline item list', async () => {
      postJsonMessage.mockResolvedValue(
        pass({ INLINEITEMS: [{ SUBPROCESSSTEP: 'COAT', ISCOMPLETE: 'N' }] }),
      );

      const result = await moveInInlineService.getInlineInfo('LOT001', '1200');

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.processName).toBe('COAT');
    });

    it('rejects with the server error message when the message fails', async () => {
      postJsonMessage.mockResolvedValue(fail('LOT을 찾을 수 없습니다.'));

      await expect(moveInInlineService.getInlineInfo('LOT001', '1200')).rejects.toThrow(
        'LOT을 찾을 수 없습니다.',
      );
    });
  });

  describe('getMaskLocationInfo', () => {
    it('sends MASKINFO and maps the first item', async () => {
      postJsonMessage.mockResolvedValue(
        pass({
          ITEMS: {
            ITEM: [
              {
                RETICLETAG: 'MT001',
                PRODUCT: 'PRODUCT-A',
                GIBEN: 'G1',
                STATUS: 'IDLE',
                ISUSE: 'Y',
                CURRLOC: 'STK-01',
                SUBLOCATION3: 'A-01',
                AFTERINSP: 'Y',
              },
            ],
          },
        }),
      );

      const result = await moveInInlineService.getMaskLocationInfo('MT001');

      expect(postJsonMessage).toHaveBeenCalledWith('MASKINFO', {
        ID_IDENT: 'T',
        RETICLEID: 'MT001',
        FACILITY: 'MAIN_FACILITY',
      });
      expect(result).toEqual({
        maskTag: 'MT001',
        product: 'PRODUCT-A',
        giben: 'G1',
        status: 'IDLE',
        isUse: 'Y',
        currentLoc: 'STK-01',
        subLocation3: 'A-01',
        afterInsp: 'Y',
      });
    });

    it('rejects when no mask item is returned', async () => {
      postJsonMessage.mockResolvedValue(pass({ ITEMS: { ITEM: [] } }));

      await expect(moveInInlineService.getMaskLocationInfo('MT001')).rejects.toThrow(
        'Mask Location 정보를 찾을 수 없습니다.',
      );
    });

    it('rejects with the server error message when the message fails', async () => {
      postJsonMessage.mockResolvedValue(fail('MASK 정보를 찾을 수 없습니다.'));

      await expect(moveInInlineService.getMaskLocationInfo('MT001')).rejects.toThrow(
        'MASK 정보를 찾을 수 없습니다.',
      );
    });
  });

  describe('inlineSet', () => {
    const params = {
      lotId: 'LOT001',
      operation: '1200',
      maskTag: 'MT001',
      quantity: '25',
      isFullInline: 'N' as const,
      items: [
        { subOperation: '01', identCode: 'C' },
        { subOperation: '02', identCode: 'E' },
      ],
    };

    it('sends INLINESET with the selected items as concatenated ITEM fragments', async () => {
      postJsonMessage.mockResolvedValue(pass({}));

      await moveInInlineService.inlineSet(params);

      expect(postJsonMessage).toHaveBeenCalledWith('INLINESET', {
        LOTID: 'LOT001',
        FACILITY: 'MAIN_FACILITY',
        OPERATION: '1200',
        REALMASKTAG: 'MT001',
        QUANTITY: '25',
        ISFULLINLINE: 'N',
        INLINEITEMS:
          '<ITEM>\n<SUBOPERATION>01</SUBOPERATION>\n<IDENTCODE>C</IDENTCODE>\n</ITEM>\n' +
          '<ITEM>\n<SUBOPERATION>02</SUBOPERATION>\n<IDENTCODE>E</IDENTCODE>\n</ITEM>\n',
      });
    });

    it('maps the response body', async () => {
      postJsonMessage.mockResolvedValue(
        pass({
          ISEXPOSURE: 'Y',
          EQPGROUP: 'EG01',
          EXPEQPGROUP: 'EXP01',
          SUBOPERATION: '02',
          COMMENTQTY: '1',
          NRWCOMMENTQTY: '2',
        }),
      );

      const result = await moveInInlineService.inlineSet(params);

      expect(result).toEqual({
        isSuccessful: true,
        isExposure: 'Y',
        eqpGroup: 'EG01',
        expEqpGroup: 'EXP01',
        subOperation: '02',
        commentQty: '1',
        nrwCommentQty: '2',
      });
    });

    it('rejects with the server error message when the message fails', async () => {
      postJsonMessage.mockResolvedValue(fail('INLINE 설정에 실패하였습니다.'));

      await expect(moveInInlineService.inlineSet(params)).rejects.toThrow(
        'INLINE 설정에 실패하였습니다.',
      );
    });
  });
});
