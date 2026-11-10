import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { BaseDropdownList, BaseInput, BaseScreen } from 'src/components/base';
import TestResultInputPage from 'src/features/test-result-input/pages/TestResultInputPage.vue';
import { testResultInputService as service } from 'src/features/test-result-input/services/test-result-input.service';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

vi.mock('src/features/test-result-input/services/test-result-input.service', () => ({
  testResultInputService: {
    inspMaskInfo: vi.fn(),
    inspMaskStatCheck: vi.fn(),
    inspMaskInsert: vi.fn(),
  },
}));
let wrapper: VueWrapper;
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/test-result-input', component: TestResultInputPage },
      { path: '/main', component: { template: '<div>MAIN</div>' } },
    ],
  });
  await router.push('/test-result-input');
  await router.isReady();
  wrapper = mount(TestResultInputPage, {
    attachTo: document.body,
    global: { plugins: [createPinia(), router] },
  });
  await flushPromises();
  return router;
}
beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = '';
});

it('renders legacy labels and initial disabled state without Null placeholders', async () => {
  await render();
  expect(wrapper.text()).toContain('검사 결과 입력');
  expect(wrapper.text()).toContain('검사결과입력');
  expect(wrapper.text()).not.toContain('Null');
  expect(wrapper.getComponent(BaseScreen).props('okDisabled')).toBe(true);
  expect(wrapper.findAllComponents(BaseDropdownList)).toHaveLength(4);
  expect(
    wrapper
      .findAllComponents(BaseInput)
      .find((field) => field.props('label') === 'PELLICLE')
      ?.props('readonly'),
  ).toBe(true);
  expect(
    wrapper
      .findAllComponents(BaseInput)
      .find((field) => field.props('label') === '검사일자')
      ?.props('readonly'),
  ).toBe(true);
  expect(document.activeElement).toBe(wrapper.findAll('input')[0]?.element);
});

it('keeps editable fields enabled before lookup while save remains disabled', async () => {
  await render();
  expect(wrapper.getComponent(BaseScreen).props('okDisabled')).toBe(true);
  expect(
    wrapper.findAllComponents(BaseDropdownList).every((field) => !field.props('disabled')),
  ).toBe(true);
  for (const label of ['SERIAL No', '검사내용', 'HOLD 사유']) {
    expect(
      wrapper
        .findAllComponents(BaseInput)
        .find((field) => field.props('label') === label)
        ?.props('disabled'),
    ).toBe(false);
  }
});

it('rejects letters from Serial while preserving leading zeros', async () => {
  await render();
  const serial = wrapper
    .findAllComponents(BaseInput)
    .find((field) => field.props('label') === 'SERIAL No')!;
  serial.vm.$emit('update:modelValue', '0012A3');
  await wrapper.vm.$nextTick();
  expect(serial.props('modelValue')).toBe('00123');
});

it('removes a typed letter when the filtered Serial model does not change', async () => {
  await render();
  const serial = wrapper
    .findAllComponents(BaseInput)
    .find((field) => field.props('label') === 'SERIAL No')!;
  const input = serial.get('input');
  await input.setValue('0012');
  await input.setValue('0012A');
  expect((input.element as HTMLInputElement).value).toBe('0012');
});

it('submits scanner once and supports cancel fallback', async () => {
  vi.mocked(service.inspMaskInfo).mockResolvedValue({
    ok: true,
    data: {
      serialNo: '12345',
      pellicle: 'Y',
      testDay: 'today',
      fabInDate: '',
      eqpIds: [],
      inspTypes: [],
      inspType2s: [],
      inspResults: [],
    },
  });
  const router = await render();
  const mask = wrapper
    .findAllComponents(BaseInput)
    .find((field) => field.props('label') === 'Mask Tag')!;
  mask.vm.$emit('update:modelValue', 'ab1X');
  await wrapper.vm.$nextTick();
  await mask.get('input').trigger('keydown', { key: 'Enter' });
  await flushPromises();
  expect(service.inspMaskInfo).toHaveBeenCalledTimes(1);
  expect(wrapper.getComponent(BaseScreen).props('okDisabled')).toBe(false);
  wrapper.getComponent(BaseScreen).vm.$emit('cancel');
  await flushPromises();
  expect(router.currentRoute.value.path).toBe('/main');
});

it('resets an existing dropdown choice when QSelect opens by keyboard', async () => {
  vi.mocked(service.inspMaskInfo).mockResolvedValue({
    ok: true,
    data: {
      serialNo: '12345',
      pellicle: 'Y',
      testDay: 'today',
      fabInDate: '',
      eqpIds: ['EQP01'],
      inspTypes: [],
      inspType2s: [],
      inspResults: [],
    },
  });
  await render();
  const mask = wrapper
    .findAllComponents(BaseInput)
    .find((field) => field.props('label') === 'Mask Tag')!;
  mask.vm.$emit('update:modelValue', 'MASK01X');
  await wrapper.vm.$nextTick();
  await mask.get('input').trigger('keydown', { key: 'Enter' });
  await flushPromises();
  const eqp = wrapper
    .findAllComponents(BaseDropdownList)
    .find((field) => field.props('label') === '장비')!;
  eqp.vm.$emit('update:modelValue', 'EQP01');
  await wrapper.vm.$nextTick();
  expect(eqp.props('modelValue')).toBe('EQP01');
  eqp.findComponent({ name: 'QSelect' }).vm.$emit('popupShow');
  await wrapper.vm.$nextTick();
  expect(eqp.props('modelValue')).toBeUndefined();
});
