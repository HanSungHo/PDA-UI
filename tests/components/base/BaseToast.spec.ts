import { enableAutoUnmount, mount } from '@vue/test-utils';
import { BaseToast, baseToastDefaults } from 'src/components/base/toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';

enableAutoUnmount(afterEach);

describe('BaseToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders default layout, accessibility attributes, and success type', () => {
    const wrapper = mount(BaseToast, {
      props: {
        title: 'Operation Successful',
        description: 'Your changes have been saved.',
      },
    });

    expect(wrapper.classes()).toContain('ds-toast');
    expect(wrapper.attributes('role')).toBe('alert');
    expect(wrapper.attributes('aria-live')).toBe('polite');

    expect(wrapper.find('.ds-toast__title').text()).toBe('Operation Successful');
    expect(wrapper.find('.ds-toast__description').text()).toBe('Your changes have been saved.');

    // Success icon default
    const icon = wrapper.find('.ds-toast__icon');
    expect(icon.exists()).toBe(true);
    expect(icon.find('circle').attributes('fill')).toBe('var(--ds-toast-success-bg)');
  });

  it.each([
    ['error', 'var(--ds-toast-error-bg)'],
    ['info', 'var(--ds-toast-info-bg)'],
    ['warning', 'var(--ds-toast-warning-bg)'],
  ] as const)('renders corresponding icon for type="%s"', (type, expectedBg) => {
    const wrapper = mount(BaseToast, {
      props: { type, title: `${type} toast` },
    });

    const icon = wrapper.find('.ds-toast__icon');
    expect(icon.exists()).toBe(true);
    const coloredElement = icon.find(`[fill="${expectedBg}"]`);
    expect(coloredElement.exists()).toBe(true);
  });

  it('supports custom icon slot overriding the default icon', () => {
    const wrapper = mount(BaseToast, {
      slots: {
        icon: () => h('span', { class: 'custom-toast-icon' }, '★'),
      },
    });

    expect(wrapper.find('.custom-toast-icon').exists()).toBe(true);
    expect(wrapper.find('.ds-toast__icon').exists()).toBe(false);
  });

  it('supports custom title and default description slots', () => {
    const wrapper = mount(BaseToast, {
      slots: {
        title: () => h('h4', { class: 'custom-title-element' }, 'Rich Title'),
        default: () => h('span', { class: 'custom-desc-element' }, 'Rich Description'),
      },
    });

    expect(wrapper.find('.custom-title-element').text()).toBe('Rich Title');
    expect(wrapper.find('.custom-desc-element').text()).toBe('Rich Description');
  });

  it('omits title and description containers when not provided', () => {
    const wrapper = mount(BaseToast);

    expect(wrapper.find('.ds-toast__title').exists()).toBe(false);
    expect(wrapper.find('.ds-toast__description').exists()).toBe(false);
  });

  it('handles manual closing via close button and custom closeIcon slot', async () => {
    const wrapper = mount(BaseToast, {
      props: { closable: true },
      slots: {
        closeIcon: () => h('span', { class: 'my-close' }, '✕'),
      },
    });

    const closeBtn = wrapper.find('.ds-toast__close-btn');
    expect(closeBtn.exists()).toBe(true);
    expect(closeBtn.find('.my-close').text()).toBe('✕');

    await closeBtn.trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('omits close button when closable is false', () => {
    const wrapper = mount(BaseToast, {
      props: { closable: false },
    });

    expect(wrapper.find('.ds-toast__close-btn').exists()).toBe(false);
  });

  it('auto-closes after default duration (3000ms)', () => {
    const wrapper = mount(BaseToast);

    expect(wrapper.emitted('close')).toBeUndefined();

    vi.advanceTimersByTime(2999);
    expect(wrapper.emitted('close')).toBeUndefined();

    vi.advanceTimersByTime(1);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('auto-closes after custom duration', () => {
    const wrapper = mount(BaseToast, {
      props: { duration: 5000 },
    });

    vi.advanceTimersByTime(4999);
    expect(wrapper.emitted('close')).toBeUndefined();

    vi.advanceTimersByTime(1);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('does not auto-close when duration is 0', () => {
    const wrapper = mount(BaseToast, {
      props: { duration: 0 },
    });

    vi.advanceTimersByTime(10000);
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('pauses auto-close timer on mouseenter and resumes on mouseleave', async () => {
    const wrapper = mount(BaseToast, {
      props: { duration: 3000 },
    });

    vi.advanceTimersByTime(1500);

    // Hover pauses timer
    await wrapper.trigger('mouseenter');

    // Advance way past 3000ms
    vi.advanceTimersByTime(5000);
    expect(wrapper.emitted('close')).toBeUndefined();

    // Leave resumes timer (new cycle of 3000ms)
    await wrapper.trigger('mouseleave');

    vi.advanceTimersByTime(2999);
    expect(wrapper.emitted('close')).toBeUndefined();

    vi.advanceTimersByTime(1);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('restarts timer when duration prop changes', async () => {
    const wrapper = mount(BaseToast, {
      props: { duration: 2000 },
    });

    vi.advanceTimersByTime(1000);

    // Update duration to 4000ms
    await wrapper.setProps({ duration: 4000 });

    // 1000ms after update (total 2000ms from start), should NOT have fired yet
    vi.advanceTimersByTime(1000);
    expect(wrapper.emitted('close')).toBeUndefined();

    // Advance remaining 3000ms to reach 4000ms from the change
    vi.advanceTimersByTime(3000);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('cleans up timer on unmount', () => {
    const wrapper = mount(BaseToast, {
      props: { duration: 3000 },
    });

    wrapper.unmount();
    vi.advanceTimersByTime(5000);

    // No close event emitted after unmount
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('exports baseToastDefaults correctly', () => {
    expect(baseToastDefaults).toEqual({
      closable: true,
      duration: 3000,
      type: 'success',
    });
  });
});
