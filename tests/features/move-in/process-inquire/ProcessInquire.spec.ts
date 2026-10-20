/* eslint-disable vue/one-component-per-file */
import { type DOMWrapper, flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';

import ProcessInquire from '../../../../src/features/move-in/pages/ProcessInquire.vue';

const { mockUseProcessInquire, mockUseConfirmModal } = vi.hoisted(() => ({
  mockUseProcessInquire: vi.fn(),
  mockUseConfirmModal: vi.fn(),
}));

vi.mock('../../../../src/features/move-in/composables/useProcessInquire', () => ({
  useProcessInquire: mockUseProcessInquire,
}));

vi.mock('../../../../src/features/move-in/composables/useConfirmModal', () => ({
  useConfirmModal: mockUseConfirmModal,
}));

// Stub toàn bộ base components để test không phụ thuộc Quasar.
vi.mock('../../../../src/components/base', async () => {
  const { defineComponent, h } = await import('vue');

  const BaseButton = defineComponent({
    name: 'BaseButton',
    props: {
      label: { type: String, default: '' },
      disabled: Boolean,
      loading: Boolean,
      size: { type: String, default: 'medium' },
      variant: { type: String, default: 'primary' },
    },
    emits: ['click'],
    setup(props, { emit }) {
      return () =>
        h(
          'button',
          { type: 'button', disabled: props.disabled, onClick: () => emit('click') },
          props.label,
        );
    },
  });

  const BaseInput = defineComponent({
    name: 'BaseInput',
    props: {
      modelValue: { type: [String, Number], default: '' },
      label: { type: String, default: '' },
      disabled: Boolean,
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      return () =>
        h('label', [
          h('span', props.label),
          h('input', {
            type: 'text',
            value: props.modelValue,
            disabled: props.disabled,
            onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
          }),
        ]);
    },
  });

  const BaseCheckbox = defineComponent({
    name: 'BaseCheckbox',
    props: {
      modelValue: Boolean,
      label: { type: String, default: '' },
      disabled: Boolean,
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      return () =>
        h('label', [
          h('input', {
            type: 'checkbox',
            checked: props.modelValue,
            disabled: props.disabled,
            onChange: (e: Event) =>
              emit('update:modelValue', (e.target as HTMLInputElement).checked),
          }),
          props.label,
        ]);
    },
  });

  // Chỉ render nội dung khi open = true, giống modal thật.
  const BaseModal = defineComponent({
    name: 'BaseModal',
    props: {
      open: Boolean,
      title: { type: String, default: '' },
    },
    emits: ['update:open', 'cancel'],
    setup(props, { emit, slots }) {
      return () =>
        props.open
          ? h('div', { class: 'base-modal', 'data-title': props.title }, [
              h('button', { class: 'modal-x', type: 'button', onClick: () => emit('cancel') }, 'x'),
              h('div', { class: 'modal-body' }, slots.default?.()),
              h('div', { class: 'modal-footer' }, slots.footer?.()),
            ])
          : null;
    },
  });

  return { BaseButton, BaseInput, BaseCheckbox, BaseModal };
});

const WAFER_TITLE = 'WAFER 선택';

let waferFixedCount = 2;
let confirmModal: {
  modalOpen: ReturnType<typeof ref<boolean>>;
  modalTitle: ReturnType<typeof ref<string>>;
  modalMessage: ReturnType<typeof ref<string>>;
  modalType: ReturnType<typeof ref<string>>;
  resolveModal: ReturnType<typeof vi.fn>;
  handleModalCancel: ReturnType<typeof vi.fn>;
};
let composable: {
  form: Record<string, string>;
  rows: Array<{ id: number; subOperation: string; status: string; description: string }>;
  skipCurrentProcess: ReturnType<typeof ref<boolean>>;
  scopeSubstitution: ReturnType<typeof ref<boolean>>;
  isCurrentOperationSkipEnabled: ReturnType<typeof ref<boolean>>;
  isLoading: ReturnType<typeof ref<boolean>>;
  isSubmitting: ReturnType<typeof ref<boolean>>;
  toggleMeasureRow: ReturnType<typeof vi.fn>;
  initialize: ReturnType<typeof vi.fn>;
  submitCurrentMeasure: ReturnType<typeof vi.fn>;
  getWaferSelectPayload: ReturnType<typeof vi.fn>;
};

function mountPage() {
  return mount(ProcessInquire);
}

function findButtonByText(
  root: { findAll: (selector: string) => DOMWrapper<Element>[] },
  text: string,
) {
  return root.findAll('button').find((button) => button.text() === text);
}

function waferModal(wrapper: ReturnType<typeof mountPage>) {
  return wrapper.find(`[data-title="${WAFER_TITLE}"]`);
}

// Thứ tự nút W/H: currentSlot, currentWf, semSlot, semWf
async function openWafer(wrapper: ReturnType<typeof mountPage>, index: number) {
  const whButtons = wrapper.findAll('button').filter((button) => button.text() === 'W/H');
  await whButtons[index].trigger('click');
}

describe('ProcessInquire', () => {
  beforeEach(() => {
    waferFixedCount = 2;

    confirmModal = {
      modalOpen: ref(false),
      modalTitle: ref('확인'),
      modalMessage: ref('Message'),
      modalType: ref('confirm'),
      resolveModal: vi.fn(),
      handleModalCancel: vi.fn(),
    };
    mockUseConfirmModal.mockReturnValue(confirmModal);

    composable = {
      form: reactive({
        lotNo: 'LOT-001',
        job: 'JOB-01',
        currentProcess: 'VI(OP01A1)',
        productName: 'HIFI-UI-DEMO',
        quantity: '25',
        currentSlot: '01,02,03,04',
        currentWf: '01,02,03,04',
        semSlot: '05,06,07,08',
        semWf: '05,06,07,08',
      }),
      rows: [
        { id: 1, subOperation: 'CD', status: 'N', description: 'Dimension check' },
        { id: 2, subOperation: 'OVER', status: 'Y', description: 'Overlay check' },
        { id: 3, subOperation: 'THK', status: 'C', description: 'Thickness check' },
      ],
      skipCurrentProcess: ref(false),
      scopeSubstitution: ref(false),
      isCurrentOperationSkipEnabled: ref(true),
      isLoading: ref(false),
      isSubmitting: ref(false),
      toggleMeasureRow: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
      submitCurrentMeasure: vi.fn(),
      getWaferSelectPayload: vi.fn((target: string) =>
        target.endsWith('Slot')
          ? {
              target,
              lotId: 'LOT-001',
              existingWaferList: 'Slot.01,Slot.02,Slot.03',
              fixedCount: waferFixedCount,
            }
          : {
              target,
              lotId: 'LOT-001',
              existingWaferList: 'LOT-001.01,LOT-001.02,LOT-001.03',
              fixedCount: waferFixedCount,
            },
      ),
    };
    mockUseProcessInquire.mockReturnValue(composable);
  });

  describe('render & lifecycle', () => {
    it('renders the page title, product info and measurement rows', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('계측 공정선택');
      expect(wrapper.text()).toContain('LOT NO.');
      expect(wrapper.text()).toContain('CD');
      expect(wrapper.text()).toContain('OVER');
      expect(wrapper.text()).toContain('THK');
    });

    it('applies is-selected / is-complete classes based on row status', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const trs = wrapper.findAll('tbody tr');
      expect(trs[0].classes()).not.toContain('is-selected');
      expect(trs[1].classes()).toContain('is-selected');
      expect(trs[2].classes()).toContain('is-complete');
    });

    it('calls initialize on mount', async () => {
      mountPage();
      await flushPromises();

      expect(composable.initialize).toHaveBeenCalledTimes(1);
    });

    it('emits complete when the composable onComplete callback is invoked', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const options = mockUseProcessInquire.mock.calls[0][0] as {
        onComplete: (result: unknown) => void;
      };
      const result = { ok: true };
      options.onComplete(result);

      expect(wrapper.emitted('complete')).toHaveLength(1);
      expect(wrapper.emitted('complete')?.[0]).toEqual([result]);
    });
  });

  describe('user interactions', () => {
    it('calls toggleMeasureRow when a row is clicked', async () => {
      const wrapper = mountPage();
      await flushPromises();

      await wrapper.findAll('tbody tr')[0].trigger('click');

      expect(composable.toggleMeasureRow).toHaveBeenCalledTimes(1);
      expect(composable.toggleMeasureRow).toHaveBeenCalledWith(composable.rows[0]);
    });

    it('emits cancel when cancel button is clicked', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const cancelButton = findButtonByText(wrapper.find('.bottom-section'), '취소');
      expect(cancelButton).toBeTruthy();

      await cancelButton?.trigger('click');

      expect(wrapper.emitted('cancel')).toHaveLength(1);
    });

    it('calls submitCurrentMeasure when OK button is clicked', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const okButton = findButtonByText(wrapper.find('.bottom-section'), '확인');
      expect(okButton).toBeTruthy();

      await okButton?.trigger('click');

      expect(composable.submitCurrentMeasure).toHaveBeenCalledTimes(1);
    });

    it('disables OK button while loading', async () => {
      composable.isLoading.value = true;
      const wrapper = mountPage();
      await flushPromises();

      const okButton = findButtonByText(wrapper.find('.bottom-section'), '확인');
      expect(okButton?.attributes('disabled')).toBeDefined();
    });

    it('updates form when editable inputs change (v-model)', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const editableInputs = wrapper.findAll('input[type="text"]:not([disabled])');
      expect(editableInputs).toHaveLength(4);

      await editableInputs[0].setValue('09,10');

      expect(composable.form.currentSlot).toBe('09,10');
    });

    it('updates skipCurrentProcess and scopeSubstitution via checkboxes', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(2);

      await checkboxes[0].setValue(true);
      await checkboxes[1].setValue(true);

      expect(composable.skipCurrentProcess.value).toBe(true);
      expect(composable.scopeSubstitution.value).toBe(true);
    });

    it('disables the skip checkbox when current operation skip is not enabled', async () => {
      composable.isCurrentOperationSkipEnabled.value = false;
      const wrapper = mountPage();
      await flushPromises();

      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      expect(checkboxes[0].attributes('disabled')).toBeDefined();
      expect(checkboxes[1].attributes('disabled')).toBeUndefined();
    });
  });

  describe('wafer select modal', () => {
    it('opens the wafer modal with option labels when W/H is clicked', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(waferModal(wrapper).exists()).toBe(false);

      await openWafer(wrapper, 1);

      expect(composable.getWaferSelectPayload).toHaveBeenCalledWith('currentWf');
      const modal = waferModal(wrapper);
      expect(modal.exists()).toBe(true);
      expect(modal.text()).toContain('LOT-001');

      const optionButtons = modal.findAll('.wafer-option');
      expect(optionButtons.map((b) => b.text())).toEqual(['01', '02', '03']);
    });

    it('toggles an option on and off', async () => {
      const wrapper = mountPage();
      await flushPromises();
      await openWafer(wrapper, 1);

      const option = waferModal(wrapper).find('button[aria-label="LOT-001.01"]');

      await option.trigger('click');
      expect(option.attributes('aria-pressed')).toBe('true');
      expect(waferModal(wrapper).find('.selected-wafer-list').text()).toBe('LOT-001.01');

      await option.trigger('click');
      expect(option.attributes('aria-pressed')).toBe('false');
      expect(waferModal(wrapper).find('.selected-wafer-list').text()).toBe('');
    });

    it('does not select more options than fixedCount', async () => {
      const wrapper = mountPage();
      await flushPromises();
      await openWafer(wrapper, 1);

      const modal = waferModal(wrapper);
      await modal.find('button[aria-label="LOT-001.01"]').trigger('click');
      await modal.find('button[aria-label="LOT-001.02"]').trigger('click');
      await modal.find('button[aria-label="LOT-001.03"]').trigger('click');

      expect(modal.find('.selected-wafer-list').text()).toBe('LOT-001.01, LOT-001.02');
      expect(modal.find('button[aria-label="LOT-001.03"]').attributes('aria-pressed')).toBe(
        'false',
      );
    });

    it('select-all picks up to fixedCount options', async () => {
      const wrapper = mountPage();
      await flushPromises();
      await openWafer(wrapper, 1);

      const modal = waferModal(wrapper);
      await findButtonByText(modal, '전체선택')?.trigger('click');

      expect(modal.find('.selected-wafer-list').text()).toBe('LOT-001.01, LOT-001.02');
    });

    it('select-all toggles back to empty when every option is already selected', async () => {
      waferFixedCount = 3;
      const wrapper = mountPage();
      await flushPromises();
      await openWafer(wrapper, 1);

      const modal = waferModal(wrapper);
      const selectAll = findButtonByText(modal, '전체선택');

      await selectAll?.trigger('click');
      expect(modal.find('.selected-wafer-list').text()).toBe('LOT-001.01, LOT-001.02, LOT-001.03');

      await selectAll?.trigger('click');
      expect(modal.find('.selected-wafer-list').text()).toBe('');
    });

    it('confirm writes selected wafers (without lot prefix) into the form and closes', async () => {
      const wrapper = mountPage();
      await flushPromises();
      await openWafer(wrapper, 1); // currentWf

      const modal = waferModal(wrapper);
      await modal.find('button[aria-label="LOT-001.01"]').trigger('click');
      await modal.find('button[aria-label="LOT-001.02"]').trigger('click');
      await findButtonByText(modal.find('.modal-footer'), '확인')?.trigger('click');

      expect(composable.form.currentWf).toBe('01,02');
      expect(waferModal(wrapper).exists()).toBe(false);
    });

    it('confirm strips the "Slot." prefix for slot targets', async () => {
      const wrapper = mountPage();
      await flushPromises();
      await openWafer(wrapper, 0); // currentSlot

      const modal = waferModal(wrapper);
      await modal.find('button[aria-label="Slot.01"]').trigger('click');
      await modal.find('button[aria-label="Slot.03"]').trigger('click');
      await findButtonByText(modal.find('.modal-footer'), '확인')?.trigger('click');

      expect(composable.form.currentSlot).toBe('01,03');
      expect(waferModal(wrapper).exists()).toBe(false);
    });

    it('cancel button clears the target field and closes the modal', async () => {
      const wrapper = mountPage();
      await flushPromises();
      await openWafer(wrapper, 2); // semSlot

      const modal = waferModal(wrapper);
      await findButtonByText(modal.find('.modal-footer'), '취소')?.trigger('click');

      expect(composable.form.semSlot).toBe('');
      expect(waferModal(wrapper).exists()).toBe(false);
    });

    it('modal cancel event also clears the target field and closes the modal', async () => {
      const wrapper = mountPage();
      await flushPromises();
      await openWafer(wrapper, 3); // semWf

      await waferModal(wrapper).find('.modal-x').trigger('click');

      expect(composable.form.semWf).toBe('');
      expect(waferModal(wrapper).exists()).toBe(false);
    });
  });

  describe('common alert / confirm modal', () => {
    it('shows message and both buttons for confirm type', async () => {
      confirmModal.modalOpen.value = true;
      confirmModal.modalType.value = 'confirm';
      confirmModal.modalTitle.value = '확인 필요';
      confirmModal.modalMessage.value = 'Continue?';

      const wrapper = mountPage();
      await flushPromises();

      const modal = wrapper.find('[data-title="확인 필요"]');
      expect(modal.exists()).toBe(true);
      expect(modal.text()).toContain('Continue?');

      const footer = modal.find('.modal-footer');
      await findButtonByText(footer, '취소')?.trigger('click');
      expect(confirmModal.resolveModal).toHaveBeenLastCalledWith(false);

      await findButtonByText(footer, '확인')?.trigger('click');
      expect(confirmModal.resolveModal).toHaveBeenLastCalledWith(true);
    });

    it('hides the cancel button for alert type', async () => {
      confirmModal.modalOpen.value = true;
      confirmModal.modalType.value = 'alert';
      confirmModal.modalTitle.value = '알림';

      const wrapper = mountPage();
      await flushPromises();

      const footer = wrapper.find('[data-title="알림"] .modal-footer');
      expect(findButtonByText(footer, '취소')).toBeUndefined();
      expect(findButtonByText(footer, '확인')).toBeTruthy();
    });

    it('calls handleModalCancel when the modal emits cancel', async () => {
      confirmModal.modalOpen.value = true;
      confirmModal.modalTitle.value = '알림';

      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('[data-title="알림"] .modal-x').trigger('click');

      expect(confirmModal.handleModalCancel).toHaveBeenCalledTimes(1);
    });
  });
});
