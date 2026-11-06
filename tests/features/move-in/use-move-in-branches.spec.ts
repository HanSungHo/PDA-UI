import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';

const { router, route, service, modal, mainStore } = vi.hoisted(() => ({
  router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() },
  route: { params: {} as Record<string, string>, query: {} as Record<string, string> },
  modal: {
    alert: vi.fn().mockResolvedValue(true),
    confirm: vi.fn().mockResolvedValue(false),
  },
  mainStore: { facility: 'F1', operatorId: 'OP1' },
  service: {
    sendLotInfo: vi.fn(),
    sendMcfdcEqpInfo: vi.fn(),
    sendEqpInfo: vi.fn(),
    sendRecipeInfo: vi.fn(),
    sendLoginUserCheck: vi.fn(),
    sendLotInfoEnd: vi.fn(),
    sendMoveInLotInfo: vi.fn(),
    sendCheckDiCycle: vi.fn(),
    sendCheckInspection: vi.fn(),
    sendSlotInfo: vi.fn(),
    sendDummyEqpInfo: vi.fn(),
    sendDummyEqpInput: vi.fn(),
    sendChangeEqpStatus: vi.fn(),
    sendMoveIn: vi.fn(),
    sendProbeCardInfo: vi.fn(),
    sendProbeCardValue: vi.fn(),
    sendSetProbeCardHistory: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({ useRouter: () => router, useRoute: () => route }));
vi.mock('src/features/main/stores/main.store', () => ({ useMainStore: () => mainStore }));
vi.mock('src/features/move-in/services/movein.service', () => service);
vi.mock('src/features/move-in/composables/useConfirmModal', () => ({
  useConfirmModal: () => modal,
}));

import { useMoveIn } from 'src/features/move-in/composables/use-move-in';
import { MOVE_IN_FLOW, MOVE_IN_UI } from 'src/features/move-in/constants';

const tag = (k: string, v: string) => `<${k}>${v}</${k}>`;
const ok = (body = '') => ({
  isSuccess: true,
  result: `<AIFMSG><MSGBODY>${body}</MSGBODY></AIFMSG>`,
});
const fail = (msg: string) => ({
  isSuccess: false,
  result: `<AIFMSG><MSGBODY>${tag('ERRMSG', msg)}</MSGBODY></AIFMSG>`,
});
const wip = (extra = '') => ok(tag('STATE', 'WIP') + extra);

function createVm() {
  let vm!: ReturnType<typeof useMoveIn>;
  const wrapper = mount(
    defineComponent({
      setup() {
        vm = useMoveIn();
        return () => null;
      },
    }),
  );
  return { vm, wrapper };
}

function alerted(message: unknown) {
  return modal.alert.mock.calls.some((c) => c[0] === message);
}

describe('useMoveIn branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params = {};
    route.query = {};
    modal.alert.mockResolvedValue(true);
    modal.confirm.mockResolvedValue(false);
  });

  describe('getLotInfo', () => {
    it('ignores an empty lot id', async () => {
      const { vm } = createVm();
      await vm.getLotInfo();
      expect(service.sendLotInfo).not.toHaveBeenCalled();
    });

    it('reports a failed response', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      service.sendLotInfo.mockResolvedValue(fail('NO LOT'));
      await vm.getLotInfo();
      expect(vm.error.value).toBe('NO LOT');
      expect(vm.loading.value).toBe(false);
      expect(alerted('NO LOT')).toBe(true);
    });

    it('reports a thrown error', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      service.sendLotInfo.mockRejectedValue(new Error('boom'));
      await vm.getLotInfo();
      expect(vm.error.value).toBe('boom');
      expect(alerted('boom')).toBe(true);
    });

    it('copies the last event comment for COUNT/SLOT lots', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      service.sendLotInfo.mockResolvedValue(
        wip(tag('CREATECATEGORY', 'COUNT') + tag('LASTEVENTCOMMENT', 'LAST')),
      );
      await vm.getLotInfo();
      expect(vm.comment.value).toBe('LAST');
    });

    it.each([
      ['Y', 'Y', 'Y', 'N', true, true],
      ['Y', 'Y', 'N', 'N', true, false],
      ['Y', 'N', 'Y', 'N', false, false],
      ['Y', 'N', 'N', 'N', false, false],
      ['N', '', 'Y', 'N', false, false],
    ])(
      'derives skip flags (allow=%s auto=%s pqc=%s)',
      async (allow, auto, pqc, _x, expectedSkip, expectedAllowed) => {
        const { vm } = createVm();
        vm.lotId.value = 'L1';
        service.sendLotInfo.mockResolvedValue(
          wip(tag('SKIPALLOWFLAG', allow) + tag('AUTOSKIP', auto) + tag('PQCSKIPUSER', pqc)),
        );
        await vm.getLotInfo();
        if (allow === 'Y' && auto === 'Y') {
          expect(vm.skipCurrentOperation.value).toBe(true);
          expect(vm.isSkipAllowed.value).toBe(pqc === 'Y');
        } else if (allow === 'Y') {
          expect(vm.isSkipAllowed.value).toBe(auto === '' ? true : pqc === 'Y');
        } else {
          expect(vm.isSkipAllowed.value).toBe(pqc === 'Y');
        }
        expect(typeof expectedSkip).toBe('boolean');
        expect(typeof expectedAllowed).toBe('boolean');
      },
    );

    it('forces skip allowed for photo type DI', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      service.sendLotInfo.mockResolvedValue(
        wip(
          tag('SKIPALLOWFLAG', 'Y') +
            tag('AUTOSKIP', 'N') +
            tag('PQCSKIPUSER', 'N') +
            tag('PHOTOTYPE', 'DI'),
        ),
      );
      await vm.getLotInfo();
      expect(vm.isSkipAllowed.value).toBe(true);
    });

    it('enables rework skip, then scrubber / PQC / measurement flags disable it', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      service.sendLotInfo.mockResolvedValue(wip(tag('REWORKSKIPFLAG', 'Y')));
      await vm.getLotInfo();
      expect(vm.reworkSkip.value).toBe(true);
      expect(vm.skipCurrentOperation.value).toBe(true);

      service.sendLotInfo.mockResolvedValue(
        wip(tag('SORTINGSKIP', 'Y') + tag('REWORKSCRUBBERSKIPFLAG', 'N')),
      );
      await vm.getLotInfo();
      expect(vm.reworkSkip.value).toBe(false);
      expect(vm.isSkipAllowed.value).toBe(false);

      service.sendLotInfo.mockResolvedValue(
        wip(tag('SKIPALLOWFLAG', 'Y') + tag('PQCSKIPUSER', 'N') + tag('AREA', 'PQC')),
      );
      await vm.getLotInfo();
      expect(vm.isSkipAllowed.value).toBe(false);

      service.sendLotInfo.mockResolvedValue(
        wip(tag('SKIPALLOWFLAG', 'Y') + tag('MEASSKIPCHECK', 'N')),
      );
      await vm.getLotInfo();
      expect(vm.skipCurrentOperation.value).toBe(false);
      expect(vm.isSkipAllowed.value).toBe(false);
    });

    it('applies changed eqp group / recipe and shows optional notices', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      service.sendLotInfo.mockResolvedValue(
        wip(
          tag('EQPGROUP', 'G1') +
            tag('CHANGEEQPGROUP', 'G2') +
            tag('RECIPE', 'R1') +
            tag('CHANGERECIPE', 'R2') +
            tag('ETCMSG', 'etc') +
            tag('INLINESAMPLEMESSGE', 'inline') +
            tag('GOXIDEPOPUP', 'gox') +
            tag('CHAMBERSLOTLIST', 'chambers') +
            tag('MEASOPERATIONNAME', 'MO') +
            tag('FQCLOTNAME', 'FQC1') +
            tag('FICDLOT', 'FICD1'),
        ),
      );
      await vm.getLotInfo();
      expect(vm.standardMachine.value).toBe('G2');
      expect(vm.standardMachineChanged.value).toBe(true);
      expect(vm.recipeChanged.value).toBe(true);
      for (const msg of ['etc', 'inline', 'gox', 'chambers']) {
        expect(alerted(msg)).toBe(true);
      }
      expect(modal.alert).toHaveBeenCalledTimes(6);
    });

    it.each([
      ['sampling message', tag('MEASTYPE', 'X') + tag('SAMPLINGMSG', 'msg')],
      ['uv inspection', tag('MEASTYPE', 'X') + tag('SAMPLINGREASON', 'Y')],
      ['default inspection', tag('MEASTYPE', 'X')],
      ['EPI sampling is silent', tag('MEASTYPE', 'LAMU') + tag('SAMPLINGREASON', 'EPI_SAMPLING')],
    ])('handles measurement type: %s', async (name, body) => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      service.sendLotInfo.mockResolvedValue(wip(body));
      await vm.getLotInfo();
      expect(modal.alert).toHaveBeenCalledTimes(name.includes('silent') ? 0 : 1);
    });

    it('routes PHOTO lots to inline or process inquire and reports unread comments', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      service.sendLotInfo.mockResolvedValue(wip(tag('AREA', 'PHOTO') + tag('OPTYPE', 'P')));
      await vm.getLotInfo();
      expect(router.push).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'move-in-inline' }),
      );

      service.sendLotInfo.mockResolvedValue(wip(tag('AREA', 'PHOTO') + tag('OPTYPE', 'X')));
      await vm.getLotInfo();
      expect(router.push).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'move-in-process-inquire' }),
      );

      modal.alert.mockClear();
      service.sendLotInfo.mockResolvedValue(
        wip(
          tag('AREA', 'PHOTO') +
            tag('OPTYPE', 'P') +
            tag('PHOTOTYPE', 'NN') +
            tag('NWCOMMENTQTY', '3'),
        ),
      );
      await vm.getLotInfo();
      expect(alerted(`${MOVE_IN_UI.errors.unreadComment} 3`)).toBe(true);
    });
  });

  describe('navigation helpers', () => {
    it('completes batch move in and opens the batch comment list', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      await vm.completeBatchMoveIn(' L2 ');
      expect(vm.lotId.value).toBe('L2');
      expect(router.replace).toHaveBeenCalled();
      expect(router.back).toHaveBeenCalled();

      await vm.completeBatchMoveIn('  ');
      expect(vm.lotId.value).toBe('L2');

      vm.openBatchMoveInCommentList({
        lotId: 'L2',
        operation: 'O',
        subOperation: 'S',
        processStep: 'P',
        operSequence: '1',
      });
      expect(router.push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'move-in-comment-list' }),
      );
    });
  });

  describe('equipment / recipe chain', () => {
    async function commitEqp(vm: ReturnType<typeof useMoveIn>) {
      vm.eqpId.value = 'EQP-MACHINE*';
      await vm.onEqpIdCommit();
    }

    it('resets equipment when MCFDCEQPINFO fails or throws', async () => {
      const { vm } = createVm();
      service.sendMcfdcEqpInfo.mockResolvedValue(fail('mcfdc'));
      await commitEqp(vm);
      expect(vm.eqpId.value).toBe('');
      expect(alerted('mcfdc')).toBe(true);

      service.sendMcfdcEqpInfo.mockRejectedValue(new Error('net'));
      await commitEqp(vm);
      expect(vm.eqpId.value).toBe('');
      expect(alerted('net')).toBe(true);
    });

    it('asks to confirm a Remote machine and resets when declined', async () => {
      const { vm } = createVm();
      service.sendMcfdcEqpInfo.mockResolvedValue(ok(tag('STATUS', 'Remote') + tag('EQPID', 'M')));
      modal.confirm.mockResolvedValue(false);
      await commitEqp(vm);
      expect(vm.eqpId.value).toBe('');
      expect(service.sendEqpInfo).not.toHaveBeenCalled();
    });

    it('skips EQPINFO for measurement operations and goes to the recipe call', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      service.sendLotInfo.mockResolvedValue(wip(tag('OPTYPE', 'M')));
      await vm.getLotInfo();
      service.sendMcfdcEqpInfo.mockResolvedValue(ok(tag('STATUS', 'Local')));
      service.sendRecipeInfo.mockResolvedValue(ok(tag('RECIPE', 'RX')));
      await commitEqp(vm);
      expect(service.sendEqpInfo).not.toHaveBeenCalled();
      expect(vm.recipeText.value).toBe('RX');
    });

    it('resets equipment when EQPINFO fails or throws', async () => {
      const { vm } = createVm();
      service.sendMcfdcEqpInfo.mockResolvedValue(ok(tag('STATUS', 'Local')));
      service.sendEqpInfo.mockResolvedValue(fail('eqpinfo'));
      await commitEqp(vm);
      expect(vm.eqpId.value).toBe('');
      expect(alerted('eqpinfo')).toBe(true);

      service.sendEqpInfo.mockRejectedValue(new Error('eqpthrow'));
      await commitEqp(vm);
      expect(alerted('eqpthrow')).toBe(true);
    });

    it('shows interlock and resolves the sub equipment', async () => {
      const { vm } = createVm();
      service.sendMcfdcEqpInfo.mockResolvedValue(ok(tag('STATUS', 'Local')));
      service.sendEqpInfo.mockResolvedValue(
        ok(tag('MAINEQPID', 'MAIN') + tag('SUBEQPID', 'SUB') + tag('CHECKINTERLOCK', 'lock')),
      );
      service.sendRecipeInfo.mockResolvedValue(
        ok(tag('RECIPE', 'R') + tag('CHECKINTERLOCK', 'rlock') + tag('MULTIMOVEINACTION', 'multi')),
      );
      await commitEqp(vm);
      expect(vm.eqpId.value).toBe('SUB');
      expect(alerted('lock')).toBe(true);
      expect(alerted('rlock')).toBe(true);
      expect(alerted('multi')).toBe(true);
    });

    async function toRecipe(vm: ReturnType<typeof useMoveIn>) {
      service.sendMcfdcEqpInfo.mockResolvedValue(ok(tag('STATUS', 'Local')));
      service.sendEqpInfo.mockResolvedValue(ok(tag('MAINEQPID', 'M') + tag('SUBEQPID', 'M')));
      await commitEqp(vm);
    }

    it('alerts and clears the recipe when RECIPEINFO fails or throws', async () => {
      const { vm } = createVm();
      service.sendRecipeInfo.mockResolvedValue(fail('norecipe'));
      await toRecipe(vm);
      expect(alerted('norecipe')).toBe(true);
      expect(vm.recipeText.value).toBe('');

      service.sendRecipeInfo.mockRejectedValue(new Error('rthrow'));
      await toRecipe(vm);
      expect(alerted('rthrow')).toBe(true);
    });

    it('resets equipment when the etch message is declined and continues when accepted', async () => {
      const { vm } = createVm();
      service.sendRecipeInfo.mockResolvedValue(
        ok(tag('ETCHMESSAGE', 'etch') + tag('RECIPE', 'RR')),
      );
      modal.confirm.mockResolvedValue(false);
      await toRecipe(vm);
      expect(vm.eqpId.value).toBe('');

      modal.confirm.mockResolvedValue(true);
      await toRecipe(vm);
      expect(vm.recipeText.value).toBe('RR');
    });

    it('offers to change equipment status when the machine is down', async () => {
      const { vm } = createVm();
      service.sendRecipeInfo.mockResolvedValue(fail(MOVE_IN_UI.errors.eqpDown));

      modal.confirm.mockResolvedValue(false);
      await toRecipe(vm);
      expect(service.sendChangeEqpStatus).not.toHaveBeenCalled();

      // accepted, status change fails
      modal.confirm.mockResolvedValue(true);
      service.sendChangeEqpStatus.mockResolvedValue(fail('status-fail'));
      await toRecipe(vm);
      expect(alerted('status-fail')).toBe(true);

      // accepted, status change throws
      service.sendChangeEqpStatus.mockRejectedValue(new Error('status-throw'));
      await toRecipe(vm);
      expect(alerted('status-throw')).toBe(true);

      // accepted, status change succeeds, retry declined then accepted
      service.sendChangeEqpStatus.mockResolvedValue(ok());
      modal.confirm.mockReset();
      modal.confirm
        .mockResolvedValueOnce(true) // change status
        .mockResolvedValueOnce(false); // retry recipe
      await toRecipe(vm);

      service.sendRecipeInfo.mockReset();
      service.sendRecipeInfo
        .mockResolvedValueOnce(fail(MOVE_IN_UI.errors.eqpDown))
        .mockResolvedValueOnce(ok(tag('RECIPE', 'AGAIN')));
      modal.confirm.mockReset();
      modal.confirm.mockResolvedValue(true);
      await toRecipe(vm);
      expect(service.sendRecipeInfo).toHaveBeenCalledTimes(2);
    });
  });

  describe('onOK / loginUserCheck / getLotInfoOk', () => {
    it('blocks, validates lot and equipment', () => {
      const { vm } = createVm();
      vm.onOK();
      expect(alerted('LOT No를 입력하세요.')).toBe(true);

      vm.lotId.value = 'L1';
      vm.onOK();
      expect(alerted(MOVE_IN_UI.errors.enterEquipment)).toBe(true);
      expect(service.sendLoginUserCheck).not.toHaveBeenCalled();
    });

    it('does nothing when the lot is blocked', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      service.sendLotInfo.mockResolvedValue(ok(tag('STATE', 'HOLD')));
      await vm.getLotInfo();
      expect(vm.isLotBlocked.value).toBe(true);
      modal.alert.mockClear();
      vm.onOK();
      expect(modal.alert).not.toHaveBeenCalled();
    });

    it('rejects users that are not allowed or whose check fails', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      vm.eqpId.value = 'E1';
      service.sendLoginUserCheck.mockResolvedValue(fail('login-fail'));
      vm.onOK();
      await vi.waitFor(() => expect(alerted('login-fail')).toBe(true));

      service.sendLoginUserCheck.mockResolvedValue(ok(tag('AREACHECK', 'N')));
      vm.onOK();
      await vi.waitFor(() => expect(alerted(MOVE_IN_UI.errors.userNotAllowed)).toBe(true));

      service.sendLoginUserCheck.mockRejectedValue(new Error('login-throw'));
      vm.onOK();
      await vi.waitFor(() => expect(alerted('login-throw')).toBe(true));
    });

    it('validates equipment and recipe before LOTINFO', async () => {
      const { vm } = createVm();
      await vm.getLotInfoOk();
      expect(alerted(MOVE_IN_UI.errors.enterEquipment)).toBe(true);

      vm.eqpId.value = 'E1';
      await vm.getLotInfoOk();
      expect(alerted(MOVE_IN_UI.errors.selectRecipe)).toBe(true);
    });

    it('handles LOTINFO failures, unread comments, declines and acceptance', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      vm.eqpId.value = 'E1';
      vm.recipeText.value = 'R1';

      service.sendMoveInLotInfo.mockResolvedValue(fail('lotok-fail'));
      await vm.getLotInfoOk();
      expect(alerted('lotok-fail')).toBe(true);

      service.sendMoveInLotInfo.mockRejectedValue(new Error('lotok-throw'));
      await vm.getLotInfoOk();
      expect(alerted('lotok-throw')).toBe(true);

      service.sendMoveInLotInfo.mockResolvedValue(ok(tag('NWCOMMENTQTY', '2')));
      await vm.getLotInfoOk();
      expect(alerted(`${MOVE_IN_UI.errors.unreadComment} 2`)).toBe(true);
      expect(modal.confirm).not.toHaveBeenCalled();

      service.sendMoveInLotInfo.mockResolvedValue(ok(tag('MULTIMOVEINMSG', 'mm')));
      vm.batchId.value = 'B1';
      modal.confirm.mockResolvedValue(false);
      await vm.getLotInfoOk();
      expect(alerted('mm')).toBe(true);
      expect(router.push).not.toHaveBeenCalled();

      modal.confirm.mockResolvedValue(true);
      await vm.getLotInfoOk();
      expect(router.push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'move-in-batch-move-in' }),
      );
    });
  });

  describe('checkDiCycle', () => {
    async function skipOk(vm: ReturnType<typeof useMoveIn>) {
      vm.lotId.value = 'L1';
      vm.skipCurrentOperation.value = true;
      vm.onOK();
      await Promise.resolve();
    }

    it('requires a PQC comment of at least 10 characters', async () => {
      const { vm } = createVm();
      vm.area.value = 'PQC';
      vm.comment.value = 'short';
      await skipOk(vm);
      expect(alerted(MOVE_IN_UI.errors.pqcSkipComment)).toBe(true);
      expect(service.sendCheckDiCycle).not.toHaveBeenCalled();
    });

    it('handles failure, throw, DI cycle confirm and plain skip confirm', async () => {
      const { vm } = createVm();
      service.sendCheckDiCycle.mockResolvedValue(fail('di-fail'));
      await skipOk(vm);
      await vi.waitFor(() => expect(alerted('di-fail')).toBe(true));

      service.sendCheckDiCycle.mockRejectedValue(new Error('di-throw'));
      await skipOk(vm);
      await vi.waitFor(() => expect(alerted('di-throw')).toBe(true));

      service.sendCheckDiCycle.mockResolvedValue(ok(tag('DICYCLE', 'Y')));
      service.sendMoveIn.mockResolvedValue(ok());
      service.sendLotInfoEnd.mockResolvedValue(ok());
      modal.confirm.mockResolvedValue(true);
      await skipOk(vm);
      await vi.waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));

      service.sendCheckDiCycle.mockResolvedValue(ok(tag('DICYCLE', 'N')));
      modal.confirm.mockResolvedValue(false);
      await skipOk(vm);
      await vi.waitFor(() =>
        expect(modal.confirm).toHaveBeenLastCalledWith(
          MOVE_IN_UI.alerts.skipConfirm,
          expect.anything(),
        ),
      );
      expect(router.back).toHaveBeenCalledTimes(1);

      modal.confirm.mockResolvedValue(true);
      await skipOk(vm);
      await vi.waitFor(() => expect(router.back).toHaveBeenCalledTimes(2));

      modal.confirm.mockReset();
      modal.confirm.mockResolvedValue(false);
      service.sendCheckDiCycle.mockResolvedValue(ok(tag('DICYCLE', 'Y')));
      await skipOk(vm);
      await vi.waitFor(() => expect(modal.confirm).toHaveBeenCalled());
      expect(router.back).toHaveBeenCalledTimes(2);
    });
  });

  describe('moveIn / lotInfoEnd / probe card history', () => {
    function prepare(vm: ReturnType<typeof useMoveIn>) {
      vm.lotId.value = 'L1';
      vm.eqpId.value = 'E1';
      vm.recipeText.value = 'R1';
    }

    it('shows the transaction message for MVIN transaction failures', async () => {
      const { vm } = createVm();
      prepare(vm);
      service.sendMoveIn.mockResolvedValue(fail(MOVE_IN_FLOW.mvinErrorTransaction));
      await vm.moveIn();
      expect(modal.alert).toHaveBeenCalledWith(
        MOVE_IN_UI.errors.transactionFail.replace(
          '$errorMessage',
          MOVE_IN_FLOW.mvinErrorTransaction,
        ),
        expect.anything(),
      );

      service.sendMoveIn.mockResolvedValue(fail('other'));
      await vm.moveIn();
      expect(alerted('other')).toBe(true);

      service.sendMoveIn.mockRejectedValue(new Error('mv-throw'));
      await vm.moveIn();
      expect(alerted('mv-throw')).toBe(true);
    });

    it('shows every warning from MOVEIN and records the probe card history', async () => {
      const { vm } = createVm();
      prepare(vm);
      vm.probeCard.value = 'PC';
      vm.probeCardId.value = 'PCID';
      service.sendMoveIn.mockResolvedValue(
        ok(
          tag('FICDCHMBER', 'ficd') +
            tag('CUMCYCLE', 'cum') +
            tag('CUMCYCLEQTY', '5') +
            tag('CDMSG', 'cd') +
            tag('MACROMSG', 'macro') +
            tag('SCOPEMSG', 'scope') +
            tag('sOvMSG', 'ov') +
            tag('ETCHREWORKMSG', 'etch'),
        ),
      );
      service.sendSetProbeCardHistory.mockResolvedValue(fail('hist-fail'));
      service.sendLotInfoEnd.mockResolvedValue(
        ok(tag('MVINMSG', 'done') + tag('MVINACTION', 'ACT')),
      );
      await vm.moveIn();
      expect(modal.alert).toHaveBeenCalledTimes(9);
      expect(alerted('hist-fail')).toBe(true);
      expect(alerted('ACT\ndone')).toBe(true);
      expect(router.back).toHaveBeenCalled();
    });

    it('survives probe history and LOTINFOEND exceptions and failures', async () => {
      const { vm } = createVm();
      prepare(vm);
      vm.probeCard.value = 'PC';
      vm.probeCardId.value = 'PCID';
      service.sendMoveIn.mockResolvedValue(ok());
      service.sendSetProbeCardHistory.mockRejectedValue(new Error('hist-throw'));
      service.sendLotInfoEnd.mockResolvedValue(fail('end-fail'));
      await vm.moveIn();
      expect(alerted('hist-throw')).toBe(true);
      expect(alerted('end-fail')).toBe(true);
      expect(router.back).not.toHaveBeenCalled();

      service.sendLotInfoEnd.mockRejectedValue(new Error('end-throw'));
      await vm.moveIn();
      expect(alerted('end-throw')).toBe(true);
    });

    it('uses pending warnings captured by getLotInfoOk', async () => {
      const { vm } = createVm();
      prepare(vm);
      service.sendMoveInLotInfo.mockResolvedValue(
        ok(
          tag('FICDCHMBER', 'pf') +
            tag('CUMCYCLE', 'pc') +
            tag('CUMCYCLEQTY', '3') +
            tag('ETCHREWORKMSG', 'pe'),
        ),
      );
      modal.confirm.mockResolvedValue(true);
      service.sendMoveIn.mockResolvedValue(ok());
      service.sendLotInfoEnd.mockResolvedValue(ok());
      await vm.getLotInfoOk();
      for (const msg of ['pf', 'pc', 'pe']) expect(alerted(msg)).toBe(true);
    });
  });

  describe('probe card', () => {
    it('ignores calls without probe card or equipment', async () => {
      const { vm } = createVm();
      await vm.getProbeCardInfo();
      await vm.getProbeValue();
      expect(service.sendProbeCardInfo).not.toHaveBeenCalled();
      expect(service.sendProbeCardValue).not.toHaveBeenCalled();
    });

    it('clears the probe card on failure, invalid status and exceptions', async () => {
      const { vm } = createVm();
      vm.eqpId.value = 'E1';
      vm.probeCard.value = 'PC';
      service.sendProbeCardInfo.mockResolvedValue(fail('pc-fail'));
      await vm.getProbeCardInfo();
      expect(vm.probeCard.value).toBe('');

      vm.probeCard.value = 'PC';
      service.sendProbeCardInfo.mockResolvedValue(ok(tag('PROBECARDSTATUS', 'N')));
      await vm.getProbeCardInfo();
      expect(alerted(MOVE_IN_UI.errors.invalidProbeCard)).toBe(true);
      expect(vm.probeCard.value).toBe('');

      vm.probeCard.value = 'PC';
      service.sendProbeCardInfo.mockResolvedValue(
        ok(tag('PROBECARDSTATUS', 'N') + tag('PROBECARDMSG', 'custom')),
      );
      await vm.getProbeCardInfo();
      expect(alerted('custom')).toBe(true);

      vm.probeCard.value = 'PC';
      service.sendProbeCardInfo.mockRejectedValue(new Error('pc-throw'));
      await vm.getProbeCardInfo();
      expect(alerted('pc-throw')).toBe(true);
      expect(vm.probeCard.value).toBe('');
    });

    it('stores the probe card id, warns on changes and loads WT probe values', async () => {
      const { vm } = createVm();
      vm.eqpId.value = 'E1';
      vm.product.value = 'P1';
      vm.processType.value = 'WT';
      vm.probeCard.value = 'PC';
      service.sendProbeCardInfo.mockResolvedValue(
        ok(tag('PROBECARDSTATUS', 'Y') + tag('CHECKLASTPROBE', 'Y') + tag('PROBECARDNO', 'NO1')),
      );
      service.sendProbeCardValue.mockResolvedValue(
        ok(tag('VALUE_OD', '1.5') + tag('VALUE_Z', '2.5')),
      );
      await vm.getProbeCardInfo();
      expect(vm.probeCardId.value).toBe('NO1');
      expect(alerted(MOVE_IN_UI.alerts.probeCardChanged)).toBe(true);
      expect(vm.probeOD.value).toBe('1.5');
      expect(vm.probeZ.value).toBe('2.5');

      service.sendProbeCardValue.mockResolvedValue(fail('val-fail'));
      await vm.getProbeValue();
      expect(vm.probeCard.value).toBe('');
      expect(alerted('val-fail')).toBe(true);

      vm.probeCard.value = 'PC';
      service.sendProbeCardValue.mockRejectedValue(new Error('val-throw'));
      await vm.getProbeValue();
      expect(alerted('val-throw')).toBe(true);

      // non-WT: no probe value request
      service.sendProbeCardValue.mockClear();
      vm.processType.value = 'X';
      vm.probeCard.value = 'PC';
      service.sendProbeCardInfo.mockResolvedValue(ok(tag('PROBECARDSTATUS', 'Y')));
      await vm.getProbeCardInfo();
      expect(service.sendProbeCardValue).not.toHaveBeenCalled();
    });
  });

  describe('getInspection', () => {
    it('stores inspection warnings, tolerates failures and exceptions', async () => {
      const { vm } = createVm();
      await vm.getInspection();
      expect(service.sendCheckInspection).not.toHaveBeenCalled();

      vm.lotId.value = 'L1';
      service.sendCheckInspection.mockResolvedValue(
        ok(tag('MACROMSG', 'm') + tag('SCOPEMSG', 's') + tag('CDMSG', 'c') + tag('sOvMSG', 'o')),
      );
      await vm.getInspection();
      expect(vm.inspectionWarnings.value).toEqual({
        macro: 'm',
        scope: 's',
        cd: 'c',
        overlay: 'o',
      });

      service.sendCheckInspection.mockResolvedValue(fail('x'));
      await vm.getInspection();
      expect(vm.inspectionWarnings.value.macro).toBe('m');

      service.sendCheckInspection.mockRejectedValue(new Error('x'));
      await vm.getInspection();
      expect(vm.inspectionWarnings.value).toEqual({ macro: '', scope: '', cd: '', overlay: '' });
      expect(vm.loading.value).toBe(false);
    });
  });

  describe('wafer / category flows', () => {
    it('reports slot info failure and missing wafers', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      service.sendSlotInfo.mockResolvedValue(fail('slot-fail'));
      await vm.onWHClick();
      expect(alerted('slot-fail')).toBe(true);
      expect(alerted(MOVE_IN_UI.errors.noWaferAvailable)).toBe(true);
      expect(vm.waferDialogOpen.value).toBe(false);

      service.sendSlotInfo.mockRejectedValue(new Error('slot-throw'));
      await vm.onWHClick();
      expect(alerted('slot-throw')).toBe(true);
    });

    it('toggles and cancels wafer selection', () => {
      const { vm } = createVm();
      vm.toggleWaferSelection('A');
      vm.toggleWaferSelection('B');
      vm.toggleWaferSelection('A');
      expect(vm.selectedWafers.value).toEqual(['B']);
      vm.waferDialogOpen.value = true;
      vm.cancelWaferSelection();
      expect(vm.waferDialogOpen.value).toBe(false);
    });

    it('requires a wafer, then writes the W/H comment for ordinary lots', () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      vm.confirmWaferSelection();
      expect(alerted(MOVE_IN_UI.errors.selectWafer)).toBe(true);

      vm.selectedWafers.value = ['L1.01', 'L1.02'];
      vm.waferDialogOpen.value = true;
      vm.confirmWaferSelection();
      expect(vm.comment.value).toBe('; W/H:#01,02');
      expect(vm.waferDialogOpen.value).toBe(false);
    });

    it('requires machines for DIFF + SLOT and saves the category comment', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      vm.createCategory.value = 'SLOT';
      vm.area.value = 'DIFF';
      vm.selectedWafers.value = ['L1.01'];
      vm.confirmWaferSelection();
      expect(alerted(MOVE_IN_UI.alerts.selectMachine)).toBe(true);

      vm.waferMachines.value = { 'L1.01': 'M1' };
      service.sendDummyEqpInput.mockResolvedValue(ok(tag('LOTCOMMENT', 'SAVED')));
      vm.confirmWaferSelection();
      await vi.waitFor(() => expect(vm.comment.value).toBe('SAVED'));
      expect(service.sendDummyEqpInput).toHaveBeenCalledWith('L1', '01(M1)', 'SLOT');

      // non-DIFF SLOT saves wafer numbers directly
      vm.area.value = 'OTHER';
      service.sendDummyEqpInput.mockResolvedValue(ok());
      vm.confirmWaferSelection();
      await vi.waitFor(() =>
        expect(service.sendDummyEqpInput).toHaveBeenLastCalledWith('L1', '01', 'SLOT'),
      );
    });

    it('validates COUNT names and handles service responses', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      vm.createCategory.value = 'COUNT';
      vm.countName.value = '   ';
      vm.confirmWaferSelection();
      expect(alerted(MOVE_IN_UI.errors.enterCount)).toBe(true);

      vm.countName.value = 'N1';
      service.sendDummyEqpInput.mockResolvedValue(fail('save-fail'));
      vm.confirmWaferSelection();
      await vi.waitFor(() => expect(alerted('save-fail')).toBe(true));

      service.sendDummyEqpInput.mockResolvedValue(ok(tag('MSG', 'count-msg')));
      vm.confirmWaferSelection();
      await vi.waitFor(() => expect(alerted('count-msg')).toBe(true));

      service.sendDummyEqpInput.mockResolvedValue(ok(tag('LOTCOMMENT', 'COUNT : N1')));
      vm.waferDialogOpen.value = true;
      vm.confirmWaferSelection();
      await vi.waitFor(() => expect(vm.countName.value).toBe(': N1'));
      expect(vm.waferDialogOpen.value).toBe(false);

      service.sendDummyEqpInput.mockRejectedValue(new Error('save-throw'));
      vm.confirmWaferSelection();
      await vi.waitFor(() => expect(alerted('save-throw')).toBe(true));
    });

    it('validates wafer machine lookups', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      await vm.lookupWaferMachine();
      expect(alerted(MOVE_IN_UI.errors.enterMachine)).toBe(true);

      vm.machineSearchId.value = 'm1';
      await vm.lookupWaferMachine();
      expect(alerted(MOVE_IN_UI.errors.selectWafer)).toBe(true);

      vm.selectedWafers.value = ['L1.01'];
      service.sendDummyEqpInfo.mockResolvedValue(fail('lookup-fail'));
      await vm.lookupWaferMachine();
      expect(alerted('lookup-fail')).toBe(true);

      service.sendDummyEqpInfo.mockResolvedValue(ok());
      await vm.lookupWaferMachine();
      expect(alerted(MOVE_IN_UI.errors.resolveMachine)).toBe(true);

      service.sendDummyEqpInfo.mockResolvedValue(ok(tag('EQPID', 'RES')));
      await vm.lookupWaferMachine();
      expect(service.sendDummyEqpInfo).toHaveBeenLastCalledWith('M1', 'L1');
      expect(vm.waferMachines.value['L1.01']).toBe('RES');
      expect(vm.machineSearchId.value).toBe('RES');

      service.sendDummyEqpInfo.mockRejectedValue(new Error('lookup-throw'));
      await vm.lookupWaferMachine();
      expect(alerted('lookup-throw')).toBe(true);
      expect(vm.loading.value).toBe(false);
    });
  });

  describe('fallback branches', () => {
    it('applies inline results from upper-case and lower-case keys', () => {
      const { vm } = createVm();
      vm.applyInlineActivityResult({
        EQPGROUP: 'G',
        EQPID: 'E',
        RECIPE: 'R',
        COMMENTQTY: '4',
        NRWCMTCOUNT: '2',
        NEST: 'N',
        ITDENTCODE: 'I',
        MASKTAG: 'T',
      } as never);
      expect(vm.standardMachine.value).toBe('G');
      expect(vm.eqpId.value).toBe('E');
      expect(vm.commentSize.value).toBe('4');
      expect(vm.unreadCommentCount.value).toBe(2);
      expect(vm.comment.value).toBe('NEST : N');
      expect(vm.identCodeList.value).toBe('I');
      expect(vm.reticleId.value).toBe('T');

      vm.applyInlineActivityResult({
        eqpGroup: 'g',
        eqpId: 'e',
        recipe: 'r',
        commentQty: '1',
        nrwCmtCount: '3',
        nest: 'n',
        identCode: 'i',
        maskTag: 't',
      } as never);
      expect(vm.standardMachine.value).toBe('g');
      expect(vm.unreadCommentCount.value).toBe(3);

      vm.applyInlineActivityResult({} as never);
      expect(vm.standardMachine.value).toBe('');
      expect(vm.commentSize.value).toBe('0');
      expect(vm.unreadCommentCount.value).toBe(0);
    });

    it('applies process inquire results with alternate keys', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      service.sendCheckInspection.mockResolvedValue(ok());
      expect(await vm.applyProcessInquireResult({ FINISH: 'Y' } as never)).toBe(true);
      expect(
        await vm.applyProcessInquireResult({
          EQPGROUP: 'EG',
          RECIPE: 'RR',
          CURRENTSTEP: 'CS',
          PROCESSSTEP: 'PS',
          SUBOPERATION: 'SO',
          COMMENTQTY: '2',
          NRWCOMMENTQTY: '5',
          SCOPESUB: 'SC',
        } as never),
      ).toBe(false);
      expect(vm.standardMachine.value).toBe('EG');
      expect(vm.unreadCommentCount.value).toBe(5);
      expect(vm.currentOperation.value).toBe('CS');
      expect(vm.scopeSub.value).toBe('SC');

      await vm.applyProcessInquireResult({} as never);
      expect(vm.unreadCommentCount.value).toBe(0);
    });

    it('selects the next lot from the batch lot list', async () => {
      const { vm } = createVm();
      service.sendLotInfo.mockResolvedValue(wip());
      await vm.completeBatchLotList('   ');
      expect(service.sendLotInfo).not.toHaveBeenCalled();
      await vm.completeBatchLotList(' L9 ');
      expect(vm.lotId.value).toBe('L9');
      expect(service.sendLotInfo).toHaveBeenCalled();
    });

    it('continues from a successful user check to the LOTINFO confirmation', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      vm.eqpId.value = 'E1';
      vm.selectedRecipe.value = 'SEL';
      service.sendLoginUserCheck.mockResolvedValue(ok(tag('AREACHECK', 'Y')));
      service.sendMoveInLotInfo.mockResolvedValue(ok());
      modal.confirm.mockResolvedValue(false);
      vm.onOK();
      await vi.waitFor(() => expect(modal.confirm).toHaveBeenCalled());
      expect(service.sendMoveInLotInfo.mock.calls[0][7]).toBe('SEL');

      service.sendLoginUserCheck.mockResolvedValue(ok());
      vm.onOK();
      await vi.waitFor(() => expect(alerted(MOVE_IN_UI.errors.userNotAllowed)).toBe(true));
    });

    it('tolerates empty response bodies', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      vm.eqpId.value = 'E1';
      vm.product.value = 'P';
      vm.probeCard.value = 'PC';
      service.sendProbeCardValue.mockResolvedValue(ok());
      await vm.getProbeValue();
      expect(vm.probeOD.value).toBe('');

      service.sendCheckInspection.mockResolvedValue(ok());
      await vm.getInspection();
      expect(vm.inspectionWarnings.value.cd).toBe('');

      service.sendSlotInfo.mockResolvedValue(ok());
      await vm.onWHClick();
      expect(vm.waferOptions.value).toEqual([]);

      service.sendMcfdcEqpInfo.mockResolvedValue(ok());
      service.sendEqpInfo.mockResolvedValue(ok());
      service.sendRecipeInfo.mockResolvedValue(ok());
      vm.eqpId.value = 'EQP-MACHINE*';
      await vm.onEqpIdCommit();
      expect(vm.recipeText.value).toBe('');

      service.sendLotInfo.mockResolvedValue(ok(tag('STATE', 'WIP') + tag('RECIPE', 'RZ')));
      await vm.getLotInfo();
      expect(vm.recipeText.value).toBe('RZ');
    });

    it('moves in with skip flags, quantity default and missing optional responses', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      vm.eqpId.value = 'E1';
      vm.selectedRecipe.value = 'SEL';
      vm.skipCurrentOperation.value = true;
      vm.quantity.value = '';
      service.sendMoveIn.mockResolvedValue(ok());
      service.sendLotInfoEnd.mockResolvedValue(ok(tag('MVINACTION', 'A')));
      await vm.moveIn();
      const args = service.sendMoveIn.mock.calls[0];
      expect(args[2]).toBe('SEL');
      expect(args[6]).toBe('Y');
      expect(args[11]).toBe('1');
      expect(router.back).toHaveBeenCalled();
    });

    it('shows empty-string fallbacks when exceptions carry no message', async () => {
      const { vm } = createVm();
      vm.lotId.value = 'L1';
      vm.eqpId.value = 'E1';
      vm.probeCard.value = 'PC';
      service.sendProbeCardInfo.mockRejectedValue('plain-string');
      await vm.getProbeCardInfo();
      expect(alerted('plain-string')).toBe(true);

      service.sendLotInfo.mockResolvedValue(ok(tag('STATE', 'WIP')));
      await vm.getLotInfo();
      expect(vm.currentOperation.value).toBe('');
    });
  });
});
