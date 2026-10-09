import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { QIcon } from 'quasar';
import { BaseDropdownList, BaseEmptyState, BaseRevoGrid } from 'src/components/base';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import { useMainStore } from '../../../src/features/main/stores/main.store';
import {
  type RemoteFurnaceKecOptions,
  useRemoteFurnaceKec,
} from '../../../src/features/remote-furnace-kec/composables/use-remote-furnace-kec';
import RemoteFurnaceKecPage from '../../../src/features/remote-furnace-kec/pages/RemoteFurnaceKecPage.vue';

vi.mock('../../../src/features/remote-furnace-kec/composables/use-remote-furnace-kec', () => ({
  useRemoteFurnaceKec: vi.fn(),
}));

vi.mock('@revolist/vue3-datagrid', () => ({
  default: {
    name: 'RevoGrid',
    template: '<div />',
  },
}));

const BaseModalStub = defineComponent({
  props: { open: { type: Boolean, required: true }, title: { type: String, default: '' } },
  emits: ['cancel', 'update:open'],
  setup(props, { slots }) {
    return () =>
      props.open
        ? h('section', { role: 'dialog', 'aria-label': props.title }, [
            h('h2', props.title),
            slots.default?.(),
            slots.footer?.(),
          ])
        : null;
  },
});

const recipeDialogStub = defineComponent({
  props: {
    modelValue: { type: Boolean, required: true },
    recipeList: { type: String, default: '' },
    lotNo: { type: String, default: '' },
  },
  emits: ['update:modelValue', 'confirm', 'cancel'],
  setup(props, { emit }) {
    return () =>
      props.modelValue
        ? h('section', { 'data-testid': 'recipe-confirm' }, [
            h('span', props.recipeList),
            h('span', props.lotNo),
            h('button', { onClick: () => emit('confirm') }, '확인'),
            h('button', { onClick: () => emit('cancel') }, '취소'),
          ])
        : null;
  },
});

const exampleRow = {
  LOTID: 'LOT-ROW',
  COMMENTQTY: '1',
  STATUS: 'WAIT',
  PROCESSSTEP: 'STEP-1',
  PRODUCT: 'PRODUCT-1',
  QUANTITY: '20',
  ERRORMESSAGE: '',
  OPERATION: 'OP-1',
  SUBOPERATION: 'SUB-1',
  LOTSTATE: 'WIP',
  NWCOMMENTQTY: '0',
  OPERSEQUENCE: '2',
  PROCESSNAME: 'NORMAL',
};

let providedOptions: RemoteFurnaceKecOptions | undefined;

function getProvidedOptions(): RemoteFurnaceKecOptions {
  if (!providedOptions) throw new Error('KEC page options were not captured');
  return providedOptions;
}

