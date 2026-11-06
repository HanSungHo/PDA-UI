import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import App from 'src/App.vue';
import {
  activeEQPspcEvent,
  openEQPspcActivity,
  releaseEQPspcEvent,
} from 'src/features/eqp-spc/eqp-spc.service';
import { postAifMessage } from 'src/services/aif-message.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, onUnmounted, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

const capacitorAppMock = vi.hoisted(() => ({
  addListener: vi.fn(),
  backButtonListener: undefined as ((event: { canGoBack: boolean }) => void) | undefined,
  removeListener: vi.fn(async () => undefined),
}));

vi.mock('@capacitor/app', () => ({ App: { addListener: capacitorAppMock.addListener } }));
vi.mock('src/services/aif-message.service', () => ({
  postAifMessage: vi.fn(async () => undefined),
}));

const interlockDialog = () =>
  document.body.querySelector<HTMLElement>('.eqp-spc-modal[aria-label="#EQPSPC INTERLOCK#"]');

describe('EQP SPC UDP overlay', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    capacitorAppMock.backButtonListener = undefined;
    capacitorAppMock.removeListener.mockClear();
    capacitorAppMock.addListener.mockImplementation(async (_event, listener) => {
      capacitorAppMock.backButtonListener = listener;
      return { remove: capacitorAppMock.removeListener };
    });
  });

  afterEach(() => {
    while (activeEQPspcEvent.value) releaseEQPspcEvent(activeEQPspcEvent.value.id);
    vi.clearAllMocks();
  });

  it('keeps an unfinished Move In form mounted and preserves its draft after OK', async () => {
    const onFormUnmounted = vi.fn();
    const MoveInDraftForm = defineComponent({
      setup() {
        const equipment = ref('');
        const comment = ref('');
        const selection = ref('');
        onUnmounted(onFormUnmounted);
        return () =>
          h('main', [
            h('input', {
              'data-testid': 'equipment',
              value: equipment.value,
              onInput: (event: Event) => {
                equipment.value = (event.target as HTMLInputElement).value;
              },
            }),
            h('input', {
              'data-testid': 'comment',
              value: comment.value,
              onInput: (event: Event) => {
                comment.value = (event.target as HTMLInputElement).value;
              },
            }),
            h(
              'select',
              {
                'data-testid': 'selection',
                value: selection.value,
                onChange: (event: Event) => {
                  selection.value = (event.target as HTMLSelectElement).value;
                },
              },
              [h('option', { value: '' }, 'Choose'), h('option', { value: 'RCP-A' }, 'RCP-A')],
            ),
          ]);
      },
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/move-in', component: MoveInDraftForm }],
    });
    await router.push('/move-in');
    await router.isReady();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const wrapper = mount(App, {
      attachTo: host,
      global: { plugins: [router], stubs: { AlarmCommonPopup: true } },
    });
    await wrapper.find('[data-testid="equipment"]').setValue('EQ-42');
    await wrapper.find('[data-testid="comment"]').setValue('unfinished note');
    await wrapper.find('[data-testid="selection"]').setValue('RCP-A');
    const equipmentInput = wrapper.find('[data-testid="equipment"]').element as HTMLInputElement;
    equipmentInput.focus();

    openEQPspcActivity({ message: 'INTERLOCKMANAGER' });
    await nextTick();
    const dialog = interlockDialog();
    expect(dialog?.querySelector('.ds-modal__title')?.textContent?.trim()).toBe(
      '#EQPSPC INTERLOCK#',
    );
    const ok = dialog?.querySelector<HTMLButtonElement>('.eqp-spc-ok');
    expect(ok?.textContent?.trim()).toBe('Ok');
    expect(router.currentRoute.value.fullPath).toBe('/move-in');
    expect(onFormUnmounted).not.toHaveBeenCalled();

    ok?.click();
    ok?.click();
    await nextTick();
    expect(interlockDialog()).toBeNull();
    expect(router.currentRoute.value.fullPath).toBe('/move-in');
    expect(onFormUnmounted).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(equipmentInput);
    expect((wrapper.find('[data-testid="equipment"]').element as HTMLInputElement).value).toBe(
      'EQ-42',
    );
    expect((wrapper.find('[data-testid="comment"]').element as HTMLInputElement).value).toBe(
      'unfinished note',
    );
    expect((wrapper.find('[data-testid="selection"]').element as HTMLSelectElement).value).toBe(
      'RCP-A',
    );
    expect(postAifMessage).toHaveBeenCalledOnce();
    wrapper.unmount();
    host.remove();
  });

  it('dismisses with Escape and Android Back without confirming, then shows the queued event', async () => {
    openEQPspcActivity({ message: 'INTERLOCKMANAGER' });
    const firstEventId = activeEQPspcEvent.value?.id;
    if (!firstEventId) throw new Error('The first EQP SPC event was not activated.');
    openEQPspcActivity({ message: 'INTERLOCKMANAGER' });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/home', component: { render: () => h('main', 'Home') } }],
    });
    await router.push('/home');
    await router.isReady();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const wrapper = mount(App, {
      attachTo: host,
      global: { plugins: [router], stubs: { AlarmCommonPopup: true } },
    });
    await nextTick();
    await Promise.resolve();

    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escape);
    await nextTick();
    await Promise.resolve();

    const queuedEventId = activeEQPspcEvent.value?.id;
    expect(escape.defaultPrevented).toBe(true);
    expect(queuedEventId).toBeDefined();
    expect(queuedEventId).not.toBe(firstEventId);
    expect(interlockDialog()).not.toBeNull();
    expect(capacitorAppMock.addListener).toHaveBeenCalledTimes(2);
    expect(capacitorAppMock.backButtonListener).toBeDefined();
    expect(postAifMessage).not.toHaveBeenCalled();

    capacitorAppMock.backButtonListener?.({ canGoBack: true });
    await nextTick();
    expect(interlockDialog()).toBeNull();
    expect(activeEQPspcEvent.value).toBeNull();
    expect(postAifMessage).not.toHaveBeenCalled();

    wrapper.unmount();
    host.remove();
    await Promise.resolve();
    expect(capacitorAppMock.removeListener).toHaveBeenCalledTimes(2);
  });
});
