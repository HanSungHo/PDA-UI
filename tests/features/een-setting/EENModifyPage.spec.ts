import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, type Pinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

import { COMMON_FIELD } from '../../../src/constants/common-strings';
import { mockEENSettingItems } from '../../../src/features/een-setting/mocks/een-setting.mock';
import EENModifyPage from '../../../src/features/een-setting/pages/EENModifyPage.vue';
import * as eenSettingService from '../../../src/features/een-setting/services/een-setting.service';
import { useEENSettingResultStore } from '../../../src/features/een-setting/stores/een-setting-result.store';
import { useMainStore } from '../../../src/features/main/stores/main.store';
import apiClient from '../../../src/services/api-client';

enableAutoUnmount(afterEach);

const BaseModalStub = defineComponent({
  name: 'BaseModal',
  props: {
    open: { type: Boolean, required: true },
    title: { type: String, default: '' },
  },
  emits: ['update:open'],
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

let router: Router;
let pinia: Pinia;

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/esheet', name: 'esheet', component: { template: '<div>eSheet</div>' } },
      {
        path: '/een-setting',
        name: 'een-setting',
        component: { template: '<div>eSheet EEN</div>' },
      },
      { path: '/een-modify', name: 'een-modify', component: EENModifyPage },
    ],
  });
}

function mockMessageResponse(status: 'PASS' | 'FAIL', messageBody: object = {}) {
  return {
    data: {
      statusCode: 200,
      result: JSON.stringify({ STATUS: status, MSGBODY: messageBody }),
    },
  };
}

async function mountPage() {
  const wrapper = mount(EENModifyPage, {
    attachTo: document.body,
    global: { plugins: [pinia, router], stubs: { BaseModal: BaseModalStub } },
  });
  await flushPromises();

  return wrapper;
}

async function setDropdownValue(wrapper: VueWrapper, label: string, value: string): Promise<void> {
  const dropdown = wrapper
    .findAllComponents({ name: 'BaseDropdownList' })
    .find((component) => component.props('label') === label);

  if (!dropdown) throw new Error(`Dropdown ${label} was not rendered`);

  dropdown.vm.$emit('update:modelValue', value);
  dropdown.vm.$emit('change', value);
  await nextTick();
}

