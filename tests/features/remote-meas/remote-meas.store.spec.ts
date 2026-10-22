import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import { remoteMeasService } from 'src/features/remote-meas/services/remote-meas.service';
import { useRemoteMeasStore } from 'src/features/remote-meas/stores/remote-meas.store';
import type {
  RemoteMeasEqpInfo,
  RemoteMeasLotInfo,
  RemoteMeasPortStatus,
} from 'src/features/remote-meas/types/remote-meas.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLotBase: RemoteMeasLotInfo = {
  product: 'PRD-01',
  facility: 'FAB2',
  operation: '5100',
  subOperation: '01',
  customer: 'CUST-01',
  category: 'SALE',
  engineer: 'KIM',
  packing: 'BOX',
  quantity: '25',
  goodChips: '25',
  recipe: 'RCP-STD',
  changeRecipe: '',
  measEqpId: 'MEQP-01',
  changeEqpGroup: '',
  commentQty: 2,
  nwCommentQty: 0,
  batchId: 'BATCH-01',
  area: 'ETCH',
  workedEqpId: '',
  workedRecipe: '',
  workedReticle: '',
  jobCode: 'JOB-01',
  processStep: 'STEP-1',
  opType: 'M',
  status: 'WAIT',
  state: 'WIP',
  holdStatus: 'RELEASE',
  operSequence: '10',
  etcMsg: '',
  machineName: '',
  portName: '',
  machineRecipeName: '',
  lotResUser: '',
  reworkFlag: 'N',
  oxMachine: '',
  skipAllowFlag: 'Y',
};

const mockEqpBase: RemoteMeasEqpInfo = {
  mainEqpId: 'MEQP-MAIN',
  procEqpId: 'MEQP-01',
  eqpArea: 'MEAS',
  eqpType: 'MEAS',
  pmMessage: '',
  portName: 'PORT-1,PORT-2',
  recipeName: 'RCP-STD',
};

const mockPortBase: RemoteMeasPortStatus = {
  portStateName: 'READY',
  portLotName: '',
  ackMsg: '',
};

