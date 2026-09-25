import { mount } from '@vue/test-utils';
import OkDialog from 'src/components/OkDialog.vue';
import { describe, expect, it } from 'vitest';

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
});
