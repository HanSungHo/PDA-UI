import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

const { fetchDiffEqpDataInfo, fetchEqpParameters, insertParameter } = vi.hoisted(() => ({
  fetchDiffEqpDataInfo: vi.fn(),
  fetchEqpParameters: vi.fn(),
  insertParameter: vi.fn(),
}));

const { okDialogShow } = vi.hoisted(() => ({
  okDialogShow: vi.fn(),
}));

const routerBack = vi.fn();
const routerReplace = vi.fn();
let routeQuery: Record<string, string> = {};

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({ back: routerBack, replace: routerReplace }),
}));

vi.mock('src/features/diff-inst-parameter/services/diff-inst-parameter.service', () => ({
  fetchDiffEqpDataInfo,
  fetchEqpParameters,
  insertParameter,
}));

vi.mock('src/services/ok-dialog.service', () => ({
  okDialog: {
    show: okDialogShow,
  },
}));

const { default: DiffInstParameterPage } =
  await import('src/features/diff-inst-parameter/pages/DiffInstParameterPage.vue');

const pageCss = readFileSync(
  join(process.cwd(), 'src/features/diff-inst-parameter/pages/DiffInstParameterPage.css'),
  'utf8',
);

const lotInfo = {
  lotProcessState: 'RUN',
  batchId: 'BAT202048248',
  machineName: 'DIFF-01',
  processOperationName: '2200',
  reUpdate: 'N',
};

const parameters = [
  { no: '1', para: 'CD', min: '0.10', max: '0.15', data: '' },
  { no: '2', para: 'THK', min: '520', max: '560', data: '' },
  { no: '3', para: 'OVL-X', min: '-0.2', max: '-0.2', data: '' },
  { no: '4', para: 'OVL-Y', min: '-0.2', max: '0.2', data: '' },
  { no: '5', para: 'FOCUS', min: '-3', max: '3', data: '' },
  { no: '6', para: 'DOSE', min: '18', max: '22', data: '' },
  { no: '7', para: 'SHIFT', min: '-5', max: '5', data: '' },
  { no: '8', para: 'ALIGN', min: '0', max: '10', data: '' },
];

const BaseRevoGridStub = defineComponent({
  name: 'BaseRevoGrid',
  props: {
    rows: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
  },
  setup(props) {
    return () =>
      h('div', { 'data-testid': 'base-revo-grid-stub', class: 'base-revo-grid-stub' }, [
        h(
          'div',
          { 'data-testid': 'grid-header' },
          (props.columns as Array<Record<string, unknown>>).map((column) =>
            h('span', { 'data-testid': 'grid-column' }, String(column.name ?? '')),
          ),
        ),
        ...(props.rows as Array<Record<string, unknown>>).map((row) =>
          h(
            'div',
            { 'data-testid': 'grid-row' },
            (props.columns as Array<Record<string, unknown>>).map((column) => {
              const cellTemplate = column.cellTemplate as
                | ((createElement: typeof h, detail: { model: Record<string, unknown> }) => unknown)
                | undefined;
              if (cellTemplate) return cellTemplate(h, { model: row }) as ReturnType<typeof h>;

              return h('span', String(row[String(column.prop)] ?? ''));
            }),
          ),
        ),
      ]);
  },
});

function mountPage() {
  return mount(DiffInstParameterPage, {
    attachTo: document.body,
    global: { stubs: { BaseRevoGrid: BaseRevoGridStub, teleport: true } },
  });
}