describe('useRemoteMeasStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const main = useMainStore();
    main.facility = 'FAB2';
    main.operatorId = 'OP_TEST';
    main.operatorName = 'Tester';
  });

  it('initializes with default state', () => {
    const store = useRemoteMeasStore();
    expect(store.lotId).toBe('');
    expect(store.lotInfo).toBeNull();
    expect(store.isStartBtnEnabled).toBe(false);
    expect(store.isClearPortEnabled).toBe(false);
  });

  it('rejects LOT with RUN status', async () => {
    const store = useRemoteMeasStore();
    vi.spyOn(remoteMeasService, 'fetchLotInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockLotBase, status: 'RUN' },
    });

    const success = await store.fetchLotDetails('LOT-RUN');
    expect(success).toBe(false);
    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.message).toBe('이미 MOVE IN된 LOT입니다. 자동화 진행이 불가합니다.');
    expect(store.isMachineDisabled).toBe(true);
  });

  it('rejects LOT when state is not WIP', async () => {
    const store = useRemoteMeasStore();
    vi.spyOn(remoteMeasService, 'fetchLotInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockLotBase, state: 'NONWIP' },
    });

    const success = await store.fetchLotDetails('LOT-NONWIP');
    expect(success).toBe(false);
    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.message).toBe('NONWIP 상태 입니다. 자동화 진행이 불가합니다.');
    expect(store.isMachineDisabled).toBe(true);
  });

  it('rejects LOT on hold', async () => {
    const store = useRemoteMeasStore();
    vi.spyOn(remoteMeasService, 'fetchLotInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockLotBase, holdStatus: 'ONHOLD' },
    });

    const success = await store.fetchLotDetails('LOT-HOLD');
    expect(success).toBe(false);
    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.message).toBe('HOLD된 LOT입니다. 자동화 진행이 불가합니다.');
    expect(store.isMachineDisabled).toBe(true);
  });

  it('rejects PHOTO or IMP area lots', async () => {
    const store = useRemoteMeasStore();
    vi.spyOn(remoteMeasService, 'fetchLotInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockLotBase, area: 'PHOTO' },
    });

    const success = await store.fetchLotDetails('LOT-PHOTO');
    expect(success).toBe(false);
    expect(store.alertDialog.message).toBe(
      'PHOTO 계측진행 LOT입니다. 계측 자동화 진행이 불가합니다.',
    );
    expect(store.isMachineDisabled).toBe(true);
  });

  it('loads valid lot and displays PM warning if present in EqpInfo', async () => {
    const store = useRemoteMeasStore();
    vi.spyOn(remoteMeasService, 'fetchLotInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockLotBase },
    });
    vi.spyOn(remoteMeasService, 'fetchEqpInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockEqpBase, pmMessage: 'PM Due Soon' },
    });
    vi.spyOn(remoteMeasService, 'fetchPortStatus').mockResolvedValueOnce({
      ok: true,
      data: { ...mockPortBase },
    });

    await store.initScreen('LOT-OK');
    expect(store.lotId).toBe('LOT-OK');
    expect(store.isStartBtnEnabled).toBe(true);
    expect(store.isReadCommentEnabled).toBe(true);

    await store.fetchEqpInfo('MEQP-01');
    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.title).toBe('PM주기 경고');
    expect(store.alertDialog.message).toBe('PM Due Soon');
  });

  it('selects Flag P when recipe ends with BF, otherwise Flag T', async () => {
    const store = useRemoteMeasStore();
    store.lotInfo = { ...mockLotBase };
    vi.spyOn(remoteMeasService, 'fetchEqpInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockEqpBase, recipeName: 'RCP-BF' },
    });
    vi.spyOn(remoteMeasService, 'fetchPortStatus').mockResolvedValue({
      ok: true,
      data: { ...mockPortBase },
    });

    await store.fetchEqpInfo('MEQP-01');
    expect(store.selectedFlag).toBe('P');

    vi.spyOn(remoteMeasService, 'fetchEqpInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockEqpBase, recipeName: 'RCP-NORMAL' },
    });
    await store.fetchEqpInfo('MEQP-01');
    expect(store.selectedFlag).toBe('T');
  });

  it('handles running port status alert and enables port clear button', async () => {
    const store = useRemoteMeasStore();
    store.selectedPort = 'PORT-1';
    store.superEqpId = 'MEQP-01';

    vi.spyOn(remoteMeasService, 'fetchPortStatus').mockResolvedValueOnce({
      ok: true,
      data: {
        portStateName: 'RUN',
        portLotName: 'OTHER-LOT',
        ackMsg: '',
      },
    });

    await store.fetchPortStatus();
    expect(store.portState).toBe('RUN');
    expect(store.isClearPortEnabled).toBe(true);
    expect(store.isStartBtnEnabled).toBe(false);
    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.message).toContain('해당 PORT가 진행중입니다.');
  });

  it('clears port and displays success message', async () => {
    const store = useRemoteMeasStore();
    store.selectedPort = 'PORT-1';
    store.superEqpId = 'MEQP-01';

    vi.spyOn(remoteMeasService, 'clearPort').mockResolvedValueOnce({ ok: true });
    vi.spyOn(remoteMeasService, 'fetchPortStatus').mockResolvedValueOnce({
      ok: true,
      data: { ...mockPortBase, portStateName: 'IDLE' },
    });

    await store.executeClearPort();
    expect(store.alertDialog.title).toBe('DOOR OPEN');
    expect(store.alertDialog.message).toBe('해당 PORT 초기화 명령을 전송하였습니다.');
  });

  it('blocks start if required fields are missing', async () => {
    const store = useRemoteMeasStore();
    store.procEqpId = '';
    const res1 = await store.validateAndStart();
    expect(res1).toBe(false);
    expect(store.alertDialog.message).toBe('진행장비를 입력하세요.');

    store.procEqpId = 'MEQP-01';
    store.selectedPort = '';
    const res2 = await store.validateAndStart();
    expect(res2).toBe(false);
    expect(store.alertDialog.message).toBe('진행 Port를 선택하세요.');

    store.selectedPort = 'PORT-1';
    store.selectedWaferList = '';
    const res3 = await store.validateAndStart();
    expect(res3).toBe(false);
    expect(store.alertDialog.message).toBe('진행 WF를 선택하세요.');

    store.selectedWaferList = '01,02';
    store.selectedFlag = '';
    const res4 = await store.validateAndStart();
    expect(res4).toBe(false);
    expect(store.alertDialog.message).toBe('계측 FLAG를 선택하세요.');

    store.selectedFlag = 'T';
    store.prodMachine = '';
    const res5 = await store.validateAndStart();
    expect(res5).toBe(false);
    expect(store.alertDialog.message).toBe('생산 장비명을 입력하세요.');

    store.prodMachine = 'PROD-01';
    store.recipeName = '';
    const res6 = await store.validateAndStart();
    expect(res6).toBe(false);
    expect(store.alertDialog.message).toBe('진행Rcp를 선택하세요.');
  });

  it('rejects LOT when holdStatus is ONHOLD', async () => {
    const store = useRemoteMeasStore();
    vi.spyOn(remoteMeasService, 'fetchLotInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockLotBase, holdStatus: 'ONHOLD' },
    });

    const success = await store.fetchLotDetails('LOT-HOLD');
    expect(success).toBe(false);
    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.message).toBe('HOLD된 LOT입니다. 자동화 진행이 불가합니다.');
    expect(store.isMachineDisabled).toBe(true);
  });

  it('rejects LOT when area is PHOTO or IMP', async () => {
    const store = useRemoteMeasStore();
    vi.spyOn(remoteMeasService, 'fetchLotInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockLotBase, area: 'PHOTO' },
    });

    const success1 = await store.fetchLotDetails('LOT-PHOTO');
    expect(success1).toBe(false);
    expect(store.alertDialog.message).toBe(
      'PHOTO 계측진행 LOT입니다. 계측 자동화 진행이 불가합니다.',
    );
    expect(store.isMachineDisabled).toBe(true);

    vi.spyOn(remoteMeasService, 'fetchLotInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockLotBase, area: 'IMP' },
    });

    const success2 = await store.fetchLotDetails('LOT-IMP');
    expect(success2).toBe(false);
    expect(store.alertDialog.message).toBe('IMP 진행 LOT입니다. IMP 자동화기능을 이용해 주세요.');
    expect(store.isMachineDisabled).toBe(true);
  });

  it('blocks start and does not open recipe dialog if checkComment API fails', async () => {
    const store = useRemoteMeasStore();
    store.procEqpId = 'MEQP-01';
    store.selectedPort = 'PORT-1';
    store.selectedWaferList = '01,02';
    store.waferCount = 2;
    store.selectedFlag = 'T';
    store.prodMachine = 'PROD-01';
    store.recipeName = 'RCP-01';
    store.lotId = 'LOT-01';

    vi.spyOn(remoteMeasService, 'fetchLotInfo').mockResolvedValueOnce({
      ok: false,
      message: 'Network Timeout',
    });

    const res = await store.validateAndStart();
    expect(res).toBe(false);
    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.message).toBe('Network Timeout');
    expect(store.recipeDialog.open).toBe(false);
  });

  it('blocks start and does not open recipe dialog if unread comment exists', async () => {
    const store = useRemoteMeasStore();
    store.procEqpId = 'MEQP-01';
    store.selectedPort = 'PORT-1';
    store.selectedWaferList = '01,02';
    store.waferCount = 2;
    store.selectedFlag = 'T';
    store.prodMachine = 'PROD-01';
    store.recipeName = 'RCP-01';
    store.lotId = 'LOT-01';

    vi.spyOn(remoteMeasService, 'fetchLotInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockLotBase, nwCommentQty: 3 },
    });

    const res = await store.validateAndStart();
    expect(res).toBe(false);
    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.message).toContain('읽지 않은 작업성 COMMENT가 [3]가 있습니다.');
    expect(store.recipeDialog.open).toBe(false);
  });

  it('shows alerts for etcMsg, nwCommentQty and sets changeRecipe', async () => {
    const store = useRemoteMeasStore();
    vi.spyOn(remoteMeasService, 'fetchLotInfo').mockResolvedValueOnce({
      ok: true,
      data: {
        ...mockLotBase,
        changeRecipe: 'RCP-CHANGE',
        etcMsg: 'Special Notice',
        nwCommentQty: 3,
      },
    });

    const success = await store.fetchLotDetails('LOT-NOTICE');
    expect(success).toBe(true);
    expect(store.recipeName).toBe('RCP-CHANGE');
    expect(store.alertDialog.open).toBe(true);
  });

  it('handles reserved lot user assignment (lotResUser)', async () => {
    const store = useRemoteMeasStore();
    vi.spyOn(remoteMeasService, 'fetchLotInfo').mockResolvedValueOnce({
      ok: true,
      data: {
        ...mockLotBase,
        lotResUser: 'OTHER_USER',
        machineName: 'MEQP-01',
        portName: 'PORT-1',
      },
    });
    vi.spyOn(remoteMeasService, 'fetchEqpInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockEqpBase },
    });
    vi.spyOn(remoteMeasService, 'fetchPortStatus').mockResolvedValue({
      ok: true,
      data: { ...mockPortBase },
    });

    const success = await store.fetchLotDetails('LOT-RES');
    expect(success).toBe(true);
    expect(store.isMachineDisabled).toBe(true);
    expect(store.isPortDisabled).toBe(true);
  });

  it('shows PM cycle warning when equipment has pmMessage', async () => {
    const store = useRemoteMeasStore();
    store.lotInfo = { ...mockLotBase };
    vi.spyOn(remoteMeasService, 'fetchEqpInfo').mockResolvedValueOnce({
      ok: true,
      data: { ...mockEqpBase, pmMessage: 'PM Due Soon' },
    });
    vi.spyOn(remoteMeasService, 'fetchPortStatus').mockResolvedValueOnce({
      ok: true,
      data: { ...mockPortBase },
    });

    const success = await store.fetchEqpInfo('MEQP-01');
    expect(success).toBe(true);
    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.title).toBe('PM주기 경고');
    expect(store.alertDialog.message).toBe('PM Due Soon');
  });

  it('handles equipment fetch failure', async () => {
    const store = useRemoteMeasStore();
    store.lotInfo = { ...mockLotBase };
    vi.spyOn(remoteMeasService, 'fetchEqpInfo').mockResolvedValueOnce({
      ok: false,
      message: '장비 조회 실패',
    });

    const success = await store.fetchEqpInfo('MEQP-FAIL');
    expect(success).toBe(false);
    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.message).toBe('장비 조회 실패');
  });

  it('handles port status fetch failure and pending state', async () => {
    const store = useRemoteMeasStore();
    store.selectedPort = 'PORT-1';
    store.superEqpId = 'MEQP-01';

    vi.spyOn(remoteMeasService, 'fetchPortStatus').mockResolvedValueOnce({
      ok: false,
      message: 'PORT 조회 실패',
    });

    await store.fetchPortStatus();
    expect(store.alertDialog.message).toBe('PORT 조회 실패');

    vi.spyOn(remoteMeasService, 'fetchPortStatus').mockResolvedValueOnce({
      ok: true,
      data: { ...mockPortBase, portStateName: 'PENDING' },
    });

    await store.fetchPortStatus();
    expect(store.portState).toBe('PENDING');
    expect(store.isStartBtnEnabled).toBe(false);
    expect(store.alertDialog.message).toContain('해당 PORT가 진행중입니다.');
  });

  it('handles failure when clearPort API fails', async () => {
    const store = useRemoteMeasStore();
    store.selectedPort = 'PORT-1';
    store.superEqpId = 'MEQP-01';

    vi.spyOn(remoteMeasService, 'clearPort').mockResolvedValueOnce({
      ok: false,
      message: 'Port Clear Error',
    });

    await store.executeClearPort();
    expect(store.alertDialog.message).toBe('Port Clear Error');
  });

  it('handles failure when startRemoteMeas API fails', async () => {
    const store = useRemoteMeasStore();
    store.lotId = 'LOT-01';
    store.procEqpId = 'MEQP-01';
    store.superEqpId = 'MEQP-01';
    store.eqpType = 'MEAS';
    store.selectedPort = 'PORT-1';
    store.recipeName = 'RCP-STD';
    store.waferCount = 2;
    store.selectedFlag = 'T';
    store.prodMachine = 'PROD-01';
    store.selectedWaferList = '01,02';
    store.lotInfo = { ...mockLotBase };

    vi.spyOn(remoteMeasService, 'startRemoteMeas').mockResolvedValueOnce({
      ok: false,
      message: 'Remote Start Failed',
    });

    const ok = await store.submitRemoteStart();
    expect(ok).toBe(false);
    expect(store.alertDialog.message).toBe('Remote Start Failed');
  });

  it('alerts PHOTO warning only when area is PHOTO, opType is P and exposure is true', async () => {
    const store = useRemoteMeasStore();
    store.lotInfo = { ...mockLotBase, area: 'PHOTO', opType: 'P' };
    store.exposure = false;

    await store.getMachineInfo('MEQP-01');
    expect(store.alertDialog.open).toBe(false);

    store.exposure = true;
    await store.getMachineInfo('MEQP-01');
    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.message).toBe(
      'PHOTO진행 LOT입니다. PHOTO 자동화 기능을 이용해 주세요.',
    );
  });

  it('sets procEqpId and superEqpId directly from API without falling back to cleanEqp', async () => {
    const store = useRemoteMeasStore();
    store.lotInfo = { ...mockLotBase };
    vi.spyOn(remoteMeasService, 'fetchEqpInfo').mockResolvedValueOnce({
      ok: true,
      data: {
        ...mockEqpBase,
        procEqpId: '',
        mainEqpId: '',
      },
    });
    vi.spyOn(remoteMeasService, 'fetchPortStatus').mockResolvedValue({
      ok: true,
      data: { ...mockPortBase },
    });

    await store.getMachineInfo('INPUT-EQP');
    expect(store.procEqpId).toBe('');
    expect(store.superEqpId).toBe('');
  });
});
