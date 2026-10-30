import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, type Pinia, setActivePinia } from 'pinia';
import { BaseButton, BaseRevoGrid } from 'src/components/base';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

import EENSettingPage from '../../../src/features/een-setting/pages/EENSettingPage.vue';
import * as eenSettingService from '../../../src/features/een-setting/services/een-setting.service';
import type { EENSettingItem } from '../../../src/features/een-setting/types/een-setting.types';
import { useMainStore } from '../../../src/features/main/stores/main.store';

function fieldValue(wrapper: { get: (selector: string) => { element: Element } }, field: string) {
  return (wrapper.get(`[data-field="${field}"] input`).element as HTMLInputElement).value;
}

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

function createRow(overrides: Partial<EENSettingItem> = {}): EENSettingItem {
  return {
    id: 'EEN-0001',
    processOperationName: '1200',
    processName: 'PHOTO-EXPOSURE',
    factoryName: 'GUMI-ROW',
    product: 'ROW-PRODUCT',
    route: 'ROW-ROUTE',
    operation: '1200',
    poDesc: 'Selected process description',
    eenId: 'EEN-0001',
    actionPoint: 'MOVEIN',
    tagId: 'TAG-001',
    tagComment: 'Designer Review and approve before production',
    createTime: '2026-10-28 09:12:30',
    createUser: 'DEMO',
    confirmUser: '',
    confirmTime: '',
    ...overrides,
  };
}

const otherRow = createRow({
  id: 'EEN-0002',
  eenId: 'EEN-0002',
  processName: 'ETCH-MAIN',
  operation: '1300',
  processOperationName: '1300',
  tagComment: 'Second row',
});

