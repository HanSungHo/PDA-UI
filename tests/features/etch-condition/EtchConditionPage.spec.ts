import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { BaseDropdownList, BaseRevoGrid } from 'src/components/base';
import type { BaseRevoGridColumn } from 'src/components/base/revo-grid';
import EtchConditionPage from 'src/features/etch-condition/pages/EtchConditionPage.vue';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

const service = vi.hoisted(() => ({ fetchEtchCondition: vi.fn() }));

vi.mock('src/features/etch-condition/services/etch-condition.service', () => service);

let wrapper: ReturnType<typeof mount>;

async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/main', component: { template: '<div>MAIN</div>' } },
      { path: '/etch', component: EtchConditionPage },
    ],
  });
  await router.push('/main');
  await router.push('/etch');
  await router.isReady();
  wrapper = mount(EtchConditionPage, {
    attachTo: document.body,
    global: { plugins: [createPinia(), router] },
  });
  await flushPromises();
  return router;
}

function button(name: string) {
  const result = wrapper.findAll('button').find((item) => item.text() === name);
  if (!result) throw new Error(`Missing button ${name}`);
  return result;
}

function lotInput() {
  return wrapper.get('input[aria-labelledby]:not([readonly])');
}

function gridColumns(): BaseRevoGridColumn[] {
  return wrapper.getComponent(BaseRevoGrid).props('columns') as BaseRevoGridColumn[];
}

function continuityClass(value: string): unknown {
  const column = gridColumns().find((item) => item.prop === 'CHKCHK');
  const cellProperties = column?.cellProperties as
    | ((detail: { model: Record<string, string> }) => { class: string })
    | undefined;
  return cellProperties?.({ model: { CHKCHK: value } }).class;
}

beforeEach(() => {
  vi.resetAllMocks();
  service.fetchEtchCondition.mockResolvedValue({
    processType: 'DPS POLY',
    operDesc: '4200 DPS POLY / RCP: DP-POLY-07',
    para2nd: '',
    value2nd: '',
    comm2nd: '실비 조건을 확인하세요.',
    hmEen: '',
    rows: [{ CHAMBER: 'A', ETCVALUE: 'SOURCE POWER', CHKCHK: '가능' }],
  });
});

afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = '';
});

describe('EtchConditionPage', () => {
  it('renders the Android title, Machine list, LOT search and a single 취소 action', async () => {
    await render();

    expect(wrapper.get('h1').text()).toBe('ETCH 조건표 조회');
    const machine = wrapper.getComponent(BaseDropdownList);
    expect(machine.props('label')).toBe('Machine');
    expect(machine.props('modelValue')).toBeUndefined();
    expect(machine.props('clearable')).toBe(true);
    expect(machine.props('options')).toHaveLength(9);
    expect(machine.props('options')?.[0]).toEqual({ label: '4E03-21', value: '4E03-21' });
    expect(button('조회').exists()).toBe(true);
    expect(button('취소').exists()).toBe(true);
    expect(wrapper.findAll('.ds-screen__footer button')).toHaveLength(1);
    expect(wrapper.findComponent(BaseRevoGrid).exists()).toBe(false);
    expect(document.activeElement).toBe(lotInput().element);
  });

  it('has no placeholder on Machine or LOT, like the Android layout', async () => {
    await render();

    for (const component of [
      ...wrapper.findAllComponents({ name: 'BaseInput' }),
      ...wrapper.findAllComponents({ name: 'BaseDropdownList' }),
    ]) {
      expect(component.props('placeholder')).toBeUndefined();
    }
  });

  it('searches a scanned LOT on Enter and shows the recipe, comment and chamber grid', async () => {
    await render();

    await lotInput().setValue(' lot-1x');
    await lotInput().trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(service.fetchEtchCondition).toHaveBeenCalledWith('LOT-1', '');
    expect(
      wrapper.findAll('input[readonly]').some((input) => {
        const element = input.element as HTMLInputElement;
        return element.value === '4200 DPS POLY / RCP: DP-POLY-07';
      }),
    ).toBe(true);
    expect(wrapper.get('.etch-condition__comment').text()).toBe('실비 조건을 확인하세요.');
    expect(gridColumns().map((column) => column.name)).toEqual([
      'CH',
      'PARA',
      'BASE',
      '변경',
      '현재값',
      '연속',
    ]);
    expect(continuityClass('가능')).toBe('etch-condition__cell--possible');
    expect(continuityClass('불가')).toBe('etch-condition__cell--impossible');
    expect(continuityClass('')).toBe('etch-condition__cell--continuity');
  });

  it('scans on the native-enter event only while the LOT field has focus', async () => {
    await render();

    await lotInput().setValue(' lot-2x');
    (document.querySelector('.ds-screen__footer button') as HTMLElement).focus();
    window.dispatchEvent(new Event(NATIVE_ENTER_EVENT));
    await flushPromises();
    expect(service.fetchEtchCondition).not.toHaveBeenCalled();

    (lotInput().element as HTMLInputElement).focus();
    window.dispatchEvent(new Event(NATIVE_ENTER_EVENT));
    await flushPromises();
    expect(service.fetchEtchCondition).toHaveBeenCalledWith('LOT-2', '');
  });

  it('sends the selected machine and a blank one after it is cleared', async () => {
    await render();
    const machine = wrapper.getComponent(BaseDropdownList);
    await lotInput().setValue('LOT-1');

    machine.vm.$emit('update:modelValue', '5E03-25');
    await button('조회').trigger('click');
    await flushPromises();
    expect(service.fetchEtchCondition).toHaveBeenLastCalledWith('LOT-1', '5E03-25');
    expect(machine.props('modelValue')).toBe('5E03-25');

    machine.vm.$emit('update:modelValue', undefined);
    await button('조회').trigger('click');
    await flushPromises();
    expect(service.fetchEtchCondition).toHaveBeenLastCalledWith('LOT-1', '');
  });

  it('switches to the COL / VALUE grid for TE8500', async () => {
    service.fetchEtchCondition.mockResolvedValueOnce({
      processType: 'TE8500',
      operDesc: '',
      para2nd: '',
      value2nd: '',
      comm2nd: '',
      hmEen: '',
      rows: [{ COL: 'GAP', VALUE: '0.85' }],
    });
    await render();

    await lotInput().setValue('LOT-1');
    await button('조회').trigger('click');
    await flushPromises();

    expect(gridColumns().map((column) => column.name)).toEqual(['COL', 'VALUE']);
  });

  it('asks for a LOT in a dialog when 조회 is pressed with an empty field', async () => {
    await render();

    await button('조회').trigger('click');
    await flushPromises();

    expect(document.body.textContent).toContain('LOT을 입력하여 주세요.');
    expect(service.fetchEtchCondition).not.toHaveBeenCalled();
  });

  it('returns to the previous screen on 취소', async () => {
    const router = await render();

    await button('취소').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/main');
  });
});
