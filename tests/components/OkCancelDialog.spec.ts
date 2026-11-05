import { mount } from '@vue/test-utils';
import OkCancelDialog from 'src/components/OkCancelDialog.vue';
import { afterEach, describe, expect, it } from 'vitest';

function mountDialog() {
  return mount(OkCancelDialog, {
    attachTo: document.body,
    props: { open: true, title: '확  인', message: 'LOT NO:\n    LOT-1\n를 출고 하시겠습니까?' },
  });
}

function buttons(): HTMLButtonElement[] {
  return [...document.body.querySelectorAll<HTMLButtonElement>('.ok-cancel-dialog__button')];
}

describe('OkCancelDialog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows the title, message and the default 취소 / 확인 buttons', () => {
    const wrapper = mountDialog();

    expect(document.body.textContent).toContain('확  인');
    expect(document.body.textContent).toContain('를 출고 하시겠습니까?');
    expect(buttons().map((button) => button.textContent?.trim())).toEqual(['취소', '확인']);
    wrapper.unmount();
  });

  it('emits ok or cancel from its buttons', async () => {
    const wrapper = mountDialog();
    const [cancelButton, okButton] = buttons();

    cancelButton?.click();
    okButton?.click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('ok')).toHaveLength(1);
    expect(wrapper.emitted('update:open')).toEqual([[false], [false]]);
    wrapper.unmount();
  });

  it('answers OK when closed with the back button, like legacy onBackPressed', () => {
    const wrapper = mountDialog();

    wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('update:open', false);

    expect(wrapper.emitted('ok')).toHaveLength(1);
    expect(wrapper.emitted('cancel')).toBeUndefined();
    wrapper.unmount();
  });
});