let fetchSpy: MockInstance<typeof eenSettingService.fetchEENSettingItems>;

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
    // The page stubs the EEN service; its GETEENLIST request is covered in een-setting.service.spec.
    fetchSpy = vi
      .spyOn(eenSettingService, 'fetchEENSettingItems')
      .mockResolvedValue({ success: true, data: [otherRow, createRow()] });
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
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders the eSheet context and selects the row matching the current process', async () => {
    const wrapper = await mountPage();

    expect(wrapper.find('button[aria-label="뒤로가기"]').exists()).toBe(false);
    expect(fieldValue(wrapper, 'lotId')).toBe('LOT-260927-001');
    expect(fieldValue(wrapper, 'route')).toBe('PHOTO-DEMO');
    expect(fieldValue(wrapper, 'operation')).toBe('1200');
    expect(fieldValue(wrapper, 'processStep')).toBe('PHOTO-EXPOSURE');
    expect(fieldValue(wrapper, 'product')).toBe('HIFI-UI-DEMO');

    const grid = wrapper.getComponent(BaseRevoGrid);
    // Android focuses the row whose PROCESSOPERATIONNAME is the current operation.
    expect(grid.props('selectedRowKey')).toBe('EEN-0001');
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
    expect(columns.map(({ size }) => size)).toEqual([153, 160, 120, 168, 120, 128, 168]);
    expect(columns.every(({ pin }) => pin === undefined)).toBe(true);
    expect(grid.props('rows')[1]).toMatchObject({
      processName: 'PHOTO-EXPOSURE',
      tagComment: 'Designer Review and approve before production',
    });
  });

  it('keeps the matching row keyboard reachable and returns to eSheet with the LOT when closed', async () => {
    const wrapper = await mountPage();
    const grid = wrapper.getComponent(BaseRevoGrid);
    grid.vm.$emit('rowSelect', 'EEN-0002', otherRow);
    await wrapper.vm.$nextTick();
    expect(grid.props('selectedRowKey')).toBe('EEN-0002');

    await wrapper.get('button[aria-label="닫기"]').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('esheet');
    expect(router.currentRoute.value.query.lotId).toBe('LOT-260927-001');
  });

  it('opens EEN Add with the current LOT context and without the EEN Add mock mode', async () => {
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
    expect(router.currentRoute.value.query.mock).toBeUndefined();
  });

  it('opens Modify for the selected EEN record and preserves the eSheet context', async () => {
    const wrapper = await mountPage();

    await wrapper.findAll('.een-setting-action')[1]!.trigger('click');
    await flushPromises();

    // EENSettingActivity.modifyEEN passes the selected row as Intent extras.
    expect(router.currentRoute.value.name).toBe('een-modify');
    expect(router.currentRoute.value.query).toEqual({
      lotId: 'LOT-260927-001',
      eenId: 'EEN-0001',
      tagComment: 'Designer Review and approve before production',
      actionPoint: 'MOVEIN',
      factoryName: 'GUMI-ROW',
      product: 'ROW-PRODUCT',
      route: 'ROW-ROUTE',
      operation: '1200',
      tagId: 'TAG-001',
      poDesc: 'Selected process description',
    });
  });

  it('opens Delete with the selected EEN metadata and eSheet context', async () => {
    const wrapper = await mountPage();

    await wrapper.findAll('.een-setting-action')[2]!.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('een-delete');
    expect(router.currentRoute.value.query.lotId).toBe('LOT-260927-001');
    expect(router.currentRoute.value.query.eenId).toBe('EEN-0001');
    expect(router.currentRoute.value.query.tagComment).toBe(
      'Designer Review and approve before production',
    );
    expect(router.currentRoute.value.query.actionPoint).toBe('MOVEIN');
    expect(router.currentRoute.value.query.tagId).toBe('TAG-001');
    expect(router.currentRoute.value.query.factoryName).toBe('GUMI-ROW');
    expect(router.currentRoute.value.query.product).toBe('ROW-PRODUCT');
    expect(router.currentRoute.value.query.route).toBe('ROW-ROUTE');
    expect(router.currentRoute.value.query.operation).toBe('1200');
    expect(router.currentRoute.value.query.poDesc).toBe('Selected process description');
  });

  it('uses BaseButton controls and BaseRevoGrid for the EEN list', async () => {
    const wrapper = await mountPage();

    expect(wrapper.findAllComponents(BaseButton)).toHaveLength(4);
    expect(wrapper.findComponent(BaseRevoGrid).exists()).toBe(true);
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('selects the first row of the current operation when the list reloads', async () => {
    fetchSpy.mockResolvedValue({
      success: true,
      data: [createRow({ id: 'EEN-A', eenId: 'EEN-A' }), otherRow, createRow()],
    });

    const wrapper = await mountPage();

    expect(wrapper.getComponent(BaseRevoGrid).props('selectedRowKey')).toBe('EEN-A');
  });

  it('requests GETEENLIST with the LOT and the device facility', async () => {
    useMainStore().$patch({ facility: 'DEVICE-FACILITY' });

    await mountPage();

    expect(fetchSpy).toHaveBeenCalledWith({ lotId: 'LOT-260927-001', facility: 'DEVICE-FACILITY' });
  });

  it('shows an empty state when GETEENLIST returns no rows', async () => {
    fetchSpy.mockResolvedValue({ success: true, data: [] });

    const wrapper = await mountPage();

    expect(wrapper.findComponent(BaseRevoGrid).exists()).toBe(false);
    expect(wrapper.get('[role="status"]').text()).toBe('조회된 EEN 정보가 없습니다.');
    expect(wrapper.get('.een-setting-action--primary').attributes('disabled')).toBeDefined();
  });

  it('shows the service error in a dialog when loading the EEN list fails', async () => {
    fetchSpy.mockResolvedValue({ success: false, message: 'EEN 목록 조회 실패' });

    const wrapper = await mountPage();

    const dialog = wrapper.findComponent({ name: 'BaseModal' });
    expect(dialog.exists()).toBe(true);
    expect(dialog.props('open')).toBe(true);
    expect(dialog.props('title')).toBe('에  러');
    expect(wrapper.text()).toContain('EEN 목록 조회 실패');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
});