describe('DiffInstParameterPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    routeQuery = {};
    routerBack.mockReset();
    routerReplace.mockReset();
    fetchDiffEqpDataInfo.mockResolvedValue({ ok: true, data: { ...lotInfo } });
    fetchEqpParameters.mockResolvedValue({
      ok: true,
      getDate: 'Y',
      items: structuredClone(parameters),
    });
    insertParameter.mockResolvedValue({ ok: true, machineState: '' });
    okDialogShow.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    fetchDiffEqpDataInfo.mockReset();
    fetchEqpParameters.mockReset();
    insertParameter.mockReset();
  });

  it('auto loads query lotId and renders equipment parameter rows', async () => {
    routeQuery = { lotId: 'LOT-DIFF-001' };

    const wrapper = mountPage();
    await flushPromises();

    expect(fetchDiffEqpDataInfo).toHaveBeenCalledWith('LOT-DIFF-001');
    expect(fetchEqpParameters).toHaveBeenCalledWith({
      machineName: 'DIFF-01',
      facility: '',
    });
    expect(wrapper.text()).toContain('DIFF 계측 PARAMETER 입력');
    expect((wrapper.get('[aria-label="BATCHID"]').element as HTMLInputElement).value).toBe(
      'BAT202048248',
    );
    expect((wrapper.get('[aria-label="MACHINENAME"]').element as HTMLInputElement).value).toBe(
      'DIFF-01',
    );
    expect(
      (wrapper.get('[aria-label="PROCESSOPERATIONNAME"]').element as HTMLInputElement).value,
    ).toBe('2200');
    expect(wrapper.text()).toContain('CD');
    expect(wrapper.text()).toContain('THK');
    expect(wrapper.text()).toContain('ALIGN');
    expect(wrapper.findComponent(BaseRevoGridStub).exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="grid-row"]')).toHaveLength(8);
    expect(wrapper.findAll('.ds-table-cell')).toHaveLength(0);
    expect(
      wrapper
        .findAll('.diff-inst-parameter__data-input input')
        .every((input) => input.attributes('placeholder') === undefined),
    ).toBe(true);
    expect(wrapper.find('.diff-inst-parameter__scroll-indicator').exists()).toBe(false);
    expect(wrapper.get('[data-testid="diff-inst-save"]').attributes('disabled')).toBeUndefined();

    wrapper.unmount();
  });

  it('ignores uppercase LOTID query on mount', async () => {
    routeQuery = { LOTID: 'LOT-DIFF-001' };

    const wrapper = mountPage();
    await flushPromises();

    expect(fetchDiffEqpDataInfo).not.toHaveBeenCalled();
    expect(
      (wrapper.get('.diff-inst-parameter__lot-input input').element as HTMLInputElement).value,
    ).toBe('');

    wrapper.unmount();
  });

  it('matches legacy LOT and grid input labels', async () => {
    routeQuery = { lotId: 'LOT-DIFF-001' };

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('LOT NO');
    expect(wrapper.find('.diff-inst-parameter__readonly .q-field__label').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="grid-column"]').map((column) => column.text())).toEqual([
      'NO',
      'PARA',
      'MIN',
      'MAX',
      'DATA',
    ]);
    expect(
      wrapper
        .findAll('.diff-inst-parameter__data-input input')
        .every((input) => input.attributes('type') === 'number'),
    ).toBe(true);

    wrapper.unmount();
  });

  it('parses barcode style LOT input before searching on native enter', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const lotInput = wrapper.get('.diff-inst-parameter__lot-input input');

    await lotInput.setValue(' LOT-DIFF-002X');
    (lotInput.element as HTMLInputElement).focus();
    window.dispatchEvent(new CustomEvent('native-enter'));
    await flushPromises();

    expect(fetchDiffEqpDataInfo).toHaveBeenCalledWith('LOT-DIFF-002');
    expect(
      (wrapper.get('.diff-inst-parameter__lot-input input').element as HTMLInputElement).value,
    ).toBe('LOT-DIFF-002');

    wrapper.unmount();
  });

  it('searches directly on manual keyboard enter without barcode parsing', async () => {
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('.diff-inst-parameter__lot-input input').setValue('lot-diff-002');
    await wrapper.get('.diff-inst-parameter__lot-input input').trigger('keyup.enter');
    await flushPromises();

    expect(fetchDiffEqpDataInfo).toHaveBeenCalledWith('LOT-DIFF-002');
    expect(okDialogShow).not.toHaveBeenCalled();
    expect(
      (wrapper.get('.diff-inst-parameter__lot-input input').element as HTMLInputElement).value,
    ).toBe('LOT-DIFF-002');

    wrapper.unmount();
  });

  it('clears summary data when barcode native enter fails to return a LOT', async () => {
    const wrapper = mountPage();
    await flushPromises();
    const lotInput = wrapper.get('.diff-inst-parameter__lot-input input');

    await lotInput.setValue('LOT-DIFF-001');
    await wrapper.get('.diff-inst-parameter__search-button').trigger('click');
    await flushPromises();

    expect((wrapper.get('[aria-label="BATCHID"]').element as HTMLInputElement).value).toBe(
      'BAT202048248',
    );

    fetchDiffEqpDataInfo.mockClear();
    await lotInput.setValue('X');
    (lotInput.element as HTMLInputElement).focus();
    window.dispatchEvent(new CustomEvent('native-enter'));
    await flushPromises();

    expect(fetchDiffEqpDataInfo).not.toHaveBeenCalled();
    expect(okDialogShow).toHaveBeenCalledWith('READING ERROR', 'LOT#를 읽어주세요.', '확인');
    expect((wrapper.get('[aria-label="BATCHID"]').element as HTMLInputElement).value).toBe('');
    expect(
      (wrapper.get('.diff-inst-parameter__lot-input input').element as HTMLInputElement).value,
    ).toBe('');

    wrapper.unmount();
  });

  it('syncs the lotId query after searching a different lot successfully', async () => {
    routeQuery = { lotId: 'LOT-OLD-001' };
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('.diff-inst-parameter__lot-input input').setValue('lot-new-002');
    await wrapper.get('.diff-inst-parameter__search-button').trigger('click');
    await flushPromises();

    expect(fetchDiffEqpDataInfo).toHaveBeenLastCalledWith('LOT-NEW-002');
    expect(routerReplace).toHaveBeenCalledWith({
      query: { lotId: 'LOT-NEW-002' },
    });

    wrapper.unmount();
  });

  it('uses the base grid without rendering an extra page scroll indicator', async () => {
    routeQuery = { lotId: 'LOT-DIFF-001' };
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.diff-inst-parameter__scroll-indicator').exists()).toBe(false);
    expect(wrapper.getComponent(BaseRevoGridStub).element.parentElement?.classList).toContain(
      'diff-inst-parameter__grid-card',
    );

    wrapper.unmount();
  });

  it('keeps the search icon and parameter table column sizes', () => {
    const wrapper = mountPage();

    expect(wrapper.find('.diff-inst-parameter__lot-input .q-icon').exists()).toBe(true);
    expect(pageCss).toContain('.diff-inst-parameter__grid');
    expect(pageCss).not.toContain('--revo-grid-');
    expect(pageCss).not.toContain('width: 180px;');

    wrapper.unmount();
  });

  it('uses BaseScreen with shared cards and footer actions', () => {
    const wrapper = mountPage();

    expect(wrapper.getComponent({ name: 'BaseScreen' }).props('title')).toBe(
      'DIFF 계측 PARAMETER 입력',
    );
    expect(wrapper.findAll('.ds-screen__card')).toHaveLength(2);
    expect(wrapper.get('.ds-screen__header h1').text()).toBe('DIFF 계측 PARAMETER 입력');
    expect(wrapper.get('.ds-screen__footer').text()).toContain('저장');
    expect(wrapper.get('.ds-screen__footer').text()).toContain('취소');
    expect(pageCss).not.toContain('--base-revo-grid-');

    wrapper.unmount();
  });

  it('uses base loading while parameter data is loading', async () => {
    let resolveLotInfo: (value: { ok: boolean; data: typeof lotInfo }) => void = () => {};
    fetchDiffEqpDataInfo.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLotInfo = resolve;
      }),
    );
    routeQuery = { lotId: 'LOT-DIFF-001' };

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.ds-loading').exists()).toBe(true);

    resolveLotInfo({ ok: true, data: { ...lotInfo } });
    await flushPromises();

    expect(wrapper.find('.ds-loading').exists()).toBe(false);

    wrapper.unmount();
  });

  it('does not show the scroll indicator when no parameter rows exist', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[data-testid="base-revo-grid-stub"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="diff-inst-empty-state"]').exists()).toBe(true);
    expect(
      wrapper.find('[data-testid="diff-inst-empty-state"] .ds-empty-state__icon').exists(),
    ).toBe(true);
    expect(wrapper.find('[data-testid="diff-inst-empty-state"]').text()).toContain('EMPTY');
    expect(wrapper.find('[data-testid="diff-inst-empty-state"]').text()).toContain(
      '해당 결과가 없습니다',
    );
    expect(wrapper.find('.diff-inst-parameter__scroll-indicator').exists()).toBe(false);

    wrapper.unmount();
  });

  it('keeps summary fields readonly without forcing blur on focus', async () => {
    routeQuery = { lotId: 'LOT-DIFF-001' };

    const wrapper = mountPage();
    await flushPromises();

    for (const label of ['BATCHID', 'MACHINENAME', 'PROCESSOPERATIONNAME']) {
      const input = wrapper.get(`[aria-label="${label}"]`).element as HTMLInputElement;
      expect(input.readOnly).toBe(true);
      input.focus();
      await flushPromises();

      expect(document.activeElement).toBe(input);
    }

    wrapper.unmount();
  });

  it('blocks parameter loading when LOT is not RUN', async () => {
    fetchDiffEqpDataInfo.mockResolvedValueOnce({
      ok: true,
      data: { ...lotInfo, lotProcessState: 'WAIT' },
    });
    routeQuery = { lotId: 'LOT-WAIT-001' };

    const wrapper = mountPage();
    await flushPromises();

    expect(fetchEqpParameters).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('선측정 불가');
    expect(wrapper.text()).toContain('MOVE IN 후에만 DATA 입력이 가능합니다.');
    expect(
      (wrapper.get('.diff-inst-parameter__lot-input input').element as HTMLInputElement).value,
    ).toBe('');
    expect(wrapper.get('[data-testid="diff-inst-save"]').attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });

  it('requires DATA values before inserting parameters', async () => {
    routeQuery = { lotId: 'LOT-DIFF-001' };
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('[data-testid="diff-inst-save"]').trigger('click');
    await flushPromises();

    expect(insertParameter).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('모든 Parameter에 대해, 계측값을 입력하시기 바랍니다');

    wrapper.unmount();
  });

  it('shows the required LOT message in a persistent BaseModal', async () => {
    const wrapper = mountPage();
    await wrapper.get('.diff-inst-parameter__search-button').trigger('click');

    const dialog = wrapper.getComponent({ name: 'BaseModal' });
    expect(dialog.props()).toMatchObject({
      open: true,
      title: '에  러',
      closable: false,
      backClosable: false,
      overlayClosable: false,
    });
    expect(dialog.text()).toContain('LOT을 입력하세요.');
    expect(wrapper.find('[data-testid="diff-inst-dialog-cancel"]').exists()).toBe(false);
    await wrapper.get('[data-testid="diff-inst-dialog-ok"]').trigger('click');
    expect(dialog.props('open')).toBe(false);
    expect(fetchDiffEqpDataInfo).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it.each([true, false])(
    'waits for re-entry confirmation before loading parameters: %s',
    async (accept) => {
      routeQuery = { lotId: 'LOT-DIFF-001' };
      fetchDiffEqpDataInfo.mockResolvedValueOnce({
        ok: true,
        data: { ...lotInfo, reUpdate: '2026-11-09' },
      });
      const wrapper = mountPage();
      await flushPromises();

      expect(fetchEqpParameters).not.toHaveBeenCalled();
      expect(wrapper.getComponent({ name: 'BaseModal' }).props('title')).toBe('확  인');
      expect(wrapper.text()).toContain('[2026-11-09]에 이미 데이터가 입력 되었습니다.');
      expect(wrapper.text()).toContain('데이터를 다시 입력하시겠습니까?');
      expect(wrapper.get('[data-testid="diff-inst-dialog-cancel"]').text()).toBe('아니오');
      expect(wrapper.get('[data-testid="diff-inst-dialog-ok"]').text()).toBe('예');
      await wrapper
        .get(`[data-testid="diff-inst-dialog-${accept ? 'ok' : 'cancel'}"]`)
        .trigger('click');
      await flushPromises();

      expect(wrapper.getComponent({ name: 'BaseModal' }).props('open')).toBe(false);
      if (accept) {
        expect(fetchEqpParameters).toHaveBeenCalledWith({ machineName: 'DIFF-01', facility: '' });
      } else {
        expect(fetchEqpParameters).not.toHaveBeenCalled();
        expect(
          (wrapper.get('.diff-inst-parameter__lot-input input').element as HTMLInputElement).value,
        ).toBe('');
      }
      wrapper.unmount();
    },
  );

  it('inserts parameter values and clears the screen after success dialog closes', async () => {
    const mainStore = useMainStore();
    mainStore.operatorId = 'OP10023';
    mainStore.facility = 'KFAB';
    routeQuery = { lotId: 'LOT-DIFF-001' };
    const wrapper = mountPage();
    await flushPromises();

    const dataInputs = wrapper.findAll('.diff-inst-parameter__data-input input');
    await dataInputs[0]!.setValue('0.12');
    await dataInputs[1]!.setValue('540');
    await dataInputs[2]!.setValue('-0.2');
    await dataInputs[3]!.setValue('0.1');
    await dataInputs[4]!.setValue('1');
    await dataInputs[5]!.setValue('20');
    await dataInputs[6]!.setValue('2');
    await dataInputs[7]!.setValue('8');
    await wrapper.get('[data-testid="diff-inst-save"]').trigger('click');
    await flushPromises();

    expect(insertParameter).toHaveBeenCalledWith({
      userId: 'OP10023',
      batchId: 'BAT202048248',
      machineName: 'DIFF-01',
      facility: 'KFAB',
      eqpPara: '0.12|540|-0.2|0.1|1|20|2|8',
      eqpParaNo: '1|2|3|4|5|6|7|8',
      eqpParaMax: '0.15|560|-0.2|0.2|3|22|5|10',
    });
    expect(wrapper.text()).toContain('완료');
    expect(wrapper.text()).toContain('정상 입력 되었습니다.');

    await wrapper.get('[data-testid="diff-inst-dialog-ok"]').trigger('click');
    await flushPromises();

    expect(
      (wrapper.get('.diff-inst-parameter__lot-input input').element as HTMLInputElement).value,
    ).toBe('');
    expect(wrapper.find('[data-testid="base-revo-grid-stub"]').exists()).toBe(false);

    wrapper.unmount();
  });
});
