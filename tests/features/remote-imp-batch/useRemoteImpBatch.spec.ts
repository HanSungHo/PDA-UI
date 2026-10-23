import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import { useRemoteImpBatch } from '~/features/remote_imp_batch/composables/useRemoteImpBatch';
import {
  ERRORMSG_MSGBODY,
  remoteImpBatchService,
} from '~/features/remote_imp_batch/services/remote-imp-batch.service';
import type {
  DropdownOption,
  HifosServiceResult,
} from '~/features/remote_imp_batch/types/remote-imp-batch.types';
import { barcodeStyleLotId } from '~/utils/barcode-style';

const mockBack = vi.fn();
const mockPush = vi.fn();
const mockRoute = vi.hoisted(() => ({ query: {} as Record<string, unknown> }));

const mockMainStore = {
  facility: 'KFAB',
  operatorId: 'ENGINEER',
};

vi.mock('~/features/main', () => ({
  useMainStore: () => mockMainStore,
}));

vi.mock('~/utils/barcode-style', () => ({
  barcodeStyleLotId: vi.fn((input: string) => {
    const trimmed = input.trim();

    if (trimmed.includes('INVALID')) {
      return {
        isValid: false,
        parsedId: '',
      };
    }

    return {
      isValid: true,
      parsedId: trimmed.replace(/^\]C1/, '').toUpperCase(),
    };
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

type Api = ReturnType<typeof useRemoteImpBatch>;

function setup(): Api {
  let result!: Api;
  mount(
    defineComponent({
      setup() {
        result = useRemoteImpBatch();
        return () => h('div');
      },
    }),
  );
  return result;
}

const ok = <T>(body: unknown): HifosServiceResult<T> => ({
  isSuccessFul: true,
  body: body as T,
  errorMessage: '',
});

const fail = <T>(msg: string): HifosServiceResult<T> => ({
  isSuccessFul: false,
  body: {} as T,
  errorMessage: msg,
});

const lotBody = (o: Record<string, unknown> = {}) => ({
  PRODUCT: 'P1',
  OPERATION: '3100',
  SUBOPERATION: '00',
  STATUS: 'WAIT',
  STATE: 'WIP',
  AREA: 'IMP',
  NWCOMMENTQTY: '0',
  ...o,
});

const fillValid = (api: Api) => {
  api.txtIngMachine.value = 'EQP-01';
  api.txtRecipe.value = 'RCP-01';
  api.ports.value[0].lotId = 'LOT-1';
  api.ports.value[0].operation = 'OP-1';
  api.ports.value[1].lotId = 'LOT-2';
  api.ports.value[1].operation = 'OP-2';
  vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValue(ok({ NWCOMMENTQTY: '0' }));
};

const startAndAnswer = async (api: Api, accept: boolean) => {
  const p = api.executeRemoteStart();
  await vi.waitFor(() => expect(api.messageModalOpen.value).toBe(true));
  expect(api.messageModal.value.isConfirm).toBe(true);
  if (accept) api.handleModalConfirm();
  else api.handleModalCancel();
  await p;
};

const ruleCases: Array<[string, Record<string, unknown>, string]> = [
  ['already moved in', { STATUS: 'RUN' }, '이미 MOVE IN된 LOT입니다.'],
  ['state is not WIP', { STATE: 'HOLD' }, 'HOLD 상태 입니다'],
  ['lot is on hold', { HOLDSTATUS: 'ONHOLD' }, 'HOLD된 LOT입니다.'],
  ['batch id is set', { BATCHID: 'B1' }, 'BATCHID가 설정된 LOT입니다.'],
  ['area is not IMP', { AREA: 'ETC' }, 'IMP공정이 아닙니다.'],
  ['reserved by a user', { LOTRESUSER: 'USER1' }, '이미 작업 예약되었거나 진행중인 LOT입니다.'],
];

describe('useRemoteImpBatch', () => {
  beforeEach(() => {
    mockRoute.query = {};
    mockMainStore.facility = 'KFAB';
    mockMainStore.operatorId = 'ENGINEER';
    vi.spyOn(remoteImpBatchService, 'memorization').mockResolvedValue(ok({}));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('onMounted', () => {
    it('1.1 sets data and calls lotInfo when LOTID and EQPID are present', () => {
      mockRoute.query = { LOTID: 'LOT-Q', EQPID: 'EQP-Q' };
      const spy = vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValue(fail('x'));
      const { ports, txtIngMachine } = setup();
      expect(ports.value[0].lotId).toBe('LOT-Q');
      expect(txtIngMachine.value).toBe('EQP-Q');
      expect(spy).toHaveBeenCalled();
    });

    it('1.2 does not call lotInfo when query params are missing', () => {
      const spy = vi.spyOn(remoteImpBatchService, 'lotInfo');
      const { ports, txtIngMachine } = setup();
      expect(ports.value[0].lotId).toBe('');
      expect(txtIngMachine.value).toBe('');
      expect(spy).not.toHaveBeenCalled();
    });

    it('1.3 ignores non-string query values', () => {
      mockRoute.query = { LOTID: ['A'], EQPID: ['B'] };
      const spy = vi.spyOn(remoteImpBatchService, 'lotInfo');
      const { ports, txtIngMachine } = setup();
      expect(ports.value[0].lotId).toBe('');
      expect(txtIngMachine.value).toBe('');
      expect(spy).not.toHaveBeenCalled();
    });

    it('1.4 does not call lotInfo when only LOTID is present', () => {
      mockRoute.query = { LOTID: 'LOT-ONLY' };
      const spy = vi.spyOn(remoteImpBatchService, 'lotInfo');
      const { ports } = setup();
      expect(ports.value[0].lotId).toBe('');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('dialog helpers', () => {
    it('1.5 showOkDialog opens a non-confirm modal', () => {
      const { showOkDialog, messageModal, messageModalOpen } = setup();
      showOkDialog('Title', 'Body');
      expect(messageModal.value).toEqual({ title: 'Title', message: 'Body', isConfirm: false });
      expect(messageModalOpen.value).toBe(true);
    });

    it('1.6 handleModalConfirm / handleModalCancel close the modal without a pending dialog', () => {
      const { showOkDialog, handleModalConfirm, handleModalCancel, messageModalOpen } = setup();

      showOkDialog('T', 'M');
      handleModalConfirm();
      expect(messageModalOpen.value).toBe(false);

      showOkDialog('T', 'M');
      handleModalCancel();
      expect(messageModalOpen.value).toBe(false);
    });

    it('1.7 openRemoteRecipeDialog resolves true on confirm and false on cancel', async () => {
      const { openRemoteRecipeDialog, handleModalConfirm, handleModalCancel, messageModal } =
        setup();

      const first = openRemoteRecipeDialog('RCP-A');
      expect(messageModal.value.message).toContain('RECIPE [RCP-A]');
      handleModalConfirm();
      await expect(first).resolves.toBe(true);

      const second = openRemoteRecipeDialog('RCP-B');
      handleModalCancel();
      await expect(second).resolves.toBe(false);
    });
  });

  describe('requestFocusEditLot2', () => {
    it('1.8 calls focus directly on BaseInput instance', async () => {
      const focusSpy = vi.fn();
      const api = setup();
      api.editLot2Ref.value = { focus: focusSpy };
      vi.spyOn(remoteImpBatchService, 'recipeInfo').mockResolvedValue(ok({ RECIPE: 'R' }));
      await api.getRecipeInfo();
      await flushPromises();
      expect(focusSpy).toHaveBeenCalled();
    });

    it('1.9 does not throw when editLot2Ref is null', async () => {
      const api = setup();
      api.editLot2Ref.value = null;
      vi.spyOn(remoteImpBatchService, 'recipeInfo').mockResolvedValue(ok({ RECIPE: 'R' }));
      await expect(api.getRecipeInfo()).resolves.toBeUndefined();
    });
  });

  describe('setLotData1', () => {
    it('2.1 shows error when lotInfo fails', async () => {
      const { ports, setLotData1, messageModal } = setup();
      ports.value[0].lotId = 'LOT-1';
      vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValueOnce(fail('Server lookup error'));
      await setLotData1();
      expect(messageModal.value.message).toBe('Server lookup error');
    });

    it('2.2 warns about unread comments', async () => {
      const { ports, setLotData1, messageModal } = setup();
      ports.value[0].lotId = 'LOT-1';
      vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValueOnce(
        ok(lotBody({ NWCOMMENTQTY: '3' })),
      );
      vi.spyOn(remoteImpBatchService, 'recipeInfo').mockResolvedValueOnce(ok({ RECIPE: 'RCP-1' }));
      await setLotData1();
      expect(messageModal.value.message).toContain('읽지 않은 작업성 COMMENT가 [3]가 있습니다');
    });

    it('2.3 shows error when recipeInfo fails', async () => {
      const { ports, setLotData1, messageModal } = setup();
      ports.value[0].lotId = 'LOT-1';
      vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValueOnce(ok(lotBody()));
      vi.spyOn(remoteImpBatchService, 'recipeInfo').mockResolvedValueOnce(fail('Recipe not found'));
      await setLotData1();
      expect(messageModal.value.message).toBe('Recipe not found');
    });

    it('2.4 rejects LOT1 when it equals LOT2', async () => {
      const spy = vi.spyOn(remoteImpBatchService, 'lotInfo');
      const { ports, setLotData1, messageModal } = setup();
      ports.value[0].lotId = 'LOT-1';
      ports.value[1].lotId = 'LOT-1';
      await setLotData1();
      expect(messageModal.value.message).toContain('동일 LOT으로 조회가 불가합니다');
      expect(spy).not.toHaveBeenCalled();
    });

    it.each(ruleCases)('2.5 rejects LOT1: %s', async (name, override, message) => {
      const recipeSpy = vi.spyOn(remoteImpBatchService, 'recipeInfo');
      const { ports, setLotData1, messageModal } = setup();
      ports.value[0].lotId = 'LOT-1';
      vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValueOnce(ok(lotBody(override)));
      await setLotData1();
      expect(messageModal.value.message).toContain(message);
      expect(recipeSpy).not.toHaveBeenCalled();
    });

    it('2.6 fills every LOT1 field on success', async () => {
      const { ports, txtRecipe, isBtnStartEnabled, setLotData1 } = setup();
      ports.value[0].lotId = 'LOT-1';
      vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValueOnce(
        ok(
          lotBody({
            JOBCODE: 'JOB-1',
            QUANTITY: '25',
            PROCESSSTEP: 'STEP-1',
            OPERSEQUENCE: '10',
            OPTYPE: 'TYPE-1',
          }),
        ),
      );
      vi.spyOn(remoteImpBatchService, 'recipeInfo').mockResolvedValueOnce(ok({ RECIPE: 'RCP-1' }));

      await setLotData1();

      const p1 = ports.value[0];
      expect(p1.product).toBe('P1');
      expect(p1.jobCode).toBe('JOB-1');
      expect(p1.operation).toBe('3100-00');
      expect(p1.qty).toBe('25');
      expect(p1.searchOperation).toBe('3100');
      expect(p1.searchSubOperation).toBe('00');
      expect(p1.searchProcessStep).toBe('STEP-1');
      expect(p1.searchOperSeq).toBe('10');
      expect(p1.searchOpType).toBe('TYPE-1');
      expect(p1.isCommentEnabled).toBe(true);
      expect(isBtnStartEnabled.value).toBe(true);
      expect(txtRecipe.value).toBe('RCP-1');
    });

    it('2.7 falls back to empty strings when the response has no optional fields', async () => {
      const { ports, txtRecipe, setLotData1 } = setup();
      ports.value[0].lotId = 'LOT-1';
      vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValueOnce(
        ok({ STATE: 'WIP', AREA: 'IMP' }),
      );
      vi.spyOn(remoteImpBatchService, 'recipeInfo').mockResolvedValueOnce(ok({}));

      await setLotData1();

      expect(ports.value[0].product).toBe('');
      expect(ports.value[0].operation).toBe('-');
      expect(txtRecipe.value).toBe('');
    });

    it('2.8 still calls lotInfo when both LOT fields are empty', async () => {
      const spy = vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValue(fail('x'));
      const { setLotData1 } = setup();
      await setLotData1();
      expect(spy).toHaveBeenCalledWith('MVIN', '', 'KFAB');
    });
  });

  describe('setLotData2 and editorActionListener', () => {
    it('3.1 editorActionListener does nothing for a whitespace lotId', () => {
      const spy = vi.spyOn(remoteImpBatchService, 'lotInfo');
      const { ports, editorActionListener } = setup();
      ports.value[1].lotId = '   ';
      editorActionListener();
      expect(spy).not.toHaveBeenCalled();
    });

    it('3.2 clears LOT2 data when lotInfo fails', async () => {
      const { ports, setLotData2, messageModal } = setup();
      ports.value[1].lotId = 'LOT-2';
      vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValueOnce(fail('LOT2 invalid'));
      await setLotData2();
      expect(messageModal.value.message).toBe('LOT2 invalid');
      expect(ports.value[1].lotId).toBe('');
      expect(ports.value[1].isCommentEnabled).toBe(false);
    });

    it('3.3 resets LOT2 when recipeInfo fails', async () => {
      const { ports, setLotData2, messageModal, isBtnStartEnabled } = setup();
      ports.value[0].lotId = 'LOT-1';
      ports.value[1].lotId = 'LOT-2';
      vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValueOnce(
        ok(lotBody({ PRODUCT: 'P2' })),
      );
      vi.spyOn(remoteImpBatchService, 'recipeInfo').mockResolvedValueOnce(
        fail('Recipe check error'),
      );
      await setLotData2();
      expect(messageModal.value.message).toBe('Recipe check error');
      expect(ports.value[1].product).toBe('');
      expect(isBtnStartEnabled.value).toBe(false);
    });

    it('3.4 rejects LOT2 when the RECIPE differs', async () => {
      const { ports, txtRecipe, setLotData2, messageModal } = setup();
      txtRecipe.value = 'RCP-1';
      ports.value[0].lotId = 'LOT-1';
      ports.value[1].lotId = 'LOT-2';
      vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValueOnce(ok(lotBody()));
      vi.spyOn(remoteImpBatchService, 'recipeInfo').mockResolvedValueOnce(
        ok({ RECIPE: 'RCP-OTHER' }),
      );
      await setLotData2();
      expect(messageModal.value.message).toBe('RECIPE가 다른 LOT입니다.');
    });

    it('3.5 requires a LOT ID', async () => {
      const spy = vi.spyOn(remoteImpBatchService, 'lotInfo');
      const { ports, setLotData2, messageModal } = setup();
      ports.value[1].lotId = '';
      await setLotData2();
      expect(messageModal.value.message).toBe('LOT ID를 입력하세요');
      expect(spy).not.toHaveBeenCalled();
    });

    it('3.6 rejects LOT2 when it equals LOT1', async () => {
      const spy = vi.spyOn(remoteImpBatchService, 'lotInfo');
      const { ports, setLotData2, messageModal } = setup();
      ports.value[0].lotId = 'LOT-1';
      ports.value[1].lotId = 'LOT-1';
      await setLotData2();
      expect(messageModal.value.message).toContain('동일 LOT으로 조회가 불가합니다');
      expect(spy).not.toHaveBeenCalled();
    });

    it.each(ruleCases)('3.7 rejects LOT2: %s', async (name, override, message) => {
      const recipeSpy = vi.spyOn(remoteImpBatchService, 'recipeInfo');
      const { ports, setLotData2, messageModal } = setup();
      ports.value[1].lotId = 'LOT-2';
      vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValueOnce(ok(lotBody(override)));
      await setLotData2();
      expect(messageModal.value.message).toContain(message);
      expect(recipeSpy).not.toHaveBeenCalled();
    });

    it('3.8 fills LOT2 and accepts a matching RECIPE', async () => {
      const { ports, txtRecipe, isBtnStartEnabled, messageModalOpen, setLotData2 } = setup();
      txtRecipe.value = 'RCP-1';
      ports.value[0].lotId = 'LOT-1';
      ports.value[1].lotId = 'LOT-2';
      vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValueOnce(
        ok(lotBody({ JOBCODE: 'JOB-2', QUANTITY: '10', OPTYPE: 'T2' })),
      );
      vi.spyOn(remoteImpBatchService, 'recipeInfo').mockResolvedValueOnce(ok({ RECIPE: 'RCP-1' }));

      await setLotData2();

      const p2 = ports.value[1];
      expect(p2.product).toBe('P1');
      expect(p2.jobCode).toBe('JOB-2');
      expect(p2.operation).toBe('3100-00');
      expect(p2.qty).toBe('10');
      expect(p2.isCommentEnabled).toBe(true);
      expect(isBtnStartEnabled.value).toBe(true);
      expect(messageModalOpen.value).toBe(false);
    });

    it('3.9 warns about unread comments and falls back to empty optional fields', async () => {
      const { ports, txtRecipe, setLotData2, messageModal } = setup();
      txtRecipe.value = 'R';
      ports.value[0].lotId = 'LOT-1';
      ports.value[1].lotId = 'LOT-2';
      vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValueOnce(
        ok({ STATE: 'WIP', AREA: 'IMP', NWCOMMENTQTY: '2' }),
      );
      vi.spyOn(remoteImpBatchService, 'recipeInfo').mockResolvedValueOnce(ok({ RECIPE: 'R' }));

      await setLotData2();

      expect(messageModal.value.message).toContain('[2]');
      expect(ports.value[1].product).toBe('');
    });

    it('3.10 editorActionListener parses valid barcode envelopes with BarcodeStyle', async () => {
      const spy = vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValue(fail('x'));

      const { ports, editorActionListener } = setup();

      ports.value[1].lotId = ']C1LOT-02';

      editorActionListener();

      expect(barcodeStyleLotId).toHaveBeenCalledWith(']C1LOT-02');

      await vi.waitFor(() => expect(spy).toHaveBeenCalledWith('MVIN', 'LOT-02', 'KFAB'));
    });

    it('3.11 editorActionListener stops processing invalid barcode input', () => {
      const spy = vi.spyOn(remoteImpBatchService, 'lotInfo');

      const { ports, editorActionListener } = setup();

      ports.value[1].lotId = 'INVALID_INPUT';

      editorActionListener();

      expect(spy).not.toHaveBeenCalled();
    });

    it('3.12 onLotInputUpdate uppercases only LOT2', () => {
      const { ports, onLotInputUpdate } = setup();
      onLotInputUpdate(1, 'abc');
      onLotInputUpdate(2, 'abc');
      expect(ports.value[0].lotId).toBe('abc');
      expect(ports.value[1].lotId).toBe('ABC');
    });
  });

  describe('memorizationRecipe', () => {
    it('4.1 returns early without calling the service when txtRecipe is empty', async () => {
      const spy = vi.spyOn(remoteImpBatchService, 'memorization');
      const { txtRecipe, memorizationRecipe } = setup();
      txtRecipe.value = '';
      await memorizationRecipe();
      expect(spy).not.toHaveBeenCalled();
    });

    it('4.2 shows a popup when the response contains POPUP', async () => {
      const spy = vi
        .spyOn(remoteImpBatchService, 'memorization')
        .mockResolvedValue(ok({ POPUP: 'Check recipe' }));
      const {
        txtIngMachine,
        txtRecipe,
        ports,
        memorizationRecipe,
        messageModal,
        messageModalOpen,
      } = setup();
      txtIngMachine.value = 'EQP-1';
      ports.value[0].lotId = 'LOT-1';
      txtRecipe.value = 'RCP-9';

      await memorizationRecipe();

      expect(spy).toHaveBeenCalledWith('EQP-1', 'RCP-9', 'LOT-1', '', '', 'IMP');
      expect(messageModal.value).toEqual({
        title: '알림',
        message: 'Check recipe',
        isConfirm: false,
      });
      expect(messageModalOpen.value).toBe(true);
    });

    it('4.3 shows no popup when POPUP is empty', async () => {
      vi.spyOn(remoteImpBatchService, 'memorization').mockResolvedValue(ok({ POPUP: '' }));
      const { txtRecipe, memorizationRecipe, messageModalOpen } = setup();
      txtRecipe.value = 'RCP-9';
      await memorizationRecipe();
      expect(messageModalOpen.value).toBe(false);
    });

    it('4.4 shows an error and disables START on a real failure', async () => {
      vi.spyOn(remoteImpBatchService, 'memorization').mockResolvedValue(fail('Memo failed'));
      const { txtRecipe, memorizationRecipe, messageModal, isBtnStartEnabled } = setup();
      isBtnStartEnabled.value = true;
      txtRecipe.value = 'RCP-9';

      await memorizationRecipe();

      expect(messageModal.value.title).toBe('오류');
      expect(messageModal.value.message).toBe('Memo failed');
      expect(isBtnStartEnabled.value).toBe(false);
    });

    it('4.5 ignores the ERRORMSG_MSGBODY sentinel', async () => {
      vi.spyOn(remoteImpBatchService, 'memorization').mockResolvedValue(fail(ERRORMSG_MSGBODY));
      const { txtRecipe, memorizationRecipe, messageModalOpen, isBtnStartEnabled } = setup();
      isBtnStartEnabled.value = true;
      txtRecipe.value = 'RCP-9';

      await memorizationRecipe();

      expect(messageModalOpen.value).toBe(false);
      expect(isBtnStartEnabled.value).toBe(true);
    });
  });

  describe('Bay / Stocker', () => {
    it('5.1 shows error when areaBayInfo fails', async () => {
      const { checkChangeListener, messageModal } = setup();
      vi.spyOn(remoteImpBatchService, 'areaBayInfo').mockResolvedValueOnce(
        fail('Failed to fetch BAY list'),
      );
      checkChangeListener(true);
      await vi.waitFor(() => expect(messageModal.value.message).toBe('Failed to fetch BAY list'));
    });

    it('5.2 setStk returns early when no BAY is selected', async () => {
      const spy = vi.spyOn(remoteImpBatchService, 'bayStockerInfo');
      const { selectedBay, setStk } = setup();
      selectedBay.value = '';
      await setStk();
      expect(spy).not.toHaveBeenCalled();
    });

    it('5.3 shows error when bayStockerInfo fails', async () => {
      const { selectedBay, setStk, messageModal } = setup();
      selectedBay.value = 'BAY-01';
      vi.spyOn(remoteImpBatchService, 'bayStockerInfo').mockResolvedValueOnce(
        fail('Stocker lookup failed'),
      );
      await setStk();
      expect(messageModal.value.message).toBe('Stocker lookup failed');
    });

    it('5.4 parses the STOCKERS list', async () => {
      const { selectedBay, stkOptions, setStk } = setup();
      selectedBay.value = 'BAY-01';
      vi.spyOn(remoteImpBatchService, 'bayStockerInfo').mockResolvedValueOnce(
        ok({ STOCKERS: [{ STOCKER: 'STK-A' }, 'STK-B'] }),
      );
      await setStk();
      expect(stkOptions.value.map((o) => o.value)).toEqual(['STK-A', 'STK-B']);
    });

    const bayCases: Array<[string, unknown, string[]]> = [
      [
        'BAYS array with mixed items',
        { BAYS: ['B1', { BAY: 'B2' }, { BAY: 3 }, { X: 1 }, 5] },
        ['B1', 'B2', '3'],
      ],
      ['plain array body', ['B1', { BAY: 'B2' }], ['B1', 'B2']],
      ['prefixed keys', { BAY0: 'B1', bay1: 'B2', OTHER: 'x', BAY2: 3 }, ['B1', 'B2', '3']],
      ['fallback to string values', { FOO: 'B1', NUM: 1 }, ['B1']],
      ['null body', null, []],
      ['primitive body', 'text', []],
    ];

    it.each(bayCases)('5.5 setBay parses: %s', async (name, body, expected) => {
      vi.spyOn(remoteImpBatchService, 'areaBayInfo').mockResolvedValueOnce(ok(body));
      const { setBay, bayOptions } = setup();
      await setBay();
      expect(bayOptions.value.map((o) => o.value)).toEqual(expected);
    });

    it('5.6 setStk parses prefixed STK keys', async () => {
      const { selectedBay, stkOptions, setStk } = setup();
      selectedBay.value = 'BAY-01';
      vi.spyOn(remoteImpBatchService, 'bayStockerInfo').mockResolvedValueOnce(
        ok({ STK1: 'S1', stocker2: 'S2', OTHER: 'x' }),
      );
      await setStk();
      expect(stkOptions.value.map((o) => o.value)).toEqual(['S1', 'S2']);
    });
  });

  describe('checkChangeListener / itemSelectedListener', () => {
    beforeEach(() => {
      vi.spyOn(remoteImpBatchService, 'areaBayInfo').mockResolvedValue(ok({ BAYS: ['BAY-1'] }));
      vi.spyOn(remoteImpBatchService, 'bayStockerInfo').mockResolvedValue(
        ok({ STOCKERS: ['STK-1'] }),
      );
    });

    it('5.7 boolean true enables spinners and loads BAY options', async () => {
      const {
        checkChangeListener,
        chkCarry,
        isSpinnerBayEnabled,
        isSpinnerStkEnabled,
        bayOptions,
      } = setup();
      checkChangeListener(true);
      expect(chkCarry.value).toBe(true);
      expect(isSpinnerBayEnabled.value).toBe(true);
      expect(isSpinnerStkEnabled.value).toBe(true);
      await vi.waitFor(() => expect(bayOptions.value.map((o) => o.value)).toEqual(['BAY-1']));
    });

    it('5.8 event-like argument is read from target.checked', async () => {
      const { checkChangeListener, chkCarry, bayOptions } = setup();
      checkChangeListener({ target: { checked: true } });
      expect(chkCarry.value).toBe(true);
      await vi.waitFor(() => expect(bayOptions.value.length).toBe(1));
    });

    it('5.9 unchecking resets BAY and STK state', () => {
      const api = setup();
      api.chkCarry.value = true;
      api.selectedBay.value = 'BAY-1';
      api.selectedStk.value = 'STK-1';
      api.bayOptions.value = [{ label: 'BAY-1', value: 'BAY-1' }] as DropdownOption[];
      api.stkOptions.value = [{ label: 'STK-1', value: 'STK-1' }] as DropdownOption[];
      api.isSpinnerBayEnabled.value = true;
      api.isSpinnerStkEnabled.value = true;

      api.checkChangeListener(false);

      expect(api.chkCarry.value).toBe(false);
      expect(api.selectedBay.value).toBe('');
      expect(api.selectedStk.value).toBe('');
      expect(api.bayOptions.value).toEqual([]);
      expect(api.stkOptions.value).toEqual([]);
      expect(api.isSpinnerBayEnabled.value).toBe(false);
      expect(api.isSpinnerStkEnabled.value).toBe(false);
    });

    it('5.10 unknown argument falls back to the current chkCarry value', async () => {
      const api = setup();

      api.chkCarry.value = true;
      api.checkChangeListener(undefined);
      expect(api.isSpinnerBayEnabled.value).toBe(true);
      await vi.waitFor(() => expect(api.bayOptions.value.length).toBe(1));

      api.chkCarry.value = false;
      api.checkChangeListener({ target: {} });
      expect(api.isSpinnerBayEnabled.value).toBe(false);
    });

    it('5.11 itemSelectedListener accepts a string and loads STK options with dynamic facility', async () => {
      mockMainStore.facility = 'FAB2';
      const spy = vi.spyOn(remoteImpBatchService, 'bayStockerInfo');
      const { itemSelectedListener, selectedBay, stkOptions } = setup();
      itemSelectedListener('BAY-1');
      expect(selectedBay.value).toBe('BAY-1');
      await vi.waitFor(() => expect(stkOptions.value.map((o) => o.value)).toEqual(['STK-1']));
      expect(spy).toHaveBeenCalledWith('BAY-1', 'FAB2');
    });

    it('5.12 itemSelectedListener accepts an option object', async () => {
      const { itemSelectedListener, selectedBay, stkOptions } = setup();
      itemSelectedListener({ value: 'BAY-2' });
      expect(selectedBay.value).toBe('BAY-2');
      await vi.waitFor(() => expect(stkOptions.value.length).toBe(1));
    });

    it('5.13 itemSelectedListener falls back to the current selectedBay', async () => {
      const spy = vi.spyOn(remoteImpBatchService, 'bayStockerInfo');
      const { itemSelectedListener, selectedBay } = setup();
      selectedBay.value = 'BAY-P';
      itemSelectedListener(undefined);
      expect(selectedBay.value).toBe('BAY-P');
      await vi.waitFor(() => expect(spy).toHaveBeenCalledWith('BAY-P', 'KFAB'));
    });

    it('5.14 itemSelectedListener with an empty value does not load STK options', () => {
      const spy = vi.spyOn(remoteImpBatchService, 'bayStockerInfo');
      const { itemSelectedListener, selectedStk, stkOptions } = setup();
      selectedStk.value = 'OLD';
      itemSelectedListener('');
      expect(spy).not.toHaveBeenCalled();
      expect(selectedStk.value).toBe('');
      expect(stkOptions.value).toEqual([]);
    });
  });

  describe('executeRemoteStart', () => {
    it('6.1 does not call impBatchRemoteStart when the user cancels the confirm modal', async () => {
      const spyExec = vi.spyOn(remoteImpBatchService, 'impBatchRemoteStart');
      const api = setup();
      fillValid(api);
      await startAndAnswer(api, false);
      expect(spyExec).not.toHaveBeenCalled();
    });

    it('6.2 shows error when the user confirms but the API fails', async () => {
      vi.spyOn(remoteImpBatchService, 'impBatchRemoteStart').mockResolvedValueOnce(
        fail('Batch start failed on equipment'),
      );
      const api = setup();
      fillValid(api);
      await startAndAnswer(api, true);
      expect(api.messageModal.value.message).toBe('Batch start failed on equipment');
    });

    it('6.3 calls router.back() on success', async () => {
      vi.spyOn(remoteImpBatchService, 'impBatchRemoteStart').mockResolvedValueOnce(
        ok({ RESULT: 'PASS' }),
      );
      const api = setup();
      fillValid(api);
      await startAndAnswer(api, true);
      expect(mockBack).toHaveBeenCalled();
    });

    it('6.4 sends carry = N with empty BAY and STOCKER when carry is off and uses store operatorId', async () => {
      mockMainStore.operatorId = 'OP_DYNAMIC_88';
      const spy = vi
        .spyOn(remoteImpBatchService, 'impBatchRemoteStart')
        .mockResolvedValue(ok({ RESULT: 'PASS' }));
      const api = setup();
      fillValid(api);
      api.selectedBay.value = 'BAY-IGNORED';
      api.selectedStk.value = 'STK-IGNORED';
      await startAndAnswer(api, true);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          LOTNAME1: 'LOT-1',
          LOTNAME2: 'LOT-2',
          MACHINENAME: 'EQP-01',
          RECIPENAME: 'RCP-01',
          ISCARRY: 'N',
          BAY: '',
          STOCKER: '',
          EVENTUSER: 'OP_DYNAMIC_88',
        }),
      );
    });

    it('6.5 sends carry = Y with the selected BAY and STOCKER when carry is on', async () => {
      const spy = vi
        .spyOn(remoteImpBatchService, 'impBatchRemoteStart')
        .mockResolvedValue(ok({ RESULT: 'PASS' }));
      const api = setup();
      fillValid(api);
      api.chkCarry.value = true;
      api.selectedBay.value = 'BAY-1';
      api.selectedStk.value = 'STK-1';
      await startAndAnswer(api, true);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ ISCARRY: 'Y', BAY: 'BAY-1', STOCKER: 'STK-1' }),
      );
    });

    const validationCases: Array<[string, (a: Api) => void, string]> = [
      [
        'machine is empty',
        (a) => {
          a.txtIngMachine.value = '';
        },
        '진행장비를 입력하세요.',
      ],
      [
        'recipe is empty',
        (a) => {
          a.txtRecipe.value = '';
        },
        '진행Rcp가 조회되지 않았습니다.',
      ],
      [
        'LOT1 is empty',
        (a) => {
          a.ports.value[0].lotId = '';
        },
        '진행할 LOT을 다시 조회 바랍니다.',
      ],
      [
        'LOT2 is empty',
        (a) => {
          a.ports.value[1].lotId = '';
        },
        '진행할 LOT을 다시 조회 바랍니다.',
      ],
      [
        'LOT1 operation is empty',
        (a) => {
          a.ports.value[0].operation = '';
        },
        'LOT 조회가 정상적으로 이루어 지지 않았습니다.',
      ],
      [
        'LOT2 operation is empty',
        (a) => {
          a.ports.value[1].operation = '';
        },
        'LOT 조회가 정상적으로 이루어 지지 않았습니다.',
      ],
      [
        'carry is on but no BAY',
        (a) => {
          a.chkCarry.value = true;
          a.selectedBay.value = '';
        },
        'BAY를 선택하세요.',
      ],
      [
        'carry is on but no STK',
        (a) => {
          a.chkCarry.value = true;
          a.selectedBay.value = 'BAY-1';
          a.selectedStk.value = '';
        },
        'STOCKER를 선택하세요.',
      ],
    ];

    it.each(validationCases)('6.6 validation: %s', async (name, mutate, message) => {
      const spyExec = vi.spyOn(remoteImpBatchService, 'impBatchRemoteStart');
      const api = setup();
      fillValid(api);
      mutate(api);

      await api.executeRemoteStart();

      expect(api.messageModalOpen.value).toBe(true);
      expect(api.messageModal.value.message).toBe(message);
      expect(spyExec).not.toHaveBeenCalled();
    });

    it('6.7 blocks when LOT1 has unread comments', async () => {
      const api = setup();
      fillValid(api);
      vi.mocked(remoteImpBatchService.lotInfo).mockResolvedValueOnce(ok({ NWCOMMENTQTY: '2' }));
      await api.executeRemoteStart();
      expect(api.messageModal.value.message).toContain('LOT[LOT-1]');
      expect(api.messageModal.value.isConfirm).toBe(false);
    });

    it('6.8 blocks when LOT2 has unread comments', async () => {
      const api = setup();
      fillValid(api);
      vi.mocked(remoteImpBatchService.lotInfo)
        .mockResolvedValueOnce(ok({ NWCOMMENTQTY: '0' }))
        .mockResolvedValueOnce(ok({ NWCOMMENTQTY: '2' }));
      await api.executeRemoteStart();
      expect(api.messageModal.value.message).toContain('LOT[LOT-2]');
    });

    it('6.9 blocks when the comment lookup fails', async () => {
      const api = setup();
      fillValid(api);
      vi.mocked(remoteImpBatchService.lotInfo).mockResolvedValueOnce(fail('Comment lookup failed'));
      await api.executeRemoteStart();
      expect(api.messageModal.value.message).toBe('Comment lookup failed');
    });
  });

  describe('onSingleClick', () => {
    it('7.1 btn_search_port1 and btn_search_port2 call lotInfo', async () => {
      const spy = vi.spyOn(remoteImpBatchService, 'lotInfo').mockResolvedValue(fail('x'));
      const { onSingleClick, ports } = setup();
      ports.value[0].lotId = 'LOT-1';
      ports.value[1].lotId = 'LOT-2';

      onSingleClick('btn_search_port1');
      onSingleClick('btn_search_port2');

      await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    });

    it('7.2 btn_comment_read1 navigates with LOT1 search fields', () => {
      const { onSingleClick, ports } = setup();
      ports.value[0].lotId = 'LOT-1';
      ports.value[0].searchOperation = '3100';
      ports.value[0].searchSubOperation = '00';

      onSingleClick('btn_comment_read1');

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/comment-list',
          query: expect.objectContaining({
            LOTID: 'LOT-1',
            OPERATION: '3100',
            SUBOPERATION: '00',
          }),
        }),
      );
    });

    it('7.3 btn_comment_read2 navigates with LOT2 search fields', () => {
      const { onSingleClick, ports } = setup();
      ports.value[1].lotId = 'LOT-2';
      ports.value[1].searchOperation = '3200';

      onSingleClick('btn_comment_read2');

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/comment-list',
          query: expect.objectContaining({ LOTID: 'LOT-2', OPERATION: '3200' }),
        }),
      );
    });

    it('7.4 btn_start runs validation and shows an error when machine is empty', async () => {
      const { onSingleClick, messageModal, messageModalOpen } = setup();

      onSingleClick('btn_start');

      await vi.waitFor(() => expect(messageModalOpen.value).toBe(true));
      expect(messageModal.value.message).toBe('진행장비를 입력하세요.');
    });

    it('7.5 btn_cancel calls router.back()', () => {
      const { onSingleClick } = setup();
      onSingleClick('btn_cancel');
      expect(mockBack).toHaveBeenCalled();
    });

    it('7.6 an unknown button id does nothing', () => {
      const { onSingleClick } = setup();
      onSingleClick('btn_unknown');
      expect(mockBack).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
