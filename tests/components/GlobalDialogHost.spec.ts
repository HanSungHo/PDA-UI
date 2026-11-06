import { mount } from '@vue/test-utils';
import GlobalDialogHost from 'src/components/GlobalDialogHost.vue';
import OkDialog from 'src/components/OkDialog.vue';
import { okDialog } from 'src/services/ok-dialog.service';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/app', () => ({
  App: { addListener: () => Promise.resolve({ remove: () => Promise.resolve() }) },
}));

describe('GlobalDialogHost OkDialog', () => {
  afterEach(() => {
    okDialog.confirm();
  });

  it('opens OkDialog from the okDialog service and resolves RETURN_CODE_OK on confirm', async () => {
    const wrapper = mount(GlobalDialogHost, {
      global: {
        stubs: {
          AlarmCommonPopup: true,
          EQPspcOverlay: true,
          MDSSpcOverlay: true,
          StepperIdleDialog: true,
          RecipeInterlockDialog: true,
          PremptyDialog: true,
          OkCancelDialog: true,
        },
      },
    });
    const dialog = wrapper.findComponent(OkDialog);
    expect(dialog.props('open')).toBe(false);

    const result = okDialog.show('에  러', '장비를 입력해주세요', 'OK');
    await wrapper.vm.$nextTick();

    expect(dialog.props('open')).toBe(true);
    expect(dialog.props('title')).toBe('에  러');
    expect(dialog.props('message')).toBe('장비를 입력해주세요');
    expect(dialog.props('confirmLabel')).toBe('OK');

    dialog.vm.$emit('confirm');
    await expect(result).resolves.toBe(1);
    await wrapper.vm.$nextTick();
    expect(dialog.props('open')).toBe(false);
    wrapper.unmount();
  });
});
