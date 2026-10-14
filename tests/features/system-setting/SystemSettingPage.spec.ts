import { DOMWrapper, enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { DEV_SERVER } from 'src/constants/server';
import * as mocks from 'src/features/system-setting/mocks/system-setting.mock';
import SystemSettingPage from 'src/features/system-setting/pages/SystemSettingPage.vue';
import { setBackBlocked } from 'src/features/system-setting/services/system-setting-native.service';
import type { SystemSettingMockCase } from 'src/features/system-setting/types/system-setting.types';
import appRoutes from 'src/router/routes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, type Router, RouterView } from 'vue-router';

vi.mock('src/features/system-setting/services/system-setting-native.service', () => ({
  setBackBlocked: vi.fn(async () => undefined),
  downloadApk: vi.fn(async () => undefined),
}));

enableAutoUnmount(afterEach);
let router: Router;
let api: ReturnType<typeof mocks.createSystemSettingMockApi>;
let now: number;

function control(testId: string): DOMWrapper<Element> {
  const element = document.querySelector(`[data-testid="${testId}"]`);
  if (!element) throw new Error(`Missing control ${testId}`);
  return new DOMWrapper(element);
}

async function click(testId: string): Promise<void> {
  now += 1001;
  await control(testId).trigger('click');
  await flushPromises();
}

async function input(testId: string, value: string): Promise<void> {
  await control(testId).get('input').setValue(value);
}

async function mountPage(mockCase: SystemSettingMockCase = 'success', query = {}) {
  await router.push({
    path: '/system-setting',
    query: { mock: 'system-setting', case: mockCase, ...query },
  });
  const wrapper = mount(defineComponent({ setup: () => () => h(RouterView) }), {
    attachTo: document.body,
    global: { plugins: [createPinia(), router] },
  });
  await flushPromises();
  return wrapper;
}

async function unlock(): Promise<void> {
  await input('edit-password', 'hifos');
  await click('btn-password');
}

describe('SystemSettingPage legacy behavior', () => {
  beforeEach(async () => {
    localStorage.clear();
    now = 10000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const factory = mocks.createSystemSettingMockApi;
    vi.spyOn(mocks, 'createSystemSettingMockApi').mockImplementation((mockCase) => {
      api = factory(mockCase);
      return api;
    });
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/main', component: { template: '<div>Main</div>' } },
        { path: '/system-setting', component: SystemSettingPage },
      ],
    });
    await router.push('/main');
    await router.isReady();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('registers the real named route', async () => {
    const route = appRoutes.find((record) => record.path === '/system-setting');
    expect(route?.name).toBe('system-setting');
    expect(await (route?.component as () => Promise<{ default: unknown }>)()).toHaveProperty(
      'default',
      SystemSettingPage,
    );
  });

  it('renders exact legacy labels, empty masked password, disabled OK and hidden PDMA', async () => {
    await mountPage();
    expect(document.querySelector('#system-title')?.textContent).toBe('System Configuration');
    expect(control('edit-password').text()).toContain('비밀번호');
    expect(control('edit-password').get('input').attributes('type')).toBe('password');
    expect((control('edit-password').get('input').element as HTMLInputElement).value).toBe('');
    expect(control('btn-password').text()).toBe('변경');
    expect(control('btn-battery-down').text()).toBe('Battery Monitor');
    expect(control('btn-close').text()).toBe('닫기');
    expect(control('btn-ok').text()).toBe('확인');
    expect(control('btn-ok').attributes('disabled')).toBeDefined();
    expect(control('btn-pmdm-down').text()).toBe('PDMA Agent');
    expect(control('btn-pmdm-down').isVisible()).toBe(false);
    expect(document.querySelector('[data-testid="layout-server-info"]')).toBeNull();
    expect(setBackBlocked).toHaveBeenCalledWith(true);
  });

  it.each(['', 'HIFOS', ' hifos', 'hifos '])('rejects nonexact password %j', async (password) => {
    const wrapper = await mountPage();
    await input('edit-password', password);
    await click('btn-password');
    expect(wrapper.findComponent({ name: 'BaseToast' }).props('description')).toBe(
      '비밀번호가 다릅니다',
    );
    expect(document.querySelector('[data-testid="layout-server-info"]')).toBeNull();
    expect(control('btn-ok').attributes('disabled')).toBeDefined();
    expect(api.getRequests()).toEqual([]);
  });

  it('unlocks, preserves edits, and relocks only when Change is pressed with a wrong password', async () => {
    await mountPage();
    await unlock();
    expect(control('layout-server-info').text()).toContain('Mobile Server');
    expect(control('radio-server1').text()).toContain('PROD');
    expect(control('radio-server2').text()).toContain('DEV');
    expect(control('edit-prod-server').text()).toContain('PROD IP');
    expect(control('edit-dev-server').text()).toContain('DEV IP');
    expect(control('btn-ok').attributes('disabled')).toBeUndefined();
    await input('edit-prod-server', '192x.168a.0.15');
    expect((control('edit-prod-server').get('input').element as HTMLInputElement).value).toBe(
      '192.168.0.15',
    );
    await input('edit-password', 'wrong');
    expect(control('btn-ok').attributes('disabled')).toBeUndefined();
    await click('btn-password');
    expect(control('btn-ok').attributes('disabled')).toBeDefined();
    await unlock();
    expect((control('edit-prod-server').get('input').element as HTMLInputElement).value).toBe(
      '192.168.0.15',
    );
  });

  it('uses one shared 1000ms click debounce and never checks on unlock', async () => {
    await mountPage();
    await unlock();
    await control('btn-ok').trigger('click');
    expect(document.querySelector('[data-testid="dialog-ok"]')).toBeNull();
    expect(api.getRequests()).toEqual([]);
    await click('btn-ok');
    expect(document.body.textContent).toContain('시스템 환경설정을 변경 하시겠습니까?');
    expect(api.getRequests()).toEqual([]);
  });

  it('canceling confirmation leaves server info untouched', async () => {
    await mountPage();
    await unlock();
    await click('btn-ok');
    expect(control('dialog-cancel').text()).toBe('취소');
    await click('dialog-cancel');
    expect(api.getRequests()).toEqual([]);
    expect(router.currentRoute.value.path).toBe('/system-setting');
  });

  it.each(['success', 'dev-selected'] as const)(
    'saves %s only after confirmation and exits only after acknowledging success',
    async (mockCase) => {
      await mountPage(mockCase);
      await unlock();
      await click('btn-ok');
      await click('dialog-ok');
      expect(api.getRequests().map((request) => request.operation)).toEqual([
        'checkAPI',
        'saveServerConfigs',
        'applyServerInfo',
      ]);
      expect(api.getRequests()[0]).toEqual({
        operation: 'checkAPI',
        checkUrl: `http://172.16.0.${mockCase === 'success' ? '10' : '20'}:8080`,
      });
      expect(document.body.textContent).toContain('시스템 환경설정이 변경 되었습니다.');
      expect(router.currentRoute.value.path).toBe('/system-setting');
      await click('dialog-ok');
      expect(router.currentRoute.value.path).toBe('/main');
      expect(setBackBlocked).toHaveBeenLastCalledWith(false);
      expect(localStorage.getItem('server.info')).toBeNull();
    },
  );

  it('selects DEV exclusively and applies edited IP addresses', async () => {
    await mountPage();
    await unlock();
    await control('radio-server2').get('[role="radio"]').trigger('click');
    await input('edit-prod-server', '1.2.3.4');
    await input('edit-dev-server', '5.6.7.8');
    await click('btn-ok');
    await click('dialog-ok');
    expect(api.getServerInfo()).toEqual({
      editProdServer: '1.2.3.4',
      editDevServer: '5.6.7.8',
      selectedServer: DEV_SERVER,
    });
    expect(api.getRequests()[2]).toEqual({
      operation: 'applyServerInfo',
      info: {
        mobileServerUrl: 'http://5.6.7.8:8080',
        updateServerUrl: 'http://1.2.3.4:8081',
        mobileServerName: 'DEV-SERVER',
      },
    });
  });

  it('non-200 check leaves the page open without a success message or storage write', async () => {
    await mountPage('check-rejected');
    await unlock();
    await click('btn-ok');
    await click('dialog-ok');
    expect(api.getRequests().map((request) => request.operation)).toEqual(['checkAPI']);
    expect(document.querySelector('[data-testid="dialog-ok"]')).toBeNull();
    expect(router.currentRoute.value.path).toBe('/system-setting');
    expect(control('btn-ok').attributes('disabled')).toBeUndefined();
  });

  it.each([
    ['network-error', 'Network unavailable'],
    ['storage-error', 'Storage unavailable'],
  ] as const)('shows error and does not apply runtime for %s', async (mockCase, message) => {
    await mountPage(mockCase);
    await unlock();
    await click('btn-ok');
    await click('dialog-ok');
    expect(document.body.textContent).toContain('에  러');
    expect(document.body.textContent).toContain(message);
    expect(api.getRequests().some((request) => request.operation === 'applyServerInfo')).toBe(
      false,
    );
    await click('dialog-ok');
    expect(router.currentRoute.value.path).toBe('/system-setting');
  });

  it.each(['empty', 'missing-prod', 'missing-dev'] as const)(
    'supports %s without a legacy null crash',
    async (mockCase) => {
      await mountPage(mockCase);
      await unlock();
      expect((control('edit-prod-server').get('input').element as HTMLInputElement).value).toBe(
        mockCase === 'missing-dev' ? '172.16.0.10' : '127.0.0.1',
      );
      expect((control('edit-dev-server').get('input').element as HTMLInputElement).value).toBe(
        mockCase === 'missing-prod' ? '172.16.0.20' : '10.0.0.1',
      );
    },
  );

  it('reports a load failure without crashing', async () => {
    await mountPage('load-error');
    expect(document.body.textContent).toContain('Server info unavailable');
    await click('dialog-ok');
    await click('btn-close');
    expect(router.currentRoute.value.path).toBe('/main');
  });

  it('downloads without a password using the legacy update path', async () => {
    await mountPage('dev-selected');
    await click('btn-battery-down');
    expect(api.getRequests()).toEqual([
      {
        operation: 'downloadApk',
        url: 'http://172.16.0.10:8081/upload/EmBatteryMonitor.apk',
        fileName: 'EmBatteryMonitor.apk',
      },
    ]);
    expect(router.currentRoute.value.path).toBe('/system-setting');
  });

  it.each([
    ['download-error', 'APK download failed'],
    ['permission-denied', '설치 권한이 필요합니다.'],
  ] as const)('handles %s and allows retry', async (mockCase, message) => {
    await mountPage(mockCase);
    await click('btn-battery-down');
    expect(document.body.textContent).toContain(message);
    await click('dialog-ok');
    await click('btn-battery-down');
    expect(api.getRequests()).toHaveLength(2);
  });

  it('blocks route Back and closes explicitly without saving', async () => {
    await mountPage();
    await router.push('/main');
    expect(router.currentRoute.value.path).toBe('/system-setting');
    await click('btn-close');
    expect(router.currentRoute.value.path).toBe('/main');
    expect(api.getRequests()).toEqual([]);
  });

  it('matches the child OkCancelDialog Back override by confirming, while screen Back stays blocked', async () => {
    await mountPage();
    window.dispatchEvent(new Event('system-setting-back'));
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/system-setting');
    expect(api.getRequests()).toEqual([]);
    await unlock();
    await click('btn-ok');
    window.dispatchEvent(new Event('system-setting-back'));
    await flushPromises();
    expect(api.getRequests().map((request) => request.operation)).toEqual([
      'checkAPI',
      'saveServerConfigs',
      'applyServerInfo',
    ]);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/main');
  });

  it('handles Escape as acknowledgment in the child error dialog', async () => {
    await mountPage('load-error');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flushPromises();
    expect(document.querySelector('[data-testid="dialog-ok"]')).toBeNull();
    expect(router.currentRoute.value.path).toBe('/system-setting');
  });

  it('retains the hidden PDMA event contract without exposing the button', async () => {
    await mountPage();
    expect(control('btn-pmdm-down').isVisible()).toBe(false);
    await click('btn-pmdm-down');
    expect(api.getRequests()).toEqual([
      {
        operation: 'downloadApk',
        url: 'http://172.16.0.10:8081/upload/PMDMAgent.apk',
        fileName: 'PMDMAgent.apk',
      },
    ]);
  });

  it('prevents double save and locks the form while the selected server check is pending', async () => {
    await mountPage();
    await unlock();
    let resolveCheck: ((success: boolean) => void) | undefined;
    const pending = new Promise<boolean>((resolve) => {
      resolveCheck = resolve;
    });
    const save = vi.spyOn(api, 'saveServerInfo').mockReturnValue(pending);
    await click('btn-ok');
    await click('dialog-ok');
    expect(control('btn-ok').attributes('disabled')).toBeDefined();
    expect(control('edit-prod-server').get('input').attributes('disabled')).toBeDefined();
    await click('btn-ok');
    expect(save).toHaveBeenCalledOnce();
    resolveCheck?.(true);
    await flushPromises();
    expect(document.body.textContent).toContain('시스템 환경설정이 변경 되었습니다.');
  });

  it('can close during the background APK download and ignores late errors after unmount', async () => {
    await mountPage();
    let rejectDownload: ((error: Error) => void) | undefined;
    const pending = new Promise<void>((_resolve, reject) => {
      rejectDownload = reject;
    });
    vi.spyOn(api, 'downLoadBatterMonitor').mockReturnValue(pending);
    await click('btn-battery-down');
    expect(control('btn-battery-down').attributes('disabled')).toBeDefined();
    expect(control('btn-close').attributes('disabled')).toBeUndefined();
    await click('btn-close');
    expect(router.currentRoute.value.path).toBe('/main');
    rejectDownload?.(new Error('late error'));
    await flushPromises();
    expect(document.querySelector('[data-testid="dialog-ok"]')).toBeNull();
  });
});
