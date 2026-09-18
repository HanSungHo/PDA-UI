import { enableAutoUnmount, mount } from '@vue/test-utils';
import ESheetDrawMenuPreviewPage from 'src/features/esheet/pages/ESheetDrawMenuPreviewPage.vue';
import { afterEach, describe, expect, it } from 'vitest';

enableAutoUnmount(afterEach);

describe('ESheetDrawMenuPreviewPage', () => {
  it('keeps drawer closed and eSheet unblurred until the active row is selected', async () => {
    const wrapper = mount(ESheetDrawMenuPreviewPage);

    expect(wrapper.findComponent({ name: 'DrawMenuList' }).props('open')).toBe(false);
    expect(wrapper.classes()).not.toContain('esheet-draw-menu-preview--drawer-open');

    await wrapper.get('[data-testid="draw-menu-trigger"]').trigger('click');

    expect(wrapper.findComponent({ name: 'DrawMenuList' }).props('open')).toBe(true);
    expect(wrapper.classes()).toContain('esheet-draw-menu-preview--drawer-open');
  });

  it('removes the eSheet blur after closing the drawer from the back button', async () => {
    const wrapper = mount(ESheetDrawMenuPreviewPage);

    await wrapper.get('[data-testid="draw-menu-trigger"]').trigger('click');
    await wrapper.get('.draw-menu-list__back').trigger('click');

    expect(wrapper.findComponent({ name: 'DrawMenuList' }).props('open')).toBe(false);
    expect(wrapper.classes()).not.toContain('esheet-draw-menu-preview--drawer-open');
  });
});
