import { enableAutoUnmount, mount } from '@vue/test-utils';
import RemoteRecipeDialog from 'src/components/esheet/RemoteRecipeDialog.vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

enableAutoUnmount(afterEach);

function findButtonByLabel(label: string): HTMLElement | null {
  const buttons = Array.from(document.body.querySelectorAll('.remote-recipe-btn'));
  return (buttons.find((el) => el.textContent?.includes(label)) as HTMLElement | undefined) ?? null;
}

describe('RemoteRecipeDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders legacy labels with recipe and Run No when lotNo is provided', () => {
    const wrapper = mount(RemoteRecipeDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipeList: 'RCP-SAMPLE-01',
        lotNo: 'RUN20260330001',
      },
    });

    expect(wrapper.exists()).toBe(true);

    const titleEl = document.body.querySelector('.remote-recipe-dialog__title');
    expect(titleEl?.textContent).toContain('확인');

    const labels = Array.from(document.body.querySelectorAll('.remote-recipe-label')).map((el) =>
      el.textContent?.trim(),
    );
    expect(labels).toContain('선택 RECIPE');
    expect(labels).toContain('선택 Run No');

    const recipeEl = document.body.querySelector('.remote-recipe-value--recipe');
    expect(recipeEl?.textContent).toContain('RCP-SAMPLE-01');

    const lotEl = document.body.querySelector('.remote-recipe-value--lot');
    expect(lotEl?.textContent).toContain('RUN20260330001');

    const promptEl = document.body.querySelector('.remote-recipe-prompt');
    expect(promptEl?.textContent).toContain('계속 진행하시겠습니까?');

    expect(findButtonByLabel('취소')).not.toBeNull();
    expect(findButtonByLabel('확인')).not.toBeNull();
  });

  it('hides Run No row when lotNo is empty (legacy View.GONE)', () => {
    mount(RemoteRecipeDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipeList: 'RCP-NO-LOT',
        lotNo: '',
      },
    });

    const labels = Array.from(document.body.querySelectorAll('.remote-recipe-label')).map((el) =>
      el.textContent?.trim(),
    );
    expect(labels).toContain('선택 RECIPE');
    expect(labels).not.toContain('선택 Run No');
    expect(document.body.querySelector('.remote-recipe-value--lot')).toBeNull();
  });

  it('hides Run No row when lotNo is whitespace-only', () => {
    mount(RemoteRecipeDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipeList: 'RCP-WHITESPACE',
        lotNo: '   ',
      },
    });

    expect(document.body.querySelector('.remote-recipe-value--lot')).toBeNull();
  });

  it('emits confirm and update:modelValue(false) when OK button is clicked', async () => {
    const wrapper = mount(RemoteRecipeDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipeList: 'RCP-OK',
        lotNo: 'RUN-OK',
      },
    });

    const okBtn = findButtonByLabel('확인');
    expect(okBtn).not.toBeNull();
    await okBtn!.click();

    expect(wrapper.emitted('confirm')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });

  it('emits cancel and update:modelValue(false) when CANCEL button is clicked', async () => {
    const wrapper = mount(RemoteRecipeDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipeList: 'RCP-CANCEL',
      },
    });

    const cancelBtn = findButtonByLabel('취소');
    expect(cancelBtn).not.toBeNull();
    await cancelBtn!.click();

    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });

  it('handles Escape with default legacyBackBehavior (triggers confirm)', () => {
    const wrapper = mount(RemoteRecipeDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipeList: 'RCP-ESC-LEGACY',
      },
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(wrapper.emitted('confirm')).toBeTruthy();
    expect(wrapper.emitted('cancel')).toBeFalsy();
  });

  it('handles Escape with legacyBackBehavior: false (triggers cancel)', () => {
    const wrapper = mount(RemoteRecipeDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipeList: 'RCP-ESC-SAFE',
        legacyBackBehavior: false,
      },
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('confirm')).toBeFalsy();
  });

  it('ignores Escape while closed', () => {
    const wrapper = mount(RemoteRecipeDialog, {
      props: {
        modelValue: false,
        recipeList: 'RCP-CLOSED',
      },
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(wrapper.emitted('cancel')).toBeFalsy();
    expect(wrapper.emitted('confirm')).toBeFalsy();
  });

  it('handles Enter key (triggers confirm)', () => {
    const wrapper = mount(RemoteRecipeDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        recipeList: 'RCP-ENTER',
      },
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(wrapper.emitted('confirm')).toBeTruthy();
  });
});
