import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';

import { useRework } from '~/features/rework/composables/useRework';
import ReworkPage from '~/features/rework/pages/ReworkPage.vue';

// ---- stub the Base* design-system components so this test doesn't depend
// on their real implementation, and only exercises ReworkPage's own wiring ----

vi.mock('~/components/base', () => ({
  BaseButton: {
    name: 'BaseButton',
    props: {
      label: String,
      variant: String,
      block: Boolean,
      disabled: Boolean,
    },
    emits: ['click'],
    template: `<button type="button" :disabled="disabled" @click="$emit('click')">{{ label }}<slot /></button>`,
  },
}));

vi.mock('~/components/base/checkbox/BaseCheckbox.vue', () => ({
  default: {
    name: 'BaseCheckbox',
    props: { modelValue: Boolean, label: String, disabled: Boolean },
    emits: ['update:modelValue'],
    template: `<input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', $event.target.checked)"
    />`,
  },
}));

vi.mock('~/components/base/dropdown-list/BaseDropdownList.vue', () => ({
  default: {
    name: 'BaseDropdownList',
    props: {
      modelValue: null,
      options: Array,
      label: String,
      block: Boolean,
      disabled: Boolean,
    },
    emits: ['update:modelValue'],
    template: `<select
      :value="modelValue"
      :disabled="disabled"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>`,
  },
}));

vi.mock('~/components/base/input/BaseInput.vue', () => ({
  default: {
    name: 'BaseInput',
    props: {
      modelValue: null,
      label: String,
      disabled: Boolean,
      readonly: Boolean,
    },
    emits: ['update:modelValue'],
    template: `
      <input
        :value="modelValue"
        :disabled="disabled"
        :readonly="readonly"
        @input="$emit('update:modelValue', $event.target.value)"
        @keyup.enter
      />
    `,
  },
}));

vi.mock('~/components/base/modal/BaseModal.vue', () => ({
  default: {
    name: 'BaseModal',
    props: ['open', 'title'],
    template: `<div v-if="open" class="base-modal-stub"><p>{{ title }}</p><slot /></div>`,
  },
}));

vi.mock('~/features/rework/composables/useRework', () => ({
  useRework: vi.fn(),
}));

const mockedUseRework = vi.mocked(useRework);

