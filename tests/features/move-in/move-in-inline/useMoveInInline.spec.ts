/**
 * Unit tests for composables/useMoveInInline.ts (Vitest)
 * Place this file next to useMoveInInline.ts.
 * The whole service is mocked; only the composable's own logic is tested.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMoveInInline } from '~/features/move-in/composables/useMoveInInline';
import { moveInInlineService } from '~/features/move-in/services/move-in-inline.service';

vi.mock('~/features/move-in/services/move-in-inline.service.ts', () => ({
  moveInInlineService: {
    getInlineInfo: vi.fn(),
    getMaskLocationInfo: vi.fn(),
    inlineSet: vi.fn(),
  },
}));

const service = vi.mocked(moveInInlineService);

const LOT_ID = 'LOT001';
const OPERATION = '1200';

const makeInfo = (override: Record<string, string> = {}) => ({
  product: 'PRODUCT-A',
  operation: '1200',
  photoJobCode: 'JOB-01',
  maskTag: 'MT001,MT002',
  changeMaskTag: '',
  inlineRecipe: 'RCP-01',
  processStep: 'PHOTO',
  quantity: '25',
  criticalStepper: 'S1',
  criticalStepper2: 'S2',
  criticalStepper3: 'S3',
  ...override,
});

const makeRows = (status: string[] = ['N', 'N', 'N']) =>
  [
    { processName: 'COAT', identCode: 'C', subOperation: '01' },
    { processName: 'EXPOSE', identCode: 'E', subOperation: '02' },
    { processName: 'DEVELOP', identCode: 'D', subOperation: '03' },
  ].map((row, index) => ({
    ...row,
    isComplete: status[index],
    localRecipe: `R${index + 1}`,
    workedEqp: '',
  }));

const okInfoResponse = (
  options: { info?: Record<string, string>; rows?: ReturnType<typeof makeRows> } = {},
) => ({
  isSuccessful: true,
  info: makeInfo(options.info),
  rows: options.rows ?? makeRows(),
});

const setResponse = {
  isSuccessful: true,
  isExposure: 'Y',
  eqpGroup: 'EG01',
  expEqpGroup: 'EXP01',
  subOperation: '02',
  commentQty: '1',
  nrwCommentQty: '2',
};

async function setup(options: Parameters<typeof okInfoResponse>[0] = {}) {
  service.getInlineInfo.mockResolvedValue(okInfoResponse(options) as never);
  const composable = useMoveInInline(LOT_ID, OPERATION);
  await composable.loadInfo();
  return composable;
}

describe('useMoveInInline', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty state and 4 NEST options', () => {
      const c = useMoveInInline(LOT_ID, OPERATION);

      expect(c.info.value.product).toBe('');
      expect(c.rows.value).toEqual([]);
      expect(c.nest.value).toBe('');
      expect(c.errorMessage.value).toBe('');
      expect(c.nestOptions.map((o) => o.value)).toEqual(['1', '2', '3', '4']);
    });
  });

  describe('loadInfo', () => {
    it('calls the service with lotId and operation', async () => {
      await setup();

      expect(service.getInlineInfo).toHaveBeenCalledWith(LOT_ID, OPERATION);
    });

    it('fills info, rows, default NEST and the first Real Mask Tag', async () => {
      const c = await setup();

      expect(c.info.value.product).toBe('PRODUCT-A');
      expect(c.info.value.photoJobCode).toBe('JOB-01');
      expect(c.currentProcess.value).toBe('PHOTO(1200)');
      expect(c.rows.value).toHaveLength(3);
      expect(c.nest.value).toBe('1');
      expect(c.realMaskTag.value).toBe('MT001');
      expect(c.maskTagOptions.value.map((o) => o.value)).toEqual(['MT001', 'MT002']);
      expect(c.errorMessage.value).toBe('');
    });

    it('turns loading on while the call is pending and off once it settles', async () => {
      let resolve!: (value: unknown) => void;
      service.getInlineInfo.mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }) as never,
      );
      const c = useMoveInInline(LOT_ID, OPERATION);

      const promise = c.loadInfo();
      expect(c.loading.value).toBe(true);

      resolve(okInfoResponse());
      await promise;
      expect(c.loading.value).toBe(false);
    });

    it('turns ISCOMPLETE "Y" from the server into "C" and locks FULL IL', async () => {
      const c = await setup({ rows: makeRows(['Y', 'N', 'N']) });

      expect(c.rows.value.map((r) => r.isComplete)).toEqual(['C', 'N', 'N']);
      expect(c.hasCompletedRow.value).toBe(true);
    });

    it('does not lock FULL IL when no row is completed', async () => {
      const c = await setup();

      expect(c.hasCompletedRow.value).toBe(false);
    });

    it('uses CHANGEMASKTAG when it differs from MASKTAG and flags it as changed', async () => {
      const c = await setup({ info: { maskTag: 'MT001', changeMaskTag: 'MT999' } });

      expect(c.maskTag.value).toBe('MT999');
      expect(c.isMaskTagChanged.value).toBe(true);
      expect(c.realMaskTag.value).toBe('MT999');
    });

    it('does not flag as changed when CHANGEMASKTAG equals MASKTAG', async () => {
      const c = await setup({ info: { maskTag: 'MT001', changeMaskTag: 'MT001' } });

      expect(c.maskTag.value).toBe('MT001');
      expect(c.isMaskTagChanged.value).toBe(false);
    });

    it('does not flag as changed when CHANGEMASKTAG is empty', async () => {
      const c = await setup({ info: { maskTag: 'MT001', changeMaskTag: '' } });

      expect(c.maskTag.value).toBe('MT001');
      expect(c.isMaskTagChanged.value).toBe(false);
    });

    it('skips empty and whitespace-only entries in the mask tag list', async () => {
      const c = await setup({ info: { maskTag: 'MT001, ,MT002,' } });

      expect(c.maskTagOptions.value.map((o) => o.value)).toEqual(['MT001', 'MT002']);
    });

    it('falls back to empty values when the server omits fields', async () => {
      service.getInlineInfo.mockResolvedValue({ isSuccessful: true, info: {}, rows: [] } as never);
      const c = useMoveInInline(LOT_ID, OPERATION);

      await c.loadInfo();

      expect(c.info.value.product).toBe('');
      expect(c.info.value.quantity).toBe('');
      expect(c.realMaskTag.value).toBe('');
      expect(c.rows.value).toEqual([]);
    });

    it('surfaces the server error message', async () => {
      service.getInlineInfo.mockResolvedValue({
        isSuccessful: false,
        errorMessage: 'LOT not found',
      } as never);
      const c = useMoveInInline(LOT_ID, OPERATION);

      await c.loadInfo();

      expect(c.errorMessage.value).toBe('LOT not found');
    });

    it('uses a default message when the server sends no errorMessage', async () => {
      service.getInlineInfo.mockResolvedValue({ isSuccessful: false } as never);
      const c = useMoveInInline(LOT_ID, OPERATION);

      await c.loadInfo();

      expect(c.errorMessage.value).toBe('Get Inline Info failed');
    });

    it('surfaces the message when the service throws an Error', async () => {
      service.getInlineInfo.mockRejectedValue(new Error('Network Error'));
      const c = useMoveInInline(LOT_ID, OPERATION);

      await c.loadInfo();

      expect(c.errorMessage.value).toBe('Network Error');
      expect(c.loading.value).toBe(false);
    });

    it('falls back to "Error" when the thrown Error has an empty message', async () => {
      service.getInlineInfo.mockRejectedValue(new Error(''));
      const c = useMoveInInline(LOT_ID, OPERATION);

      await c.loadInfo();

      expect(c.errorMessage.value).toBe('Error');
    });

    it('surfaces the message when the service throws a plain string', async () => {
      service.getInlineInfo.mockRejectedValue('Something broke');
      const c = useMoveInInline(LOT_ID, OPERATION);

      await c.loadInfo();

      expect(c.errorMessage.value).toBe('Something broke');
    });

    it('falls back to "Error" when the service throws an empty string', async () => {
      service.getInlineInfo.mockRejectedValue('');
      const c = useMoveInInline(LOT_ID, OPERATION);

      await c.loadInfo();

      expect(c.errorMessage.value).toBe('Error');
    });

    it('falls back to "Error" when the service throws a non-Error, non-string value', async () => {
      service.getInlineInfo.mockRejectedValue(undefined);
      const c = useMoveInInline(LOT_ID, OPERATION);

      await c.loadInfo();

      expect(c.errorMessage.value).toBe('Error');
    });

    it('clears a previous error once a later call succeeds', async () => {
      service.getInlineInfo.mockRejectedValueOnce(new Error('Network Error'));
      const c = useMoveInInline(LOT_ID, OPERATION);
      await c.loadInfo();
      expect(c.errorMessage.value).toBe('Network Error');

      service.getInlineInfo.mockResolvedValue(okInfoResponse() as never);
      await c.loadInfo();

      expect(c.errorMessage.value).toBe('');
    });

    it('resets previously selected rows and identCodeList on a fresh load', async () => {
      const c = await setup();
      c.toggleRow(0);
      expect(c.identCodeList.value).toBe('C');

      service.getInlineInfo.mockResolvedValue(okInfoResponse() as never);
      await c.loadInfo();

      expect(c.identCodeList.value).toBe('');
      expect(c.rows.value.map((r) => r.isComplete)).toEqual(['N', 'N', 'N']);
    });
  });

  describe('toggleRow', () => {
    it('selects the first row: turns it Y and starts identCodeList', async () => {
      const c = await setup();

      c.toggleRow(0);

      expect(c.rows.value[0]?.isComplete).toBe('Y');
      expect(c.identCodeList.value).toBe('C');
    });

    it('blocks selecting out of order while the previous row is still N', async () => {
      const c = await setup();

      c.toggleRow(1);

      expect(c.rows.value[1]?.isComplete).toBe('N');
      expect(c.identCodeList.value).toBe('');
    });

    it('selects rows top to bottom', async () => {
      const c = await setup();

      c.toggleRow(0);
      c.toggleRow(1);
      c.toggleRow(2);

      expect(c.rows.value.map((r) => r.isComplete)).toEqual(['Y', 'Y', 'Y']);
      expect(c.identCodeList.value).toBe('CED');
    });

    it('allows selecting when the previous row is already completed (C)', async () => {
      const c = await setup({ rows: makeRows(['Y', 'N', 'N']) });

      c.toggleRow(1);

      expect(c.rows.value.map((r) => r.isComplete)).toEqual(['C', 'Y', 'N']);
    });

    it('removes the last character of identCodeList when unselecting the last selected row', async () => {
      const c = await setup();
      c.toggleRow(0);
      c.toggleRow(1);

      c.toggleRow(1);

      expect(c.rows.value.map((r) => r.isComplete)).toEqual(['Y', 'N', 'N']);
      expect(c.identCodeList.value).toBe('C');
    });

    it('blocks unselecting a middle row while the next row is still selected', async () => {
      const c = await setup();
      c.toggleRow(0);
      c.toggleRow(1);

      c.toggleRow(0);

      expect(c.rows.value.map((r) => r.isComplete)).toEqual(['Y', 'Y', 'N']);
      expect(c.identCodeList.value).toBe('CE');
    });

    it('selecting then unselecting all rows from the bottom up empties identCodeList', async () => {
      const c = await setup();
      [0, 1, 2].forEach((i) => c.toggleRow(i));

      [2, 1, 0].forEach((i) => c.toggleRow(i));

      expect(c.rows.value.map((r) => r.isComplete)).toEqual(['N', 'N', 'N']);
      expect(c.identCodeList.value).toBe('');
    });

    it('clicking an already-completed row (C) has no effect', async () => {
      const c = await setup({ rows: makeRows(['Y', 'N', 'N']) });

      c.toggleRow(0);

      expect(c.rows.value[0]?.isComplete).toBe('C');
    });

    it('handles a table with a single row (no previous and no next row)', async () => {
      const c = await setup({ rows: makeRows().slice(0, 1) });

      c.toggleRow(0);
      expect(c.rows.value[0]?.isComplete).toBe('Y');
      expect(c.identCodeList.value).toBe('C');

      c.toggleRow(0);
      expect(c.rows.value[0]?.isComplete).toBe('N');
      expect(c.identCodeList.value).toBe('');
    });

    it('ignores an out-of-range index', async () => {
      const c = await setup();

      expect(() => c.toggleRow(99)).not.toThrow();
      expect(c.identCodeList.value).toBe('');
    });
  });

  describe('selectFullIl', () => {
    it('selects every row and sets identCodeList to the fixed "CED" (Kotlin: fullIinline() hardcodes it)', async () => {
      const c = await setup();

      c.selectFullIl();

      expect(c.rows.value.map((r) => r.isComplete)).toEqual(['Y', 'Y', 'Y']);
      expect(c.identCodeList.value).toBe('CED');
    });

    it('does nothing when a row is already completed', async () => {
      const c = await setup({ rows: makeRows(['Y', 'N', 'N']) });

      c.selectFullIl();

      expect(c.rows.value.map((r) => r.isComplete)).toEqual(['C', 'N', 'N']);
      expect(c.identCodeList.value).toBe('');
    });

    it('still hardcodes identCodeList to "CED" even when the actual row identCodes differ', async () => {
      const customRows = makeRows().map((row, index) => ({
        ...row,
        identCode: ['X', 'Y', 'Z'][index],
      }));
      const c = await setup({ rows: customRows });

      c.selectFullIl();

      // Intentional Kotlin-matching quirk: identCodeList does NOT reflect
      // the real row data here, unlike the items sent to inlineSet below.
      expect(c.identCodeList.value).toBe('CED');
    });

    it('sends the real row identCode/subOperation to inlineSet even when identCodeList is hardcoded', async () => {
      const customRows = makeRows().map((row, index) => ({
        ...row,
        identCode: ['X', 'Y', 'Z'][index],
      }));
      const c = await setup({ rows: customRows });
      c.selectFullIl();
      service.inlineSet.mockResolvedValue(setResponse as never);

      await c.submitInlineSet();

      expect(service.inlineSet).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            { subOperation: '01', identCode: 'X' },
            { subOperation: '02', identCode: 'Y' },
            { subOperation: '03', identCode: 'Z' },
          ],
        }),
      );
    });
  });

  describe('fetchMaskLocation', () => {
    const rawMask = {
      maskTag: 'MT001',
      product: 'PRODUCT-A',
      giben: 'G1',
      status: 'IDLE',
      isUse: 'Y',
      currentLoc: 'STK-01',
      subLocation3: 'A-01',
      afterInsp: 'Y',
    };

    it('reports an error and skips the service call when no Real Mask Tag is selected', async () => {
      const c = useMoveInInline(LOT_ID, OPERATION);

      const result = await c.fetchMaskLocation();

      expect(result).toBeNull();
      expect(c.errorMessage.value).toBe('Mask Tag를 선택 해 주세요.');
      expect(service.getMaskLocationInfo).not.toHaveBeenCalled();
    });

    it('calls the service with the selected Real Mask Tag and translates ISUSE = Y', async () => {
      const c = await setup();
      c.realMaskTag.value = 'MT002';
      service.getMaskLocationInfo.mockResolvedValue(rawMask as never);

      const result = await c.fetchMaskLocation();

      expect(service.getMaskLocationInfo).toHaveBeenCalledWith('MT002');
      expect(result).toEqual({ ...rawMask, isUse: '사용가능' });
    });

    it('translates any ISUSE other than Y to "사용불가"', async () => {
      const c = await setup();
      service.getMaskLocationInfo.mockResolvedValue({ ...rawMask, isUse: 'N' } as never);

      const result = await c.fetchMaskLocation();

      expect(result?.isUse).toBe('사용불가');
    });

    it('falls back to empty values when the server omits fields', async () => {
      const c = await setup();
      service.getMaskLocationInfo.mockResolvedValue({ isUse: 'Y' } as never);

      const result = await c.fetchMaskLocation();

      expect(result).toEqual({
        maskTag: '',
        product: '',
        giben: '',
        status: '',
        isUse: '사용가능',
        currentLoc: '',
        subLocation3: '',
        afterInsp: '',
      });
    });

    it('reports an error when the server returns no data', async () => {
      const c = await setup();
      service.getMaskLocationInfo.mockResolvedValue(null as never);

      const result = await c.fetchMaskLocation();

      expect(result).toBeNull();
      expect(c.errorMessage.value).toBe('Mask Location 정보를 찾을 수 없습니다.');
    });

    it('reports an error when the service throws', async () => {
      const c = await setup();
      service.getMaskLocationInfo.mockRejectedValue(new Error('Network Error'));

      const result = await c.fetchMaskLocation();

      expect(result).toBeNull();
      expect(c.errorMessage.value).toBe('Network Error');
    });
  });

  describe('submitInlineSet', () => {
    it('reports an error when no process step is selected', async () => {
      const c = await setup();

      const result = await c.submitInlineSet();

      expect(result).toBeNull();
      expect(c.errorMessage.value).toBe('진행 할 공정을 선택하세요');
      expect(service.inlineSet).not.toHaveBeenCalled();
    });

    it('reports an error when an Expose step is selected but there is no mask tag', async () => {
      const c = await setup({ info: { maskTag: '', changeMaskTag: '' } });
      c.toggleRow(0);
      c.toggleRow(1);

      const result = await c.submitInlineSet();

      expect(result).toBeNull();
      expect(c.errorMessage.value).toBe('진행할 MASK TAG를 선택하세요.');
      expect(service.inlineSet).not.toHaveBeenCalled();
    });

    it('proceeds when there is no mask tag but no Expose step is selected', async () => {
      const c = await setup({ info: { maskTag: '', changeMaskTag: '' } });
      c.toggleRow(0);
      service.inlineSet.mockResolvedValue(setResponse as never);

      const result = await c.submitInlineSet();

      expect(result).not.toBeNull();
    });

    it('reports an error when NEST is not selected', async () => {
      const c = await setup();
      c.toggleRow(0);
      c.nest.value = '';

      const result = await c.submitInlineSet();

      expect(result).toBeNull();
      expect(c.errorMessage.value).toBe('진행할 NEST를 선택하세요.');
      expect(service.inlineSet).not.toHaveBeenCalled();
    });

    it('sends isFullInline = Y when all 3 steps are selected and returns the machine-select data', async () => {
      const c = await setup();
      c.selectFullIl();
      service.inlineSet.mockResolvedValue(setResponse as never);

      const result = await c.submitInlineSet();

      expect(service.inlineSet).toHaveBeenCalledWith({
        lotId: LOT_ID,
        operation: OPERATION,
        maskTag: 'MT001,MT002',
        quantity: '25',
        isFullInline: 'Y',
        items: [
          { subOperation: '01', identCode: 'C' },
          { subOperation: '02', identCode: 'E' },
          { subOperation: '03', identCode: 'D' },
        ],
      });
      expect(result).toEqual(
        expect.objectContaining({
          isExposure: 'Y',
          eqpGroup: 'EG01',
          expEqpGroup: 'EXP01',
          subOperation: '02',
          commentQty: '1',
          nrwCommentQty: '2',
        }),
      );
      expect(c.errorMessage.value).toBe('');
    });

    it('sends isFullInline = N when only some steps are selected', async () => {
      const c = await setup();
      c.toggleRow(0);
      service.inlineSet.mockResolvedValue(setResponse as never);

      await c.submitInlineSet();

      expect(service.inlineSet).toHaveBeenCalledWith(
        expect.objectContaining({
          isFullInline: 'N',
          items: [{ subOperation: '01', identCode: 'C' }],
        }),
      );
    });

    it('sends CHANGEMASKTAG when the mask tag has been changed', async () => {
      const c = await setup({ info: { maskTag: 'MT001', changeMaskTag: 'MT999' } });
      c.toggleRow(0);
      service.inlineSet.mockResolvedValue(setResponse as never);

      await c.submitInlineSet();

      expect(service.inlineSet).toHaveBeenCalledWith(expect.objectContaining({ maskTag: 'MT999' }));
    });

    it('falls back to empty values when the response omits fields', async () => {
      const c = await setup();
      c.toggleRow(0);
      service.inlineSet.mockResolvedValue({ isSuccessful: true } as never);

      const result = await c.submitInlineSet();

      expect(result).toEqual(
        expect.objectContaining({
          isExposure: '',
          eqpGroup: '',
          expEqpGroup: '',
          subOperation: '',
          commentQty: '',
          nrwCommentQty: '',
        }),
      );
    });

    it('surfaces the server error message when isSuccessful = false', async () => {
      const c = await setup();
      c.toggleRow(0);
      service.inlineSet.mockResolvedValue({
        isSuccessful: false,
        errorMessage: 'Invalid NEST',
      } as never);

      const result = await c.submitInlineSet();

      expect(result).toBeNull();
      expect(c.errorMessage.value).toBe('Invalid NEST');
    });

    it('uses a default message when the server response has no body at all', async () => {
      const c = await setup();
      c.toggleRow(0);
      service.inlineSet.mockResolvedValue(undefined as never);

      const result = await c.submitInlineSet();

      expect(result).toBeNull();
      expect(c.errorMessage.value).toBe('Inline Set failed');
    });

    it('uses a default message when the response body exists but has no errorMessage field', async () => {
      const c = await setup();
      c.toggleRow(0);
      service.inlineSet.mockResolvedValue({ isSuccessful: false } as never);

      const result = await c.submitInlineSet();

      expect(result).toBeNull();
      expect(c.errorMessage.value).toBe('Inline Set failed');
    });

    it('reports an error when the service throws', async () => {
      const c = await setup();
      c.toggleRow(0);
      service.inlineSet.mockRejectedValue(new Error('Network Error'));

      const result = await c.submitInlineSet();

      expect(result).toBeNull();
      expect(c.errorMessage.value).toBe('Network Error');
    });
  });
});
