import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { QTooltip } from 'quasar';
import { BaseTooltip, baseTooltipDefaults } from 'src/components/base/tooltip';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, Fragment, h, nextTick } from 'vue';

enableAutoUnmount(afterEach);

describe('BaseTooltip', () => {
  it('uses the application font token without declaring a remote font', () => {
    const tokens = readFileSync(resolve(process.cwd(), 'src/css/base-tokens.css'), 'utf8');
    const designTokens = readFileSync(resolve(process.cwd(), 'src/css/design-tokens.css'), 'utf8');

    expect(tokens).toContain('--ds-tooltip-font-family: var(--ds-font-family-sans);');
    expect(designTokens).toContain("--font-family-default: 'Noto Sans KR', sans-serif;");
  });

  it('renders the trigger and configures a Quasar tooltip with design defaults', async () => {
    const wrapper = mount(BaseTooltip, {
      attachTo: document.body,
      slots: {
        default: () => h('button', { class: 'trigger-btn' }, 'More information'),
      },
    });

    await nextTick();
    const tooltip = wrapper.getComponent(QTooltip);

    expect(wrapper.get('.trigger-btn').text()).toBe('More information');
    expect(tooltip.props('anchor')).toBe('top middle');
    expect(tooltip.props('self')).toBe('bottom middle');
    expect(tooltip.props('noParentEvent')).toBe(true);
    expect(tooltip.props('target')).toBe(wrapper.get('.trigger-btn').element);
    expect(tooltip.vm.$attrs.class).not.toContain('ds-tooltip--arrow');
  });

  it('uses click as its compatible default trigger and opens on click', async () => {
    const wrapper = mount(BaseTooltip, {
      attachTo: document.body,
      props: { title: 'Helpful information' },
      slots: { default: () => h('button', 'Open tooltip') },
    });

    const tooltip = wrapper.getComponent(QTooltip);
    expect(baseTooltipDefaults).toEqual({
      arrow: false,
      placement: 'top',
      trigger: 'click',
    });
    expect(tooltip.props('modelValue')).toBe(false);

    await wrapper.get('button').trigger('click');

    expect(wrapper.getComponent(QTooltip).props('modelValue')).toBe(true);

    await wrapper.get('button').trigger('click');

    expect(wrapper.getComponent(QTooltip).props('modelValue')).toBe(false);
  });

  it('renders the title prop and custom title slot after opening', async () => {
    const wrapper = mount(BaseTooltip, {
      attachTo: document.body,
      props: { title: 'Fallback title' },
      slots: {
        default: () => h('button', 'Open tooltip'),
        title: () => h('div', { class: 'custom-title' }, 'Custom title'),
      },
    });

    await wrapper.get('button').trigger('click');

    expect(document.body.textContent).toContain('Custom title');
    expect(document.body.textContent).not.toContain('Fallback title');
    expect(
      document.body.querySelector('.q-tooltip.ds-tooltip > .ds-tooltip__content > .custom-title'),
    ).not.toBeNull();
  });

  it.each([
    ['top', 'top middle', 'bottom middle'],
    ['bottom', 'bottom middle', 'top middle'],
    ['left', 'center left', 'center right'],
    ['right', 'center right', 'center left'],
    ['topLeft', 'top left', 'bottom left'],
    ['topRight', 'top right', 'bottom right'],
    ['bottomLeft', 'bottom left', 'top left'],
    ['bottomRight', 'bottom right', 'top right'],
    ['leftTop', 'top left', 'top right'],
    ['leftBottom', 'bottom left', 'bottom right'],
    ['rightTop', 'top right', 'top left'],
    ['rightBottom', 'bottom right', 'bottom left'],
  ] as const)(
    'maps the %s placement to Quasar anchor and self positions',
    (placement, anchor, self) => {
      const wrapper = mount(BaseTooltip, { props: { placement } });
      const tooltip = wrapper.getComponent(QTooltip);

      expect(tooltip.props('anchor')).toBe(anchor);
      expect(tooltip.props('self')).toBe(self);
    },
  );

  it.each([
    ['click', 'click'],
    ['hover', 'pointerenter'],
    ['focus', 'focusin'],
    ['contextmenu', 'contextmenu'],
  ] as const)('supports the %s trigger', async (trigger, eventName) => {
    const wrapper = mount(BaseTooltip, {
      props: { trigger },
      slots: { default: () => h('button', 'Trigger') },
    });

    await wrapper.get('button').trigger(eventName);

    expect(wrapper.getComponent(QTooltip).props('modelValue')).toBe(true);
  });

  it('supports combined triggers and closes hover/focus triggers when they end', async () => {
    const wrapper = mount(BaseTooltip, {
      props: { trigger: ['hover', 'click'] },
      slots: { default: () => h('button', 'Trigger') },
    });
    const trigger = wrapper.get('button');

    await trigger.trigger('pointerenter');
    expect(wrapper.getComponent(QTooltip).props('modelValue')).toBe(true);

    await trigger.trigger('pointerleave');
    expect(wrapper.getComponent(QTooltip).props('modelValue')).toBe(false);

    await trigger.trigger('click');
    expect(wrapper.getComponent(QTooltip).props('modelValue')).toBe(true);
  });

  it('wraps multiple trigger nodes in a single interactive target', async () => {
    const wrapper = mount(BaseTooltip, {
      slots: {
        default: () => [h('span', 'First action'), h('button', 'Second action')],
      },
    });
    await nextTick();
    const target = wrapper.get('.ds-tooltip__trigger');

    expect(target.text()).toBe('First actionSecond action');
    expect(wrapper.getComponent(QTooltip).props('target')).toBe(target.element);

    await target.trigger('click');

    expect(wrapper.getComponent(QTooltip).props('modelValue')).toBe(true);
  });

  it('wraps a single fragment slot so Quasar receives a real target element', async () => {
    const wrapper = mount(BaseTooltip, {
      slots: {
        default: () => h(Fragment, null, [h('span', 'First'), h('button', 'Second')]),
      },
    });
    await nextTick();
    const target = wrapper.get('.ds-tooltip__trigger');

    expect(target.text()).toBe('FirstSecond');
    expect(wrapper.getComponent(QTooltip).props('target')).toBe(target.element);

    await target.trigger('click');

    expect(wrapper.getComponent(QTooltip).props('modelValue')).toBe(true);
  });

  it('preserves a single-root component as the trigger without adding a layout wrapper', async () => {
    const CustomTrigger = defineComponent({
      inheritAttrs: false,
      emits: ['click'],
      setup(_, { emit }) {
        return () => h('button', { onClick: () => emit('click') }, 'Custom trigger');
      },
    });
    const wrapper = mount(BaseTooltip, {
      attachTo: document.body,
      slots: { default: () => h(CustomTrigger) },
    });
    await nextTick();

    expect(wrapper.find('.ds-tooltip__trigger').exists()).toBe(false);
    expect(wrapper.getComponent(QTooltip).props('target')).toBe(wrapper.get('button').element);

    await wrapper.get('button').trigger('click');

    expect(wrapper.getComponent(QTooltip).props('modelValue')).toBe(true);
  });

  it('closes when focus moves outside the trigger', async () => {
    const wrapper = mount(BaseTooltip, {
      props: { trigger: 'focus' },
      slots: { default: () => h('button', 'Trigger') },
    });
    const trigger = wrapper.get('button');

    await trigger.trigger('focusin');
    expect(wrapper.getComponent(QTooltip).props('modelValue')).toBe(true);

    await trigger.trigger('focusout', { relatedTarget: document.body });
    expect(wrapper.getComponent(QTooltip).props('modelValue')).toBe(false);
  });

  it('dismisses a context-menu tooltip after an outside pointer event', async () => {
    const wrapper = mount(BaseTooltip, {
      props: { trigger: 'contextmenu' },
      slots: { default: () => h('button', 'Trigger') },
    });
    const trigger = wrapper.get('button');
    const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });

    trigger.element.dispatchEvent(contextMenuEvent);
    await nextTick();
    expect(contextMenuEvent.defaultPrevented).toBe(true);
    expect(wrapper.getComponent(QTooltip).props('modelValue')).toBe(true);

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await nextTick();

    expect(wrapper.getComponent(QTooltip).props('modelValue')).toBe(false);
  });

  it('keeps the arrow option available when explicitly enabled', () => {
    const wrapper = mount(BaseTooltip, { props: { arrow: true } });

    expect(wrapper.getComponent(QTooltip).vm.$attrs.class).toContain('ds-tooltip--arrow');
  });

  it.each([
    [20, 40, 60, 80, 'ds-tooltip--top'],
    [60, 80, 20, 40, 'ds-tooltip--bottom'],
  ])(
    'aligns the optional arrow to the measured %s tooltip position',
    async (tooltipTop, tooltipBottom, targetTop, targetBottom, expectedClass) => {
      const wrapper = mount(BaseTooltip, {
        attachTo: document.body,
        props: { arrow: true, placement: 'top' },
        slots: { default: () => h('button', 'Trigger') },
      });
      const tooltip = wrapper.getComponent(QTooltip);
      await wrapper.get('button').trigger('click');
      await nextTick();
      const content = document.body.querySelector<HTMLElement>('.q-tooltip.ds-tooltip > div');
      const tooltipElement = content?.closest<HTMLElement>('.q-tooltip');
      expect(tooltipElement).not.toBeNull();

      Object.defineProperty(tooltipElement!, 'getBoundingClientRect', {
        value: () => ({
          top: tooltipTop,
          bottom: tooltipBottom,
          left: 10,
          right: 80,
          width: 70,
          height: tooltipBottom - tooltipTop,
        }),
      });
      Object.defineProperty(wrapper.get('button').element, 'getBoundingClientRect', {
        value: () => ({
          top: targetTop,
          bottom: targetBottom,
          left: 20,
          right: 80,
          width: 60,
          height: targetBottom - targetTop,
        }),
      });

      const onShow = tooltip.vm.$.vnode.props?.onShow as (() => Promise<void>) | undefined;
      expect(onShow).toBeTypeOf('function');
      await onShow?.();
      await nextTick();

      expect(tooltip.vm.$attrs.class).toContain(expectedClass);
    },
  );

  it('recalculates the optional arrow after the viewport repositions an open tooltip', async () => {
    const wrapper = mount(BaseTooltip, {
      attachTo: document.body,
      props: { arrow: true, placement: 'top' },
      slots: { default: () => h('button', 'Trigger') },
    });
    const tooltip = wrapper.getComponent(QTooltip);
    await wrapper.get('button').trigger('click');
    await nextTick();
    const content = document.body.querySelector<HTMLElement>('.q-tooltip.ds-tooltip > div');
    const tooltipElement = content?.closest<HTMLElement>('.q-tooltip');
    expect(tooltipElement).not.toBeNull();

    let flipped = false;
    Object.defineProperty(tooltipElement!, 'getBoundingClientRect', {
      value: () => ({
        top: flipped ? 60 : 20,
        bottom: flipped ? 80 : 40,
        left: 10,
        right: 80,
        width: 70,
        height: 20,
      }),
    });
    Object.defineProperty(wrapper.get('button').element, 'getBoundingClientRect', {
      value: () => ({
        top: flipped ? 20 : 60,
        bottom: flipped ? 40 : 80,
        left: 20,
        right: 80,
        width: 60,
        height: 20,
      }),
    });

    const onShow = tooltip.vm.$.vnode.props?.onShow as (() => Promise<void>) | undefined;
    await onShow?.();
    expect(tooltip.vm.$attrs.class).toContain('ds-tooltip--top');

    flipped = true;
    window.dispatchEvent(new Event('resize'));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await nextTick();

    expect(tooltip.vm.$attrs.class).toContain('ds-tooltip--bottom');
  });

  it('recalculates the optional arrow when placement or arrow props change while open', async () => {
    const wrapper = mount(BaseTooltip, {
      attachTo: document.body,
      props: { arrow: false, placement: 'top' },
      slots: { default: () => h('button', 'Trigger') },
    });
    const tooltip = wrapper.getComponent(QTooltip);
    await wrapper.get('button').trigger('click');
    await nextTick();
    const content = document.body.querySelector<HTMLElement>('.q-tooltip.ds-tooltip > div');
    const tooltipElement = content?.closest<HTMLElement>('.q-tooltip');
    expect(tooltipElement).not.toBeNull();

    let flipped = false;
    Object.defineProperty(tooltipElement!, 'getBoundingClientRect', {
      value: () => ({
        top: flipped ? 60 : 20,
        bottom: flipped ? 80 : 40,
        left: 10,
        right: 80,
        width: 70,
        height: 20,
      }),
    });
    Object.defineProperty(wrapper.get('button').element, 'getBoundingClientRect', {
      value: () => ({
        top: flipped ? 20 : 60,
        bottom: flipped ? 40 : 80,
        left: 20,
        right: 80,
        width: 60,
        height: 20,
      }),
    });

    const waitForArrowUpdate = () =>
      new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await wrapper.setProps({ arrow: true });
    await waitForArrowUpdate();
    await nextTick();
    expect(tooltip.vm.$attrs.class).toContain('ds-tooltip--top');

    flipped = true;
    await wrapper.setProps({ placement: 'bottom' });
    await waitForArrowUpdate();
    await nextTick();
    expect(tooltip.vm.$attrs.class).toContain('ds-tooltip--bottom');
  });
});