function createScreenHarness(overrides: Partial<ReturnType<typeof useRemoteFurnaceKec>> = {}) {
  const refValue = <T>(value: T) => ({ value });
  const availability = {
    clearPort: false,
    start: true,
    restart: false,
    enter: false,
    enterStart: false,
  };
  const screen = {
    availability,
    batchId: refValue('BATCH-1'),
    dummyMode: refValue('F'),
    equipmentId: refValue(''),
    externalMachine: refValue('EXT-1'),
    getINLKChk: vi.fn(async () => undefined),
    getFurnaceLotTarget: vi.fn(async () => 'KEC'),
    getLotInfo: vi.fn(async () => undefined),
    handleEquipmentEnter: vi.fn(async () => undefined),
    initialize: vi.fn(async () => undefined),
    isNonLot: refValue(false),
    isRecipeChanged: refValue(false),
    isStandardEquipmentChanged: refValue(false),
    loading: refValue(false),
    lotId: refValue('WP00001'),
    lotLocked: refValue(true),
    mwfOptions: ['1', '2', '3', '4', '5', '6'],
    mwfPosition: refValue(2),
    operSequence: refValue('2'),
    operation: refValue('OP-1'),
    operationType: refValue('M'),
    portOptions: refValue(['PORT-1']),
    portState: refValue('IDLE'),
    processStep: refValue('STEP-1'),
    product: refValue('PRODUCT-1'),
    recipe: refValue('BASE-RCP'),
    recipeOptions: refValue(['RUN-RCP']),
    refreshPortState: vi.fn(async () => undefined),
    restartMode: refValue(false),
    rows: refValue([exampleRow]),
    selectRow: vi.fn(),
    selectedMwf: refValue('2'),
    selectedPort: refValue('PORT-1'),
    selectedRecipe: refValue('RUN-RCP'),
    selectedRowId: refValue(''),
    setPortState: vi.fn(async () => undefined),
    standardEquipment: refValue('GROUP'),
    subOperation: refValue('SUB-1'),
    executeClearPort: vi.fn(async () => undefined),
    executeCommand: vi.fn(async () => undefined),
    checkRecipeInterlock: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as ReturnType<typeof useRemoteFurnaceKec>;

  vi.mocked(useRemoteFurnaceKec).mockImplementation((options) => {
    providedOptions = options;
    return screen;
  });
  return screen;
}

describe('RemoteFurnaceKecPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps empty fields blank and preserves the HTML empty state and NONLOT labels', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    createScreenHarness({
      lotId: { value: '' },
      batchId: { value: '' },
      recipe: { value: '' },
      standardEquipment: { value: '' },
      selectedRecipe: { value: null },
      portOptions: { value: [] },
      rows: { value: [] },
      isNonLot: { value: true },
    } as unknown as Partial<ReturnType<typeof useRemoteFurnaceKec>>);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/furnace-remote', component: RemoteFurnaceKecPage }],
    });
    await router.push('/furnace-remote');
    const wrapper = mount(RemoteFurnaceKecPage, {
      global: {
        plugins: [pinia, router],
        stubs: { BaseModal: BaseModalStub, RemoteRecipeDialog: recipeDialogStub },
      },
    });
    try {
      await flushPromises();
      for (const id of [
        'kec-lot',
        'kec-batch',
        'kec-recipe',
        'kec-standard-machine',
        'kec-equipment',
      ]) {
        expect(wrapper.get(`#${id}`).element).toHaveProperty('value', '');
      }
      expect(wrapper.find('[placeholder="Null"]').exists()).toBe(false);
      expect(wrapper.text()).not.toContain('Null');
      expect(wrapper.text()).toContain('EMPTY');
      expect(wrapper.text()).toContain('해당 결과가 없습니다');
      expect(wrapper.getComponent(BaseEmptyState).getComponent(QIcon).props('name')).toBe(
        'sym_o_info',
      );
      expect(wrapper.text()).toContain('NO BATCH');
      expect(wrapper.text()).toContain('온도설정');
      expect(wrapper.find('#kec-port').exists()).toBe(false);
      expect(wrapper.findAllComponents(BaseDropdownList)).toHaveLength(2);
    } finally {
      wrapper.unmount();
    }
  });

  it('renders legacy controls, initializes LOT, validates selections, and preserves the comment route contract', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    providedOptions = undefined;
    const mainStore = useMainStore();
    mainStore.$patch({ facility: 'FAB1', operatorId: 'OP-1', operatorName: 'Operator' });
    const screen = createScreenHarness();
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/furnace-remote', component: RemoteFurnaceKecPage },
        { path: '/comment-list', component: { template: '<div />' } },
        { path: '/esheet', component: { template: '<div />' } },
      ],
    });
    await router.push('/furnace-remote?LOTID=WP00001');
    await router.isReady();

    const wrapper = mount(RemoteFurnaceKecPage, {
      global: {
        plugins: [pinia, router],
        stubs: { BaseModal: BaseModalStub, RemoteRecipeDialog: recipeDialogStub },
      },
    });
    try {
      await flushPromises();
      expect(screen.initialize).toHaveBeenCalledOnce();
      expect(wrapper.get('h1').text()).toBe('KEC Furnace 자동화');
      expect(wrapper.text()).toContain('진행 RCP');
      expect(wrapper.text()).toContain('BATCH');
      expect(wrapper.text()).toContain('기준장비');
      expect(wrapper.text()).toContain('MWF');
      expect(wrapper.text()).toContain('ENTER + START');

      const dropdowns = wrapper.findAllComponents(BaseDropdownList);
      dropdowns[0]!.vm.$emit('update:modelValue', 'RUN-RCP');
      dropdowns[0]!.vm.$emit('change', 'RUN-RCP');
      expect(screen.checkRecipeInterlock).toHaveBeenCalledOnce();
      dropdowns[2]!.vm.$emit('update:modelValue', 'PORT-1');
      dropdowns[2]!.vm.$emit('change', 'PORT-1');
      expect(screen.refreshPortState).toHaveBeenCalledOnce();
      await wrapper.get('#kec-equipment').setValue('EQP-MACHINE1*');
      await wrapper.get('#kec-equipment').trigger('keyup.enter');
      expect(screen.handleEquipmentEnter).toHaveBeenCalledWith('EQP-MACHINE1*');

      const grid = wrapper.getComponent(BaseRevoGrid);
      expect(grid.props('rows')).toEqual([exampleRow]);
      expect(grid.props('rowKey')).toBe('LOTID');
      expect(grid.props('selectedRowKey')).toBe('');
      expect(grid.props('columns').map((column) => column.prop)).toEqual([
        'LOTID',
        'COMMENTQTY',
        'STATUS',
        'PROCESSSTEP',
        'PRODUCT',
        'QUANTITY',
        'ERRORMESSAGE',
        'OPERATION',
        'SUBOPERATION',
        'LOTSTATE',
        'NWCOMMENTQTY',
        'OPERSEQUENCE',
      ]);
      grid.vm.$emit('rowSelect', exampleRow.LOTID, { ...exampleRow, rowClass: '' });
      expect(screen.selectRow).toHaveBeenCalledWith(exampleRow);
      grid.vm.$emit('rowSelect', 'UNKNOWN', exampleRow);
      expect(screen.selectRow).toHaveBeenCalledOnce();
      getProvidedOptions().onComment(exampleRow);
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/comment-list');
      expect(router.currentRoute.value.query).toMatchObject({
        lotId: 'LOT-ROW',
        operation: 'OP-1',
        subOperation: 'SUB-1',
        processStep: 'STEP-1',
        operSequence: '2',
        facility: 'FAB1',
      });
    } finally {
      wrapper.unmount();
    }
  });

  it('requires recipe confirmation and runs no command after cancel', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    providedOptions = undefined;
    const screen = createScreenHarness({
      executeCommand: vi.fn(async () => undefined),
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/furnace-remote', component: RemoteFurnaceKecPage },
        { path: '/esheet', component: { template: '<div />' } },
      ],
    });
    await router.push('/furnace-remote?LOTID=WP00001');
    await router.isReady();
    const wrapper = mount(RemoteFurnaceKecPage, {
      global: {
        plugins: [pinia, router],
        stubs: { BaseModal: BaseModalStub, RemoteRecipeDialog: recipeDialogStub },
      },
    });
    try {
      await flushPromises();
      await wrapper.get('.remote-furnace-kec__action-row--three button').trigger('click');
      expect(screen.executeCommand).toHaveBeenCalledWith('start');
      const recipeDialog = wrapper.getComponent(recipeDialogStub);
      const recipeConfirmation = getProvidedOptions().confirmRecipe('RUN-RCP', 'WP00001');
      await nextTick();
      expect(recipeDialog.props('modelValue')).toBe(true);
      expect(recipeDialog.props('recipeList')).toBe('RUN-RCP');
      expect(recipeDialog.props('lotNo')).toBe('WP00001');
      recipeDialog.vm.$emit('confirm');
      await expect(recipeConfirmation).resolves.toBe(true);

      const clearConfirmation = getProvidedOptions().dialog.confirm(
        '확  인',
        'Clear?',
        '확인',
        '취소',
      );
      await nextTick();
      expect(wrapper.get('[role="dialog"]').text()).toContain('취소');
      expect(wrapper.get('[role="dialog"]').text()).toContain('확인');
      await wrapper.get('[role="dialog"] button.ds-btn--secondary').trigger('click');
      await expect(clearConfirmation).resolves.toBe(false);

      getProvidedOptions().onSuccess();
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/esheet');
      expect(router.currentRoute.value.query).toEqual({ lotId: 'WP00001' });

      const alertDialog = getProvidedOptions().dialog.alert('에  러', 'Failure message');
      await nextTick();
      expect(wrapper.get('[role="dialog"]').text()).toContain('Failure message');
      wrapper.getComponent(BaseModalStub).vm.$emit('update:open', false);
      await nextTick();
      await expect(alertDialog).resolves.toBeUndefined();
    } finally {
      wrapper.unmount();
    }
  });

  it('returns a successful NONLOT command through browser history', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    providedOptions = undefined;
    createScreenHarness();
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/before', component: { template: '<div />' } },
        { path: '/furnace-remote', component: RemoteFurnaceKecPage },
      ],
    });
    await router.push('/before');
    await router.push('/furnace-remote');
    await router.isReady();
    const wrapper = mount(RemoteFurnaceKecPage, {
      global: {
        plugins: [pinia, router],
        stubs: { BaseModal: BaseModalStub, RemoteRecipeDialog: recipeDialogStub },
      },
    });
    try {
      await flushPromises();
      getProvidedOptions().onSuccess();
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/before');
    } finally {
      wrapper.unmount();
    }
  });
});
