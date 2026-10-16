import { useRemoteImpMain } from 'src/features/remote-imp-main/composables/useRemoteImpMain';
import type {
  ImpApi,
  ImpBody,
} from 'src/features/remote-imp-main/services/remote-imp-main.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pass = (body: ImpBody = {}) => ({ ok: true as const, body });
const lot = {
  STATUS: 'WAIT',
  STATE: 'WIP',
  HOLDSTATUS: '',
  AREA: 'IMP',
  RECIPE: 'R-A',
  EQPGROUP: 'FAB1',
  PRODUCT: 'PRODUCT-A',
  JOBCODE: 'JOB-1',
  PROCESSSTEP: 'IMPLANT',
  OPERATION: '20000',
  SUBOPERATION: '01',
  QUANTITY: '25',
  COMMENTQTY: '2',
  NWCOMMENTQTY: '0',
};

function setup() {
  const api = {
    lotInfo: vi.fn().mockResolvedValue(pass(lot)),
    remoteEqpInfo: vi
      .fn()
      .mockResolvedValue(pass({ PROCEQPID: 'IMP-1', EQPTYPE: 'VARIAN_MC', PORTNAME: '1,2' })),
    recipeInfo: vi.fn().mockResolvedValue(pass({ RECIPE: 'MAIN:B,A' })),
    memorization: vi.fn().mockResolvedValue(pass()),
    machinePortStatus: vi.fn().mockResolvedValue(pass({ PORTSTATENAME: 'READY', ALLSTATE: 'Y' })),
    machinePortClean: vi.fn().mockResolvedValue(pass()),
    areaBayInfo: vi.fn().mockResolvedValue(pass({ BAYS: [{ BAY: 'B1' }] })),
    bayStockerInfo: vi.fn().mockResolvedValue(pass({ STOCKERS: [{ STOCKER: 'S1' }] })),
    impRemoteStart: vi.fn().mockResolvedValue(pass()),
  };
  const alert = vi.fn();
  const confirm = vi.fn().mockResolvedValue(true);
  const onComplete = vi.fn();
  const onComment = vi.fn();
  const screen = useRemoteImpMain({
    api: api as unknown as ImpApi,
    facility: 'FAB-A',
    operatorId: 'OP-A',
    alert,
    confirm,
    onComplete,
    onComment,
  });
  return { api, alert, confirm, onComplete, onComment, ...screen };
}

