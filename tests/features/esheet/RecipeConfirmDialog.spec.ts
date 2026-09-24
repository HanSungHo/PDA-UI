import { enableAutoUnmount, mount } from '@vue/test-utils';
import RecipeConfirmDialog from 'src/components/esheet/RecipeConfirmDialog.vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

enableAutoUnmount(afterEach);

describe('RecipeConfirmDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders Case A (Normal Recipe Confirm) with full details and no Edge Far flag', () => {
    const wrapper = mount(RecipeConfirmDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipe: 'RECIPE_SAMPLE_01',
        lotId: 'WA2409001',
        edgeFar: 'N',
      },
    });

    expect(wrapper.exists()).toBe(true);

    const titleEl = document.body.querySelector('.recipe-confirm-modal__title');
    expect(titleEl?.textContent).toContain('확인');

    const recipeLabelEl = document.body.querySelector('.recipe-confirm-label');
    expect(recipeLabelEl?.textContent).toContain('선택 RECIPE');

    const recipeEl = document.body.querySelector('.recipe-confirm-value--recipe');
    expect(recipeEl?.textContent).toContain('RECIPE_SAMPLE_01');

    const lotEl = document.body.querySelector('.recipe-confirm-value--lot');
    expect(lotEl?.textContent).toContain('WA2409001');

    const promptEl = document.body.querySelector('.recipe-confirm-prompt');
    expect(promptEl?.textContent).toContain('계속 진행하시겠습니까?');

    // Edge Far tag should not be present
    const edgeFarEl = document.body.querySelector('.recipe-confirm-edgefar');
    expect(edgeFarEl).toBeNull();
  });

  it('displays the red EDGE FAR badge when edgeFar is "Y"', () => {
    mount(RecipeConfirmDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipe: 'RECIPE_EDGE_02',
        lotId: 'WA2409002',
        edgeFar: 'Y',
      },
    });

    const edgeFarEl = document.body.querySelector('.recipe-confirm-edgefar');
    expect(edgeFarEl).not.toBeNull();
    expect(edgeFarEl?.textContent).toContain('EDGE FAR');
    expect(edgeFarEl?.textContent).toContain('Y');
  });

  it('renders Case B (DiCycle Skip Mode) with warning card and skips lot info', () => {
    mount(RecipeConfirmDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipe: 'This is a measurement target LOT.\nSKIP without measuring?',
        skip: 'OK',
      },
    });

    const titleEl = document.body.querySelector('.recipe-confirm-modal__title');
    expect(titleEl?.textContent).toContain('확인');

    // Normal card should be absent
    const normalCard = document.body.querySelector('.recipe-confirm-card');
    expect(normalCard).toBeNull();

    // Skip warning card should be present
    const skipMessageEl = document.body.querySelector('.recipe-confirm-skip-message');
    expect(skipMessageEl?.textContent).toContain('This is a measurement target LOT.');
    expect(skipMessageEl?.textContent).toContain('SKIP without measuring?');
  });

  it('emits confirm and update:modelValue(false) when OK button is clicked', async () => {
    const wrapper = mount(RecipeConfirmDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipe: 'RECIPE_OK',
        lotId: 'WA2409003',
      },
    });

    const okBtn = document.body.querySelector('.recipe-confirm-btn--ok') as HTMLElement;
    expect(okBtn).not.toBeNull();

    await okBtn.click();

    expect(wrapper.emitted('confirm')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);
  });

  it('emits cancel and update:modelValue(false) when CANCEL button is clicked', async () => {
    const wrapper = mount(RecipeConfirmDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipe: 'RECIPE_CANCEL',
        lotId: 'WA2409004',
      },
    });

    const cancelBtn = document.body.querySelector('.recipe-confirm-btn--cancel') as HTMLElement;
    expect(cancelBtn).not.toBeNull();

    await cancelBtn.click();

    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);
  });

  it('handles Escape key with default safe behavior (triggers cancel)', async () => {
    const wrapper = mount(RecipeConfirmDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipe: 'RECIPE_ESC',
        legacyBackBehavior: false,
      },
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('confirm')).toBeFalsy();
  });

  it('handles Escape key with legacyBackBehavior: true (triggers confirm)', async () => {
    const wrapper = mount(RecipeConfirmDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipe: 'RECIPE_LEGACY_BACK',
        legacyBackBehavior: true,
      },
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(wrapper.emitted('confirm')).toBeTruthy();
    expect(wrapper.emitted('cancel')).toBeFalsy();
  });

  it('ignores Escape key while closed', () => {
    const wrapper = mount(RecipeConfirmDialog, {
      props: {
        modelValue: false,
        recipe: 'RECIPE_CLOSED',
      },
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(wrapper.emitted('cancel')).toBeFalsy();
    expect(wrapper.emitted('confirm')).toBeFalsy();
  });

  it('handles Enter key (triggers confirm)', async () => {
    const wrapper = mount(RecipeConfirmDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipe: 'RECIPE_ENTER',
      },
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(wrapper.emitted('confirm')).toBeTruthy();
  });
});
