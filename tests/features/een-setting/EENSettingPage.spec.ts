import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, type Pinia, setActivePinia } from 'pinia';
import { BaseButton, BaseRevoGrid } from 'src/components/base';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

import { useEenAddStore } from '../../../src/features/een-add/stores/een-add.store';
import { mockEENSettingItems } from '../../../src/features/een-setting/mocks/een-setting.mock';
import EENSettingPage from '../../../src/features/een-setting/pages/EENSettingPage.vue';
import * as eenSettingService from '../../../src/features/een-setting/services/een-setting.service';
import { useEENSettingResultStore } from '../../../src/features/een-setting/stores/een-setting-result.store';
import type { EENSettingItem } from '../../../src/features/een-setting/types/een-setting.types';
import { useMainStore } from '../../../src/features/main/stores/main.store';

enableAutoUnmount(afterEach);

const BaseModalStub = defineComponent({
  name: 'BaseModal',
  props: {
    open: { type: Boolean, required: true },
    title: { type: String, default: '' },
  },
  setup(props, { slots }) {
    return () =>
      props.open
        ? h('section', { role: 'dialog' }, [
            h('h2', props.title),
            ...(slots.default?.() ?? []),
            ...(slots.footer?.() ?? []),
          ])
        : null;
  },
});

let router: Router;
let pinia: Pinia;

function createMockItem(): EENSettingItem {
  return {
    id: 'een-photo-exposure',
    processOperationName: '1200',
    processName: 'PHOTO-EXPOSURE',
    factoryName: 'GUMI-ROW',
    product: 'ROW-PRODUCT',
    route: 'ROW-ROUTE',
    operation: 'ROW-OPERATION',
    poDesc: 'Selected process description',
    eenId: 'EEN-0001',
    actionPoint: 'MOVEIN',
    tagId: 'TAG-001',
    tagComment: 'Designer Review and approve before production',
    modifyReason: '',
  };
}

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/esheet', name: 'esheet', component: { template: '<div>eSheet</div>' } },
      { path: '/een-setting', name: 'een-setting', component: EENSettingPage },
      { path: '/een-add', name: 'een-add', component: { template: '<div>EEN Add</div>' } },
      { path: '/een-modify', name: 'een-modify', component: { template: '<div>EEN Modify</div>' } },
      { path: '/een-delete', name: 'een-delete', component: { template: '<div>EEN Delete</div>' } },
    ],
  });
}

async function mountPage() {
  const wrapper = mount(EENSettingPage, {
    attachTo: document.body,
    global: { plugins: [pinia, router], stubs: { BaseModal: BaseModalStub } },
  });
  await flushPromises();

  return wrapper;
}

