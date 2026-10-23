import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import NotificationPage from '~/features/notification/pages/NotificationPage.vue';
import type { NotificationInboundParams } from '~/features/notification/types/notification.types';

// Renders title / default / footer slots only when open
const BaseModalStub = defineComponent({
  name: 'BaseModal',
  props: { open: { type: Boolean, default: false } },
  emits: ['cancel', 'update:open'],
  setup(props, { slots }) {
    return () =>
      props.open
        ? h('div', { class: 'base-modal-stub' }, [
            h('div', { class: 'base-modal-stub__title' }, slots.title?.()),
            h('div', { class: 'base-modal-stub__body' }, slots.default?.()),
            h('div', { class: 'base-modal-stub__footer' }, slots.footer?.()),
          ])
        : null;
  },
});

const BaseButtonStub = defineComponent({
  name: 'BaseButton',
  props: {
    label: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        { class: 'base-button-stub', disabled: props.disabled, onClick: () => emit('click') },
        props.label,
      );
  },
});

// id and class fall through to the root element
const BaseChipStub = defineComponent({
  name: 'BaseChip',
  props: { label: { type: String, default: '' } },
  setup(props) {
    return () => h('span', { class: 'base-chip-stub' }, props.label);
  },
});

// Cells are joined by "</": 0 time, 2 eqpid, 3 lotId, 6 level, 7 desc
function buildAlarmMessage(level = '3', prefix = ''): string {
  const cells = [
    '<T>2024-01-05T10:20:30+09:00',
    '<X>x',
    '<E>EQP01',
    '<L>LOT01',
    '<A>a',
    '<B>b',
    `<V>${level}`,
    '<D>foo;Reason : overheat',
  ];
  return `INTERLOCKMANAGER${prefix}<Table diffgr:` + cells.join('</');
}

// onCreate runs in onMounted, so wait one tick for the re-render before asserting
async function mountModal(
  props: { modelValue?: boolean; inboundParams?: NotificationInboundParams } = {},
) {
  const wrapper = mount(NotificationPage, {
    props: { modelValue: true, ...props },
    global: {
      stubs: {
        BaseModal: BaseModalStub,
        BaseButton: BaseButtonStub,
        BaseChip: BaseChipStub,
      },
    },
  });
  await nextTick();
  return wrapper;
}

