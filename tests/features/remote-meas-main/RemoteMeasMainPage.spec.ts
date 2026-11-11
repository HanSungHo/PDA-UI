import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { BaseEmptyState } from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import RemoteMeasMainPage from 'src/features/remote-meas-main/pages/RemoteMeasMainPage.vue';
import { okDialog } from 'src/services/ok-dialog.service';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

const service = vi.hoisted(() => ({ xrfEqpTypeCheck: vi.fn() }));

vi.mock('src/features/remote-meas-main/services/remote-meas-main.service', () => service);

let wrapper: ReturnType<typeof mount>;

async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: `/${ROUTE.remoteMeasMain}`, component: RemoteMeasMainPage },
      { path: `/${ROUTE.remoteAit}`, component: { template: '<div>AIT</div>' } },
      { path: `/${ROUTE.remoteAegis}`, component: { template: '<div>AEGIS</div>' } },
      { path: `/${ROUTE.remoteXrf}`, component: { template: '<div>XRF</div>' } },
    ],
  });
  await router.push(`/${ROUTE.remoteMeasMain}`);
  await router.isReady();
  wrapper = mount(RemoteMeasMainPage, {
    attachTo: document.body,
    global: { plugins: [createPinia(), router] },
  });
  await flushPromises();
  return router;
}

function machineInput() {
  return wrapper.get('.remote-meas-main__machine input');
}

function searchButton() {
  const result = wrapper.findAll('button').find((item) => item.text() === '조회');
  if (!result) throw new Error('Missing 조회 button');
  return result;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  service.xrfEqpTypeCheck.mockResolvedValue([{ MODEL: 'XRF-RIGAKU', MAINEQPID: 'XRF-01' }]);
});

afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = '';
  okDialog.confirm();
  okDialog.message.value = '';
  vi.useRealTimers();
});

describe('RemoteMeasMainPage', () => {
  it('renders the Android title and label, focuses 진행장비 and shows no footer buttons', async () => {
    await render();

    expect(wrapper.get('h1').text()).toBe('MEAS Remote');
    expect(wrapper.get('.remote-meas-main__machine label').text()).toBe('진행장비');
    // activity_remote_meas_main.xml sets no hint on txt_machine.
    expect(machineInput().attributes('placeholder') ?? '').toBe('');
    expect(document.activeElement).toBe(machineInput().element);
    expect(wrapper.findComponent(BaseEmptyState).exists()).toBe(true);
    expect(wrapper.findAll('button').map((item) => item.text())).toEqual(['조회']);
    expect(wrapper.find('footer').exists()).toBe(false);
  });

  it('upper-cases the typed equipment', async () => {
    await render();

    await machineInput().setValue('xrf-01');

    expect((machineInput().element as HTMLInputElement).value).toBe('XRF-01');
  });

  it('shows the Android error when 조회 is pressed with no equipment', async () => {
    await render();

    await searchButton().trigger('click');
    await flushPromises();

    expect(service.xrfEqpTypeCheck).not.toHaveBeenCalled();
    expect(okDialog.isOpen.value).toBe(true);
    expect(okDialog.message.value).toBe('장비명을 입력하여 주세요.');
  });

  it('opens the AIT screen with the MAINEQPID from XRFEQPTYPECHECK on Enter', async () => {
    service.xrfEqpTypeCheck.mockResolvedValueOnce([{ MODEL: 'AIT-XP', MAINEQPID: 'AIT-01' }]);
    const router = await render();

    await machineInput().setValue('AIT-01-A');
    await machineInput().trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(service.xrfEqpTypeCheck).toHaveBeenCalledWith('AIT-01-A');
    expect(router.currentRoute.value.path).toBe(`/${ROUTE.remoteAit}`);
    expect(router.currentRoute.value.query).toEqual({ Eqpid: 'AIT-01' });
  });

  it('opens the AEGIS and XRF screens from 조회', async () => {
    service.xrfEqpTypeCheck
      .mockResolvedValueOnce([{ MODEL: 'AEGIS-200', MAINEQPID: 'AEGIS-01' }])
      .mockResolvedValueOnce([{ MODEL: 'XRF-RIGAKU', MAINEQPID: 'XRF-01' }]);
    const router = await render();
    await machineInput().setValue('AEGIS-01');

    await searchButton().trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe(`/${ROUTE.remoteAegis}?Eqpid=AEGIS-01`);

    await router.push(`/${ROUTE.remoteMeasMain}`);
    // OnSingleClickListener drops clicks within one second of the last one.
    vi.setSystemTime(Date.now() + 1001);
    await machineInput().setValue('XRF-01');
    await searchButton().trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe(`/${ROUTE.remoteXrf}?Eqpid=XRF-01`);
  });

  it('ignores a second 조회 click within one second', async () => {
    service.xrfEqpTypeCheck.mockRejectedValue(new Error('XRF-99 장비 정보가 없습니다.'));
    await render();
    await machineInput().setValue('XRF-99');

    await searchButton().trigger('click');
    await flushPromises();
    await searchButton().trigger('click');
    await flushPromises();

    expect(service.xrfEqpTypeCheck).toHaveBeenCalledOnce();
    expect(okDialog.message.value).toBe('XRF-99 장비 정보가 없습니다.');
  });

  it('parses a scanned EQP- barcode on the native-enter event', async () => {
    const router = await render();
    await machineInput().setValue('EQP-XRF-01#');
    (machineInput().element as HTMLInputElement).focus();

    window.dispatchEvent(new CustomEvent(NATIVE_ENTER_EVENT));
    await flushPromises();

    expect(service.xrfEqpTypeCheck).toHaveBeenCalledWith('XRF-01');
    expect(router.currentRoute.value.fullPath).toBe(`/${ROUTE.remoteXrf}?Eqpid=XRF-01`);
  });

  it('shows READING ERROR for a scan without the EQP- prefix', async () => {
    await render();
    await machineInput().setValue('XRF-01');
    (machineInput().element as HTMLInputElement).focus();

    window.dispatchEvent(new CustomEvent(NATIVE_ENTER_EVENT));
    await flushPromises();

    expect(service.xrfEqpTypeCheck).not.toHaveBeenCalled();
    expect(okDialog.title.value).toBe('READING ERROR');
    expect(okDialog.message.value).toBe('진행할 장비를 읽어주세요.');
    expect((machineInput().element as HTMLInputElement).value).toBe('');
  });

  it('stops listening for native-enter after leaving the screen', async () => {
    await render();
    await machineInput().setValue('EQP-XRF-01#');
    wrapper.unmount();

    window.dispatchEvent(new CustomEvent(NATIVE_ENTER_EVENT));
    await flushPromises();

    expect(service.xrfEqpTypeCheck).not.toHaveBeenCalled();
  });
});
