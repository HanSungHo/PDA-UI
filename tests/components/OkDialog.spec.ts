import { flushPromises, mount } from '@vue/test-utils';
import OkDialog from 'src/components/OkDialog.vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addListener } = vi.hoisted(() => ({ addListener: vi.fn() }));
beforeEach(() => {
  addListener.mockReset();
  addListener.mockReturnValue(Promise.resolve({ remove: () => Promise.resolve() }));
});
vi.mock('@capacitor/app', () => ({ App: { addListener } }));

describe('OkDialog', () => {
  it('shows its title and message, then emits confirm when acknowledged', async () => {
    const wrapper = mount(OkDialog, {
      attachTo: document.body,
      props: {
        open: true,
        title: '필수 입력',
        message: '수량 보정 사유를 선택 하세요.',
      },
    });

    try {
      expect(document.body.textContent).toContain('필수 입력');
      expect(document.body.textContent).toContain('수량 보정 사유를 선택 하세요.');

      const confirmButton = document.body.querySelector<HTMLButtonElement>('.ok-dialog__button');
      expect(confirmButton).not.toBeNull();
      await confirmButton?.click();

      expect(wrapper.emitted('confirm')).toHaveLength(1);
      expect(wrapper.emitted('update:open')).toEqual([[false]]);
    } finally {
      wrapper.unmount();
      document.body.innerHTML = '';
    }
  });

  it('treats the device Back button as OK while open and removes the listener on close', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    let backHandler: (() => void) | undefined;
    addListener.mockImplementation((_event: string, handler: () => void) => {
      backHandler = handler;
      return Promise.resolve({ remove });
    });

    const wrapper = mount(OkDialog, {
      attachTo: document.body,
      props: { open: true, title: 'T', message: 'M' },
    });
    try {
      await flushPromises();
      expect(addListener).toHaveBeenCalledWith('backButton', expect.any(Function));

      backHandler?.();
      expect(wrapper.emitted('confirm')).toHaveLength(1);
      expect(wrapper.emitted('update:open')).toEqual([[false]]);

      await wrapper.setProps({ open: false });
      expect(remove).toHaveBeenCalled();
    } finally {
      wrapper.unmount();
      document.body.innerHTML = '';
    }
  });
});
