import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed } from 'vue';

import { BaseButton } from '../button';
import BaseTooltip from './BaseTooltip.vue';

const meta = {
  title: 'Base Components/Tooltip',
  component: BaseTooltip,
  argTypes: {
    arrow: { control: 'boolean' },
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
    title: { control: 'text' },
    trigger: {
      control: 'select',
      options: ['hover', 'click', 'focus', ['hover', 'click'], ['click', 'focus']],
    },
  },
  args: {
    arrow: true,
    placement: 'top',
    title: 'Tooltip',
    trigger: 'hover',
  },
  render: (args) => ({
    components: { BaseTooltip, BaseButton },
    setup() {
      const buttonLabel = computed(() => {
        const triggers = Array.isArray(args.trigger) ? args.trigger : [args.trigger];
        if (triggers.includes('click') && triggers.includes('hover')) return 'Hover or Click me';
        if (triggers.includes('click')) return 'Click me';
        if (triggers.includes('focus')) return 'Focus me (Tab or Click)';
        return 'Hover me';
      });

      return { args, buttonLabel };
    },
    template: `
      <div style="padding: 60px; display: flex; justify-content: center;">
        <BaseTooltip v-bind="args">
          <BaseButton variant="tertiary" size="medium">{{ buttonLabel }}</BaseButton>
        </BaseTooltip>
      </div>
    `,
  }),
} satisfies Meta<typeof BaseTooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllPlacements: Story = {
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 32px; padding: 40px;">
        <!-- Top placement (arrow pointing down) -->
        <div class="ds-tooltip-card ds-tooltip-card--top">
          <span>Tooltip</span>
          <span class="ds-tooltip-card__arrow" />
        </div>
 
        <!-- Right placement (arrow pointing left) -->
        <div class="ds-tooltip-card ds-tooltip-card--right">
          <span>Tooltip</span>
          <span class="ds-tooltip-card__arrow" />
        </div>
 
        <!-- Left placement (arrow pointing right) -->
        <div class="ds-tooltip-card ds-tooltip-card--left">
          <span>Tooltip</span>
          <span class="ds-tooltip-card__arrow" />
        </div>
 
        <!-- Bottom placement (arrow pointing up) -->
        <div class="ds-tooltip-card ds-tooltip-card--bottom">
          <span>Tooltip</span>
          <span class="ds-tooltip-card__arrow" />
        </div>
      </div>
    `,
  }),
};

export const InteractivePositions: Story = {
  render: () => ({
    components: { BaseTooltip, BaseButton },
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, 160px); gap: 24px; padding: 60px; justify-content: center;">
        <BaseTooltip title="Tooltip on top" placement="top">
          <BaseButton variant="tertiary" size="medium" block>Top</BaseButton>
        </BaseTooltip>
 
        <BaseTooltip title="Tooltip on bottom" placement="bottom">
          <BaseButton variant="tertiary" size="medium" block>Bottom</BaseButton>
        </BaseTooltip>
 
        <BaseTooltip title="Tooltip on left" placement="left">
          <BaseButton variant="tertiary" size="medium" block>Left</BaseButton>
        </BaseTooltip>
 
        <BaseTooltip title="Tooltip on right" placement="right">
          <BaseButton variant="tertiary" size="medium" block>Right</BaseButton>
        </BaseTooltip>
      </div>
    `,
  }),
};

export const CustomContent: Story = {
  render: () => ({
    components: { BaseTooltip, BaseButton },
    template: `
      <div style="padding: 60px; display: flex; justify-content: center;">
        <BaseTooltip placement="top">
          <template #title>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <strong style="color: var(--ds-color-neutral-900);">Custom Tooltip</strong>
              <span style="color: var(--ds-color-neutral-500); font-size: 11px;">Additional helpful description</span>
            </div>
          </template>
          <BaseButton variant="primary" size="medium">Hover for rich tooltip</BaseButton>
        </BaseTooltip>
      </div>
    `,
  }),
};

export const MobileTouchTriggers: Story = {
  render: () => ({
    components: { BaseTooltip, BaseButton },
    template: `
      <div style="display: flex; gap: 24px; padding: 60px; justify-content: center; flex-wrap: wrap;">
        <BaseTooltip title="Tap to open on mobile" trigger="click">
          <BaseButton variant="primary" size="medium">Click (Mobile)</BaseButton>
        </BaseTooltip>
 
        <BaseTooltip title="Hover on desktop or Tap on mobile" :trigger="['hover', 'click']">
          <BaseButton variant="tertiary" size="medium">Hybrid (Hover + Click)</BaseButton>
        </BaseTooltip>
 
        <BaseTooltip title="Focus with Tab or Tap" :trigger="['focus', 'click']">
          <BaseButton variant="secondary" size="medium">Focus + Click</BaseButton>
        </BaseTooltip>
      </div>
    `,
  }),
};
