import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { BaseDropdownList, BaseInput } from 'src/components/base';
import { BuildConfig } from 'src/constants/build-config';
import { DeviceInfo } from 'src/constants/device-info';
import { SETTING_RESULT, useMainStore } from 'src/features/main/stores/main.store';
import SettingPage from 'src/features/setting/pages/SettingPage.vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

const { getWifiIpAddress } = vi.hoisted(() => ({ getWifiIpAddress: vi.fn() }));
const { settingApi } = vi.hoisted(() => ({
  settingApi: {
    getFacility: vi.fn(),
    getArea: vi.fn(),
    getBay: vi.fn(),
    sendConfig: vi.fn(),
  },
}));
vi.mock('src/features/system-setting/services/system-setting-native.service', () => ({
  getWifiIpAddress,
}));
vi.mock('src/features/setting/services/setting.api', () => ({ settingApi }));

enableAutoUnmount(afterEach);

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/main', component: { template: '<div>Main</div>' } },
      { path: '/setting', component: SettingPage },
    ],
  });
  await router.push('/setting');
  await router.isReady();
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(SettingPage, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return { wrapper, router, store: useMainStore() };
}

function dropdown(wrapper: VueWrapper, testId: string) {
  const component = wrapper
    .findAllComponents(BaseDropdownList)
    .find((item) => item.attributes('data-testid') === testId);
  if (!component) throw new Error(`Missing dropdown ${testId}`);
  return component;
}

function input(wrapper: VueWrapper, testId: string) {
  const component = wrapper
    .findAllComponents(BaseInput)
    .find((item) => item.attributes('data-testid') === testId);
  if (!component) throw new Error(`Missing input ${testId}`);
  return component;
}

async function clickDropdownControl(wrapper: VueWrapper, testId: string) {
  await dropdown(wrapper, testId).find('.q-field__control').trigger('click');
}

async function selectMockLocation(wrapper: VueWrapper) {
  await dropdown(wrapper, 'facility').vm.$emit('update:modelValue', 'GUMI');
  await dropdown(wrapper, 'area').vm.$emit('update:modelValue', 'PHOTO');
  await dropdown(wrapper, 'bay').vm.$emit('update:modelValue', 'P01');
}

