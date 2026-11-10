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

async function mountPage(viaMain = false) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/main', component: { template: '<div>Main</div>' } },
      { path: '/setting', component: SettingPage },
    ],
  });
  if (viaMain) await router.push('/main');
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SettingPage legacy parity', () => {
  beforeEach(() => {
    // Each Date.now() call is 1.5 s later so OnSingleClickListener never blocks unrelated tests.
    let clock = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1500));
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

  it.each(['area', 'bay'] as const)(
    'clears %s options without showing an API error dialog',
    async (field) => {
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
    },
  );

  it('caps persisted counts but keeps pre-cap values in legacy DeviceInfo', async () => {
    const { wrapper, store } = await mountPage();
    await selectMockLocation(wrapper);
    await input(wrapper, 'history-count').vm.$emit('update:modelValue', 3000);
    await input(wrapper, 'forward-count').vm.$emit('update:modelValue', 3001);
    await wrapper.get('[data-testid="btn-ok"]').trigger('click');
    await flushPromises();
    expect(store.historyCount).toBe('2000');
    expect(store.forwardCount).toBe('2000');
    expect(DeviceInfo.HISTORY_COUNT).toBe('3000');
    expect(DeviceInfo.FORWARD_COUNT).toBe('3001');
  });

  it('persists saved values through Main Store', async () => {
    const { wrapper, store } = await mountPage();
    await selectMockLocation(wrapper);
    await wrapper.get('[data-testid="btn-ok"]').trigger('click');
    await flushPromises();

    expect(store.facility).toBe('GUMI');
    expect(store.area).toBe('PHOTO');
    expect(store.bay).toBe('P01');
  });

  it('checks WiFi after success acknowledgement and returns OK', async () => {
    const { wrapper, router, store } = await mountPage();
    await selectMockLocation(wrapper);
    await wrapper.get('[data-testid="btn-ok"]').trigger('click');
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
    await wrapper.get('[data-testid="btn-ok"]').trigger('click');
    await flushPromises();
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();
    expect(store.settingResult).toBe(SETTING_RESULT.OK);
  });

  it('shows CONFIG failure only after save acknowledgement, then finishes with OK', async () => {
    settingApi.sendConfig.mockRejectedValueOnce(new Error('CONFIG failed.'));
    const { wrapper, router, store } = await mountPage();
    await selectMockLocation(wrapper);
    await wrapper.get('[data-testid="btn-ok"]').trigger('click');
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

  it('renders on BaseScreen with legacy copy and empty dropdown placeholders', async () => {
    const { wrapper } = await mountPage();
    const text = wrapper.text();
    for (const copy of [
      'FACILITY',
      'AREA',
      'BAY',
      'History Count',
      'Forward Count',
      '확인',
      '취소',
    ]) {
      expect(text).toContain(copy);
    }
    expect(wrapper.find('.ds-screen').exists()).toBe(true);
    expect(wrapper.findAll('.ds-screen__card')).toHaveLength(2);
    expect(dropdown(wrapper, 'facility').props('placeholder')).toBe('');
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('validates in legacy order with the 경  고 dialog and no save', async () => {
    const { wrapper, store } = await mountPage();
    const ok = () => document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    const submit = async () => {
      await wrapper.get('[data-testid="btn-ok"]').trigger('click');
      await flushPromises();
    };
    const expectWarning = async (message: string) => {
      await submit();
      expect(document.body.textContent).toContain('경  고');
      expect(document.body.textContent).toContain(message);
      ok();
      await flushPromises();
    };
    await expectWarning('FACILITY를 선택해주세요');
    await dropdown(wrapper, 'facility').vm.$emit('update:modelValue', 'GUMI');
    await expectWarning('AREA를 선택해주세요');
    await dropdown(wrapper, 'area').vm.$emit('update:modelValue', 'PHOTO');
    await expectWarning('BAY를 선택해주세요');
    await dropdown(wrapper, 'bay').vm.$emit('update:modelValue', 'P01');
    await input(wrapper, 'history-count').vm.$emit('update:modelValue', '');
    await expectWarning('History Count를 입력해주세요');
    await input(wrapper, 'history-count').vm.$emit('update:modelValue', '5');
    await input(wrapper, 'forward-count').vm.$emit('update:modelValue', '');
    await expectWarning('Forward Count를 입력해주세요');
    expect(store.settingResult).not.toBe(SETTING_RESULT.OK);
    expect(store.facility).not.toBe('GUMI');
  });

  it('warns PLEASE AREA when the bay is touched without an area, and clears nothing', async () => {
    const { wrapper } = await mountPage();
    await dropdown(wrapper, 'facility').vm.$emit('update:modelValue', 'GUMI');
    await clickDropdownControl(wrapper, 'bay');
    await flushPromises();
    expect(document.body.textContent).toContain('PLEASE AREA');
    expect(settingApi.getBay).not.toHaveBeenCalled();
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();
  });

  it('keeps the facility but clears area and bay when the facility request fails', async () => {
    const { wrapper } = await mountPage();
    await clickDropdownControl(wrapper, 'facility');
    await flushPromises();
    await selectMockLocation(wrapper);
    settingApi.getFacility.mockRejectedValueOnce(new Error('x'));
    await clickDropdownControl(wrapper, 'facility');
    await flushPromises();
    expect(dropdown(wrapper, 'facility').props('modelValue')).toBe('GUMI');
    expect(dropdown(wrapper, 'area').props('modelValue')).toBeUndefined();
    expect(dropdown(wrapper, 'bay').props('modelValue')).toBeUndefined();
    expect(dropdown(wrapper, 'area').props('options')).toEqual([]);
  });

  it('resets facility selection and dependent lists after a successful facility load', async () => {
    const { wrapper } = await mountPage();
    await selectMockLocation(wrapper);
    await clickDropdownControl(wrapper, 'facility');
    await flushPromises();
    expect(dropdown(wrapper, 'facility').props('modelValue')).toBeUndefined();
    expect(dropdown(wrapper, 'bay').props('options')).toEqual([]);
  });

  it('persists the capped Int value (no leading zeros) while DeviceInfo keeps the raw text', async () => {
    const { wrapper, store } = await mountPage();
    await selectMockLocation(wrapper);
    await input(wrapper, 'history-count').vm.$emit('update:modelValue', '0010');
    await input(wrapper, 'forward-count').vm.$emit('update:modelValue', '0');
    await wrapper.get('[data-testid="btn-ok"]').trigger('click');
    await flushPromises();
    expect(store.historyCount).toBe('10');
    expect(store.forwardCount).toBe('0');
    expect(DeviceInfo.HISTORY_COUNT).toBe('0010');
    expect(DeviceInfo.FORWARD_COUNT).toBe('0');
  });

  it('restores a saved setting into single-item lists and counts', async () => {
    localStorage.clear();
    const first = await mountPage();
    await selectMockLocation(first.wrapper);
    await input(first.wrapper, 'history-count').vm.$emit('update:modelValue', '25');
    await first.wrapper.get('[data-testid="btn-ok"]').trigger('click');
    await flushPromises();
    first.wrapper.unmount();

    const { wrapper } = await mountPage();
    expect(dropdown(wrapper, 'facility').props('modelValue')).toBe('GUMI');
    expect(dropdown(wrapper, 'area').props('options')).toEqual([
      { label: 'PHOTO', value: 'PHOTO' },
    ]);
    expect(dropdown(wrapper, 'bay').props('modelValue')).toBe('P01');
    expect(input(wrapper, 'history-count').props('modelValue')).toBe('25');
  });

  it('does not disable fields while saving and strips non-digits from counts', async () => {
    const { wrapper } = await mountPage();
    await input(wrapper, 'history-count').vm.$emit('update:modelValue', '1a2b3c4d5');
    expect(input(wrapper, 'history-count').props('modelValue')).toBe('1234');
    expect(input(wrapper, 'history-count').props('disabled')).toBeFalsy();
  });

  it('ignores clicks within 1000 ms of the last accepted click, shared by OK and Cancel', async () => {
    let now = 5_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const { wrapper, store } = await mountPage();
    await wrapper.get('[data-testid="btn-ok"]').trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('FACILITY를 선택해주세요');
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();

    now += 1000;
    await wrapper.get('[data-testid="btn-ok"]').trigger('click');
    await wrapper.get('[data-testid="btn-cancel"]').trigger('click');
    await flushPromises();
    expect(document.body.textContent).not.toContain('FACILITY를 선택해주세요');
    expect(store.settingResult).not.toBe(SETTING_RESULT.CANCELED);

    now += 1001;
    await wrapper.get('[data-testid="btn-cancel"]').trigger('click');
    await flushPromises();
    expect(store.settingResult).toBe(SETTING_RESULT.CANCELED);
  });

  it('coerces non-string dropdown values and an undefined count to legacy-safe strings', async () => {
    const { wrapper } = await mountPage();
    await dropdown(wrapper, 'facility').vm.$emit('update:modelValue', 7);
    expect(dropdown(wrapper, 'facility').props('modelValue')).toBe('7');
    await dropdown(wrapper, 'facility').vm.$emit('update:modelValue', undefined);
    expect(dropdown(wrapper, 'facility').props('modelValue')).toBeUndefined();
    await input(wrapper, 'history-count').vm.$emit('update:modelValue', undefined);
    expect(input(wrapper, 'history-count').props('modelValue')).toBe('');
  });

  it('ignores clicks outside the dropdown control and clicks while a loader is running', async () => {
    const pending = new Promise<string[]>(() => undefined);
    settingApi.getFacility.mockReturnValueOnce(pending);
    const { wrapper } = await mountPage();
    await dropdown(wrapper, 'facility').trigger('click');
    expect(settingApi.getFacility).not.toHaveBeenCalled();

    await clickDropdownControl(wrapper, 'facility');
    await clickDropdownControl(wrapper, 'facility');
    expect(settingApi.getFacility).toHaveBeenCalledOnce();

    await dropdown(wrapper, 'facility').vm.$emit('update:modelValue', 'GUMI');
    settingApi.getArea.mockReturnValueOnce(pending);
    await clickDropdownControl(wrapper, 'area');
    await clickDropdownControl(wrapper, 'area');
    expect(settingApi.getArea).toHaveBeenCalledOnce();

    await dropdown(wrapper, 'area').vm.$emit('update:modelValue', 'PHOTO');
    settingApi.getBay.mockReturnValueOnce(pending);
    await clickDropdownControl(wrapper, 'bay');
    await clickDropdownControl(wrapper, 'bay');
    expect(settingApi.getBay).toHaveBeenCalledOnce();
  });

  it('shows a non-Error CONFIG rejection as text and goes back when history has a parent', async () => {
    settingApi.sendConfig.mockRejectedValueOnce('plain failure');
    const { wrapper, router } = await mountPage(true);
    await selectMockLocation(wrapper);
    await wrapper.get('[data-testid="btn-ok"]').trigger('click');
    await flushPromises();
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();
    expect(document.body.textContent).toContain('plain failure');
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/main');
  });
});
