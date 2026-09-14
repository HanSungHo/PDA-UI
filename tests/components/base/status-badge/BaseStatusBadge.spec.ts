import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { BaseStatusBadgeProps } from '~/components/base/status-badge';
import BaseStatusBadge from '~/components/base/status-badge';
import {
  BASE_STATUS_BADGE_DEFAULT_COLOR_BY_STATUS,
  BASE_STATUS_BADGE_STATUS_CONFIG,
} from '~/components/base/status-badge';

const mountWithUncheckedProps = (props: Record<string, unknown>) =>
  mount(BaseStatusBadge, {
    props: props as never,
  });

describe('BaseStatusBadge', () => {
  it.each(['completed', 'running', 'pending'] as const)('renders %s status', (status) => {
    const wrapper = mount(BaseStatusBadge, {
      props: {
        status,
      },
    });

    expect(wrapper.text()).toContain(BASE_STATUS_BADGE_STATUS_CONFIG[status].label);
  });

  it.each(Object.entries(BASE_STATUS_BADGE_DEFAULT_COLOR_BY_STATUS))(
    'applies the default %s color',
    (status, color) => {
      const wrapper = mount(BaseStatusBadge, {
        props: {
          status: status as BaseStatusBadgeProps['status'],
        },
      });

      expect(wrapper.classes()).toContain(`ds-status-badge--${color}`);
    },
  );

  it('allows overriding with an allowed color', () => {
    const wrapper = mount(BaseStatusBadge, {
      props: {
        status: 'running',
        color: 'green',
      },
    });

    expect(wrapper.classes()).toContain('ds-status-badge--green');
  });

  it('falls back when completed receives red', () => {
    const wrapper = mountWithUncheckedProps({
      status: 'completed',
      color: 'red',
    });

    expect(wrapper.classes()).toContain('ds-status-badge--green');
    expect(wrapper.classes()).not.toContain('ds-status-badge--red');
  });

  it('falls back to red when failed receives another color', () => {
    const wrapper = mountWithUncheckedProps({
      status: 'failed',
      color: 'blue',
    });

    expect(wrapper.classes()).toContain('ds-status-badge--red');
    expect(wrapper.classes()).not.toContain('ds-status-badge--blue');
  });

  it('renders icon', () => {
    const wrapper = mount(BaseStatusBadge, {
      props: {
        status: 'completed',
      },
    });

    expect(wrapper.find('.ds-status-badge__icon').exists()).toBe(true);
  });

  it('renders root badge class', () => {
    const wrapper = mount(BaseStatusBadge, {
      props: {
        status: 'completed',
      },
    });

    expect(wrapper.classes()).toContain('ds-status-badge');
  });
});
