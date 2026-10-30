import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, type Pinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

import { COMMON_FIELD } from '../../../src/constants/common-strings';
import EENModifyPage from '../../../src/features/een-setting/pages/EENModifyPage.vue';
import * as eenSettingService from '../../../src/features/een-setting/services/een-setting.service';
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

function mockMessageResponse(status: 'PASS' | 'FAIL', messageBody: object = {}, errorMessage = '') {
  return {
    data: {
      statusCode: 200,
      result: JSON.stringify({ STATUS: status, MSGBODY: messageBody, ERRMSG: errorMessage }),
    },
  };
}

async function replaceQuery(query: Record<string, string>): Promise<void> {
  await router.replace({
    path: '/een-modify',
    query: { ...router.currentRoute.value.query, ...query },
  });
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
      // EENSettingActivity.modifyEEN Intent extras for the selected row.
      query: {
        lotId: 'LOT-260927-001',
        eenId: 'EEN-0001',
        tagComment: 'Existing comment',
        actionPoint: 'MOVEIN',
        factoryName: 'GUMI',
        product: 'HIFI-UI-DEMO',
        route: 'PHOTO-DEMO',
        operation: '1200',
        tagId: 'TAG-001',
        poDesc: 'Legacy row description',
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
    expect(readOnlyFields.slice(3).map((component) => component.props('tone'))).toEqual([
      'muted',
      'muted',
      'muted',
    ]);
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
    expect(
      wrapper
        .get<HTMLTextAreaElement>('textarea[aria-label="Tag Comment"]')
        .attributes('placeholder'),
    ).toBe('Tag Comment');
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
    expect(dropdowns.map((dropdown) => dropdown.props('placeholder'))).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('uses BaseButton for page actions without a header back button', async () => {
    const wrapper = await mountPage();

    expect(wrapper.findAllComponents({ name: 'BaseButton' })).toHaveLength(2);
    expect(wrapper.find('[aria-label="뒤로가기"]').exists()).toBe(false);
  });

  it('requests GETTAGID for the row facility', async () => {
    await mountPage();

    expect(apiClient.post).toHaveBeenCalledWith(
      '/hifos/gettagid',
      expect.objectContaining({ sMsg: expect.stringContaining('<FACTORYNAME>GUMI</FACTORYNAME>') }),
    );
  });

  it('leaves empty row values blank instead of showing Null, like Android', async () => {
    await replaceQuery({ route: '', operation: '', poDesc: '' });
    const wrapper = await mountPage();

    const values = wrapper
      .findAllComponents({ name: 'BaseInput' })
      .filter((component) =>
        ['route', 'operation'].includes(component.attributes('data-field') ?? ''),
      )
      .map((component) => component.props('modelValue'));
    expect(values).toEqual(['', '']);
  });

  it('shows an error when it is opened without a selected EEN row', async () => {
    await replaceQuery({ eenId: '' });
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

  it('keeps the TAG selection blank when the current TAG is absent from GETTAGID', async () => {
    await replaceQuery({ tagId: 'TAG-REMOVED' });
    const updateSpy = vi.spyOn(eenSettingService, 'updateEENModifyItem');
    const wrapper = await mountPage();

    const tagDropdown = wrapper
      .findAllComponents({ name: 'BaseDropdownList' })
      .find((component) => component.props('label') === 'TAG ID');
    expect(tagDropdown?.props('modelValue')).toBeUndefined();
    expect(tagDropdown?.props('placeholder')).toBeUndefined();
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
      '/hifos/message',
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
    await replaceQuery({ actionPoint: '' });
    const wrapper = await mountPage();

    expect(wrapper.findAllComponents({ name: 'BaseDropdownList' })[0]?.props('modelValue')).toBe(
      'MOVEOUT',
    );
  });

  it('confirms the update and returns to EEN Setting', async () => {
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

    expect(router.currentRoute.value.name).toBe('een-setting');
    expect(router.currentRoute.value.query.lotId).toBe('LOT-260927-001');
  });

  it('cancels without changing the selected EEN record', async () => {
    const wrapper = await mountPage();
    await setDropdownValue(wrapper, 'ACTION POINT', 'MOVEOUT');

    await wrapper.get('button.een-modify-action--cancel').trigger('click');
    await flushPromises();

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
    vi.mocked(apiClient.post).mockImplementation(async (url) =>
      url === '/hifos/message'
        ? (mockMessageResponse('FAIL', {}, 'EEN 정보를 찾을 수 없습니다.') as never)
        : (mockMessageResponse('PASS', { TAGLIST: 'TAG-001\tExisting comment' }) as never),
    );
    const wrapper = await mountPage();
    await wrapper.get<HTMLTextAreaElement>('textarea[aria-label="변경 사유"]').setValue('Reason');

    await wrapper.get('button.een-modify-action--confirm').trigger('click');
    await wrapper.get('button.een-modify-dialog__confirm').trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe(
      COMMON_FIELD.TXTDIALOGTITLE_ERROR,
    );
    expect(wrapper.get('[role="dialog"]').text()).toContain('EEN 정보를 찾을 수 없습니다.');
    expect(router.currentRoute.value.name).toBe('een-modify');
  });
});
