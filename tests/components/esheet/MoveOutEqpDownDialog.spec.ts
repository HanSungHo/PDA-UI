import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MoveOutEqpDownDialog from 'src/features/move-out/components/MoveOutEqpDownDialog.vue';
import * as moveOutServiceModule from 'src/features/move-out/services/moveout-eqp-down.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

enableAutoUnmount(afterEach);

describe('MoveOutEqpDownDialog.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders modal with legacy title 확 인, prompt text, main checkbox, and chamber list', async () => {
    const wrapper = mount(MoveOutEqpDownDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        machine: 'PHOTO-01',
        chamberList: [
          { CH: 'CH-1', MESSTATE: 'RUN' },
          { CH: 'CH-2', MESSTATE: 'IDLE' },
        ],
      },
    });

    expect(wrapper.exists()).toBe(true);

    const titleEl = document.body.querySelector('.moveout-eqp-down-modal__title');
    expect(titleEl?.textContent).toContain('확 인');

    const promptEl = document.body.querySelector('.moveout-eqp-down-prompt');
    expect(promptEl?.textContent).toContain('장비 비부하 DOWN 시키겠습니까?');

    const mainChk = document.body.querySelector('.moveout-eqp-down-chk--main');
    expect(mainChk?.textContent).toContain('PHOTO-01');

    const allChk = document.body.querySelector('.moveout-eqp-down-chk--all');
    expect(allChk?.textContent).toContain('전체 선택');

    const chamberHeader = document.body.querySelector('.moveout-eqp-down-chamber__header');
    expect(chamberHeader?.textContent).toContain('CHAMBER');

    const chamberItems = document.body.querySelectorAll('.moveout-eqp-down-chk--chamber');
    expect(chamberItems.length).toBe(2);
    expect(chamberItems[0].textContent).toContain('CH-1');
    expect(chamberItems[1].textContent).toContain('CH-2');
  });

  it('hides chamber container and select all when chamberList is empty', () => {
    mount(MoveOutEqpDownDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        machine: 'PHOTO-01',
        chamberList: [],
      },
    });

    const allChk = document.body.querySelector('.moveout-eqp-down-chk--all');
    expect(allChk).toBeNull();

    const chamberDiv = document.body.querySelector('.moveout-eqp-down-chamber');
    expect(chamberDiv).toBeNull();
  });

  it('keeps legacy RESULT_OK contract when Cancel button is clicked', async () => {
    const wrapper = mount(MoveOutEqpDownDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        machine: 'PHOTO-01',
      },
    });

    const cancelBtn = document.body.querySelector('.moveout-eqp-down-btn--cancel') as HTMLElement;
    expect(cancelBtn).not.toBeNull();
    await cancelBtn.click();

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);

    expect(wrapper.emitted('resolve')).toBeTruthy();
    expect(wrapper.emitted('resolve')![0][0]).toEqual({
      action: 'OK',
      success: true,
      changed: false,
      mainDown: false,
      downChambers: [],
    });
  });

  it('submits LOAD DOWN and emits resolve with OK when OK button is clicked with valid selection', async () => {
    vi.spyOn(moveOutServiceModule.moveOutEqpDownService, 'changeEqpStatus').mockResolvedValueOnce({
      success: true,
      message: 'Equipment status changed successfully.',
    });

    const wrapper = mount(MoveOutEqpDownDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        machine: 'PHOTO-01',
        chamberList: [{ CH: 'CH-1', MESSTATE: 'RUN' }],
      },
    });

    const okBtn = document.body.querySelector('.moveout-eqp-down-btn--ok') as HTMLElement;
    expect(okBtn).not.toBeNull();
    await okBtn.click();
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);

    expect(wrapper.emitted('resolve')).toBeTruthy();
    expect(wrapper.emitted('resolve')![0][0]).toEqual({
      action: 'OK',
      success: true,
      changed: true,
      mainDown: true,
      downChambers: ['CH-1'],
    });
  });

  it('shows warning alert when nothing is selected upon clicking OK', async () => {
    const wrapper = mount(MoveOutEqpDownDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        machine: 'PHOTO-01',
        chamberList: [{ CH: 'CH-1', MESSTATE: 'RUN' }],
      },
    });

    const selectAllInput = document.body.querySelector(
      '.moveout-eqp-down-chk--all input',
    ) as HTMLInputElement;
    expect(selectAllInput).not.toBeNull();
    await selectAllInput.click();
    await flushPromises();

    const okBtn = document.body.querySelector('.moveout-eqp-down-btn--ok') as HTMLElement;
    await okBtn.click();
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')).toBeFalsy();

    const alertTitle = document.body.querySelector('.moveout-eqp-down-alert__title');
    expect(alertTitle?.textContent).toContain('Warning');

    const alertBody = document.body.querySelector('.moveout-eqp-down-alert__body');
    expect(alertBody?.textContent).toContain('최소 하나의 장비 또는 챔버를 선택 하세요');
  });

  it('keeps legacy result OK contract after MES error alert is dismissed', async () => {
    vi.spyOn(moveOutServiceModule.moveOutEqpDownService, 'changeEqpStatus').mockResolvedValueOnce({
      success: false,
      errorDesc: 'MES error',
    });

    const wrapper = mount(MoveOutEqpDownDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
        machine: 'PHOTO-01',
      },
    });

    const okBtn = document.body.querySelector('.moveout-eqp-down-btn--ok') as HTMLElement;
    await okBtn.click();
    await flushPromises();

    const alertBody = document.body.querySelector('.moveout-eqp-down-alert__body');
    expect(alertBody?.textContent).toContain('MES error');

    const alertOkBtn = document.body.querySelector('.moveout-eqp-down-alert__btn') as HTMLElement;
    await alertOkBtn.click();
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);
    expect(wrapper.emitted('resolve')![0][0]).toEqual({
      action: 'OK',
      success: true,
      changed: false,
      mainDown: false,
      downChambers: [],
    });
  });
});