describe('Remote IMP main hifos2 flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [{ STATUS: 'RUN' }, 'MOVE IN'],
    [{ STATE: 'HOLD' }, 'HOLD 상태'],
    [{ HOLDSTATUS: 'ONHOLD' }, 'HOLD된 LOT'],
    [{ AREA: 'CVD' }, 'IMP공정이 아닙니다'],
  ])('blocks invalid LOT conditions before equipment lookup', async (change, message) => {
    const screen = setup();
    screen.api.lotInfo.mockResolvedValue(pass({ ...lot, ...change }));
    await screen.setLotInfo('LOT-1');
    expect(screen.state.machineDisabled).toBe(true);
    expect(screen.alert.mock.calls[0]?.[0].message).toContain(message);
    expect(screen.api.remoteEqpInfo).not.toHaveBeenCalled();
  });

  it('loads equipment, parses and sorts recipes, and memorizes the selection', async () => {
    const screen = setup();
    await screen.setLotInfo('LOT-1');
    expect(screen.state.recipeList).toEqual(['R-A']);
    expect(screen.state.recipe).toBe('');
    await screen.getMachineInfo('IMP-1');
    expect(screen.api.remoteEqpInfo).toHaveBeenCalledWith('IMP-1');
    expect(screen.api.recipeInfo).toHaveBeenCalledWith(
      'LOT-1',
      '20000',
      '01',
      'PRODUCT-A',
      'IMP-1',
      '',
      'FAB-A',
    );
    expect(screen.state.recipeList).toEqual(['MAIN:A', 'MAIN:B']);
    expect(screen.api.memorization).toHaveBeenCalledWith('IMP-1', 'MAIN:A', 'LOT-1');
    expect(screen.state.port).toBe('');
    expect(screen.api.machinePortStatus).not.toHaveBeenCalled();
    expect(screen.state.startEnabled).toBe(false);
    await screen.selectPort('1');
    expect(screen.api.machinePortStatus).toHaveBeenCalledWith('IMP-1', '1');
    expect(screen.state.startEnabled).toBe(true);
    expect(screen.state.clearPortEnabled).toBe(false);
  });

  it('blocks busy and idle ports and confirms a clear before sending the command', async () => {
    const screen = setup();
    await screen.setLotInfo('LOT-1');
    screen.state.isMainEqp = 'IMP-1';
    screen.api.machinePortStatus
      .mockResolvedValueOnce(pass({ PORTSTATENAME: 'RUN' }))
      .mockResolvedValueOnce(pass({ PORTSTATENAME: 'IDLE' }));
    await screen.selectPort('1');
    expect(screen.state.startEnabled).toBe(false);
    expect(screen.state.clearPortEnabled).toBe(true);
    await screen.executeClearPort();
    expect(screen.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('PORT [1]') }),
    );
    expect(screen.api.machinePortClean).toHaveBeenCalledWith('IMP-1', '1');
    expect(screen.state.startEnabled).toBe(false);
  });

  it('fetches BAY and STK on carry, then sends exact IMPREMOTESTART fields after comment and recipe checks', async () => {
    const screen = setup();
    await screen.setLotInfo('LOT-1');
    await screen.getMachineInfo('IMP-1');
    await screen.setCarry(true);
    expect(screen.api.areaBayInfo).toHaveBeenCalledWith('FAB-A');
    expect(screen.state.bay).toBe('');
    expect(screen.api.bayStockerInfo).not.toHaveBeenCalled();
    screen.state.bay = 'B1';
    await screen.setStkSpinner();
    expect(screen.api.bayStockerInfo).toHaveBeenCalledWith('B1', 'FAB-A');
    expect(screen.state.stk).toBe('');
    screen.state.stk = 'S1';
    await screen.selectPort('1');
    await screen.executeStart();
    expect(screen.api.lotInfo).toHaveBeenCalledTimes(2);
    expect(screen.confirm).toHaveBeenCalledWith({ title: 'RECIPE 확인', message: 'MAIN:A' });
    expect(screen.api.impRemoteStart).toHaveBeenCalledWith(
      expect.objectContaining({
        machineName: 'IMP-1',
        machineType: 'VARIAN_MC',
        lotName: 'LOT-1',
        portName: '1',
        recipeName: 'MAIN:A',
        jobCode: 'JOB-1',
        productName: 'PRODUCT-A',
        operation: '20000',
        isCarry: 'Y',
        bay: 'B1',
        stocker: 'S1',
        eventUser: 'OP-A',
      }),
    );
    expect(screen.onComplete).toHaveBeenCalledOnce();
  });

  it('requires unread work comments to be read and forwards the original comment context', async () => {
    const screen = setup();
    await screen.setLotInfo('LOT-1');
    screen.state.machineName = 'IMP-1';
    screen.state.port = '1';
    screen.state.recipe = 'R-A';
    screen.api.lotInfo.mockResolvedValueOnce(pass({ NWCOMMENTQTY: '3' }));
    await screen.executeStart();
    expect(screen.api.impRemoteStart).not.toHaveBeenCalled();
    expect(screen.alert.mock.calls.at(-1)?.[0].message).toContain('[3]');
    screen.executeComment();
    expect(screen.onComment).toHaveBeenCalledWith(
      expect.objectContaining({
        lotId: 'LOT-1',
        operation: '20000',
        subOperation: '01',
        processStep: 'IMPLANT',
        facility: 'FAB-A',
      }),
    );
  });

  it('invalidates the previous equipment and carry selection as soon as the equipment input changes', async () => {
    const screen = setup();
    await screen.setLotInfo('LOT-1');
    await screen.getMachineInfo('IMP-1');
    await screen.selectPort('1');
    await screen.setCarry(true);
    expect(screen.state.startEnabled).toBe(true);

    screen.updateMachineName('IMP-2');
    expect(screen.state.machineName).toBe('IMP-2');
    expect(screen.state.port).toBe('');
    expect(screen.state.machineState).toBe('');
    expect(screen.state.startEnabled).toBe(false);
    expect(screen.state.carryEnabled).toBe(false);
    expect(screen.state.carry).toBe(false);
    expect(screen.state.bay).toBe('');
  });

  it('does not send a start command when rechecking the LOT fails', async () => {
    const screen = setup();
    await screen.setLotInfo('LOT-1');
    await screen.getMachineInfo('IMP-1');
    await screen.selectPort('1');
    screen.api.lotInfo.mockResolvedValueOnce({ ok: false, message: 'LOT lookup failed' });

    await screen.executeStart();

    expect(screen.alert).toHaveBeenCalledWith({ title: '오류', message: 'LOT lookup failed' });
    expect(screen.confirm).not.toHaveBeenCalled();
    expect(screen.api.impRemoteStart).not.toHaveBeenCalled();
  });

  it('disables start when refreshing a previously ready PORT fails', async () => {
    const screen = setup();
    await screen.setLotInfo('LOT-1');
    await screen.getMachineInfo('IMP-1');
    await screen.selectPort('1');
    expect(screen.state.startEnabled).toBe(true);
    screen.api.machinePortStatus.mockResolvedValueOnce({
      ok: false,
      message: 'PORT lookup failed',
    });

    await screen.selectPort('2');

    expect(screen.state.startEnabled).toBe(false);
    expect(screen.state.machineState).toBe('');
  });

  describe('setLotInfo', () => {
    it('only clears the LOT info when the LOT id is empty', async () => {
      const screen = setup();
      await screen.setLotInfo('');
      expect(screen.api.lotInfo).not.toHaveBeenCalled();
      expect(screen.state.lotId).toBe('');
    });

    it('shows the server error when the LOT lookup fails', async () => {
      const screen = setup();
      screen.api.lotInfo.mockResolvedValue({ ok: false, message: 'LOT lookup failed' });
      await screen.setLotInfo('LOT-1');
      expect(screen.alert).toHaveBeenCalledWith({ title: '오류', message: 'LOT lookup failed' });
      expect(screen.state.recipeList).toEqual([]);
    });

    it('flags changed recipe and equipment group and shows info and unread comment alerts', async () => {
      const screen = setup();
      screen.api.lotInfo.mockResolvedValue(
        pass({
          ...lot,
          CHANGERECIPE: 'R-B;R-C',
          CHANGEEQPGROUP: 'FAB9',
          ETCMSG: 'etc info',
          NWCOMMENTQTY: '4',
        }),
      );
      await screen.setLotInfo('LOT-1');
      expect(screen.state.lsChangeRecipe).toBe(true);
      expect(screen.state.lsChangeEqpGroup).toBe(true);
      expect(screen.state.standardMachine).toBe('FAB9');
      expect(screen.state.recipeList).toEqual(['R-B', 'R-C']);
      expect(screen.state.commentEnabled).toBe(true);
      expect(screen.alert).toHaveBeenCalledWith({ title: '정보', message: 'etc info' });
      expect(screen.alert.mock.calls.at(-1)?.[0].message).toContain('[4]');
    });

    it('keeps the changed flags off when the change values equal the originals', async () => {
      const screen = setup();
      screen.api.lotInfo.mockResolvedValue(
        pass({ ...lot, CHANGERECIPE: 'R-A', CHANGEEQPGROUP: 'FAB1', COMMENTQTY: '0' }),
      );
      await screen.setLotInfo('LOT-1');
      expect(screen.state.lsChangeRecipe).toBe(false);
      expect(screen.state.lsChangeEqpGroup).toBe(false);
      expect(screen.state.commentEnabled).toBe(false);
    });

    it('locks every input when the LOT is already reserved or running', async () => {
      const screen = setup();
      screen.api.lotInfo.mockResolvedValue(pass({ ...lot, LOTRESUSER: 'OP-B' }));
      await screen.setLotInfo('LOT-1');
      expect(screen.state.machineDisabled).toBe(true);
      expect(screen.state.recipeDisabled).toBe(true);
      expect(screen.state.portDisabled).toBe(true);
      expect(screen.state.startEnabled).toBe(false);
      expect(screen.alert.mock.calls.at(-1)?.[0].message).toContain('작업 예약');
    });
  });

  describe('LOT detail fields', () => {
    it('maps FACILITY, PACKING and GOODCHIPS from the LOT info', async () => {
      const screen = setup();
      screen.api.lotInfo.mockResolvedValue(
        pass({ ...lot, FACILITY: 'FAB-Z', PACKING: 'PACK-1', GOODCHIPS: '480' }),
      );
      await screen.setLotInfo('LOT-1');
      expect(screen.state.facility).toBe('FAB-Z');
      expect(screen.state.packing).toBe('PACK-1');
      expect(screen.state.goodChips).toBe('480');
    });

    it('resets FACILITY to the device facility and clears GOOD CHIPS before a new lookup', async () => {
      const screen = setup();
      screen.api.lotInfo.mockResolvedValue(pass({ ...lot, FACILITY: 'FAB-Z', GOODCHIPS: '480' }));
      await screen.setLotInfo('LOT-1');
      screen.clearLotInfo();
      expect(screen.state.facility).toBe('FAB-A');
      expect(screen.state.goodChips).toBe('');
      expect(screen.state.packing).toBe('');
    });
  });

  describe('executeStart double click', () => {
    const ready = (screen: ReturnType<typeof setup>) =>
      Object.assign(screen.state, { machineName: 'IMP-1', port: '1', recipe: 'R-A' });

    it('ignores a second start while the LOT re-check is still pending', async () => {
      const screen = setup();
      ready(screen);
      let release: (value: ReturnType<typeof pass>) => void = () => undefined;
      screen.api.lotInfo.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));

      const first = screen.executeStart();
      expect(screen.state.starting).toBe(true);
      await screen.executeStart();
      expect(screen.api.lotInfo).toHaveBeenCalledTimes(1);

      release(pass({ NWCOMMENTQTY: '0' }));
      await first;
      expect(screen.confirm).toHaveBeenCalledTimes(1);
      expect(screen.api.impRemoteStart).toHaveBeenCalledTimes(1);
      expect(screen.state.starting).toBe(false);
    });

    it('stays locked while the recipe confirmation is open', async () => {
      const screen = setup();
      ready(screen);
      let answer: (accepted: boolean) => void = () => undefined;
      screen.confirm.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));

      const first = screen.executeStart();
      await vi.waitFor(() => expect(screen.confirm).toHaveBeenCalledTimes(1));
      await screen.executeStart();
      expect(screen.confirm).toHaveBeenCalledTimes(1);
      expect(screen.state.starting).toBe(true);

      answer(true);
      await first;
      expect(screen.api.impRemoteStart).toHaveBeenCalledTimes(1);
      expect(screen.state.starting).toBe(false);
    });

    it.each([
      ['validation fails', (screen: ReturnType<typeof setup>) => (screen.state.port = '')],
      [
        'the confirmation is declined',
        (screen: ReturnType<typeof setup>) => screen.confirm.mockResolvedValue(false),
      ],
      [
        'the start command fails',
        (screen: ReturnType<typeof setup>) =>
          screen.api.impRemoteStart.mockResolvedValue({ ok: false, message: 'start failed' }),
      ],
    ])('releases the lock when %s so the user can retry', async (_name, arrange) => {
      const screen = setup();
      ready(screen);
      arrange(screen);
      await screen.executeStart();
      expect(screen.state.starting).toBe(false);
    });

    it('releases the lock when a request throws', async () => {
      const screen = setup();
      ready(screen);
      screen.api.lotInfo.mockRejectedValueOnce(new Error('boom'));
      await expect(screen.executeStart()).rejects.toThrow('boom');
      expect(screen.state.starting).toBe(false);
    });
  });

  describe('getMachineInfo', () => {
    it('does nothing for an empty equipment id', async () => {
      const screen = setup();
      await screen.getMachineInfo('');
      expect(screen.api.remoteEqpInfo).not.toHaveBeenCalled();
    });

    it('does nothing when the machine input is disabled', async () => {
      const screen = setup();
      screen.state.machineDisabled = true;
      await screen.getMachineInfo('IMP-1');
      expect(screen.api.remoteEqpInfo).not.toHaveBeenCalled();
      expect(screen.state.machineName).toBe('IMP-1');
    });

    it('redirects PHOTO exposure LOTs to the PHOTO automation', async () => {
      const screen = setup();
      screen.state.searchArea = 'PHOTO';
      screen.state.searchOpType = 'P';
      screen.state.exposure = true;
      await screen.getMachineInfo('imp-1');
      expect(screen.alert.mock.calls[0]?.[0].message).toContain('PHOTO');
      expect(screen.api.remoteEqpInfo).not.toHaveBeenCalled();
    });

    it.each([
      ['main operation type', { searchOpType: 'M' }],
      ['FAB2 standard machine', { standardMachine: 'FAB2' }],
      ['PQC area', { searchArea: 'PQC' }],
    ])('skips the remote equipment lookup for %s', async (_name, change) => {
      const screen = setup();
      Object.assign(screen.state, change);
      await screen.getMachineInfo('imp-1');
      expect(screen.api.remoteEqpInfo).not.toHaveBeenCalled();
      expect(screen.state.machineName).toBe('IMP-1');
      expect(screen.api.recipeInfo).toHaveBeenCalled();
    });

    it('clears the machine name when the equipment lookup fails', async () => {
      const screen = setup();
      screen.api.remoteEqpInfo.mockResolvedValue({ ok: false, message: 'EQP not found' });
      await screen.getMachineInfo('IMP-1');
      expect(screen.state.machineName).toBe('');
      expect(screen.alert).toHaveBeenCalledWith({ title: '오류', message: 'EQP not found' });
      expect(screen.api.recipeInfo).not.toHaveBeenCalled();
    });

    it('shows the PM warning message', async () => {
      const screen = setup();
      screen.api.remoteEqpInfo.mockResolvedValue(
        pass({ PROCEQPID: 'IMP-1', PORTNAME: '1', PMMESSAGE: 'PM soon' }),
      );
      await screen.getMachineInfo('IMP-1');
      expect(screen.alert).toHaveBeenCalledWith({ title: 'PM주기 경고', message: 'PM soon' });
      expect(screen.state.portList).toEqual(['1']);
    });

    it('rejects equipment that is outside the standard equipment group', async () => {
      const screen = setup();
      screen.state.standardMachine = 'XXX-1,2';
      await screen.getMachineInfo('IMP-1');
      expect(screen.state.machineName).toBe('');
      expect(screen.api.recipeInfo).not.toHaveBeenCalled();
    });

    it('disables the clear port button when the recipe lookup fails', async () => {
      const screen = setup();
      screen.state.standardMachine = 'FAB1';
      screen.api.recipeInfo.mockResolvedValue({ ok: false, message: 'no recipe' });
      screen.state.clearPortEnabled = true;
      await screen.getMachineInfo('IMP-1');
      expect(screen.state.clearPortEnabled).toBe(false);
      expect(screen.state.carryEnabled).toBe(false);
      expect(screen.api.memorization).not.toHaveBeenCalled();
    });

    it('keeps a recipe without a colon as a single entry', async () => {
      const screen = setup();
      screen.state.standardMachine = 'FAB1';
      screen.api.recipeInfo.mockResolvedValue(pass({ RECIPE: 'PLAIN' }));
      await screen.getMachineInfo('IMP-1');
      expect(screen.state.recipeList).toEqual(['PLAIN']);
      expect(screen.state.recipe).toBe('PLAIN');
    });

    it('does not memorize when no recipe is returned', async () => {
      const screen = setup();
      screen.state.standardMachine = 'FAB1';
      screen.api.recipeInfo.mockResolvedValue(pass({}));
      await screen.getMachineInfo('IMP-1');
      expect(screen.state.recipeList).toEqual([]);
      expect(screen.state.recipe).toBe('');
      expect(screen.state.carryEnabled).toBe(true);
      expect(screen.api.memorization).not.toHaveBeenCalled();
    });
  });

  describe('memorizationRecipe', () => {
    it('does nothing without a selected recipe', async () => {
      const screen = setup();
      await screen.memorizationRecipe();
      expect(screen.api.memorization).not.toHaveBeenCalled();
    });

    it('shows the popup returned by the server', async () => {
      const screen = setup();
      screen.state.recipe = 'R-A';
      screen.api.memorization.mockResolvedValue(pass({ POPUP: 'check recipe' }));
      await screen.memorizationRecipe();
      expect(screen.alert).toHaveBeenCalledWith({ title: '정보', message: 'check recipe' });
    });

    it('shows an error and disables start when memorization fails', async () => {
      const screen = setup();
      screen.state.recipe = 'R-A';
      screen.state.startEnabled = true;
      screen.api.memorization.mockResolvedValue({ ok: false, message: 'memo failed' });
      await screen.memorizationRecipe();
      expect(screen.alert).toHaveBeenCalledWith({ title: '오류', message: 'memo failed' });
      expect(screen.state.startEnabled).toBe(false);
    });

    it('ignores the empty-body message from the server', async () => {
      const screen = setup();
      screen.state.recipe = 'R-A';
      screen.state.startEnabled = true;
      screen.api.memorization.mockResolvedValue({
        ok: false,
        message: 'BODY가 존재하지 않습니다',
      });
      await screen.memorizationRecipe();
      expect(screen.alert).not.toHaveBeenCalled();
      expect(screen.state.startEnabled).toBe(true);
    });
  });

  describe('setPortState', () => {
    it('does nothing when no port is selected', async () => {
      const screen = setup();
      await screen.setPortState();
      expect(screen.api.machinePortStatus).not.toHaveBeenCalled();
    });

    it('shows the port warning message for a busy port', async () => {
      const screen = setup();
      screen.api.machinePortStatus.mockResolvedValue(
        pass({ PORTSTATENAME: 'PENDING', ACKMSG: 'port ack' }),
      );
      await screen.selectPort('1');
      expect(screen.alert).toHaveBeenCalledWith({ title: 'PORT WORNING', message: 'port ack' });
      expect(screen.state.clearPortEnabled).toBe(true);
      expect(screen.state.startEnabled).toBe(false);
    });

    it('warns that the CST is not loaded when the port is idle', async () => {
      const screen = setup();
      screen.api.machinePortStatus.mockResolvedValue(pass({ PORTSTATENAME: 'IDLE' }));
      await screen.selectPort('1');
      expect(screen.alert.mock.calls[0]?.[0].message).toContain('LOAD');
      expect(screen.state.startEnabled).toBe(false);
    });

    it('warns when the port state cannot be read', async () => {
      const screen = setup();
      screen.api.machinePortStatus.mockResolvedValue(pass({}));
      await screen.selectPort('1');
      expect(screen.alert.mock.calls[0]?.[0].message).toContain('PORT 정보를 가져올 수 없습니다');
      expect(screen.state.startEnabled).toBe(false);
    });

    it('enables start and clear for a non-VARIAN ready port', async () => {
      const screen = setup();
      screen.state.searchEqpType = 'OTHER';
      screen.api.machinePortStatus.mockResolvedValue(pass({ PORTSTATENAME: 'READY' }));
      await screen.selectPort('1');
      expect(screen.state.startEnabled).toBe(true);
      expect(screen.state.clearPortEnabled).toBe(true);
    });
  });

  describe('executeClearPort', () => {
    it('asks for a port before clearing', async () => {
      const screen = setup();
      await screen.executeClearPort();
      expect(screen.alert).toHaveBeenCalledWith({
        title: '오류',
        message: '진행 Port를 먼저 선택하세요.',
      });
      expect(screen.confirm).not.toHaveBeenCalled();
    });

    it('does not clear the port when the confirmation is declined', async () => {
      const screen = setup();
      screen.state.port = '1';
      screen.confirm.mockResolvedValue(false);
      await screen.executeClearPort();
      expect(screen.api.machinePortClean).not.toHaveBeenCalled();
    });

    it('shows the error and skips the port refresh when the clear command fails', async () => {
      const screen = setup();
      screen.state.port = '1';
      screen.api.machinePortClean.mockResolvedValue({ ok: false, message: 'clear failed' });
      await screen.executeClearPort();
      expect(screen.alert).toHaveBeenCalledWith({ title: '오류', message: 'clear failed' });
      expect(screen.api.machinePortStatus).not.toHaveBeenCalled();
    });

    it('notifies the clear command and refreshes the port state', async () => {
      const screen = setup();
      screen.state.port = '1';
      await screen.executeClearPort();
      expect(screen.alert).toHaveBeenCalledWith({
        title: 'DOOR OPEN',
        message: '해당 PORT 초기화 명령을 전송하였습니다.',
      });
      expect(screen.api.machinePortStatus).toHaveBeenCalled();
    });
  });

  describe('carry spinners', () => {
    it('clears BAY and STK when carry is unchecked', async () => {
      const screen = setup();
      screen.state.bay = 'B1';
      screen.state.stk = 'S1';
      await screen.setCarry(false);
      expect(screen.state.carry).toBe(false);
      expect(screen.state.bay).toBe('');
      expect(screen.state.stk).toBe('');
      expect(screen.state.oriBay).toBe('B1');
      expect(screen.state.oriStk).toBe('S1');
    });

    it('restores the previous BAY and STK and accepts single-object lists', async () => {
      const screen = setup();
      screen.state.bay = 'B1';
      screen.state.stk = 'S1';
      screen.clearSpinnerInfo();
      screen.api.areaBayInfo.mockResolvedValue(pass({ BAYS: { BAY: 'B1' } }));
      screen.api.bayStockerInfo.mockResolvedValue(pass({ STOCKERS: { STOCKER: 'S1' } }));
      await screen.setBaySpinner();
      expect(screen.state.bayList).toEqual(['B1']);
      expect(screen.state.bay).toBe('B1');
      expect(screen.state.stkList).toEqual(['S1']);
      expect(screen.state.stk).toBe('S1');
    });

    it('shows the error when the BAY lookup fails', async () => {
      const screen = setup();
      screen.api.areaBayInfo.mockResolvedValue({ ok: false, message: 'bay failed' });
      await screen.setBaySpinner();
      expect(screen.alert).toHaveBeenCalledWith({ title: '오류', message: 'bay failed' });
      expect(screen.state.bayList).toEqual([]);
    });

    it('shows the error when the STK lookup fails', async () => {
      const screen = setup();
      screen.state.bay = 'B1';
      screen.api.bayStockerInfo.mockResolvedValue({ ok: false, message: 'stk failed' });
      await screen.setStkSpinner();
      expect(screen.alert).toHaveBeenCalledWith({ title: '오류', message: 'stk failed' });
      expect(screen.state.stkList).toEqual([]);
    });

    it('does not look up STK without a BAY', async () => {
      const screen = setup();
      await screen.setStkSpinner();
      expect(screen.api.bayStockerInfo).not.toHaveBeenCalled();
    });

    it('treats a missing BAY list as empty', async () => {
      const screen = setup();
      screen.api.areaBayInfo.mockResolvedValue(pass({}));
      await screen.setBaySpinner();
      expect(screen.state.bayList).toEqual([]);
    });
  });

  describe('executeStart', () => {
    it.each([
      ['equipment', {}, '진행장비'],
      ['port', { machineName: 'IMP-1' }, 'Port'],
      ['recipe', { machineName: 'IMP-1', port: '1' }, 'Rcp'],
      ['BAY', { machineName: 'IMP-1', port: '1', recipe: 'R-A', carry: true }, 'BAY'],
      [
        'STOCKER',
        { machineName: 'IMP-1', port: '1', recipe: 'R-A', carry: true, bay: 'B1' },
        'STOCKER',
      ],
    ])('requires the %s before starting', async (_name, change, message) => {
      const screen = setup();
      Object.assign(screen.state, change);
      await screen.executeStart();
      expect(screen.alert.mock.calls[0]?.[0].message).toContain(message);
      expect(screen.api.lotInfo).not.toHaveBeenCalled();
      expect(screen.api.impRemoteStart).not.toHaveBeenCalled();
    });

    it('does not start when the recipe confirmation is declined', async () => {
      const screen = setup();
      Object.assign(screen.state, { machineName: 'IMP-1', port: '1', recipe: 'R-A' });
      screen.confirm.mockResolvedValue(false);
      await screen.executeStart();
      expect(screen.api.impRemoteStart).not.toHaveBeenCalled();
      expect(screen.onComplete).not.toHaveBeenCalled();
    });

    it('sends empty BAY and STOCKER when carry is off', async () => {
      const screen = setup();
      Object.assign(screen.state, {
        machineName: 'IMP-1',
        port: '1',
        recipe: 'R-A',
        bay: 'B1',
        stk: 'S1',
      });
      await screen.executeStart();
      expect(screen.api.impRemoteStart).toHaveBeenCalledWith(
        expect.objectContaining({ isCarry: 'N', bay: '', stocker: '' }),
      );
    });

    it('does not complete when the start command fails', async () => {
      const screen = setup();
      Object.assign(screen.state, { machineName: 'IMP-1', port: '1', recipe: 'R-A' });
      screen.api.impRemoteStart.mockResolvedValue({ ok: false, message: 'start failed' });
      await screen.executeStart();
      expect(screen.alert).toHaveBeenCalledWith({ title: '오류', message: 'start failed' });
      expect(screen.onComplete).not.toHaveBeenCalled();
    });
  });

  it('resets the action state in initDisable', () => {
    const screen = setup();
    Object.assign(screen.state, {
      carry: true,
      carryEnabled: true,
      startEnabled: true,
      clearPortEnabled: true,
      commentEnabled: true,
      rfReadCount: 3,
    });
    screen.initDisable();
    expect(screen.state.carry).toBe(false);
    expect(screen.state.carryEnabled).toBe(false);
    expect(screen.state.startEnabled).toBe(false);
    expect(screen.state.clearPortEnabled).toBe(false);
    expect(screen.state.commentEnabled).toBe(false);
    expect(screen.state.rfReadCount).toBe(0);
  });

  it('ignores updateMachineName when the name is unchanged', () => {
    const screen = setup();
    screen.state.machineName = 'IMP-1';
    screen.state.port = '1';
    screen.updateMachineName('IMP-1');
    expect(screen.state.port).toBe('1');
  });
});
