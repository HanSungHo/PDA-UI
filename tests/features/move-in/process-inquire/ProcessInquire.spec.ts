import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProcessInquire from '../../../../src/features/move-in/pages/ProcessInquire.vue';

const { mockUseProcessInquire } = vi.hoisted(() => ({
  mockUseProcessInquire: vi.fn(),
}));

vi.mock('../../../../src/features/move-in/composables/useProcessInquire', () => ({
  useProcessInquire: mockUseProcessInquire,
}));

describe('ProcessInquire', () => {
  beforeEach(() => {
    mockUseProcessInquire.mockReturnValue({
      form: {
        lotNo: 'LOT-001',
        job: 'JOB-01',
        currentProcess: 'VI(OP01A1)',
        productName: 'HIFI-UI-DEMO',
        quantity: '25',
        currentSlot: '01,02,03,04',
        currentWf: '01,02,03,04',
        semSlot: '05,06,07,08',
        semWf: '05,06,07,08',
      },
      rows: [
        {
          id: 1,
          subOperation: 'CD',
          status: 'N',
          description: 'Dimension check',
        },
        {
          id: 2,
          subOperation: 'OVER',
          status: 'Y',
          description: 'Overlay check',
        },
      ],
      skipCurrentProcess: false,
      scopeSubstitution: false,
      isLoading: false,
      isSubmitting: false,
      isMoveInRunning: false,
      toggleMeasureRow: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
      submitCurrentMeasure: vi.fn(),
    });
  });

  it('renders the page title and measurement rows', async () => {
    const wrapper = mount(ProcessInquire, {
      global: {
        stubs: {
          BaseButton: {
            template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
            props: ['label', 'disabled'],
            emits: ['click'],
          },
          BaseInput: {
            template: '<input :value="modelValue" :disabled="disabled" />',
            props: ['modelValue', 'disabled'],
          },
          BaseCheckbox: {
            template: '<label><slot /></label>',
            props: ['modelValue', 'label'],
          },
        },
      },
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('계측 공정선택');
    expect(wrapper.text()).toContain('LOT NO.');
    expect(wrapper.text()).toContain('CD');
    expect(wrapper.text()).toContain('OVER');
  });

  it('emits cancel when cancel button is clicked', async () => {
    const wrapper = mount(ProcessInquire, {
      global: {
        stubs: {
          BaseButton: {
            template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
            props: ['label', 'disabled'],
            emits: ['click'],
          },
          BaseInput: {
            template: '<input :value="modelValue" :disabled="disabled" />',
            props: ['modelValue', 'disabled'],
          },
          BaseCheckbox: {
            template: '<label><slot /></label>',
            props: ['modelValue', 'label'],
          },
        },
      },
    });

    const buttons = wrapper.findAll('button');
    const cancelButton = buttons.find((button) => button.text().includes('취소'));

    expect(cancelButton).toBeTruthy();

    await cancelButton?.trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('calls submitCurrentMeasure when OK button is clicked', async () => {
    const submitCurrentMeasure = vi.fn();
    mockUseProcessInquire.mockReturnValue({
      form: {
        lotNo: 'LOT-001',
        job: 'JOB-01',
        currentProcess: 'VI(OP01A1)',
        productName: 'HIFI-UI-DEMO',
        quantity: '25',
        currentSlot: '01,02,03,04',
        currentWf: '01,02,03,04',
        semSlot: '05,06,07,08',
        semWf: '05,06,07,08',
      },
      rows: [{ id: 1, subOperation: 'CD', status: 'Y', description: 'Dimension check' }],
      skipCurrentProcess: false,
      scopeSubstitution: false,
      isLoading: false,
      isSubmitting: false,
      isMoveInRunning: false,
      toggleMeasureRow: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
      submitCurrentMeasure,
    });

    const wrapper = mount(ProcessInquire, {
      global: {
        stubs: {
          BaseButton: {
            template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
            props: ['label', 'disabled'],
            emits: ['click'],
          },
          BaseInput: {
            template: '<input :value="modelValue" :disabled="disabled" />',
            props: ['modelValue', 'disabled'],
          },
          BaseCheckbox: {
            template: '<label><slot /></label>',
            props: ['modelValue', 'label'],
          },
        },
      },
    });

    const okButton = wrapper.findAll('button').find((button) => button.text().includes('확인'));
    expect(okButton).toBeTruthy();

    await okButton?.trigger('click');

    expect(submitCurrentMeasure).toHaveBeenCalledTimes(1);
  });
});
