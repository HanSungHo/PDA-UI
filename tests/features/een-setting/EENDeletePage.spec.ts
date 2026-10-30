import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { QIcon } from 'quasar';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

import { BaseButton } from '../../../src/components/base/button';
import { BaseInput } from '../../../src/components/base/input';
import { COMMON_FIELD } from '../../../src/constants/common-strings';
import EENDeletePage from '../../../src/features/een-setting/pages/EENDeletePage.vue';
import * as eenSettingService from '../../../src/features/een-setting/services/een-setting.service';
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

let deleteSpy: MockInstance<typeof eenSettingService.deleteEEN>;

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
    // The page stubs the EEN service; its DELETEEEN request is covered in een-setting.service.spec.
    deleteSpy = vi.spyOn(eenSettingService, 'deleteEEN').mockResolvedValue({ success: true });
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
        lotId: 'LOT-260927-001',
        factoryName: 'GUMI',
        product: 'HIFI-UI-DEMO',
        route: 'PHOTO-DEMO',
        operation: '1200',
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
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders the selected EEN context and read-only values from the design', async () => {
    const wrapper = await mountPage();

    expect(wrapper.get('h1').text()).toBe('EEN \uC0AD\uC81C');
    expect(fieldValue(wrapper, 'lotId')).toBe('LOT-260927-001');
    expect(fieldValue(wrapper, 'facility')).toBe('GUMI');
    expect(fieldValue(wrapper, 'product')).toBe('HIFI-UI-DEMO');
    expect(fieldValue(wrapper, 'route')).toContain('PHOTO-DEMO');
    expect(fieldValue(wrapper, 'operation')).toContain('1200');
    expect(fieldValue(wrapper, 'operation')).toContain('Legacy PO description');
    expect(fieldValue(wrapper, 'operation')).not.toContain('PHOTO-EXPOSURE');
    expect(fieldValue(wrapper, 'eenId')).toBe('EEN-0001');
    expect(fieldValue(wrapper, 'actionPoint')).toBe('MOVEIN');
    expect(fieldValue(wrapper, 'tagId')).toBe('TAG-001');
    expect(wrapper.findAllComponents(QIcon).map((icon) => icon.props('name'))).toEqual([
      'sym_o_expand_more',
      'sym_o_expand_more',
      'sym_o_expand_more',
      'sym_o_expand_more',
    ]);
    expect(
      wrapper.get<HTMLTextAreaElement>('textarea[aria-label="Tag Comment"]').element.value,
    ).toBe('Existing comment');
    expect(
      wrapper.get<HTMLTextAreaElement>('textarea[aria-label="Tag Comment"]').element.readOnly,
    ).toBe(true);
    expect(
      wrapper.get<HTMLTextAreaElement>('textarea[aria-label="Tag Comment"]').element.style.resize,
    ).toBe('vertical');
    expect(
      wrapper
        .findAllComponents(BaseInput)
        .filter((input) => input.props('mode') === 'textarea')
        .map((input) => input.props('rows')),
    ).toEqual([3, 3]);
    expect(
      wrapper.get<HTMLTextAreaElement>('textarea[aria-label="\uC0AD\uC81C \uC0AC\uC720"]').element
        .value,
    ).toBe('');
    expect(
      wrapper.get<HTMLTextAreaElement>('textarea[aria-label="\uC0AD\uC81C \uC0AC\uC720"]').element
        .style.resize,
    ).toBe('none');
  });

  it('uses shared base buttons for page actions without a header back button', async () => {
    const wrapper = await mountPage();
    const buttons = wrapper.findAllComponents(BaseButton);

    expect(buttons).toHaveLength(2);
    expect(wrapper.find('[aria-label="뒤로가기"]').exists()).toBe(false);
    expect(buttons[0]?.classes()).toContain('ds-btn--primary');
    expect(buttons[1]?.classes()).toContain('ds-btn--tertiary');
  });

  it('shows the legacy validation dialog when delete reason is blank after trimming', async () => {
    const wrapper = await mountPage();
    await wrapper
      .get<HTMLTextAreaElement>('textarea[aria-label="\uC0AD\uC81C \uC0AC\uC720"]')
      .setValue('  \n ');

    await wrapper.get('button.een-delete-action--confirm').trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('삭제 사유 입력');
    expect(wrapper.get('[role="dialog"]').text()).toContain(
      '\uC0AD\uC81C \uC0AC\uC720\uB97C \uC785\uB825\uD558\uC138\uC694.',
    );
    expect(router.currentRoute.value.name).toBe('een-delete');
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

  it('leaves empty row values blank instead of showing Null, like Android', async () => {
    await router.replace({
      path: '/een-delete',
      query: { ...router.currentRoute.value.query, actionPoint: '', tagId: '' },
    });
    const wrapper = await mountPage();

    expect(fieldValue(wrapper, 'actionPoint')).toBe('');
    expect(fieldValue(wrapper, 'tagId')).toBe('');
    expect(wrapper.text()).not.toContain('Null');
  });

  it('does not enable deletion when the route has no EEN ID', async () => {
    const wrapper = await mountPage();
    await router.replace({
      path: '/een-delete',
      query: { ...router.currentRoute.value.query, eenId: '' },
    });
    await flushPromises();

    expect(wrapper.get('button.een-delete-action--confirm').attributes('disabled')).toBeDefined();
    expect(deleteSpy).not.toHaveBeenCalled();
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
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(router.currentRoute.value.name).toBe('een-delete');
  });

  it('deletes the selected EEN after confirmation and returns to Setting after success', async () => {
    await router.replace({
      path: '/een-delete',
      query: { ...router.currentRoute.value.query, eenId: 'EEN-0002' },
    });
    const wrapper = await mountPage();
    await wrapper
      .get<HTMLTextAreaElement>('textarea[aria-label="\uC0AD\uC81C \uC0AC\uC720"]')
      .setValue('\uC815\uC815 \uC694\uCCAD');
    await wrapper.get('button.een-delete-action--confirm').trigger('click');
    await wrapper.get('button.een-delete-dialog__confirm').trigger('click');
    await flushPromises();

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy.mock.calls[0]?.[0]).toMatchObject({ eenId: 'EEN-0002' });
    expect(wrapper.get('[role="dialog"]').text()).toContain(
      'EEN \uC0AD\uC81C\uAC00 \uC644\uB8CC \uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
    );
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

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(router.currentRoute.value.name).toBe('een-setting');
    expect(router.currentRoute.value.query.lotId).toBe('LOT-260927-001');
  });

  it('sends legacy delete fields and the unmodified reason to the service', async () => {
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
    deleteSpy.mockResolvedValueOnce({
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
    expect(router.currentRoute.value.name).toBe('een-delete');
  });

  it('does not render a header back button and replaces direct-entry Delete with Setting', async () => {
    const wrapper = await mountPage();
    expect(wrapper.find('button[aria-label="뒤로가기"]').exists()).toBe(false);

    router = createTestRouter();
    await router.push({ path: '/een-delete', query: { eenId: 'EEN-0001' } });
    await router.isReady();
    const directEntryWrapper = await mountPage();
    await directEntryWrapper.get('button.een-delete-action--cancel').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe('een-setting');
    expect(router.options.history.state.back).toBeUndefined();
  });
});
