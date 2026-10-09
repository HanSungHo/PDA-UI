import { enableAutoUnmount, mount } from '@vue/test-utils';
import { BaseToast, baseToastDefaults } from 'src/components/base/toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

enableAutoUnmount(afterEach);

function getToast(message: string): HTMLElement {
  const toast = [...document.querySelectorAll<HTMLElement>('.ds-toast')].find((element) =>
    element.textContent?.includes(message),
  );
  if (!toast) throw new Error('Toast notification was not rendered');
  return toast;
}

describe('BaseToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a Quasar notification with the message, caption, and close action', async () => {
    mount(BaseToast, {
      props: { title: 'Saved', description: 'Your changes have been saved.' },
    });
    await nextTick();

    const toast = getToast('Your changes have been saved.');
    expect(toast.classList.contains('q-notification')).toBe(true);
    expect(toast.classList.contains('ds-toast--success')).toBe(true);
    expect(toast.getAttribute('role')).toBe('alert');
    expect(toast.getAttribute('aria-live')).toBe('polite');
    expect(toast.querySelector('.q-notification__message')?.textContent).toContain('Saved');
    expect(toast.querySelector('.q-notification__caption')?.textContent).toBe(
      'Your changes have been saved.',
    );
    expect(toast.querySelector('.q-notification__icon')?.textContent).toContain('check');
    expect(toast.querySelector('.ds-toast__close-btn')?.getAttribute('aria-label')).toBe('Close');
  });

  it.each([
    ['error', 'priority_high'],
    ['info', 'info_i'],
    ['warning', 'priority_high'],
  ] as const)('uses a Material Symbol for the %s state', async (type, icon) => {
    mount(BaseToast, { props: { type, description: `${type} message` } });
    await nextTick();

    const toast = getToast(`${type} message`);
    expect(toast.classList.contains(`ds-toast--${type}`)).toBe(true);
    expect(toast.querySelector('.q-notification__icon')?.textContent).toContain(icon);
  });

  it('shows a description without a title', async () => {
    mount(BaseToast, { props: { description: 'Message only' } });
    await nextTick();

    expect(getToast('Message only').querySelector('.q-notification__message')?.textContent).toBe(
      'Message only',
    );
    expect(getToast('Message only').querySelector('.q-notification__caption')).toBeNull();
  });

  it('omits the close action when closable is false', async () => {
    mount(BaseToast, { props: { closable: false, description: 'Read only' } });
    await nextTick();

    expect(getToast('Read only').querySelector('.ds-toast__close-btn')).toBeNull();
  });

  it('emits close when the Quasar action dismisses the notification', async () => {
    const wrapper = mount(BaseToast, { props: { description: 'Close me' } });
    await nextTick();

    (getToast('Close me').querySelector('.ds-toast__close-btn') as HTMLElement).click();
    await nextTick();

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('auto-closes after the configured duration and stays open when duration is zero', async () => {
    const timed = mount(BaseToast, { props: { description: 'Timed', duration: 3000 } });
    await nextTick();

    vi.advanceTimersByTime(2999);
    expect(timed.emitted('close')).toBeUndefined();
    vi.advanceTimersByTime(1);
    expect(timed.emitted('close')).toHaveLength(1);

    const persistent = mount(BaseToast, { props: { description: 'Persistent', duration: 0 } });
    await nextTick();
    vi.advanceTimersByTime(10000);
    expect(persistent.emitted('close')).toBeUndefined();
  });

  it('pauses the timer on hover and restarts it when the pointer leaves', async () => {
    const wrapper = mount(BaseToast, { props: { description: 'Hover me', duration: 3000 } });
    await nextTick();
    const toast = getToast('Hover me');

    vi.advanceTimersByTime(1500);
    toast.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(5000);
    expect(wrapper.emitted('close')).toBeUndefined();

    toast.dispatchEvent(new Event('mouseleave'));
    vi.advanceTimersByTime(3000);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('restarts the timer when duration changes', async () => {
    const wrapper = mount(BaseToast, { props: { description: 'Changed', duration: 2000 } });
    await nextTick();
    vi.advanceTimersByTime(1000);
    await wrapper.setProps({ duration: 4000 });

    vi.advanceTimersByTime(3999);
    expect(wrapper.emitted('close')).toBeUndefined();
    vi.advanceTimersByTime(1);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('updates the notification when content or state changes without emitting close', async () => {
    const wrapper = mount(BaseToast, { props: { description: 'Before', type: 'info' } });
    await nextTick();
    await wrapper.setProps({ description: 'After', type: 'warning' });
    await nextTick();

    expect(getToast('After').classList.contains('ds-toast--warning')).toBe(true);
    expect(getToast('After').textContent).toContain('After');
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('dismisses on unmount without emitting close', async () => {
    const wrapper = mount(BaseToast, { props: { description: 'Unmount' } });
    await nextTick();
    wrapper.unmount();
    vi.advanceTimersByTime(5000);

    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('keeps the public defaults', () => {
    expect(baseToastDefaults).toEqual({ closable: true, duration: 3000, type: 'success' });
  });
});
