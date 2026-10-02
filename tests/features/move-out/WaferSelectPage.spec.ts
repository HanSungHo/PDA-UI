import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import WaferSelectPage from '~/features/move-out/pages/WaferSelectPage.vue';
import { waferSelectService } from '~/features/move-out/services/wafer-select.service';
import type { WaferSelectInput } from '~/features/move-out/types/wafer-select.types';
import { okDialog } from '~/services/ok-dialog.service';

const input: WaferSelectInput = {
  sequence: 'SEQ001',
  fixedCount: 1,
  lotId: 'LOT001',
  category: 'SLOT',
  editable: true,
  area: 'ETCH',
  existingWaferList: 'LOT001.01,LOT001.02',
  disableWaferList: '',
  selectWaferList: '',
};

async function mountPage(pageInput = input) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });
  await router.push('/');
  await router.isReady();

  const pinia = createPinia();

  return mount(WaferSelectPage, {
    props: { input: pageInput },
    global: { plugins: [pinia, router] },
  });
}

describe('WaferSelectPage', () => {
  afterEach(() => {
    okDialog.confirm();
    vi.restoreAllMocks();
  });

  it('keeps supplied input instead of replacing it with a demo mock', async () => {
    vi.spyOn(waferSelectService, 'getLotLastEvent').mockResolvedValue({
      CREATECATEGORY: 'SLOT',
      LASTEVENTCOMMENT: '',
    });

    const wrapper = await mountPage();

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('LOT001');
    expect(wrapper.findAll('.wafer-slot')).toHaveLength(25);
    expect(wrapper.findAll('.wafer-slot')[0].text()).toContain('01');

    wrapper.unmount();
  });

  it('emits lot-qualified wafer identifiers in the selection result', async () => {
    vi.spyOn(waferSelectService, 'getLotLastEvent').mockResolvedValue({
      CREATECATEGORY: 'SLOT',
      LASTEVENTCOMMENT: '',
    });

    const wrapper = await mountPage();
    await wrapper.findAll('.wafer-slot')[0].trigger('click');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('select')).toEqual([
      [
        {
          sequence: 'SEQ001',
          selectedWaferList: 'LOT001.01',
          selectedMachine: '',
        },
      ],
    ]);

    wrapper.unmount();
  });

  it('applies last-event machine information and supports select-all and reset', async () => {
    const eventInput: WaferSelectInput = {
      ...input,
      fixedCount: 2,
      area: 'DIFF',
    };
    vi.spyOn(waferSelectService, 'getLotLastEvent').mockResolvedValue({
      CREATECATEGORY: 'SLOT',
      LASTEVENTCOMMENT: ' SLOT : 01(EQP01),02(EQP01)',
    });

    const wrapper = await mountPage(eventInput);
    await flushPromises();

    expect(wrapper.findAll('.wafer-slot--selected')).toHaveLength(2);
    expect(wrapper.findAll('.wafer-slot')[0].text()).toContain('[EQP01]');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '정정')
      ?.trigger('click');
    expect(wrapper.findAll('.wafer-slot--selected')).toHaveLength(0);
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '전체선택')
      ?.trigger('click');
    expect(wrapper.findAll('.wafer-slot--selected')).toHaveLength(2);

    await wrapper.get('button[aria-label="Back"]').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.unmount();
  });

  it('assigns equipment to selected DIFF wafers before saving', async () => {
    const diffInput: WaferSelectInput = {
      ...input,
      area: 'DIFF',
      existingWaferList: 'LOT001.01',
    };
    vi.spyOn(waferSelectService, 'getLotLastEvent').mockResolvedValue({
      CREATECATEGORY: 'SLOT',
      LASTEVENTCOMMENT: '',
    });
    const getDummyEqpInfo = vi.spyOn(waferSelectService, 'getDummyEqpInfo').mockResolvedValue({
      EQPID: 'EQP01',
    });
    const dummyEqpInput = vi.spyOn(waferSelectService, 'dummyEqpInput').mockResolvedValue({
      LOTCOMMENT: 'LOT001.01(EQP01)',
      MSG: '',
    });

    const wrapper = await mountPage(diffInput);
    await wrapper.find('.wafer-slot').trigger('click');
    await wrapper.findAll('input')[1].setValue('EQP01');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '장비')
      ?.trigger('click');
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '저장')
      ?.trigger('click');
    await flushPromises();

    expect(getDummyEqpInfo).toHaveBeenCalledWith('EQP01', 'LOT001');
    expect(dummyEqpInput).toHaveBeenCalledWith('LOT001', 'SLOT', 'LOT001.01(EQP01)');
    expect(okDialog.message.value).toBe('정상 처리 되었습니다.');
    wrapper.unmount();
  });

  it('rejects a DIFF save when a selected wafer has no equipment', async () => {
    const diffInput: WaferSelectInput = {
      ...input,
      area: 'DIFF',
      existingWaferList: 'LOT001.01',
    };
    vi.spyOn(waferSelectService, 'getLotLastEvent').mockResolvedValue({
      CREATECATEGORY: 'SLOT',
      LASTEVENTCOMMENT: '',
    });
    const dummyEqpInput = vi.spyOn(waferSelectService, 'dummyEqpInput');

    const wrapper = await mountPage(diffInput);
    await wrapper.find('.wafer-slot').trigger('click');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '저장')
      ?.trigger('click');

    expect(dummyEqpInput).not.toHaveBeenCalled();
    expect(okDialog.message.value).toContain('반드시 장비가 선택');
    wrapper.unmount();
  });

  it('parses COUNT last-event data and saves the count comment', async () => {
    const countInput: WaferSelectInput = {
      ...input,
      sequence: 'SEQ004',
      lotId: 'LOT004',
      category: 'COUNT',
      existingWaferList: '',
    };
    vi.spyOn(waferSelectService, 'getLotLastEvent').mockResolvedValue({
      CREATECATEGORY: 'COUNT',
      LASTEVENTCOMMENT: ' COUNT:12',
    });
    const dummyEqpInput = vi.spyOn(waferSelectService, 'dummyEqpInput').mockResolvedValue({
      LOTCOMMENT: 'COUNT:15',
      MSG: '',
    });

    const wrapper = await mountPage(countInput);
    await flushPromises();
    expect((wrapper.findAll('input')[2].element as HTMLInputElement).value).toBe('12');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '저장')
      ?.trigger('click');
    await flushPromises();
    okDialog.confirm();
    await flushPromises();

    expect(dummyEqpInput).toHaveBeenCalledWith('LOT004', 'COUNT', '12');
    expect((wrapper.findAll('input')[2].element as HTMLInputElement).value).toBe('15');
    wrapper.unmount();
  });

  it('emits cancel and reports service errors through the dialog', async () => {
    const getLotLastEvent = vi
      .spyOn(waferSelectService, 'getLotLastEvent')
      .mockRejectedValue(new Error('request failed'));
    const wrapper = await mountPage();
    await flushPromises();

    expect(getLotLastEvent).toHaveBeenCalled();
    expect(okDialog.message.value).toBe('request failed');

    await wrapper.get('button[aria-label="Back"]').trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.unmount();
  });
});
