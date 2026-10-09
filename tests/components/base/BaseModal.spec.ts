import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { QDialog } from 'quasar';
import { BaseModal, baseModalDefaults } from 'src/components/base/modal';
import { afterEach, describe, expect, it } from 'vitest';

enableAutoUnmount(afterEach);

describe('BaseModal', () => {
  it('configures QDialog with expected default props and closed state', () => {
    const wrapper = mount(BaseModal, {
      props: {
        open: false,
      },
    });

    const dialog = wrapper.findComponent(QDialog);
    expect(dialog.exists()).toBe(true);
    expect(dialog.props('modelValue')).toBe(false);
  });

  it('respects overlayClosable prop by toggling persistent on QDialog', () => {
    const wrapper = mount(BaseModal, {
      props: {
        open: true,
        overlayClosable: false,
      },
    });

    const dialog = wrapper.findComponent(QDialog);
    expect(dialog.props('persistent')).toBe(true);
  });

  it('renders title string in the header and default body content', async () => {
    mount(BaseModal, {
      props: {
        open: true,
        title: 'Dialog Title',
      },
      slots: {
        default: 'Body Content',
      },
    });
    await flushPromises();

    expect(document.body.textContent).toContain('Dialog Title');
    expect(document.body.textContent).toContain('Body Content');
  });

  it('renders custom title slot when provided', async () => {
    mount(BaseModal, {
      props: {
        open: true,
      },
      slots: {
        title: 'Custom Slot Title',
      },
    });
    await flushPromises();

    expect(document.body.textContent).toContain('Custom Slot Title');
  });

  it('renders footer only when footer slot is provided', async () => {
    const wrapperWithoutFooter = mount(BaseModal, {
      props: { open: true },
    });
    await flushPromises();
    expect(document.body.querySelector('.ds-modal__footer')).toBeNull();
    wrapperWithoutFooter.unmount();

    mount(BaseModal, {
      props: { open: true },
      slots: { footer: 'Footer Action' },
    });
    await flushPromises();
    expect(document.body.querySelector('.ds-modal__footer')).not.toBeNull();
    expect(document.body.textContent).toContain('Footer Action');
  });

  it('omits header when title is missing and closable is default false', async () => {
    mount(BaseModal, {
      props: {
        open: true,
      },
    });
    await flushPromises();

    await flushPromises();

    expect(document.body.querySelector('.ds-modal__header')).toBeNull();
  });

  it('provides close callback in scoped footer slot and through component expose', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true },
      slots: {
        footer: `<template #footer="{ close }"><button class="scoped-close-btn" @click="close">Cancel</button></template>`,
      },
    });
    await flushPromises();

    const btn = document.body.querySelector('.scoped-close-btn') as HTMLElement;
    expect(btn).not.toBeNull();
    btn.click();

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    expect(wrapper.emitted('cancel')).toBeTruthy();

    // Test expose method
    wrapper.vm.close();
    expect(wrapper.emitted('update:open')).toEqual([[false], [false]]);
  });

  it('renders close button and custom closeIcon slot, and emits cancel & update:open(false) on click', async () => {
    const wrapper = mount(BaseModal, {
      props: {
        open: true,
        closable: true,
      },
    });
    await flushPromises();

    const closeBtn = document.body.querySelector('.ds-modal__close-btn') as HTMLElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();

    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('handles update:model-value event from QDialog', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true },
    });

    const dialog = wrapper.findComponent(QDialog);
    await dialog.vm.$emit('update:modelValue', false);

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('handles hide event from QDialog by emitting afterClose', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true },
    });

    const dialog = wrapper.findComponent(QDialog);
    await dialog.vm.$emit('hide');

    expect(wrapper.emitted('afterClose')).toBeTruthy();
  });

  it('applies custom width correctly', async () => {
    mount(BaseModal, { props: { open: true, width: 500 } });
    await flushPromises();
    expect(document.body.innerHTML).toContain('width: 500px');

    mount(BaseModal, { props: { open: true, width: '70vw' } });
    await flushPromises();
    expect(document.body.innerHTML).toContain('width: 70vw');

    mount(BaseModal, { props: { open: true, width: undefined } });
    await flushPromises();
    expect(document.body.innerHTML).toContain('width: 340px');
  });

  it('exports baseModalDefaults correctly', () => {
    expect(baseModalDefaults).toEqual({
      closable: false,
      overlayClosable: true,
      width: 340,
    });
  });
});
