import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE } from 'src/constants/routes';
import { ACTIVITY_MAIN_ACTION_ID } from 'src/features/main/components/activity-main';
import { ActivityMainPage, useMainStore } from 'src/features/main';
import { createMainStateMock } from 'src/features/main/mocks/main-state.mock';
import routes from 'src/router/routes';

const {
  messageInfoMock,
  messageSuccessMock,
  messageWarningMock,
  modalConfirmMock,
  routerPushMock,
} = vi.hoisted(() => ({
  modalConfirmMock: vi.fn(),
  messageWarningMock: vi.fn(),
  messageSuccessMock: vi.fn(),
  messageInfoMock: vi.fn(),
  routerPushMock: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();

  return {
    ...actual,
    useRouter: () => ({
      push: routerPushMock,
    }),
  };
});

vi.mock('ant-design-vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ant-design-vue')>();

  return {
    ...actual,
    Modal: {
      ...actual.Modal,
      confirm: modalConfirmMock,
    },
    message: {
      ...actual.message,
      warning: messageWarningMock,
      success: messageSuccessMock,
      info: messageInfoMock,
    },
  };
});

enableAutoUnmount(afterEach);

function mountActivityMainPage() {
  return mount(ActivityMainPage);
}

function actionSelector(actionId: string): string {
  return `[data-action-id="${actionId}"]`;
}

describe('ActivityMainPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    routerPushMock.mockResolvedValue(undefined);
  });

  it('shows setting warning before login warning when selecting a feature without setting', async () => {
    const store = useMainStore();
    store.setStateProvider(createMainStateMock({ settingInfo: null }));
    const wrapper = mountActivityMainPage();
    await flushPromises();

    await wrapper.get(actionSelector(ACTIVITY_MAIN_ACTION_ID.esheet)).trigger('click');

    expect(messageWarningMock).toHaveBeenCalledWith('환경설정 정보가 필요합니다');
    expect(messageWarningMock).not.toHaveBeenCalledWith('Log In 정보가 필요합니다');
  });

  it('shows login warning after setting exists but login is missing', async () => {
    const store = useMainStore();
    store.markSettingReady();
    store.setStateProvider(createMainStateMock({ userInfo: null }));
    const wrapper = mountActivityMainPage();
    await flushPromises();

    await wrapper.get(actionSelector(ACTIVITY_MAIN_ACTION_ID.esheet)).trigger('click');

    expect(messageWarningMock).toHaveBeenCalledWith('Log In 정보가 필요합니다');
  });

  it('pushes selected route after setting and login are ready', async () => {
    const store = useMainStore();
    store.markSettingReady();
    store.applyLoginState({
      operatorId: 'ATOP',
      operatorName: 'Kim',
      permission: 'H',
      gasInput: 'N',
    });
    store.setStateProvider(createMainStateMock({ userInfo: null }));
    const wrapper = mountActivityMainPage();
    await flushPromises();

    await wrapper.get(actionSelector(ACTIVITY_MAIN_ACTION_ID.esheet)).trigger('click');

    expect(routerPushMock).toHaveBeenCalledWith({ path: ROUTE.esheet });
  });

  it('pushes to login route without calling login API when login is missing', async () => {
    const store = useMainStore();
    store.markSettingReady();
    store.setStateProvider(createMainStateMock({ userInfo: null }));
    const wrapper = mountActivityMainPage();
    await flushPromises();

    await wrapper.get(actionSelector(ACTIVITY_MAIN_ACTION_ID.login)).trigger('click');

    expect(store.isLoggedIn).toBe(false);
    expect(routerPushMock).toHaveBeenCalledWith({ path: ROUTE.login });
    expect(messageSuccessMock).not.toHaveBeenCalledWith('로그인 성공');
  });

  it('confirms logout when pressing login while already logged in', async () => {
    const store = useMainStore();
    store.markSettingReady();
    store.applyLoginState({
      operatorId: 'ATOP',
      operatorName: 'Kim',
      permission: 'H',
      gasInput: 'N',
    });
    store.setStateProvider(createMainStateMock({ userInfo: null }));
    const wrapper = mountActivityMainPage();
    await flushPromises();

    await wrapper.get(actionSelector(ACTIVITY_MAIN_ACTION_ID.login)).trigger('click');

    expect(modalConfirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'LOGOUT',
        content: '로그아웃 하시겠습니까?',
      }),
    );
  });

  it('pushes to setting route without requiring setting state', async () => {
    const store = useMainStore();
    store.setStateProvider(createMainStateMock({ settingInfo: null }));
    const wrapper = mountActivityMainPage();
    await flushPromises();

    await wrapper.get(actionSelector(ACTIVITY_MAIN_ACTION_ID.setting)).trigger('click');

    expect(routerPushMock).toHaveBeenCalledWith({ path: ROUTE.setting });
  });

  it('initializes main state when the page is mounted', async () => {
    const store = useMainStore();
    store.setStateProvider(createMainStateMock());

    mountActivityMainPage();
    await flushPromises();

    expect(store.isSettingReady).toBe(true);
    expect(store.facility).toBe('FAB');
    expect(store.mobileServerName).toBe('DEV');
  });

  it('pushes header system setting route without requiring setting state', async () => {
    const store = useMainStore();
    store.setStateProvider(createMainStateMock({ settingInfo: null }));
    const wrapper = mountActivityMainPage();
    await flushPromises();

    await wrapper.get(actionSelector(ACTIVITY_MAIN_ACTION_ID.systemSetting)).trigger('click');

    expect(routerPushMock).toHaveBeenCalledWith({ path: ROUTE.systemSetting });
  });

  it('uses action id constants instead of hard-coded action ids in page logic', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/main/pages/ActivityMainPage.vue'),
      'utf8',
    );

    expect(source).toContain('ACTIVITY_MAIN_ACTION_ID');
    expect(source).not.toMatch(/action\.id === 'btn_[^']+'/);
  });
});

describe('main route', () => {
  it('redirects the root child route to the launcher route', () => {
    const rootRoute = routes.find((route) => route.path === '/');
    const indexRoute = rootRoute?.children?.find((route) => route.path === '');

    expect(indexRoute?.redirect).toEqual({ path: `/${ROUTE.main}` });
  });

  it('routes the launcher index to ActivityMainPage', () => {
    const rootRoute = routes.find((route) => route.path === '/');
    const indexRoute = rootRoute?.children?.find((route) => route.path === ROUTE.main);

    expect(String(indexRoute?.component)).toContain('features/main/pages/ActivityMainPage.vue');
  });
});
