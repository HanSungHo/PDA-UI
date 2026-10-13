import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProcessInquire from '../../../src/features/move-in/pages/ProcessInquire.vue';

const { mockUseProcessInquire } = vi.hoisted(() => ({
  mockUseProcessInquire: vi.fn(),
}));

vi.mock('../../../src/features/move-in/composables/useProcessInquire', () => ({
  useProcessInquire: mockUseProcessInquire,
}));

describe('ProcessInquire', () => {
  const createProcessInquireState = () => ({
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
      { id: 1, subOperation: 'CD', status: 'N', description: 'Dimension check' },
      { id: 2, subOperation: 'OVER', status: 'Y', description: 'Overlay check' },
    ],
    skipCurrentProcess: false,
    scopeSubstitution: false,
    isLoading: false,
    isSubmitting: false,
    isCurrentOperationSkipEnabled: false,
    toggleMeasureRow: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    submitCurrentMeasure: vi.fn(),
    getWaferSelectPayload: vi.fn((target: string) => ({
      lotId: 'LOT-001',
      existingWaferList: target.endsWith('Slot') ? 'Slot.01,Slot.02' : 'LOT-001.01,LOT-001.02',
      fixedCount: 2,
      target,
    })),
  });

  beforeEach(() => {
    mockUseProcessInquire.mockReturnValue(createProcessInquireState());
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

    expect(wrapper.get('.title').text()).toContain('계측 공정선택');
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

    const cancelButton = wrapper.get('.cancel-btn');
    expect(cancelButton.text()).toContain('취소');
    await cancelButton.trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('does not render a header back button', async () => {
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
            props: ['modelValue', 'label', 'disabled'],
          },
        },
      },
    });

    expect(wrapper.find('[aria-label="뒤로"]').exists()).toBe(false);
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

    const okButton = wrapper.get('.confirm-btn');
    expect(okButton.text()).toContain('확인');
    await okButton.trigger('click');

    expect(submitCurrentMeasure).toHaveBeenCalledTimes(1);
  });

  it('returns selected slot and wafer values to their matching fields', async () => {
    const state = createProcessInquireState();
    mockUseProcessInquire.mockReturnValue(state);

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
          BaseModal: {
            template:
              '<section v-if="open" class="test-modal"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>',
            props: ['open', 'title'],
          },
        },
      },
    });

    await wrapper.find('.wh-button button').trigger('click');
    expect(wrapper.find('.wafer-select-modal').exists()).toBe(true);
    expect(wrapper.get('.wafer-option').text()).toBe('01');

    await wrapper.get('.wafer-option').trigger('click');
    const confirmWaferSelection = async () => {
      const confirm = wrapper
        .find('.test-modal')
        .findAll('button')
        .find((button) => button.text().trim() === '확인');
      await confirm?.trigger('click');
    };
    await confirmWaferSelection();

    expect(state.form.currentSlot).toBe('01');
    expect(wrapper.find('.wafer-select-modal').exists()).toBe(false);

    await wrapper.findAll('.wh-button button')[1].trigger('click');
    expect(wrapper.get('.wafer-option').attributes('aria-label')).toBe('LOT-001.01');
    await wrapper.get('.wafer-option').trigger('click');
    await confirmWaferSelection();

    expect(state.form.currentWf).toBe('01');
  });

  it('clears the target field when the wafer picker is cancelled', async () => {
    const state = createProcessInquireState();
    mockUseProcessInquire.mockReturnValue(state);

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
          BaseModal: {
            template:
              '<section v-if="open" class="test-modal"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>',
            props: ['open', 'title'],
          },
        },
      },
    });

    await wrapper.findAll('.wh-button button')[3].trigger('click');
    await wrapper
      .find('.test-modal')
      .findAll('button')
      .find((button) => button.text().trim() === '취소')
      ?.trigger('click');

    expect(state.form.semWf).toBe('');
    expect(wrapper.find('.wafer-select-modal').exists()).toBe(false);
  });
});