describe('EENModifyPage', () => {
  beforeEach(async () => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.spyOn(apiClient, 'post').mockResolvedValue(
      mockMessageResponse('PASS', {
        TAGLIST:
          'TAG-001\tDesigner Review and approve before production\nTAG-002\t두 번째 TAG 설명',
      }) as never,
    );
    mockEENSettingItems.splice(0, mockEENSettingItems.length, {
      id: 'een-photo-exposure',
      processOperationName: '1200',
      processName: 'PHOTO-EXPOSURE',
      factoryName: 'GUMI',
      product: 'HIFI-UI-DEMO',
      route: 'PHOTO-DEMO',
      operation: '1200',
      poDesc: 'Legacy row description',
      eenId: 'EEN-0001',
      actionPoint: 'MOVEIN',
      tagId: 'TAG-001',
      tagComment: 'Existing comment',
      modifyReason: '',
    });
    router = createTestRouter();
    await router.push({ path: '/esheet', query: { lotId: 'LOT-260927-001' } });
    await router.push({
      path: '/een-setting',
      query: {
        lotId: 'LOT-260927-001',
        factoryName: 'GUMI',
        facility: 'GUMI',
        product: 'HIFI-UI-DEMO',
        route: 'PHOTO-DEMO',
        operation: '1200',
        processStep: 'PHOTO-EXPOSURE',
      },
    });
    await router.push({
      path: '/een-modify',
      query: {
        itemId: 'een-photo-exposure',
        lotId: 'LOT-260927-001',
        factoryName: 'GUMI',
        facility: 'GUMI',
        product: 'HIFI-UI-DEMO',
        route: 'PHOTO-DEMO',
        operation: '1200',
        processStep: 'ROUTE-STEP-SHOULD-NOT-BE-PODESC',
      },
    });
    await router.isReady();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders the selected EEN context and legacy form values', async () => {
    const wrapper = await mountPage();

    expect(wrapper.get('h1').text()).toBe('EEN 수정');
    const readOnlyFields = wrapper
      .findAllComponents({ name: 'BaseInput' })
      .filter((component) => component.attributes('data-field'));
    expect(readOnlyFields).toHaveLength(6);
    expect(readOnlyFields.map((component) => component.props('label'))).toEqual([
      'LOT ID',
      'FACILITY',
      '제품',
      'ROUTE',
      '공정',
      'EEN ID',
    ]);
    expect(readOnlyFields.map((component) => component.props('modelValue'))).toEqual([
      'LOT-260927-001',
      'GUMI',
      'HIFI-UI-DEMO',
      'PHOTO-DEMO',
      '1200 Legacy row description',
      'EEN-0001',
    ]);
    expect(readOnlyFields.every((component) => component.props('readonly'))).toBe(true);
    expect(
      readOnlyFields.every((component) => component.get('input').attributes('tabindex') === '-1'),
    ).toBe(true);
    expect(wrapper.get('[data-field="route"] .q-icon').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('[data-field="operation"] .q-icon').attributes('aria-hidden')).toBe('true');
    const dropdowns = wrapper.findAllComponents({ name: 'BaseDropdownList' });
    expect(dropdowns[0]?.props('modelValue')).toBe('MOVEIN');
    expect(dropdowns[1]?.props('modelValue')).toBe('TAG-001');
    expect(
      wrapper.get<HTMLTextAreaElement>('textarea[aria-label="Tag Comment"]').element.value,
    ).toBe('Existing comment');
    expect(wrapper.get<HTMLTextAreaElement>('textarea[aria-label="변경 사유"]').element.value).toBe(
      '',
    );
  });

  it('uses base dropdowns with the available Action Point and TAG ID options', async () => {
    const wrapper = await mountPage();
    const dropdowns = wrapper.findAllComponents({ name: 'BaseDropdownList' });

    expect(dropdowns).toHaveLength(2);
    expect(dropdowns[0]?.props('label')).toBe('ACTION POINT');
    expect(dropdowns[1]?.props('label')).toBe('TAG ID');
    expect(dropdowns[0]?.props()).toMatchObject({
      id: 'een-modify-action-point',
      modelValue: 'MOVEIN',
      options: [
        { label: 'MOVEIN', value: 'MOVEIN' },
        { label: 'MOVEOUT', value: 'MOVEOUT' },
      ],
    });
    expect(dropdowns[1]?.props()).toMatchObject({
      id: 'een-modify-tag-id',
      modelValue: 'TAG-001',
      options: expect.arrayContaining([
        { label: 'TAG-001', value: 'TAG-001' },
        { label: 'TAG-002', value: 'TAG-002' },
      ]),
    });
  });

  it('uses BaseButton for page actions without a header back button', async () => {
    const wrapper = await mountPage();

    expect(wrapper.findAllComponents({ name: 'BaseButton' })).toHaveLength(2);
    expect(wrapper.find('[aria-label="뒤로가기"]').exists()).toBe(false);
  });

  it('shows the service error when the selected EEN cannot be loaded', async () => {
    await router.replace({
      path: '/een-modify',
      query: { ...router.currentRoute.value.query, itemId: 'missing-een' },
    });
    const wrapper = await mountPage();

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe(
      COMMON_FIELD.TXTDIALOGTITLE_ERROR,
    );
    expect(wrapper.get('[role="dialog"]').text()).toContain('EEN 정보를 찾을 수 없습니다.');
  });

  it('updates Tag Comment when the selected TAG ID changes', async () => {
    const wrapper = await mountPage();

    await setDropdownValue(wrapper, 'TAG ID', 'TAG-002');

    expect(
      wrapper.get<HTMLTextAreaElement>('textarea[aria-label="Tag Comment"]').element.value,
    ).toBe('두 번째 TAG 설명');
  });

  it('uses the TAG placeholder when the current TAG is absent from GETTAGID', async () => {
    const item = mockEENSettingItems[0];
    if (item) item.tagId = 'TAG-REMOVED';
    const updateSpy = vi.spyOn(eenSettingService, 'updateEENModifyItem');
    const wrapper = await mountPage();

    const tagDropdown = wrapper
      .findAllComponents({ name: 'BaseDropdownList' })
      .find((component) => component.props('label') === 'TAG ID');
    expect(tagDropdown?.props('modelValue')).toBeUndefined();
    expect(
      wrapper.get<HTMLTextAreaElement>('textarea[aria-label="Tag Comment"]').element.value,
    ).toBe('Existing comment');

    await wrapper.get('button.een-modify-action--confirm').trigger('click');
    await wrapper.get('button.een-modify-dialog__confirm').trigger('click');
    await flushPromises();

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ tagId: null, tagComment: 'Existing comment' }),
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      '/hifos/updateeen',
      expect.objectContaining({ sMsg: expect.stringContaining('<TAGID>null</TAGID>') }),
    );
  });

  it('shows the legacy validation dialog when Tag Comment is empty', async () => {
    const wrapper = await mountPage();
    await wrapper.get<HTMLTextAreaElement>('textarea[aria-label="Tag Comment"]').setValue('');

    await wrapper.get('button.een-modify-action--confirm').trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('Tag Comment 입력');
    expect(wrapper.get('[role="dialog"]').text()).toContain('Tag Comment를 입력하세요.');
    expect(router.currentRoute.value.name).toBe('een-modify');
  });

  it('defaults unsupported legacy Action Point values to MOVEOUT', async () => {
    const item = mockEENSettingItems[0];
    if (item) item.actionPoint = '';
    const wrapper = await mountPage();

    expect(wrapper.findAllComponents({ name: 'BaseDropdownList' })[0]?.props('modelValue')).toBe(
      'MOVEOUT',
    );
  });

  it('confirms a mock update, saves the selected values, and returns to EEN Setting', async () => {
    useMainStore().operatorId = 'OPERATOR-42';
    await router.replace({
      name: 'een-modify',
      query: {
        ...router.currentRoute.value.query,
        facility: ' GUMI ',
        product: ' HIFI-UI-DEMO ',
        operation: ' 1200 ',
        route: ' PHOTO-DEMO ',
      },
    });
    const updateSpy = vi.spyOn(eenSettingService, 'updateEENModifyItem');
    const wrapper = await mountPage();
    await setDropdownValue(wrapper, 'ACTION POINT', 'MOVEOUT');
    await setDropdownValue(wrapper, 'TAG ID', 'TAG-002');
    await wrapper
      .get<HTMLTextAreaElement>('textarea[aria-label="변경 사유"]')
      .setValue('Change reason');

    await wrapper.get('button.een-modify-action--confirm').trigger('click');
    expect(wrapper.get('[role="dialog"]').text()).toContain('수정하시겠습니까?');
    await wrapper.get('button.een-modify-dialog__confirm').trigger('click');
    await flushPromises();
    expect(updateSpy).toHaveBeenCalledWith({
      lotId: 'LOT-260927-001',
      userId: 'OPERATOR-42',
      facility: 'GUMI',
      product: 'HIFI-UI-DEMO',
      operation: '1200',
      actionPoint: 'MOVEOUT',
      eenId: 'EEN-0001',
      processFlow: 'PHOTO-DEMO',
      tagComment: '두 번째 TAG 설명',
      tagId: 'TAG-002',
      oldTagComment: 'Existing comment',
      changeCause: 'Change reason',
    });
    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe(
      COMMON_FIELD.TXTDIALOGTITLE_OK,
    );
    expect(wrapper.get('[role="dialog"]').text()).toContain('EEN Update가 완료 되었습니다.');
    await wrapper.get('button.een-modify-dialog__confirm').trigger('click');
    await flushPromises();

    expect(mockEENSettingItems[0]).toMatchObject({
      actionPoint: 'MOVEOUT',
      tagId: 'TAG-002',
      tagComment: '두 번째 TAG 설명',
      modifyReason: 'Change reason',
    });
    expect(useEENSettingResultStore().pendingModifyResult).toEqual({
      lotId: 'LOT-260927-001',
      item: {
        id: 'een-photo-exposure',
        processOperationName: '1200',
        processName: 'PHOTO-EXPOSURE',
        factoryName: 'GUMI',
        product: 'HIFI-UI-DEMO',
        route: 'PHOTO-DEMO',
        operation: '1200',
        poDesc: 'Legacy row description',
        eenId: 'EEN-0001',
        actionPoint: 'MOVEOUT',
        tagId: 'TAG-002',
        tagComment: '두 번째 TAG 설명',
        modifyReason: 'Change reason',
      },
    });
    expect(router.currentRoute.value.name).toBe('een-setting');
    expect(router.currentRoute.value.query.lotId).toBe('LOT-260927-001');
  });

  it('cancels without changing the selected EEN record', async () => {
    const wrapper = await mountPage();
    await setDropdownValue(wrapper, 'ACTION POINT', 'MOVEOUT');

    await wrapper.get('button.een-modify-action--cancel').trigger('click');
    await flushPromises();

    expect(mockEENSettingItems[0]).toMatchObject({ actionPoint: 'MOVEIN', tagId: 'TAG-001' });
    expect(useEENSettingResultStore().pendingModifyResult).toBeNull();
    expect(router.currentRoute.value.name).toBe('een-setting');
    expect(router.currentRoute.value.query.lotId).toBe('LOT-260927-001');

    router.back();
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('esheet');
  });

  it('does not render a header back button', async () => {
    const wrapper = await mountPage();

    expect(wrapper.find('[aria-label="뒤로가기"]').exists()).toBe(false);
  });

  it('shows the error message returned by the service when update fails', async () => {
    const wrapper = await mountPage();
    mockEENSettingItems.splice(0, mockEENSettingItems.length);
    await wrapper.get<HTMLTextAreaElement>('textarea[aria-label="변경 사유"]').setValue('Reason');

    await wrapper.get('button.een-modify-action--confirm').trigger('click');
    await wrapper.get('button.een-modify-dialog__confirm').trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe(
      COMMON_FIELD.TXTDIALOGTITLE_ERROR,
    );
    expect(wrapper.get('[role="dialog"]').text()).toContain('EEN 정보를 찾을 수 없습니다.');
    expect(router.currentRoute.value.name).toBe('een-modify');
    expect(useEENSettingResultStore().pendingModifyResult).toBeNull();
  });
});
