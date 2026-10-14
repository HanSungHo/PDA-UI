import { mount } from '@vue/test-utils';
import FurnaceActionFooter from 'src/features/remote-furnace/components/FurnaceActionFooter.vue';
import { describe, expect, it } from 'vitest';

describe('FurnaceActionFooter.vue', () => {
  const defaultProps = {
    startLabel: 'START',
    restartLabel: 'RESTART',
    isStartDisabled: false,
    isRestartDisabled: false,
    isLoading: false,
  };

  it('renders default button labels START, RESTART and 취소', () => {
    const wrapper = mount(FurnaceActionFooter, {
      props: defaultProps,
    });

    expect(wrapper.text()).toContain('START');
    expect(wrapper.text()).toContain('RESTART');
    expect(wrapper.text()).toContain('취소');
  });

  it('renders dynamic non-lot labels NO BATCH and 온도설정', () => {
    const wrapper = mount(FurnaceActionFooter, {
      props: {
        ...defaultProps,
        startLabel: 'NO BATCH',
        restartLabel: '온도설정',
      },
    });

    expect(wrapper.text()).toContain('NO BATCH');
    expect(wrapper.text()).toContain('온도설정');
  });

  it('emits start, restart, and cancel events when clicked', async () => {
    const wrapper = mount(FurnaceActionFooter, {
      props: defaultProps,
    });

    const startBtn = wrapper.find('.furnace-footer__button--start');
    const restartBtn = wrapper.find('.furnace-footer__button--restart');
    const cancelBtn = wrapper.find('.furnace-footer__button--cancel');

    await startBtn.trigger('click');
    expect(wrapper.emitted('start')).toHaveLength(1);

    await restartBtn.trigger('click');
    expect(wrapper.emitted('restart')).toHaveLength(1);

    await cancelBtn.trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('disables buttons when disabled props are true', () => {
    const wrapper = mount(FurnaceActionFooter, {
      props: {
        ...defaultProps,
        isStartDisabled: true,
        isRestartDisabled: true,
      },
    });

    const startBtn = wrapper.find('.furnace-footer__button--start');
    const restartBtn = wrapper.find('.furnace-footer__button--restart');

    expect(startBtn.attributes('aria-disabled')).toBe('true');
    expect(restartBtn.attributes('aria-disabled')).toBe('true');
  });

  it('handles loading state for START and RESTART', () => {
    const wrapperStart = mount(FurnaceActionFooter, {
      props: {
        ...defaultProps,
        isLoading: true,
        loadingAction: 'START',
      },
    });
    expect(wrapperStart.find('.furnace-footer__button--start').exists()).toBe(true);

    const wrapperRestart = mount(FurnaceActionFooter, {
      props: {
        ...defaultProps,
        isLoading: true,
        loadingAction: 'RESTART',
      },
    });
    expect(wrapperRestart.find('.furnace-footer__button--restart').exists()).toBe(true);
  });
});
