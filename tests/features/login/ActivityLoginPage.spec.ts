import { DOMWrapper, enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { BaseInput, BaseModal } from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import { DeviceNameCheckModal } from 'src/features/device-name-check';
import ActivityLoginPage from 'src/features/login/pages/ActivityLoginPage.vue';
import { useMainStore } from 'src/features/main/stores/main.store';
import routes from 'src/router/routes';
import { CommonUtil } from 'src/utils/common-util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import { createMainStateMock } from '../../helpers/main-state.fake';

const { getWifiIpAddress, sendMessage } = vi.hoisted(() => ({
  getWifiIpAddress: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('src/features/main/services/main-message.service', () => ({
  mainApi: { sendMessage },
}));
vi.mock('src/features/system-setting/services/system-setting-native.service', () => ({
  getWifiIpAddress,
}));

enableAutoUnmount(afterEach);

function pass(messageBody: Record<string, string>) {
  return { result: JSON.stringify({ STATUS: 'PASS', MSGBODY: messageBody }), statusCode: 200 };
}

function fail(message: string) {
  return {
    result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: message, MSGBODY: '' }),
    statusCode: 200,
  };
}

interface MountPageOptions {
  deviceName?: string;
  historyUserInfo?: { operId: string; operName: string; permission: string } | null;
  userInfo?: { operId: string; operName: string; permission: string } | null;
}

async function mountPage(options: MountPageOptions = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/main', component: { template: '<div>Main</div>' } },
      { path: '/login', component: ActivityLoginPage },
    ],
  });
  await router.push('/login');
  await router.isReady();
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useMainStore();
  store.setStateProvider(
    createMainStateMock({
      settingInfo: {
        area: 'AREA',
        bay: 'BAY',
        facility: 'FAB',
        forwardCount: '10',
        historyCount: '10',
      },
      deviceInfo: { deviceName: options.deviceName ?? 'AR-DEMO' },
      historyUserInfo: options.historyUserInfo,
      userInfo: options.userInfo,
    }),
  );
  const wrapper = mount(ActivityLoginPage, {
    attachTo: document.body,
    global: { plugins: [pinia, router] },
  });
  await flushPromises();
  return { router, store, wrapper };
}

function input(testId: string) {
  const inputElement = document.querySelector<HTMLInputElement>(`[data-testid="${testId}"] input`);
  if (!inputElement) throw new Error(`Missing ${testId} input`);
  return new DOMWrapper(inputElement);
}

function form() {
  const formElement = document.querySelector<HTMLFormElement>('#login-form');
  if (!formElement) throw new Error('Missing login form');
  return new DOMWrapper(formElement);
}

