import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia } from 'pinia';
import {
  BaseCheckbox,
  BaseDropdownList,
  BaseInput,
  BaseLoading,
  BaseModal,
  BaseScreen,
} from 'src/components/base';
import MaskLocationPage from 'src/features/mask-location/pages/MaskLocationPage.vue';
import { maskLocationService as service } from 'src/features/mask-location/services/mask-location.service';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
vi.mock('src/features/mask-location/services/mask-location.service', () => ({
  maskLocationService: {
    maskInfo: vi.fn(),
    maskStatusInfo: vi.fn(),
    maskLocGroupInfo: vi.fn(),
    maskLocationInfo: vi.fn(),
    checkMaskPMS: vi.fn(),
    checkPellicle: vi.fn(),
    changeMaskLocation: vi.fn(),
  },
}));
let wrapper: VueWrapper;
async function render(fromMain = false) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/mask-location', component: MaskLocationPage },
      { path: '/main', component: { template: '<div>MAIN</div>' } },
    ],
  });
  if (fromMain) await router.push('/main');
  await router.push('/mask-location');
  await router.isReady();
  wrapper = mount(MaskLocationPage, {
    attachTo: document.body,
    global: { plugins: [createPinia(), router] },
  });
  await flushPromises();
  return router;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(service.maskInfo).mockResolvedValue({
    ok: true,
    data: {
      RETICLETAG: 'MASK01',
      PRODUCT: 'PROD',
      STATUS: 'READY',
      ISUSE: '사용가능',
      CURRLOC: 'OLD',
      SUBLOCATION3: 'EQP01',
      CUSTOMER: 'N',
      RMSINSP: 'WAIT',
      RMSID: 'Y',
      SHELF: 'S0',
      PELLICLE: 'P1',
    },
  });
  vi.mocked(service.maskStatusInfo).mockResolvedValue({ ok: true, data: ['READY'] });
});
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = '';
});
it('renders legacy labels, blank readonly values, disabled controls and initial focus', async () => {
  await render();
  expect(wrapper.text()).toContain('MASK 위치 지정');
  expect(wrapper.text()).not.toContain('Null');
  expect(wrapper.getComponent(BaseScreen).props('okDisabled')).toBe(true);
  expect(wrapper.getComponent(BaseScreen).props('okLabel')).toBe('확인');
  expect(wrapper.findAllComponents(BaseDropdownList).every((c) => c.props('disabled'))).toBe(true);
  expect(wrapper.getComponent(BaseCheckbox).props('disabled')).toBe(true);
  expect(wrapper.findAllComponents(BaseInput).filter((c) => c.props('readonly')).length).toBe(8);
  expect(document.activeElement).toBe(wrapper.findAll('input')[0]?.element);
});
it('wires Enter lookup, uppercase machine, manual toggle and cancel fallback', async () => {
  const router = await render();
  const mask = wrapper.findAllComponents(BaseInput).find((c) => c.props('label') === 'MASK TAG')!;
  mask.vm.$emit('update:modelValue', 'MASK01X');
  await wrapper.vm.$nextTick();
  await mask.get('input').trigger('keydown', { key: 'Enter' });
  await flushPromises();
  expect(service.maskInfo).toHaveBeenCalled();
  expect(wrapper.getComponent(BaseScreen).props('okDisabled')).toBe(false);
  const machine = wrapper
    .findAllComponents(BaseInput)
    .find((c) => c.props('ariaLabel') === '의뢰장비')!;
  machine.vm.$emit('update:modelValue', 'eqp02');
  await wrapper.vm.$nextTick();
  expect(machine.props('modelValue')).toBe('EQP02');
  wrapper.getComponent(BaseCheckbox).vm.$emit('update:modelValue', true);
  await flushPromises();
  expect(service.maskStatusInfo).toHaveBeenCalled();
  expect(wrapper.findAllComponents(BaseDropdownList).every((c) => !c.props('disabled'))).toBe(true);
  wrapper.getComponent(BaseScreen).vm.$emit('cancel');
  await flushPromises();
  expect(router.currentRoute.value.path).toBe('/main');
});
it('cancels back to the previous application page', async () => {
  const router = await render(true);
  wrapper.getComponent(BaseScreen).vm.$emit('cancel');
  await flushPromises();
  expect(router.currentRoute.value.path).toBe('/main');
});
it('acknowledges a result dialog on Back and stays on Mask Location', async () => {
  const router = await render(true);
  const mask = wrapper.findAllComponents(BaseInput).find((c) => c.props('label') === 'MASK TAG')!;
  await mask.get('input').trigger('keydown', { key: 'Enter' });
  await flushPromises();
  const resultDialog = wrapper
    .findAllComponents(BaseModal)
    .find((modal) => modal.props('title') === '에  러')!;
  expect(resultDialog.props('open')).toBe(true);
  expect(resultDialog.props('overlayClosable')).toBe(false);
  expect(resultDialog.findComponent({ name: 'QDialog' }).props('persistent')).toBe(false);
  expect(resultDialog.findComponent({ name: 'QDialog' }).props('noEscDismiss')).toBe(false);
  await router.push('/main');
  await flushPromises();
  expect(router.currentRoute.value.path).toBe('/mask-location');
  expect(resultDialog.props('open')).toBe(false);
});
it('runs the pending save reset when Back acknowledges the success dialog', async () => {
  vi.mocked(service.changeMaskLocation).mockResolvedValue({
    ok: true,
    data: { RETCILES: 'MASK01', SCOUNT: '1' },
  });
  const router = await render(true);
  const mask = wrapper.findAllComponents(BaseInput).find((c) => c.props('label') === 'MASK TAG')!;
  mask.vm.$emit('update:modelValue', 'MASK01X');
  await wrapper.vm.$nextTick();
  await mask.get('input').trigger('keydown', { key: 'Enter' });
  await flushPromises();
  const location = wrapper.findAllComponents(BaseInput).find((c) => c.props('label') === '위치')!;
  location.vm.$emit('update:modelValue', 'SHELF01');
  await wrapper.vm.$nextTick();
  wrapper.getComponent(BaseScreen).vm.$emit('ok');
  await flushPromises();
  expect(mask.props('modelValue')).toBe('MASK01');
  await router.push('/main');
  await flushPromises();
  expect(router.currentRoute.value.path).toBe('/mask-location');
  expect(mask.props('modelValue')).toBe('');
  expect(location.props('modelValue')).toBe('');
});
it('restores saved configuration before lookup on direct navigation', async () => {
  localStorage.setItem(
    'main.settingInfo',
    JSON.stringify({
      facility: 'SAVED-FAB',
      area: 'A',
      bay: 'B',
      historyCount: '1',
      forwardCount: '1',
    }),
  );
  localStorage.setItem(
    'main.userInfo',
    JSON.stringify({ operId: 'SAVED-USER', operName: 'User', permission: 'ALL' }),
  );
  try {
    await render();
    const mask = wrapper.findAllComponents(BaseInput).find((c) => c.props('label') === 'MASK TAG')!;
    mask.vm.$emit('update:modelValue', 'MASK01X');
    await wrapper.vm.$nextTick();
    await mask.get('input').trigger('keydown', { key: 'Enter' });
    await flushPromises();
    const savedDevice = vi.mocked(service.maskInfo).mock.calls[0]![1];
    expect(savedDevice.facility).toBe('SAVED-FAB');
    expect(savedDevice.operatorId).toBe('SAVED-USER');
    expect(savedDevice.mobileServerName).toBe('L4-DEVICE');
  } finally {
    localStorage.removeItem('main.settingInfo');
    localStorage.removeItem('main.userInfo');
  }
});
it('blocks cancel and shows a modal loader while MASKINFO is pending', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof service.maskInfo>>) => void;
  vi.mocked(service.maskInfo).mockReturnValue(new Promise((done) => (resolve = done)));
  const router = await render(true);
  const mask = wrapper.findAllComponents(BaseInput).find((c) => c.props('label') === 'MASK TAG')!;
  mask.vm.$emit('update:modelValue', 'MASK01X');
  await wrapper.vm.$nextTick();
  await mask.get('input').trigger('keydown', { key: 'Enter' });
  await wrapper.vm.$nextTick();
  expect(wrapper.getComponent(BaseScreen).props('cancelDisabled')).toBe(true);
  expect(wrapper.findAllComponents(BaseModal).some((modal) => modal.props('open'))).toBe(true);
  expect(wrapper.findComponent(BaseLoading).exists()).toBe(true);
  wrapper.getComponent(BaseScreen).vm.$emit('cancel');
  await flushPromises();
  expect(router.currentRoute.value.path).toBe('/mask-location');
  await router.push('/main');
  expect(router.currentRoute.value.path).toBe('/mask-location');
  resolve({ ok: false, message: 'lookup failed' });
  await flushPromises();
  expect(wrapper.getComponent(BaseScreen).props('cancelDisabled')).toBe(false);
});
