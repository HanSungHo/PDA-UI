import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

import { COMMON_FIELD } from '../../../src/constants/common-strings';
import {
  mockEENSettingItems,
  removeMockEENSettingItemByEenId,
} from '../../../src/features/een-setting/mocks/een-setting.mock';
import EENDeletePage from '../../../src/features/een-setting/pages/EENDeletePage.vue';
import * as eenSettingService from '../../../src/features/een-setting/services/een-setting.service';
import type { EENSettingItem } from '../../../src/features/een-setting/types/een-setting.types';
import { useMainStore } from '../../../src/features/main/stores/main.store';

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
let pinia: ReturnType<typeof createPinia>;

function testItem(): EENSettingItem {
  return {
    id: 'een-photo-exposure',
    processOperationName: '1200',
    processName: 'PHOTO-EXPOSURE',
    factoryName: 'GUMI',
    product: 'HIFI-UI-DEMO',
    route: 'PHOTO-DEMO',
    operation: '1200',
    poDesc: 'PHOTO-EXPOSURE-DESC',
    eenId: 'EEN-0001',
    actionPoint: 'MOVEIN',
    tagId: 'TAG-001',
    tagComment: 'Existing comment',
    modifyReason: '',
  };
}

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/een-setting',
        name: 'een-setting',
        component: { template: '<div>EEN Setting</div>' },
      },
      { path: '/een-delete', name: 'een-delete', component: EENDeletePage },
    ],
  });
}

async function mountPage() {
  const wrapper = mount(EENDeletePage, {
    attachTo: document.body,
    global: { plugins: [router, pinia], stubs: { BaseModal: BaseModalStub } },
  });
  await flushPromises();

  return wrapper;
}

