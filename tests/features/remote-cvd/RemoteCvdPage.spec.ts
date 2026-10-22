import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type * as VueRouter from 'vue-router';

const { route, router, mainStore } = vi.hoisted(() => ({
  route: {
    query: { LOTID: 'CVD-MOCK-001', mock: '1' } as Record<string, string>,
    name: 'remote-cvd',
  },
  router: { push: vi.fn(), back: vi.fn(), replace: vi.fn(), options: { history: { state: {} } } },
  mainStore: { facility: 'GUMI', operatorId: 'OP-01' },
}));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router');
  return { ...actual, useRoute: () => route, useRouter: () => router };
});
vi.mock('src/features/main/stores/main.store', () => ({ useMainStore: () => mainStore }));
vi.mock('src/features/remote-cvd/services/remote-cvd.service', async () => {
  const { remoteCvdTestApi } = await import('./remote-cvd-test-api');
  return { remoteCvdApi: remoteCvdTestApi };
});
import RemoteCvdPage from '../../../src/features/remote-cvd/pages/RemoteCvdPage.vue';
import { remoteCvdTestApi } from './remote-cvd-test-api';

const InputStub = {
  props: ['id', 'label', 'modelValue', 'disabled'],
  emits: ['update:modelValue', 'keydown'],
  template:
    '<label>{{ label }}<input :id="id" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown="$emit(\'keydown\', $event)" /></label>',
};
const DropdownStub = {
  props: ['id', 'label', 'ariaLabel', 'modelValue', 'options', 'disabled'],
  emits: ['change'],
  template:
    '<label>{{ label }}<select :id="id" :aria-label="ariaLabel || label" :value="modelValue" :disabled="disabled" @change="$emit(\'change\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>',
};
const ButtonStub = {
  props: ['disabled'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
};
const CheckboxStub = {
  props: ['modelValue', 'label'],
  emits: ['update:modelValue'],
  template:
    '<label><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />{{ label }}</label>',
};
const ModalStub = {
  props: ['open', 'title'],
  template: '<section v-if="open"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>',
};
const RemoteEtchCommRcpModalStub = {
  props: ['modelValue', 'inboundParams'],
  emits: ['update:modelValue', 'close'],
  template:
    '<section v-if="modelValue" role="dialog"><span>{{ inboundParams.LOTID }} {{ inboundParams.EQPID }} {{ inboundParams.RECIPE }} {{ inboundParams.OPERID }} {{ inboundParams.OPERDESC }}</span><button @click="$emit(\'close\')">닫기</button></section>',
};

function createPage() {
  return mount(RemoteCvdPage, {
    global: {
      stubs: {
        BaseInput: InputStub,
        BaseDropdownList: DropdownStub,
        BaseButton: ButtonStub,
        BaseCheckbox: CheckboxStub,
        BaseLoading: { template: '<span role="status">Loading</span>' },
        BaseModal: ModalStub,
        QCard: { template: '<section class="q-card"><slot /></section>' },
        QIcon: { template: '<i aria-hidden="true" />' },
        QToolbar: { template: '<header class="q-toolbar"><slot /></header>' },
        RemoteRecipeDialog: { template: '<div />' },
        RemoteEtchCommRcpModal: RemoteEtchCommRcpModalStub,
      },
    },
  });
}

describe('RemoteCvdPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.query = { LOTID: 'CVD-MOCK-001', mock: '1' };
    route.name = 'remote-cvd';
  });

  it('loads the LOT mock and renders the Android header and main controls', async () => {
    const wrapper = createPage();
    await flushPromises();

    expect(wrapper.get('#remote-cvd-title').text()).toBe('Remote Start');
    expect(wrapper.text()).toContain('LOT No.');
    expect(wrapper.text()).toContain('PORT 상태');
    expect(wrapper.text()).toContain('진행장비');
    expect(wrapper.text()).toContain('진행 RCP');
    expect(wrapper.text()).toContain('DOOR OPEN');
    expect(wrapper.text()).toContain('RESTART');
    const chambers = wrapper.findAll('.remote-cvd__chamber');
    expect(chambers).toHaveLength(4);
    expect(chambers.every((chamber) => chamber.element.style.display === 'none')).toBe(true);
    expect((wrapper.get('#remote-cvd-lot').element as HTMLInputElement).value).toBe('CVD-MOCK-001');
    expect((wrapper.get('#remote-cvd-comment-count').element as HTMLInputElement).value).toBe(
      '2 개',
    );
  });

  it('submits the equipment barcode on Enter and opens the nested Comment List route', async () => {
    const wrapper = createPage();
    await flushPromises();

    const equipmentInput = wrapper.get('#remote-cvd-equipment');
    await equipmentInput.setValue('EQP-CVD01X');
    await equipmentInput.trigger('keydown.enter');
    await flushPromises();

    expect(wrapper.text()).toContain('CVD:RECIPE-A');
    await wrapper.get('#remote-cvd-port').setValue('1');
    await nextTick();
    await wrapper.get('.remote-cvd__comment-read').trigger('click');

    expect(router.push).toHaveBeenCalledWith({
      path: '/remote-cvd/comment-list',
      query: {
        lotId: 'CVD-MOCK-001',
        operation: '10020',
        subOperation: '00',
        processStep: 'CVD PROCESS',
        operSequence: '10',
        facility: 'GUMI',
        mock: '1',
      },
    });
  });

  it('opens the RCP Conditions child with legacy context and returns to the parent state', async () => {
    const wrapper = createPage();
    await flushPromises();

    const equipmentInput = wrapper.get('#remote-cvd-equipment');
    await equipmentInput.setValue('EQP-CVD01X');
    await equipmentInput.trigger('keydown.enter');
    await flushPromises();

    await wrapper.get('.remote-cvd__rcp-conditions').trigger('click');
    await nextTick();

    const childDialog = wrapper.get('[role="dialog"]');
    expect(childDialog.get('span').text()).toBe(
      'CVD-MOCK-001 CVD-MAIN-01 CVD:RECIPE-A 10020 CVD PROCESS',
    );

    await childDialog.get('button').trigger('click');
    await nextTick();

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect((wrapper.get('#remote-cvd-equipment').element as HTMLInputElement).value).toBe('CVD01');
  });

  it('keeps the legacy conditional precede controls without adding a visible dropdown label', async () => {
    vi.spyOn(remoteCvdTestApi, 'memorization').mockResolvedValue({
      isSuccess: true,
      messageBody: { PRECEDE_FLAG: 'PT주기' },
      errorMessage: '',
    });
    const wrapper = createPage();
    await flushPromises();

    await wrapper.get('#remote-cvd-equipment').setValue('EQP-CVD01X');
    await wrapper.get('#remote-cvd-equipment').trigger('keydown.enter');
    await flushPromises();

    const precedeDropdown = wrapper.get('#remote-cvd-precede-type');
    expect(precedeDropdown.attributes('aria-label')).toBe('선행 구분');
    expect(precedeDropdown.element.parentElement?.textContent).not.toContain('선행 구분');
    expect(wrapper.get('.remote-cvd__precede').attributes('aria-label')).toBe('선행 조건');
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(3);
  });
});