describe('SettingPage legacy parity', () => {
  beforeEach(() => {
    localStorage.clear();
    getWifiIpAddress.mockReset().mockResolvedValue('192.168.0.10');
    settingApi.getFacility.mockReset().mockResolvedValue(['GUMI', 'ICHEON']);
    settingApi.getArea.mockReset().mockResolvedValue(['PHOTO', 'ETCH']);
    settingApi.getBay.mockReset().mockResolvedValue(['P01', 'P02']);
    settingApi.sendConfig.mockReset().mockResolvedValue(undefined);
  });

  it('uses BuildConfig version, legacy labels and migrated base fields', async () => {
    const { wrapper, store } = await mountPage();
    expect(store.versionName).toBe(BuildConfig.VERSION_NAME);
    expect(wrapper.text()).toContain(`환경설정 v${store.versionName}`);
    store.setVersionName('1.227');
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('환경설정 v1.227');
    expect(wrapper.text()).toContain('위치설정');
    expect(wrapper.text()).toContain('e-Sheet 설정');
    expect(wrapper.findAllComponents(BaseDropdownList)).toHaveLength(3);
    expect(wrapper.findAllComponents(BaseInput)).toHaveLength(2);
    expect(input(wrapper, 'history-count').props('type')).toBe('number');
    expect(input(wrapper, 'forward-count').props('type')).toBe('number');
  });

  it('defaults both legacy counts to 10 without a saved setting', async () => {
    const { wrapper } = await mountPage();
    expect(dropdown(wrapper, 'facility').props('modelValue')).toBeUndefined();
    expect(dropdown(wrapper, 'area').props('modelValue')).toBeUndefined();
    expect(dropdown(wrapper, 'bay').props('modelValue')).toBeUndefined();
    expect(input(wrapper, 'history-count').props('modelValue')).toBe('10');
    expect(input(wrapper, 'forward-count').props('modelValue')).toBe('10');
  });

  it('requires the parent location before loading its child', async () => {
    const { wrapper } = await mountPage();
    await clickDropdownControl(wrapper, 'area');
    await flushPromises();
    expect(document.body.textContent).toContain('PLEASE FACILITY');
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await dropdown(wrapper, 'area').vm.$emit('focus', new FocusEvent('focus'));
    await flushPromises();
    expect(document.body.textContent).not.toContain('PLEASE FACILITY');
  });

  it('calls each legacy location service only when its parent values are selected', async () => {
    const { wrapper } = await mountPage();

    await clickDropdownControl(wrapper, 'facility');
    await flushPromises();
    expect(settingApi.getFacility).toHaveBeenCalledOnce();
    expect(dropdown(wrapper, 'facility').props('options')).toEqual([
      { label: 'GUMI', value: 'GUMI' },
      { label: 'ICHEON', value: 'ICHEON' },
    ]);

    await dropdown(wrapper, 'facility').vm.$emit('update:modelValue', 'GUMI');
    await clickDropdownControl(wrapper, 'area');
    await flushPromises();
    expect(settingApi.getArea).toHaveBeenCalledWith('GUMI');

    await dropdown(wrapper, 'area').vm.$emit('update:modelValue', 'PHOTO');
    await clickDropdownControl(wrapper, 'bay');
    await flushPromises();
    expect(settingApi.getBay).toHaveBeenCalledWith('PHOTO', 'GUMI');
  });

  it('does not show an error dialog when a facility API request fails', async () => {
    settingApi.getFacility.mockRejectedValueOnce(new Error('FACILITY DATA Empty!'));
    const { wrapper } = await mountPage();
    await clickDropdownControl(wrapper, 'facility');
    await flushPromises();
    expect(document.body.textContent).not.toContain('FACILITY DATA Empty!');
  });

  it.each([
    ['area-error', 'area'],
    ['bay-error', 'bay'],
  ] as const)('clears %s options without showing an API error dialog', async (mockCase, field) => {
    const { wrapper } = await mountPage();
    if (field === 'area') {
      settingApi.getArea.mockRejectedValueOnce(new Error('AREA DATA Empty!'));
      await dropdown(wrapper, 'facility').vm.$emit('update:modelValue', 'GUMI');
    } else {
      settingApi.getBay.mockRejectedValueOnce(new Error('BAY DATA Empty!'));
      await selectMockLocation(wrapper);
    }
    await clickDropdownControl(wrapper, field);
    await flushPromises();
    expect(dropdown(wrapper, field).props('options')).toEqual([]);
    expect(document.body.textContent).not.toContain('DATA Empty!');
  });

  it('caps persisted counts but keeps pre-cap values in legacy DeviceInfo', async () => {
    const { wrapper, store } = await mountPage();
    await selectMockLocation(wrapper);
    await input(wrapper, 'history-count').vm.$emit('update:modelValue', 3000);
    await input(wrapper, 'forward-count').vm.$emit('update:modelValue', 3001);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(store.historyCount).toBe('2000');
    expect(store.forwardCount).toBe('2000');
    expect(DeviceInfo.HISTORY_COUNT).toBe('3000');
    expect(DeviceInfo.FORWARD_COUNT).toBe('3001');
  });

  it('persists saved values through Main Store', async () => {
    const { wrapper, store } = await mountPage();
    await selectMockLocation(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(store.facility).toBe('GUMI');
    expect(store.area).toBe('PHOTO');
    expect(store.bay).toBe('P01');
  });

  it('checks WiFi after success acknowledgement and returns OK', async () => {
    const { wrapper, router, store } = await mountPage();
    await selectMockLocation(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/setting');
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();
    expect(getWifiIpAddress).toHaveBeenCalledOnce();
    expect(settingApi.sendConfig).toHaveBeenCalledWith('192.168.0.10');
    expect(store.settingResult).toBe(SETTING_RESULT.OK);
    expect(router.currentRoute.value.path).toBe('/main');
  });

  it('does not send CONFIG when WiFi has no IP and still returns OK', async () => {
    getWifiIpAddress.mockResolvedValue(null);
    const { wrapper, store } = await mountPage();
    await selectMockLocation(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();
    expect(store.settingResult).toBe(SETTING_RESULT.OK);
  });

  it('shows CONFIG failure only after save acknowledgement, then finishes with OK', async () => {
    settingApi.sendConfig.mockRejectedValueOnce(new Error('CONFIG failed.'));
    const { wrapper, router, store } = await mountPage();
    await selectMockLocation(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();
    expect(document.body.textContent).toContain('CONFIG failed.');
    expect(router.currentRoute.value.path).toBe('/setting');
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();
    expect(store.settingResult).toBe(SETTING_RESULT.OK);
    expect(router.currentRoute.value.path).toBe('/main');
  });

  it('returns CANCELED when the cancel button is used', async () => {
    const { wrapper, store } = await mountPage();
    await wrapper.get('[data-testid="btn-cancel"]').trigger('click');
    await flushPromises();
    expect(store.settingResult).toBe(SETTING_RESULT.CANCELED);
  });
});