describe('EENDeletePage', () => {
  beforeEach(async () => {
    mockEENSettingItems.splice(0, mockEENSettingItems.length, testItem());
    pinia = createPinia();
    setActivePinia(pinia);
    useMainStore().operatorId = 'OP-2001';
    router = createTestRouter();
    await router.push({
      path: '/een-setting',
      query: { lotId: 'LOT-260927-001', facility: 'GUMI' },
    });
    await router.push({
      path: '/een-delete',
      query: {
        itemId: 'een-photo-exposure',
        lotId: 'LOT-260927-001',
        factoryName: 'GUMI',
        facility: 'GUMI',
        product: 'HIFI-UI-DEMO',
        route: 'PHOTO-DEMO',
        operation: '1200',
        processStep: 'PHOTO-EXPOSURE',
        eenId: 'EEN-0001',
        tagComment: 'Existing comment',
        actionPoint: 'MOVEIN',
        tagId: 'TAG-001',
        poDesc: 'Legacy PO description',
      },
    });
    await router.isReady();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the selected EEN context and read-only values from the design', async () => {
    const wrapper = await mountPage();

    expect(wrapper.get('h1').text()).toBe('EEN \uC0AD\uC81C');
    expect(wrapper.get('[data-field="lotId"]').text()).toBe('LOT-260927-001');
    expect(wrapper.get('[data-field="facility"]').text()).toBe('GUMI');
    expect(wrapper.get('[data-field="product"]').text()).toBe('HIFI-UI-DEMO');
    expect(wrapper.get('[data-field="route"]').text()).toBe('PHOTO-DEMO');
    expect(wrapper.get('[data-field="operation"]').text()).toContain('1200');
    expect(wrapper.get('[data-field="operation"]').text()).toContain('Legacy PO description');
    expect(wrapper.get('[data-field="operation"]').text()).not.toContain('PHOTO-EXPOSURE');
    expect(wrapper.get('[data-field="eenId"]').text()).toBe('EEN-0001');
    expect(wrapper.get('[data-field="actionPoint"]').text()).toBe('MOVEIN');
    expect(wrapper.get('[data-field="tagId"]').text()).toBe('TAG-001');
    expect(wrapper.findAll('.een-delete-value--arrow svg')).toHaveLength(4);
    expect(
      wrapper.get<HTMLTextAreaElement>('textarea[aria-label="Tag Comment"]').element.value,
    ).toBe('Existing comment');
    expect(
      wrapper.get<HTMLTextAreaElement>('textarea[aria-label="Tag Comment"]').element.readOnly,
    ).toBe(true);
    expect(
      wrapper.get<HTMLTextAreaElement>('textarea[aria-label="\uC0AD\uC81C \uC0AC\uC720"]').element
        .value,
    ).toBe('');
  });

  it('shows the legacy validation dialog when delete reason is blank after trimming', async () => {
    const deleteSpy = vi.spyOn(eenSettingService, 'deleteEEN');
    const wrapper = await mountPage();
    await wrapper
      .get<HTMLTextAreaElement>('textarea[aria-label="\uC0AD\uC81C \uC0AC\uC720"]')
      .setValue('  \n ');

    await wrapper.get('button.een-delete-action--confirm').trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe(
      COMMON_FIELD.TXTDIALOGTITLE_ERROR,
    );
    expect(wrapper.get('[role="dialog"]').text()).toContain(
      '\uC0AD\uC81C \uC0AC\uC720\uB97C \uC785\uB825\uD558\uC138\uC694.',
    );
    expect(router.currentRoute.value.name).toBe('een-delete');
    expect(mockEENSettingItems).toHaveLength(1);
    expect(deleteSpy).not.toHaveBeenCalled();
    wrapper.getComponent(BaseModalStub).vm.$emit('update:open', true);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    wrapper.getComponent(BaseModalStub).vm.$emit('update:open', false);
    await flushPromises();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    await wrapper.get('button.een-delete-action--confirm').trigger('click');
    await wrapper.get('button.een-delete-dialog__confirm').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('does not enable deletion when the route has no matching EEN item', async () => {
    const wrapper = await mountPage();
    await router.replace({
      path: '/een-delete',
      query: { ...router.currentRoute.value.query, itemId: 'missing-item' },
    });
    await flushPromises();

    expect(wrapper.get('button.een-delete-action--confirm').attributes('disabled')).toBeDefined();
    expect(removeMockEENSettingItemByEenId('missing-een')).toBe(false);
    expect(mockEENSettingItems).toHaveLength(1);
  });

  it('cancels the delete confirmation without removing the selected EEN', async () => {
    const wrapper = await mountPage();
    await wrapper
      .get<HTMLTextAreaElement>('textarea[aria-label="\uC0AD\uC81C \uC0AC\uC720"]')
      .setValue('\uC815\uC815 \uC694\uCCAD');
    await wrapper.get('button.een-delete-action--confirm').trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe(
      COMMON_FIELD.TXTDIALOGTITLE_OK,
    );
    expect(wrapper.get('[role="dialog"]').text()).toContain(
      '\uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?',
    );
    await wrapper.get('button.een-delete-dialog__cancel').trigger('click');

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(mockEENSettingItems).toHaveLength(1);
    expect(router.currentRoute.value.name).toBe('een-delete');
  });

  it('removes only the selected mock EEN after confirmation and returns to Setting after success', async () => {
    mockEENSettingItems.push({ ...testItem(), id: 'een-another', eenId: 'EEN-0002' });
    await router.replace({
      path: '/een-delete',
      query: {
        ...router.currentRoute.value.query,
        itemId: 'een-another',
        eenId: 'EEN-0002',
      },
    });
    const wrapper = await mountPage();
    await wrapper
      .get<HTMLTextAreaElement>('textarea[aria-label="\uC0AD\uC81C \uC0AC\uC720"]')
      .setValue('\uC815\uC815 \uC694\uCCAD');
    await wrapper.get('button.een-delete-action--confirm').trigger('click');
    await wrapper.get('button.een-delete-dialog__confirm').trigger('click');

    expect(wrapper.get('[role="dialog"]').text()).toContain(
      'EEN \uC0AD\uC81C\uAC00 \uC644\uB8CC \uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
    );
    expect(mockEENSettingItems).toHaveLength(1);
    expect(mockEENSettingItems[0]?.id).toBe('een-photo-exposure');
    await wrapper.get('button.een-delete-dialog__confirm').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('een-setting');
    expect(router.currentRoute.value.query.lotId).toBe('LOT-260927-001');
    expect(router.currentRoute.value.query.facility).toBe('GUMI');
    expect(router.options.history.state.back).not.toBe('/een-delete');
  });

  it('returns to Setting without deleting when cancel is pressed on the form', async () => {
    const wrapper = await mountPage();

    await wrapper.get('button.een-delete-action--cancel').trigger('click');
    await flushPromises();

    expect(mockEENSettingItems).toHaveLength(1);
    expect(router.currentRoute.value.name).toBe('een-setting');
    expect(router.currentRoute.value.query.lotId).toBe('LOT-260927-001');
  });

  it('sends legacy delete fields and the unmodified reason to the service', async () => {
    const deleteSpy = vi.spyOn(eenSettingService, 'deleteEEN');
    const wrapper = await mountPage();
    const originalTagComment = '  Existing comment  ';
    const reason = '  정정 요청  ';

    await router.replace({
      path: '/een-delete',
      query: {
        ...router.currentRoute.value.query,
        lotId: '  LOT-260927-001  ',
        factoryName: '  GUMI  ',
        facility: '  GUMI  ',
        product: '  HIFI-UI-DEMO  ',
        operation: '  1200  ',
        actionPoint: '  MOVEIN  ',
        eenId: '  EEN-0001  ',
        route: '  PHOTO-DEMO  ',
        tagId: '  TAG-001  ',
        tagComment: originalTagComment,
      },
    });
    await flushPromises();
    await wrapper.get<HTMLTextAreaElement>('textarea[aria-label="삭제 사유"]').setValue(reason);
    await wrapper.get('button.een-delete-action--confirm').trigger('click');
    await wrapper.get('button.een-delete-dialog__confirm').trigger('click');
    await flushPromises();

    expect(deleteSpy).toHaveBeenCalledWith({
      lotId: '  LOT-260927-001  ',
      userId: 'OP-2001',
      facility: 'GUMI',
      product: 'HIFI-UI-DEMO',
      operation: '1200',
      actionPoint: 'MOVEIN',
      eenId: 'EEN-0001',
      route: 'PHOTO-DEMO',
      comment: originalTagComment,
      tagId: 'TAG-001',
      deleteReason: reason,
    });
  });

  it('shows service errors and keeps the screen, reason, and item when deletion fails', async () => {
    vi.spyOn(eenSettingService, 'deleteEEN').mockResolvedValueOnce({
      success: false,
      errorMessage: '서버에서 삭제를 거부했습니다.',
    });
    const wrapper = await mountPage();
    const reason = '정정 요청';
    await wrapper.get<HTMLTextAreaElement>('textarea[aria-label="삭제 사유"]').setValue(reason);
    await wrapper.get('button.een-delete-action--confirm').trigger('click');
    await wrapper.get('button.een-delete-dialog__confirm').trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('에  러');
    expect(wrapper.get('[role="dialog"]').text()).toContain('서버에서 삭제를 거부했습니다.');
    expect(wrapper.get<HTMLTextAreaElement>('textarea[aria-label="삭제 사유"]').element.value).toBe(
      reason,
    );
    expect(mockEENSettingItems).toHaveLength(1);
    expect(router.currentRoute.value.name).toBe('een-delete');
  });

  it('uses history Back for the header action and replaces direct-entry Delete with Setting', async () => {
    const wrapper = await mountPage();
    await wrapper.get('button[aria-label="뒤로가기"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('een-setting');

    router = createTestRouter();
    await router.push({ path: '/een-delete', query: { itemId: 'een-photo-exposure' } });
    await router.isReady();
    const directEntryWrapper = await mountPage();
    await directEntryWrapper.get('button.een-delete-action--cancel').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('een-setting');
    expect(router.options.history.state.back).toBeUndefined();
  });
});