describe('ActivityLoginPage legacy parity', () => {
  beforeEach(() => {
    localStorage.clear();
    getWifiIpAddress.mockReset().mockResolvedValue('192.168.0.10');
    sendMessage.mockReset();
  });

  it('registers the legacy login target as a standalone route', () => {
    const loginRoute = routes.find((route) => route.path === `/${ROUTE.login}`);

    expect(loginRoute?.name).toBe(ROUTE.login);
    expect(String(loginRoute?.component)).toContain('features/login/pages/ActivityLoginPage.vue');
  });

  it('uses the legacy title, labels, BaseInput fields, and exact Korean actions', async () => {
    const { wrapper } = await mountPage();

    expect(document.body.textContent).toContain('계정을 입력해주세요');
    expect(document.body.textContent).toContain('USER ID');
    expect(document.body.textContent).toContain('PASSWORD');
    expect(document.body.textContent).toContain('취소');
    expect(document.body.textContent).toContain('확인');
    expect(wrapper.findAllComponents(BaseInput)).toHaveLength(2);
    expect(input('password').attributes('type')).toBe('password');
  });

  it('uses saved user ID and focuses the password field after initialization', async () => {
    const { store } = await mountPage({
      userInfo: { operId: 'saved', operName: 'Saved', permission: 'H' },
    });

    expect(store.operatorId).toBe('saved');
    expect(input('user-id').element.value).toBe('saved');
    expect(document.activeElement).toBe(input('password').element);
  });

  it('prefills USER ID from history even after the active login state is cleared', async () => {
    await mountPage({
      historyUserInfo: { operId: 'saved', operName: 'Saved', permission: 'H' },
      userInfo: null,
    });

    expect(input('user-id').element.value).toBe('saved');
    expect(document.activeElement).toBe(input('password').element);
  });

  it('shows the legacy PDA-name warning when the Bluetooth name is invalid', async () => {
    const checkPdaName = vi.spyOn(CommonUtil, 'requiresPdaNameCorrection').mockResolvedValue(true);
    await mountPage();
    checkPdaName.mockRestore();

    expect(document.body.textContent).toContain('PDA 기기명 확인');
    expect(document.body.textContent).toContain('PDA 기기명이 잘못 설정 되었습니다.');
  });

  it('preserves legacy USER ID select-all and down-focus behavior', async () => {
    await mountPage();
    await input('user-id').setValue('ATOP');
    input('password').element.focus();
    input('user-id').element.focus();
    await flushPromises();

    expect(input('user-id').element.selectionStart).toBe(0);
    expect(input('user-id').element.selectionEnd).toBe(4);

    await input('user-id').trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(input('password').element);
  });

  it('uppercases USER ID and validates ID before password with exact legacy messages', async () => {
    await mountPage();

    await form().trigger('submit');
    await flushPromises();
    expect(document.body.textContent).toContain('아이디를 입력해주세요');
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();

    await input('user-id').setValue(' atOp ');
    await form().trigger('submit');
    await flushPromises();
    expect(input('user-id').element.value).toBe('ATOP');
    expect(document.body.textContent).toContain('패스워드를 입력해주세요');
  });

  it('sends legacy LOGIN data, persists the response, and sends CONFIG after acknowledgement', async () => {
    sendMessage
      .mockResolvedValueOnce(
        pass({ GASINPUT: 'Y', OPERID: 'ATOP', OPERNAME: 'Kim', PERMISSTION: 'H' }),
      )
      .mockResolvedValueOnce(pass({ CONFIG: 'OK' }));
    const { router, store } = await mountPage();
    await input('user-id').setValue('atop');
    await input('password').setValue('pass');

    await form().trigger('submit');
    await flushPromises();
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        messageName: 'login',
        payload: expect.objectContaining({
          sMsg: expect.stringContaining('<OPERATORID>ATOP</OPERATORID>'),
        }),
      }),
    );
    expect(document.body.textContent).toContain('Kim 님');
    expect(document.body.textContent).toContain('로그인 성공 하였습니다.');

    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();
    expect(getWifiIpAddress).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        messageName: 'config',
        payload: expect.objectContaining({
          sMsg: expect.stringContaining('<USERID>ATOP</USERID>'),
        }),
      }),
    );
    expect(store.isLoggedIn).toBe(true);
    expect(store.gasInput).toBe('Y');
    expect(router.currentRoute.value.path).toBe('/main');
  });

  it('shows the server error then clears only password after acknowledgement', async () => {
    sendMessage.mockResolvedValueOnce(fail('아이디 또는 패스워드를 확인해주세요'));
    await mountPage();
    await input('user-id').setValue('ATOP');
    await input('password').setValue('bad');
    await form().trigger('submit');
    await flushPromises();

    expect(document.body.textContent).toContain('아이디 또는 패스워드를 확인해주세요');
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();
    expect(input('user-id').element.value).toBe('ATOP');
    expect(input('password').element.value).toBe('');
  });

  it('does not send CONFIG without a Wi-Fi IP and still finishes after login acknowledgement', async () => {
    getWifiIpAddress.mockResolvedValueOnce(null);
    sendMessage.mockResolvedValueOnce(
      pass({ GASINPUT: 'N', OPERID: 'ATOP', OPERNAME: 'Kim', PERMISSTION: 'H' }),
    );
    const { router } = await mountPage();
    await input('user-id').setValue('ATOP');
    await input('password').setValue('PASS');
    await form().trigger('submit');
    await flushPromises();
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.path).toBe('/main');
  });

  it('treats unavailable native Wi-Fi information as no IP', async () => {
    getWifiIpAddress.mockRejectedValueOnce(new Error('Native bridge unavailable'));
    sendMessage.mockResolvedValueOnce(
      pass({ GASINPUT: 'N', OPERID: 'ATOP', OPERNAME: 'Kim', PERMISSTION: 'H' }),
    );
    const { router } = await mountPage();
    await input('user-id').setValue('ATOP');
    await input('password').setValue('PASS');
    await form().trigger('submit');
    await flushPromises();
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.path).toBe('/main');
  });

  it('shows CONFIG failure after login acknowledgement and finishes after its error acknowledgement', async () => {
    sendMessage
      .mockResolvedValueOnce(
        pass({ GASINPUT: 'N', OPERID: 'ATOP', OPERNAME: 'Kim', PERMISSTION: 'H' }),
      )
      .mockResolvedValueOnce(fail('CONFIG failed.'));
    const { router } = await mountPage();
    await input('user-id').setValue('ATOP');
    await input('password').setValue('PASS');
    await form().trigger('submit');
    await flushPromises();
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();

    expect(document.body.textContent).toContain('CONFIG failed.');
    expect(router.currentRoute.value.path).toBe('/login');
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/main');
  });

  it('cancel finishes with router.back when history exists, otherwise replaces with main', async () => {
    const { router } = await mountPage();
    // Memory history exposes no browser history.state, so provide the entry Android would keep.
    Object.defineProperty(router.options.history, 'state', { value: { back: '/main' } });
    const back = vi.spyOn(router, 'back').mockImplementation(() => undefined);
    document.querySelector<HTMLElement>('[data-testid="btn-cancel"]')?.click();
    await flushPromises();
    expect(back).toHaveBeenCalledOnce();
  });

  it('cancel without history replaces the route with main', async () => {
    const { router } = await mountPage();
    document.querySelector<HTMLElement>('[data-testid="btn-cancel"]')?.click();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/main');
  });

  it('submits on Enter in the password field and ignores a second submit while pending', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    sendMessage.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    await mountPage();
    await input('user-id').setValue('ATOP');
    await input('password').setValue('PASS');
    await input('password').trigger('keyup', { key: 'Enter' });
    await input('password').trigger('keyup', { key: 'Enter' });
    expect(sendMessage).toHaveBeenCalledTimes(1);
    resolve(fail('late'));
    await flushPromises();
    expect(document.body.textContent).toContain('late');
  });

  it('shows thrown transport errors and stringifies non-Error values', async () => {
    sendMessage.mockRejectedValueOnce(new Error('Network down'));
    await mountPage();
    await input('user-id').setValue('ATOP');
    await input('password').setValue('PASS');
    await form().trigger('submit');
    await flushPromises();
    expect(document.body.textContent).toContain('Network down');
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();

    sendMessage.mockRejectedValueOnce('plain failure');
    await input('password').setValue('PASS');
    await form().trigger('submit');
    await flushPromises();
    expect(document.body.textContent).toContain('plain failure');
  });

  it('stringifies non-Error CONFIG failures', async () => {
    sendMessage
      .mockResolvedValueOnce(
        pass({ GASINPUT: 'N', OPERID: 'ATOP', OPERNAME: 'Kim', PERMISSTION: 'H' }),
      )
      .mockRejectedValueOnce('config exploded');
    await mountPage();
    await input('user-id').setValue('ATOP');
    await input('password').setValue('PASS');
    await form().trigger('submit');
    await flushPromises();
    document.querySelector<HTMLElement>('[data-testid="dialog-ok"]')?.click();
    await flushPromises();
    expect(document.body.textContent).toContain('config exploded');
  });

  it('stores the corrected PDA name from the device-name modal', async () => {
    const { store, wrapper } = await mountPage();
    wrapper.findComponent(DeviceNameCheckModal).vm.$emit('confirm', 'AR-NEW');
    await flushPromises();
    expect(store.deviceName).toBe('AR-NEW');
    wrapper.findComponent(DeviceNameCheckModal).vm.$emit('update:open', true);
    await flushPromises();
    expect(wrapper.findComponent(DeviceNameCheckModal).props('open')).toBe(true);
  });

  it('re-checks the PDA name when the kept-alive page is activated', async () => {
    const check = vi.spyOn(CommonUtil, 'requiresPdaNameCorrection').mockResolvedValue(false);
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useMainStore();
    store.setStateProvider(createMainStateMock({}));
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    });
    mount(
      {
        components: { ActivityLoginPage },
        template: '<KeepAlive><ActivityLoginPage /></KeepAlive>',
      },
      { attachTo: document.body, global: { plugins: [pinia, router] } },
    );
    await flushPromises();
    expect(check).toHaveBeenCalledTimes(2);
    check.mockRestore();
  });

  it('treats cleared BaseInput values as empty strings', async () => {
    const { wrapper } = await mountPage({
      historyUserInfo: { operId: 'saved', operName: 'Saved', permission: 'H' },
    });
    const [userField, passwordField] = wrapper.findAllComponents(BaseInput);
    userField?.vm.$emit('update:modelValue', undefined);
    passwordField?.vm.$emit('update:modelValue', undefined);
    await flushPromises();

    expect(input('user-id').element.value).toBe('');
    expect(input('password').element.value).toBe('');
  });

  it('falls back to empty operator fields when the LOGIN response body is empty', async () => {
    getWifiIpAddress.mockResolvedValueOnce(null);
    sendMessage.mockResolvedValueOnce(pass({}));
    await mountPage();
    await input('user-id').setValue('ATOP');
    await input('password').setValue('PASS');
    await form().trigger('submit');
    await flushPromises();

    expect(document.body.textContent).toContain('로그인 성공 하였습니다.');
  });

  it('keeps modal open state in sync with BaseModal update events', async () => {
    const { wrapper } = await mountPage();
    const [loginModal, alertModal] = wrapper.findAllComponents(BaseModal);
    alertModal?.vm.$emit('update:open', true);
    loginModal?.vm.$emit('update:open', false);
    await flushPromises();

    expect(alertModal?.props('open')).toBe(true);
    expect(loginModal?.props('open')).toBe(false);
  });
});
