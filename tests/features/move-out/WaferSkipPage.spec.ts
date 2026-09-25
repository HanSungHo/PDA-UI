import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { BaseCheckbox, BaseDropdownList, BaseInput } from 'src/components/base';
import WaferSkipPage from 'src/features/move-out/pages/WaferSkipPage.vue';
import { okDialog } from 'src/services/ok-dialog.service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import { useWaferSkipStore } from '~/features/move-out/stores/wafer-skip.store';
import type { WaferSkipInput } from '~/features/move-out/types/wafer-skip.types';

const input: WaferSkipInput = {
  waferQty: '25',
  machineQty: '20',
  reasonList: ['REWORK', 'EQUIPMENT ERROR'],
};

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });
}

async function mountPage(onCancel = vi.fn()) {
  const router = createTestRouter();
  await router.push('/');
  await router.isReady();

  return mount(WaferSkipPage, {
    attachTo: document.body,
    props: { input, onCancel },
    global: { plugins: [createPinia(), router] },
  });
}

async function enterCorrection(
  wrapper: Awaited<ReturnType<typeof mountPage>>,
  correction: number,
  isMinus = false,
): Promise<void> {
  await wrapper.findComponent(BaseDropdownList).vm.$emit('update:modelValue', 'REWORK');
  await wrapper.findAllComponents(BaseInput)[2].vm.$emit('update:modelValue', correction);

  if (isMinus) {
    await wrapper.findComponent(BaseCheckbox).vm.$emit('update:modelValue', true);
  }

  await wrapper.get('form').trigger('submit');
  await flushPromises();
}

describe('WaferSkipPage', () => {
  afterEach(() => {
    okDialog.confirm();
    document.body.innerHTML = '';
  });

  it('renders the legacy Korean labels and readonly lot quantities', async () => {
    const wrapper = await mountPage();

    try {
      expect(wrapper.text()).toContain('재진행한 WAFER 수량 입력');
      expect(wrapper.text()).toContain('현재 LOT QTY');
      expect(wrapper.text()).toContain('장비 진행 QTY');
      expect(wrapper.text()).toContain('사유 선택');
      expect(wrapper.text()).toContain('추가 진행한 QTY');
      expect(wrapper.text()).toContain('수량 보정');
      expect(wrapper.text()).toContain('취소');

      const inputs = wrapper.findAllComponents(BaseInput);
      expect((inputs[0].find('input').element as HTMLInputElement).value).toBe('25');
      expect((inputs[0].find('input').element as HTMLInputElement).readOnly).toBe(true);
      expect((inputs[1].find('input').element as HTMLInputElement).value).toBe('20');
      expect((inputs[1].find('input').element as HTMLInputElement).readOnly).toBe(true);
    } finally {
      wrapper.unmount();
    }
  });

  it('requires a reason and correction quantity', async () => {
    const wrapper = await mountPage();

    try {
      await wrapper.get('form').trigger('submit');
      await flushPromises();

      expect(okDialog.title.value).toBe('필수 입력');
      expect(okDialog.message.value).toBe('수량 보정 사유를 선택 하세요 ');
    } finally {
      wrapper.unmount();
    }
  });

  it('rejects an invalid normal correction and clears the entered quantity', async () => {
    const wrapper = await mountPage();

    try {
      await enterCorrection(wrapper, 4);

      expect(wrapper.emitted('correct')).toBeUndefined();
      expect(okDialog.title.value).toBe('에  러');
      expect(okDialog.message.value).toContain('입력한 추가진행 수량이 올바르지 않습니다.');
      expect(
        (wrapper.findAllComponents(BaseInput)[2].find('input').element as HTMLInputElement).value,
      ).toBe('');
    } finally {
      wrapper.unmount();
    }
  });

  it('emits the legacy result for valid normal and minus corrections', async () => {
    const normalWrapper = await mountPage();

    try {
      await enterCorrection(normalWrapper, 5);
      expect(normalWrapper.emitted('correct')).toEqual([
        [{ skipWafer: '5', reason: 'REWORK', minusString: '' }],
      ]);
    } finally {
      normalWrapper.unmount();
    }

    const minusInput: WaferSkipInput = { ...input, waferQty: '15' };
    const minusPinia = createPinia();
    const minusWrapper = mount(WaferSkipPage, {
      attachTo: document.body,
      props: { input: minusInput, onCancel: vi.fn() },
      global: { plugins: [minusPinia, createTestRouter()] },
    });
    useWaferSkipStore(minusPinia).start({
      waferQty: '15',
      machineQty: '20',
      reasonList: JSON.stringify([{ typeValue: 'REWORK' }]),
    });

    try {
      await enterCorrection(minusWrapper, 5, true);
      expect(minusWrapper.emitted('correct')).toEqual([
        [{ skipWafer: '5', reason: 'REWORK', minusString: 'MINUS' }],
      ]);
    } finally {
      minusWrapper.unmount();
    }
  });

  it('emits cancel when the user cancels the correction', async () => {
    const onCancel = vi.fn();
    const wrapper = await mountPage(onCancel);

    try {
      await wrapper.findAll('button').at(-1)?.trigger('click');
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(wrapper.emitted('cancel')).toHaveLength(1);
    } finally {
      wrapper.unmount();
    }
  });
});