describe('EENSettingPage', () => {
  beforeEach(async () => {
    mockEENSettingItems.splice(0, mockEENSettingItems.length, createMockItem());
    pinia = createPinia();
    setActivePinia(pinia);
    router = createTestRouter();
    await router.push({
      path: '/een-setting',
      query: {
        lotId: 'LOT-260927-001',
        factoryName: 'GUMI-FACTORY',
        facility: 'GUMI-FACILITY',
        route: 'PHOTO-DEMO',
        operation: '1200',
        processStep: 'PHOTO-EXPOSURE',
        product: 'HIFI-UI-DEMO',
      },
    });
    await router.isReady();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the eSheet context and selects the row matching the current process', async () => {
    const wrapper = await mountPage();

    expect(wrapper.find('button[aria-label="뒤로가기"]').exists()).toBe(false);
    expect(wrapper.get('[data-field="lotId"]').text()).toBe('LOT-260927-001');
    expect(wrapper.get('[data-field="route"]').text()).toBe('PHOTO-DEMO');
    expect(wrapper.get('[data-field="operation"]').text()).toBe('1200');
    expect(wrapper.get('[data-field="processStep"]').text()).toBe('PHOTO-EXPOSURE');
    expect(wrapper.get('[data-field="product"]').text()).toBe('HIFI-UI-DEMO');

    const grid = wrapper.getComponent(BaseRevoGrid);
    expect(grid.props('selectedRowKey')).toBe('een-photo-exposure');
    const columns = grid.props('columns');
    expect(columns.map(({ name }) => name)).toEqual([
      '공정명',
      'TAGCOMMENT',
      'ACTIONPOINT',
      'CREATETIME',
      'CREATEUSER',
      'CONFIRMUSER',
      'CONFIRMTIME',
    ]);
    expect(columns.slice(0, 2).map(({ size }) => size)).toEqual([153, 160]);
    expect(columns.every(({ pin }) => pin === undefined)).toBe(true);
    expect(grid.props('rows')[0]).toMatchObject({
      processName: 'PHOTO-EXPOSURE',
      tagComment: 'Designer Review and approve before production',
    });
  });

  it('keeps the matching row keyboard reachable and returns to eSheet with the LOT when closed', async () => {
    const wrapper = await mountPage();
    const grid = wrapper.getComponent(BaseRevoGrid);
    grid.vm.$emit('rowSelect', 'een-photo-exposure', createMockItem());
    await wrapper.vm.$nextTick();
    expect(grid.props('selectedRowKey')).toBe('een-photo-exposure');

    await wrapper.get('button[aria-label="닫기"]').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('esheet');
    expect(router.currentRoute.value.query.lotId).toBe('LOT-260927-001');
  });

  it('opens EEN Add with the current LOT context and mock mode', async () => {
    const wrapper = await mountPage();

    await wrapper.get('.een-setting-action--primary').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('een-add');
    expect(router.currentRoute.value.query.LOTID).toBe('LOT-260927-001');
    expect(router.currentRoute.value.query.FACTORYNAME).toBe('GUMI-ROW');
    expect(router.currentRoute.value.query.PRODUCT).toBe('ROW-PRODUCT');
    expect(router.currentRoute.value.query.ROUTE).toBe('PHOTO-DEMO');
    expect(router.currentRoute.value.query.OPERATION).toBe('1200');
    expect(router.currentRoute.value.query.PROCESSSTEP).toBe('');
    expect(router.currentRoute.value.query.source).toBe('een-setting');
    expect(router.currentRoute.value.query.mock).toBe('een-add');
  });

  it('adds and selects a returned Add result for the matching LOT', async () => {
    const addStore = useEenAddStore();
    addStore.setSettingResult({
      lotId: 'LOT-260927-001',
      facility: 'GUMI',
      product: 'HIFI-UI-DEMO',
      route: 'PHOTO-NEW',
      operation: '1300',
      poDesc: 'New process description',
      actionPoint: 'MOVEIN',
      tagId: 'TAG-002',
      tagComment: 'Added from EEN Setting',
    });

    const wrapper = await mountPage();

    const grid = wrapper.getComponent(BaseRevoGrid);
    expect(grid.props('rows')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          processName: 'New process description',
          tagComment: 'Added from EEN Setting',
        }),
      ]),
    );
    expect(grid.props('selectedRowKey')).toMatch(/^een-added-/);
    expect(mockEENSettingItems).toHaveLength(2);
    expect(addStore.consumeSettingResult('LOT-260927-001')).toBeNull();
  });

  it('opens Modify for the selected EEN record and preserves the eSheet context', async () => {
    const wrapper = await mountPage();

    await wrapper.findAll('.een-setting-action')[1]!.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('een-modify');
    expect(router.currentRoute.value.query.itemId).toBe('een-photo-exposure');
    expect(router.currentRoute.value.query.lotId).toBe('LOT-260927-001');
    expect(router.currentRoute.value.query.factoryName).toBe('GUMI-ROW');
    expect(router.currentRoute.value.query.facility).toBe('GUMI-ROW');
    expect(router.currentRoute.value.query.product).toBe('ROW-PRODUCT');
    expect(router.currentRoute.value.query.route).toBe('ROW-ROUTE');
    expect(router.currentRoute.value.query.operation).toBe('ROW-OPERATION');
  });

  it('opens Delete with the selected EEN metadata and eSheet context', async () => {
    const wrapper = await mountPage();

    await wrapper.findAll('.een-setting-action')[2]!.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('een-delete');
    expect(router.currentRoute.value.query.itemId).toBe('een-photo-exposure');
    expect(router.currentRoute.value.query.lotId).toBe('LOT-260927-001');
    expect(router.currentRoute.value.query.facility).toBe('GUMI-ROW');
    expect(router.currentRoute.value.query.eenId).toBe('EEN-0001');
    expect(router.currentRoute.value.query.tagComment).toBe(
      'Designer Review and approve before production',
    );
    expect(router.currentRoute.value.query.actionPoint).toBe('MOVEIN');
    expect(router.currentRoute.value.query.tagId).toBe('TAG-001');
    expect(router.currentRoute.value.query.factoryName).toBe('GUMI-ROW');
    expect(router.currentRoute.value.query.product).toBe('ROW-PRODUCT');
    expect(router.currentRoute.value.query.route).toBe('ROW-ROUTE');
    expect(router.currentRoute.value.query.operation).toBe('ROW-OPERATION');
    expect(router.currentRoute.value.query.poDesc).toBe('Selected process description');
  });

  it('applies the returned Modify row for the matching LOT and consumes the result', async () => {
    const store = useEENSettingResultStore();
    const fetchSpy = vi.spyOn(eenSettingService, 'fetchEENSettingItems');
    store.publishModifyResult({
      lotId: 'LOT-260927-001',
      item: {
        ...createMockItem(),
        actionPoint: 'MOVEOUT',
        tagId: 'TAG-002',
        tagComment: 'Returned comment',
      },
    });

    const wrapper = await mountPage();

    expect(fetchSpy.mock.calls[0]?.[0]).toMatchObject({
      lotId: 'LOT-260927-001',
      modifiedResult: {
        lotId: 'LOT-260927-001',
        item: { tagComment: 'Returned comment' },
      },
    });
    expect(mockEENSettingItems[0]?.tagComment).toBe('Returned comment');
    const rows = wrapper.getComponent(BaseRevoGrid).props('rows') as EENSettingItem[];
    expect(rows[0]?.tagComment).toBe('Returned comment');
    expect(store.pendingModifyResult).toBeNull();
  });

  it('does not apply a Modify result returned for a different LOT', async () => {
    const store = useEENSettingResultStore();
    store.publishModifyResult({
      lotId: 'LOT-OTHER',
      item: { ...createMockItem(), tagComment: 'Wrong LOT comment' },
    });

    const wrapper = await mountPage();

    const rows = wrapper.getComponent(BaseRevoGrid).props('rows') as EENSettingItem[];
    expect(rows[0]?.tagComment).toBe('Designer Review and approve before production');
    expect(rows[0]?.tagComment).not.toBe('Wrong LOT comment');
    expect(store.pendingModifyResult).toBeNull();
  });
  it('uses BaseButton controls and BaseRevoGrid for the EEN list', async () => {
    const wrapper = await mountPage();

    expect(wrapper.findAllComponents(BaseButton)).toHaveLength(4);
    expect(wrapper.findComponent(BaseRevoGrid).exists()).toBe(true);
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('loads EEN rows through the mock service using the LOT and facility context', async () => {
    useMainStore().$patch({ facility: 'DEVICE-FACILITY' });
    const fetchSpy = vi.spyOn(eenSettingService, 'fetchEENSettingItems');

    await mountPage();

    expect(fetchSpy).toHaveBeenCalledWith({
      lotId: 'LOT-260927-001',
      facility: 'DEVICE-FACILITY',
      addedResult: undefined,
    });
  });

  it('shows the service error in a dialog when loading the EEN list fails', async () => {
    vi.spyOn(eenSettingService, 'fetchEENSettingItems').mockResolvedValue({
      success: false,
      message: 'EEN 목록 조회 실패',
    });

    const wrapper = await mountPage();

    const dialog = wrapper.findComponent({ name: 'BaseModal' });
    expect(dialog.exists()).toBe(true);
    expect(dialog.props('open')).toBe(true);
    expect(dialog.props('title')).toBe('에  러');
    expect(wrapper.text()).toContain('EEN 목록 조회 실패');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
});
