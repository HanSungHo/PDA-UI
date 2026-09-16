import { enableAutoUnmount, mount } from '@vue/test-utils';
import { Modal as AModal } from 'ant-design-vue';
import { BaseModal, baseModalDefaults } from 'src/components/base/modal';
import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'vue';

enableAutoUnmount(afterEach);

describe('BaseModal', () => {
  it('configures AModal with expected default props and closed state', () => {
    const wrapper = mount(BaseModal, {
      props: {
        open: false,
      },
    });

    const modal = wrapper.findComponent(AModal);
    expect(modal.exists()).toBe(true);
    expect(modal.props('open')).toBe(false);
    expect(modal.props('centered')).toBe(true);
    expect(modal.props('destroyOnClose')).toBe(true);
    expect(modal.props('closable')).toBe(false);
    expect(modal.props('maskClosable')).toBe(true);
    expect(modal.props('keyboard')).toBe(false);
    expect(modal.props('footer')).toBe(null);
    expect(modal.props('wrapClassName')).toBe('ds-modal-wrap');
  });

  it('respects overlayClosable prop', () => {
    const wrapper = mount(BaseModal, {
      props: {
        open: true,
        overlayClosable: false,
      },
    });

    const modal = wrapper.findComponent(AModal);
    expect(modal.props('maskClosable')).toBe(false);
  });

  it('renders title string in the header and default body content', () => {
    mount(BaseModal, {
      attachTo: document.body,
      props: {
        open: true,
        title: 'Modal Header Title',
      },
      slots: {
        default: () => h('p', { class: 'modal-body-text' }, 'Modal body content'),
      },
    });

    const titleEl = document.body.querySelector('.ds-modal__title');
    expect(titleEl).not.toBeNull();
    expect(titleEl?.textContent).toContain('Modal Header Title');

    const bodyEl = document.body.querySelector('.modal-body-text');
    expect(bodyEl).not.toBeNull();
    expect(bodyEl?.textContent).toBe('Modal body content');
  });

  it('renders custom title slot when provided', () => {
    mount(BaseModal, {
      attachTo: document.body,
      props: {
        open: true,
      },
      slots: {
        title: () => h('span', { class: 'custom-title-slot' }, 'Custom Slot Title'),
      },
    });

    const customTitle = document.body.querySelector('.custom-title-slot');
    expect(customTitle).not.toBeNull();
    expect(customTitle?.textContent).toBe('Custom Slot Title');
  });

  it('renders footer only when footer slot is provided', () => {
    const withoutFooter = mount(BaseModal, {
      attachTo: document.body,
      props: {
        open: true,
        closable: false,
      },
    });

    expect(document.body.querySelector('.ds-modal__footer')).toBeNull();
    withoutFooter.unmount();

    mount(BaseModal, {
      attachTo: document.body,
      props: {
        open: true,
      },
      slots: {
        footer: () => h('button', { class: 'confirm-btn' }, 'Confirm'),
      },
    });

    const footer = document.body.querySelector('.ds-modal__footer');
    expect(footer).not.toBeNull();
    expect(footer?.querySelector('.confirm-btn')?.textContent).toBe('Confirm');
  });

  it('omits header when title is missing and closable is false', () => {
    mount(BaseModal, {
      attachTo: document.body,
      props: {
        open: true,
        closable: false,
      },
    });

    expect(document.body.querySelector('.ds-modal__header')).toBeNull();
  });

  it('renders close button and custom closeIcon slot, and emits cancel & update:open(false) on click', async () => {
    const wrapper = mount(BaseModal, {
      attachTo: document.body,
      props: {
        open: true,
        closable: true,
      },
      slots: {
        closeIcon: () => h('span', { class: 'my-close-icon' }, 'X'),
      },
    });

    const closeBtn = document.body.querySelector<HTMLButtonElement>('.ds-modal__close-btn');
    expect(closeBtn).not.toBeNull();
    expect(document.body.querySelector('.my-close-icon')?.textContent).toBe('X');

    closeBtn?.click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('handles cancel event from AModal', () => {
    const wrapper = mount(BaseModal, {
      props: {
        open: true,
      },
    });

    const modal = wrapper.findComponent(AModal);
    const mockEvent = new MouseEvent('click');
    modal.vm.$emit('cancel', mockEvent);

    expect(wrapper.emitted('cancel')).toEqual([[mockEvent]]);
  });

  it('handles update:open event from AModal', () => {
    const wrapper = mount(BaseModal, {
      props: {
        open: true,
      },
    });

    const modal = wrapper.findComponent(AModal);
    modal.vm.$emit('update:open', false);

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('handles after-close event from AModal', () => {
    const wrapper = mount(BaseModal, {
      props: {
        open: true,
      },
    });

    const modal = wrapper.findComponent(AModal);
    modal.vm.$emit('after-close');

    expect(wrapper.emitted('afterClose')).toHaveLength(1);
  });

  it('exports baseModalDefaults correctly', () => {
    expect(baseModalDefaults).toEqual({
      closable: true,
      overlayClosable: true,
    });
  });
});