describe('NotificationModal', () => {
  describe('rendering', () => {
    it('renders the header title slot', async () => {
      const wrapper = await mountModal({ inboundParams: { UDP_RECEIVER_MESSAGE: 'hello' } });
      expect(wrapper.find('.notification-modal__title').text()).toBe('ALARM');
    });

    it('renders a plain message without the title chip', async () => {
      const wrapper = await mountModal({ inboundParams: { UDP_RECEIVER_MESSAGE: 'hello' } });
      expect(wrapper.find('#title_receiver_message').exists()).toBe(false);
      expect(wrapper.find('#txt_receiver_message').text()).toBe('hello');
      expect(wrapper.find('#LinearLayout_NEW').exists()).toBe(true);
      expect(wrapper.find('#LinearLayout_Child').exists()).toBe(true);
    });

    it('renders the OK button in the footer slot', async () => {
      const wrapper = await mountModal({ inboundParams: { UDP_RECEIVER_MESSAGE: 'hello' } });
      const button = wrapper.find('.base-modal-stub__footer #btn_ok');
      expect(button.exists()).toBe(true);
      expect(button.text()).toBe('OK');
      expect(button.attributes('disabled')).toBeUndefined();
    });

    it('renders nothing inside the modal when closed', async () => {
      const wrapper = await mountModal({ modelValue: false });
      expect(wrapper.find('.base-modal-stub').exists()).toBe(false);
    });
  });

  describe('title chip', () => {
    it.each(['1', '2', '3'])('shows "#ALARM#" with the matching level class', async (level) => {
      const wrapper = await mountModal({
        inboundParams: {
          UDP_RECEIVER_MESSAGE: buildAlarmMessage(level),
        },
      });

      const chip = wrapper.find('#title_receiver_message');

      expect(chip.exists()).toBe(true);
      expect(chip.text()).toBe('#ALARM#');

      expect(chip.classes()).toContain('notification-modal__title-chip');

      expect(chip.classes()).toContain(`notification-modal__title-chip--level-${level}`);
    });

    it('shows the default alarm title for an unknown level', async () => {
      const wrapper = await mountModal({
        inboundParams: {
          UDP_RECEIVER_MESSAGE: buildAlarmMessage('9'),
        },
      });

      const chip = wrapper.find('#title_receiver_message');

      expect(chip.text()).toBe('#ALARM#');

      expect(chip.classes()).toContain('notification-modal__title-chip');

      expect(chip.classes().some((c) => c.includes('--level-'))).toBe(false);
    });

    it('falls back to the original title text when there is no level', async () => {
      const wrapper = await mountModal({
        inboundParams: { UDP_RECEIVER_MESSAGE: buildAlarmMessage('') },
      });
      const chip = wrapper.find('#title_receiver_message');
      expect(chip.text()).toBe('#ALARM#');
      expect(chip.classes()).not.toContain('notification-modal__title-chip--level-1');
    });

    it('renders the alarm details in the message body', async () => {
      const wrapper = await mountModal({
        inboundParams: { UDP_RECEIVER_MESSAGE: buildAlarmMessage('1') },
      });
      const text = wrapper.find('#txt_receiver_message').text();
      expect(text).toContain('EQPID: EQP01');
      expect(text).toContain('TIME: 2024-01-05 10:20:30');
      expect(text).toContain('LOTID: LOT01');
      expect(text).toContain('DESC: overheat');
    });

    it('hides the chip for an ASML error message', async () => {
      const wrapper = await mountModal({
        inboundParams: {
          UDP_RECEIVER_MESSAGE: buildAlarmMessage('1', ' ALARM_ID    : 1414725736 '),
        },
      });
      expect(wrapper.find('#title_receiver_message').exists()).toBe(false);
      expect(wrapper.find('#txt_receiver_message').text()).toContain('Mask 없음');
    });
  });

  describe('events', () => {
    it('emits update:modelValue(false) and close when OK is clicked', async () => {
      const wrapper = await mountModal({ inboundParams: { UDP_RECEIVER_MESSAGE: 'x' } });
      await wrapper.find('#btn_ok').trigger('click');
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('emits update:modelValue and close when the modal requests close', async () => {
      const wrapper = await mountModal();
      wrapper.findComponent(BaseModalStub).vm.$emit('update:open', false);
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('emits only update:modelValue when the modal requests open', async () => {
      const wrapper = await mountModal();
      wrapper.findComponent(BaseModalStub).vm.$emit('update:open', true);
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('closes on the modal cancel event', async () => {
      const wrapper = await mountModal();
      wrapper.findComponent(BaseModalStub).vm.$emit('cancel');
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });

  describe('watch', () => {
    it('re-parses the message when the modal is opened', async () => {
      const wrapper = await mountModal({
        modelValue: false,
        inboundParams: { UDP_RECEIVER_MESSAGE: 'first' },
      });
      // Changing the message while closed must not break anything
      await wrapper.setProps({ inboundParams: { UDP_RECEIVER_MESSAGE: 'second' } });
      await wrapper.setProps({ modelValue: true });
      expect(wrapper.find('#txt_receiver_message').text()).toBe('second');
    });

    it('re-parses when the message changes while open', async () => {
      const wrapper = await mountModal({ inboundParams: { UDP_RECEIVER_MESSAGE: 'first' } });
      await wrapper.setProps({ inboundParams: { UDP_RECEIVER_MESSAGE: 'second' } });
      expect(wrapper.find('#txt_receiver_message').text()).toBe('second');
    });

    it('updates the chip when the message switches from alarm to plain', async () => {
      const wrapper = await mountModal({
        inboundParams: { UDP_RECEIVER_MESSAGE: buildAlarmMessage('2') },
      });
      expect(wrapper.find('#title_receiver_message').text()).toBe('#ALARM#');

      await wrapper.setProps({ inboundParams: { UDP_RECEIVER_MESSAGE: 'plain' } });
      expect(wrapper.find('#title_receiver_message').exists()).toBe(false);
      expect(wrapper.find('#txt_receiver_message').text()).toBe('plain');
    });
  });
});
