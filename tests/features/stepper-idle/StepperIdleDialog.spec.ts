import { enableAutoUnmount, mount } from '@vue/test-utils';
import { stepperIdleMockMessage } from 'src/features/stepper-idle/mocks/stepper-idle.mock';
import { afterEach, describe, expect, it, vi } from 'vitest';

enableAutoUnmount(afterEach);

// ── Stubs (hoisted so vi.mock factory can reference them) ──────────────────
const { ModalStub, ButtonStub, InputStub } = vi.hoisted(() => {
  const ModalStub = {
    name: 'BaseModal',
    props: ['open', 'width', 'closable', 'overlayClosable'],
    emits: ['update:open', 'cancel'],
    template: `
      <div v-if="open" class="stepper-idle-modal" role="dialog">
        <slot name="title" />
        <slot />
        <slot name="footer" />
      </div>
    `,
  };

  const ButtonStub = {
    name: 'BaseButton',
    props: ['label', 'variant', 'size'],
    emits: ['click'],
    template: `<button :aria-label="label" @click="$emit('click')">{{ label }}</button>`,
  };

  const InputStub = {
    name: 'BaseInput',
    props: ['label', 'modelValue', 'readonly'],
    template: `<label>{{ label }} <span>{{ modelValue }}</span></label>`,
  };

  return { ModalStub, ButtonStub, InputStub };
});

vi.mock('src/components/base', () => ({
  BaseModal: ModalStub,
  BaseButton: ButtonStub,
  BaseInput: InputStub,
}));

import StepperIdleDialog from 'src/features/stepper-idle/components/StepperIdleDialog.vue';

// ── helpers ────────────────────────────────────────────────────────────────
function mountDialog(props: { open: boolean; receiverMessage: string }) {
  return mount(StepperIdleDialog, { props });
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('StepperIdleDialog', () => {
  describe('rendering — parsed data display', () => {
    it('renders STEPPER IDLE title', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      expect(wrapper.text()).toContain('STEPPER IDLE');
    });

    it('renders all four field labels', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      expect(wrapper.text()).toContain('발생시간');
      expect(wrapper.text()).toContain('장비명');
      expect(wrapper.text()).toContain('LOTNAME');
      expect(wrapper.text()).toContain('WAFER_NO');
    });

    it('renders 내용 section label', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      expect(wrapper.text()).toContain('내용');
    });

    it('renders parsed sTime value', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      expect(wrapper.text()).toContain('2026-10-21T09:15:30.000+09:00');
    });

    it('renders parsed sEqpid value', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      expect(wrapper.text()).toContain('STEPPER-EQP-01');
    });

    it('renders parsed sLotid value', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      expect(wrapper.text()).toContain('LOT-DEMO-IDLE-01');
    });

    it('renders parsed sWafer value', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      expect(wrapper.text()).toContain('12');
    });

    it('renders fixed notice text', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      expect(wrapper.text()).toContain('마지막 WAFER 진행 후 7분이상 경과');
    });

    it('renders OK button', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      const btn = wrapper.find('button[aria-label="OK"]');
      expect(btn.exists()).toBe(true);
    });
  });

  describe('rendering — empty / no data', () => {
    it('renders without crashing when receiverMessage is empty', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: '' });
      expect(wrapper.text()).toContain('STEPPER IDLE');
      expect(wrapper.find('button[aria-label="OK"]').exists()).toBe(true);
    });

    it('renders without crashing when message has no INTERLOCKMANAGER', () => {
      const wrapper = mountDialog({
        open: true,
        receiverMessage: '<EVENT_TYPE>RECIPE</EVENT_TYPE>',
      });
      expect(wrapper.text()).toContain('STEPPER IDLE');
    });
  });

  describe('visibility', () => {
    it('shows dialog content when open=true', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    });

    it('hides dialog content when open=false', () => {
      const wrapper = mountDialog({ open: false, receiverMessage: stepperIdleMockMessage });
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    });
  });

  describe('events — OK button', () => {
    it('emits update:open with false when OK is clicked', async () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      await wrapper.find('button[aria-label="OK"]').trigger('click');
      expect(wrapper.emitted('update:open')).toBeTruthy();
      expect(wrapper.emitted('update:open')![0]).toEqual([false]);
    });

    it('emits confirm when OK is clicked', async () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      await wrapper.find('button[aria-label="OK"]').trigger('click');
      expect(wrapper.emitted('confirm')).toBeTruthy();
    });
  });

  describe('BaseModal props contract', () => {
    it('passes closable=false to BaseModal', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      const modal = wrapper.findComponent(ModalStub);
      expect(modal.props('closable')).toBe(false);
    });

    it('passes overlay-closable=false to BaseModal', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      const modal = wrapper.findComponent(ModalStub);
      expect(modal.props('overlayClosable')).toBe(false);
    });

    it('passes open prop through to BaseModal', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      const modal = wrapper.findComponent(ModalStub);
      expect(modal.props('open')).toBe(true);
    });

    it('uses the Figma modal width', () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      const modal = wrapper.findComponent(ModalStub);
      expect(modal.props('width')).toBe('100%');
    });

    it('closes when BaseModal requests dismissal', async () => {
      const wrapper = mountDialog({ open: true, receiverMessage: stepperIdleMockMessage });
      const modal = wrapper.findComponent(ModalStub);

      await modal.vm.$emit('update:open', false);

      expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
      expect(wrapper.emitted('confirm')).toHaveLength(1);
    });
  });
});