function buildReworkState(overrides: Partial<ReturnType<typeof useRework>> = {}) {
  return {
    lotNo: ref(''),
    eqpId: ref(''),
    product: ref(''),
    currentOperation: ref(''),
    operator: ref(''),
    qty: ref(''),
    comment: ref(''),
    reworkCodeList: ref([]),
    selectedReworkCode: ref(undefined),
    isReworkCodeSelected: ref(false),
    isCarryChecked: ref(false),
    isCarryEnabled: ref(false),
    isBayStkEnabled: ref(false),
    bayList: ref([]),
    selectedBay: ref(undefined),
    stkList: ref([]),
    selectedStk: ref(undefined),
    isOkEnabled: ref(false),
    isBusy: ref(false),
    messageModalOpen: ref(false),
    messageModal: reactive({ title: 'Error', message: '' }),
    closeMessageModal: vi.fn(),
    init: vi.fn(),
    onCommentEnter: vi.fn(),
    executeRework: vi.fn(),
    handleCancel: vi.fn(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('Rework', () => {
  it('calls init() on mount (legacy: onCreate)', async () => {
    const state = buildReworkState();
    mockedUseRework.mockReturnValue(state);

    mount(ReworkPage);
    await Promise.resolve();

    expect(state.init).toHaveBeenCalledTimes(1);
  });

  it('passes labels and read-only flags to the base inputs and dropdowns', () => {
    mockedUseRework.mockReturnValue(buildReworkState());

    const wrapper = mount(ReworkPage);

    const inputs = wrapper.findAllComponents({ name: 'BaseInput' });
    expect(inputs.map((input) => input.props('label'))).toEqual([
      'LOT No.',
      '장비',
      'COMMENT',
      '제품명',
      '현공정',
      '작업자',
      '수량',
    ]);
    // Only COMMENT is editable
    expect(inputs.map((input) => input.props('readonly'))).toEqual([
      true,
      true,
      false,
      true,
      true,
      true,
      true,
    ]);

    const dropdowns = wrapper.findAllComponents({ name: 'BaseDropdownList' });
    expect(dropdowns.map((dropdown) => dropdown.props('label'))).toEqual(['RW CODE', 'BAY', 'STK']);
  });

  describe('OK / cancel buttons', () => {
    it('disables the OK button when isOkEnabled is false', () => {
      const state = buildReworkState({ isOkEnabled: ref(false) });
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);
      const okButton = wrapper.findAll('button').find((b) => b.text() === '확인');

      expect(okButton?.attributes('disabled')).toBeDefined();
    });

    it('disables the OK button while isBusy is true even if isOkEnabled is true', () => {
      const state = buildReworkState({ isOkEnabled: ref(true), isBusy: ref(true) });
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);
      const okButton = wrapper.findAll('button').find((b) => b.text() === '확인');

      expect(okButton?.attributes('disabled')).toBeDefined();
    });

    it('enables the OK button and calls executeRework on click once ready', async () => {
      const state = buildReworkState({ isOkEnabled: ref(true), isBusy: ref(false) });
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);
      const okButton = wrapper.findAll('button').find((b) => b.text() === '확인');

      expect(okButton?.attributes('disabled')).toBeUndefined();

      await okButton?.trigger('click');

      expect(state.executeRework).toHaveBeenCalledTimes(1);
    });

    it('calls handleCancel when the cancel button is clicked', async () => {
      const state = buildReworkState();
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);
      const cancelButton = wrapper.findAll('button').find((b) => b.text() === '취소');
      await cancelButton?.trigger('click');

      expect(state.handleCancel).toHaveBeenCalledTimes(1);
    });

    it('calls handleCancel when the back header button is clicked', async () => {
      const state = buildReworkState();
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);
      await wrapper.find('.rework-legacy__back').trigger('click');

      expect(state.handleCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('carry / BAY / STK enable state', () => {
    it('disables the carry checkbox when isCarryEnabled is false', () => {
      const state = buildReworkState({ isCarryEnabled: ref(false) });
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);

      expect(wrapper.find('input[type="checkbox"]').attributes('disabled')).toBeDefined();
    });

    it('enables the carry checkbox when isCarryEnabled is true', () => {
      const state = buildReworkState({ isCarryEnabled: ref(true) });
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);

      expect(wrapper.find('input[type="checkbox"]').attributes('disabled')).toBeUndefined();
    });

    it('disables the BAY/STK dropdowns when isBayStkEnabled is false', () => {
      const state = buildReworkState({ isBayStkEnabled: ref(false) });
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);
      const selects = wrapper.findAll('select');

      // RW CODE select is always enabled; BAY and STK are the two after it
      expect(selects[0]?.attributes('disabled')).toBeUndefined();
      expect(selects[1]?.attributes('disabled')).toBeDefined();
      expect(selects[2]?.attributes('disabled')).toBeDefined();
    });

    it('enables the BAY/STK dropdowns when isBayStkEnabled is true', () => {
      const state = buildReworkState({ isBayStkEnabled: ref(true) });
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);
      const selects = wrapper.findAll('select');

      expect(selects[1]?.attributes('disabled')).toBeUndefined();
      expect(selects[2]?.attributes('disabled')).toBeUndefined();
    });
  });

  describe('message modal', () => {
    it('shows the message modal with the title/message from state, and closes it on confirm', async () => {
      const state = buildReworkState({
        messageModalOpen: ref(true),
        messageModal: reactive({
          title: 'Error',
          message: 'REWORK코드를 선택하세요.',
        }),
      });
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);
      const modal = wrapper.find('.base-modal-stub');

      expect(modal.exists()).toBe(true);
      expect(modal.text()).toContain('REWORK코드를 선택하세요.');
      expect(modal.text()).toContain('Error');

      const confirmButton = modal.findAll('button').find((b) => b.text() === '확인');
      await confirmButton?.trigger('click');

      expect(state.closeMessageModal).toHaveBeenCalledTimes(1);
    });

    it('hides the message modal when messageModalOpen is false', () => {
      const state = buildReworkState({ messageModalOpen: ref(false) });
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);

      expect(wrapper.find('.base-modal-stub').exists()).toBe(false);
    });
  });

  describe('v-model wiring', () => {
    it('updates state when dropdowns, comment and carry checkbox change', async () => {
      const state = buildReworkState({
        reworkCodeList: ref([{ value: 'RW01', label: 'RW01' }]),
        bayList: ref([{ value: 'B01', label: 'B01' }]),
        stkList: ref([{ value: 'S01', label: 'S01' }]),
        isCarryEnabled: ref(true),
        isBayStkEnabled: ref(true),
      });
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);

      // RW CODE / BAY / STK
      const selects = wrapper.findAll('select');
      await selects[0]?.setValue('RW01');
      await selects[1]?.setValue('B01');
      await selects[2]?.setValue('S01');

      expect(state.selectedReworkCode.value).toBe('RW01');
      expect(state.selectedBay.value).toBe('B01');
      expect(state.selectedStk.value).toBe('S01');

      // COMMENT is the 3rd BaseInput
      const inputs = wrapper
        .findAll('input')
        .filter((input) => input.attributes('type') !== 'checkbox');
      await inputs[2]?.setValue('test comment');

      expect(state.comment.value).toBe('test comment');

      // carry checkbox
      await wrapper.find('input[type="checkbox"]').setValue(true);

      expect(state.isCarryChecked.value).toBe(true);
    });

    it('calls onCommentEnter when Enter is pressed in the comment input', async () => {
      const state = buildReworkState();
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);

      // COMMENT is the 3rd BaseInput
      const inputs = wrapper.findAll('input');
      await inputs[2]?.trigger('keyup.enter');

      expect(state.onCommentEnter).toHaveBeenCalledTimes(1);
    });

    it('covers all component event bindings', async () => {
      const state = buildReworkState({
        reworkCodeList: ref([{ value: 'RW01', label: 'RW01' }]),
        bayList: ref([{ value: 'B01', label: 'B01' }]),
        stkList: ref([{ value: 'S01', label: 'S01' }]),
        isCarryEnabled: ref(true),
        isBayStkEnabled: ref(true),
        isOkEnabled: ref(true),
      });
      mockedUseRework.mockReturnValue(state);

      const wrapper = mount(ReworkPage);

      // BaseInput: lotNo, eqpId, comment, product, currentOperation, operator, qty
      const inputFields = wrapper.findAllComponents({ name: 'BaseInput' });

      await inputFields[0]?.vm.$emit('update:modelValue', 'LOT001');
      await inputFields[1]?.vm.$emit('update:modelValue', 'EQP001');
      await inputFields[2]?.vm.$emit('update:modelValue', 'COMMENT');
      await inputFields[3]?.vm.$emit('update:modelValue', 'PRODUCT001');
      await inputFields[4]?.vm.$emit('update:modelValue', 'OP001');
      await inputFields[5]?.vm.$emit('update:modelValue', 'OPERATOR');
      await inputFields[6]?.vm.$emit('update:modelValue', '100');

      expect(state.lotNo.value).toBe('LOT001');
      expect(state.eqpId.value).toBe('EQP001');
      expect(state.comment.value).toBe('COMMENT');
      expect(state.product.value).toBe('PRODUCT001');
      expect(state.currentOperation.value).toBe('OP001');
      expect(state.operator.value).toBe('OPERATOR');
      expect(state.qty.value).toBe('100');

      // Comment Enter
      await inputFields[2]?.find('input').trigger('keyup', { key: 'Enter' });

      expect(state.onCommentEnter).toHaveBeenCalledTimes(1);

      // BaseDropdownList: RW CODE / BAY / STK
      const dropdowns = wrapper.findAllComponents({ name: 'BaseDropdownList' });

      await dropdowns[0]?.vm.$emit('update:modelValue', 'RW01');
      await dropdowns[1]?.vm.$emit('update:modelValue', 'B01');
      await dropdowns[2]?.vm.$emit('update:modelValue', 'S01');

      expect(state.selectedReworkCode.value).toBe('RW01');
      expect(state.selectedBay.value).toBe('B01');
      expect(state.selectedStk.value).toBe('S01');

      // BaseCheckbox
      const checkbox = wrapper.findComponent({ name: 'BaseCheckbox' });
      await checkbox.vm.$emit('update:modelValue', true);

      expect(state.isCarryChecked.value).toBe(true);

      // BaseButton events
      const buttons = wrapper.findAllComponents({ name: 'BaseButton' });
      const okButton = buttons.find((button) => button.props('label') === '확인');
      const cancelButton = buttons.find((button) => button.props('label') === '취소');

      await okButton?.vm.$emit('click');
      expect(state.executeRework).toHaveBeenCalled();

      await cancelButton?.vm.$emit('click');
      expect(state.handleCancel).toHaveBeenCalled();

      // Modal confirm button
      state.messageModalOpen.value = true;
      await wrapper.vm.$nextTick();

      const modalButtons = wrapper
        .find('.base-modal-stub')
        .findAllComponents({ name: 'BaseButton' });

      await modalButtons[0]?.vm.$emit('click');

      expect(state.closeMessageModal).toHaveBeenCalled();
    });
  });
});
