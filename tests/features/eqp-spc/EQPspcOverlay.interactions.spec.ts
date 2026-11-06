import { flushPromises, mount } from '@vue/test-utils';
import EQPspcOverlay from 'src/features/eqp-spc/components/EQPspcOverlay.vue';
import { emptyEQPspcFields } from 'src/features/eqp-spc/eqp-spc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

const serviceMock = vi.hoisted(() => ({
  intlkpopupcheck: vi.fn(),
  releaseEQPspcEvent: vi.fn(),
}));
const appMock = vi.hoisted(() => ({ addListener: vi.fn(), remove: vi.fn() }));

vi.mock('src/features/eqp-spc/eqp-spc.service', () => serviceMock);
vi.mock('@capacitor/app', () => ({ App: { addListener: appMock.addListener } }));

const ScreenStub = defineComponent({
  name: 'EQPspcScreen',
  props: { fields: { type: Object, required: true } },
  emits: ['ok'],
  setup(_props, { emit }) {
    return () => h('button', { 'data-testid': 'ok', onClick: () => emit('ok') }, 'Ok');
  },
});

const event = { id: 'eqp-1', fields: emptyEQPspcFields() };

function mountOverlay() {
  return mount(EQPspcOverlay, {
    attachTo: document.body,
    props: { event },
    global: { stubs: { EQPspcScreen: ScreenStub } },
  });
}

function pressKey(key: string): KeyboardEvent {
  const keydown = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  document.dispatchEvent(keydown);
  return keydown;
}

describe('EQPSPC overlay interactions', () => {
  beforeEach(() => {
    serviceMock.intlkpopupcheck.mockResolvedValue(undefined);
    appMock.remove.mockResolvedValue(undefined);
    appMock.addListener.mockResolvedValue({ remove: appMock.remove });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('passes the event fields to the screen', async () => {
    const wrapper = mountOverlay();
    await flushPromises();

    expect(wrapper.findComponent(ScreenStub).props('fields')).toEqual(event.fields);
    wrapper.unmount();
  });

  it('ignores keys other than Escape and dismisses only once on repeated Escape', async () => {
    const wrapper = mountOverlay();
    await flushPromises();

    expect(pressKey('Enter').defaultPrevented).toBe(false);
    expect(serviceMock.releaseEQPspcEvent).not.toHaveBeenCalled();

    expect(pressKey('Escape').defaultPrevented).toBe(true);
    pressKey('Escape');
    expect(serviceMock.releaseEQPspcEvent).toHaveBeenCalledOnce();
    expect(serviceMock.releaseEQPspcEvent).toHaveBeenCalledWith(event.id);
    expect(serviceMock.intlkpopupcheck).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('acknowledges once on OK and ignores a later Escape or Back', async () => {
    const wrapper = mountOverlay();
    await flushPromises();

    await wrapper.get('[data-testid="ok"]').trigger('click');
    await wrapper.get('[data-testid="ok"]').trigger('click');
    pressKey('Escape');
    const backButton = appMock.addListener.mock.calls[0]?.[1] as () => void;
    backButton();

    expect(serviceMock.intlkpopupcheck).toHaveBeenCalledOnce();
    expect(serviceMock.intlkpopupcheck).toHaveBeenCalledWith(event.fields);
    expect(serviceMock.releaseEQPspcEvent).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it('closes even when INTLKPOPUPCHECK fails', async () => {
    serviceMock.intlkpopupcheck.mockRejectedValueOnce(new Error('offline'));
    const wrapper = mountOverlay();
    await flushPromises();

    await wrapper.get('[data-testid="ok"]').trigger('click');
    await flushPromises();

    expect(serviceMock.releaseEQPspcEvent).toHaveBeenCalledWith(event.id);
    wrapper.unmount();
  });

  it('stops listening for Escape and Android Back after unmount', async () => {
    const wrapper = mountOverlay();
    await flushPromises();
    wrapper.unmount();
    await flushPromises();

    pressKey('Escape');
    expect(serviceMock.releaseEQPspcEvent).not.toHaveBeenCalled();
    expect(appMock.remove).toHaveBeenCalledOnce();
  });

  it('removes a Back listener that resolves after the overlay is gone', async () => {
    let resolveListener: ((listener: { remove: () => Promise<void> }) => void) | undefined;
    appMock.addListener.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveListener = resolve;
        }),
    );
    const wrapper = mountOverlay();
    wrapper.unmount();

    resolveListener?.({ remove: appMock.remove });
    await flushPromises();
    expect(appMock.remove).toHaveBeenCalledOnce();
  });

  it('tolerates Capacitor failing to add or remove the Back listener', async () => {
    appMock.addListener.mockRejectedValueOnce(new Error('not native'));
    const first = mountOverlay();
    await flushPromises();
    first.unmount();
    await flushPromises();
    expect(appMock.remove).not.toHaveBeenCalled();

    appMock.remove.mockRejectedValueOnce(new Error('already removed'));
    const second = mountOverlay();
    await flushPromises();
    second.unmount();
    await flushPromises();
    expect(appMock.remove).toHaveBeenCalledOnce();
  });

  it('restores focus to the control that was focused before the interlock', async () => {
    const field = document.createElement('input');
    document.body.appendChild(field);
    field.focus();

    const wrapper = mountOverlay();
    await flushPromises();
    wrapper.get<HTMLButtonElement>('[data-testid="ok"]').element.focus();
    wrapper.unmount();

    expect(document.activeElement).toBe(field);
  });

  it('does not refocus a control that was removed while the interlock was open', async () => {
    const field = document.createElement('input');
    document.body.appendChild(field);
    field.focus();
    const focusSpy = vi.spyOn(field, 'focus');

    const wrapper = mountOverlay();
    await flushPromises();
    field.remove();
    wrapper.unmount();

    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('skips focus restore when nothing was focused', async () => {
    const activeElement = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(null);
    const wrapper = mountOverlay();
    await flushPromises();
    activeElement.mockRestore();

    expect(() => wrapper.unmount()).not.toThrow();
  });
});
