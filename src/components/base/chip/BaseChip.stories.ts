import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { h, ref, watch } from 'vue';

import BaseChip from './BaseChip.vue';

/** Minimal inline SVG icon used only for the WithIcons story. */
const IconStar = {
  render: () =>
    h('svg', { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' }, [
      h('path', {
        d: 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
      }),
    ]),
};

const meta = {
  title: 'Base Components/Chip',
  component: BaseChip,
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium'],
    },
    modelValue: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: {
    label: 'Chip',
    modelValue: false,
    size: 'medium',
    disabled: false,
  },
  render: (args) => ({
    components: { BaseChip },
    setup() {
      const value = ref(args.modelValue);

      watch(
        () => args.modelValue,
        (nextValue) => {
          value.value = nextValue;
        },
      );

      return { args, value };
    },
    template: `
      <BaseChip
        v-bind="{ ...args, modelValue: value }"
        @update:model-value="value = $event"
      />
    `,
  }),
} satisfies Meta<typeof BaseChip>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Playground for interactive testing with Storybook controls. */
export const Playground: Story = {
  args: { label: 'Interactive Chip', modelValue: false, size: 'medium' },
};

/** Small / Default (unselected). */
export const SmallDefault: Story = {
  args: { label: 'Chip', size: 'small', modelValue: false, disabled: false },
};

/** Small / Selected: teal border and background, aria-pressed="true". */
export const SmallSelected: Story = {
  args: { label: 'Chip', size: 'small', modelValue: true, disabled: false },
};

/** Small / Disabled: gray border and background, cursor not-allowed. */
export const SmallDisabled: Story = {
  args: { label: 'Chip', size: 'small', modelValue: false, disabled: true },
};

/** Small / Disabled + Selected. */
export const SmallDisabledSelected: Story = {
  args: { label: 'Chip', size: 'small', modelValue: true, disabled: true },
};

/** Medium / Default (unselected). */
export const MediumDefault: Story = {
  args: { label: 'Chip', size: 'medium', modelValue: false, disabled: false },
};

/** Medium / Selected: teal border and background, aria-pressed="true". */
export const MediumSelected: Story = {
  args: { label: 'Chip', size: 'medium', modelValue: true, disabled: false },
};

/** Medium / Disabled: gray border and background, cursor not-allowed. */
export const MediumDisabled: Story = {
  args: { label: 'Chip', size: 'medium', modelValue: false, disabled: true },
};

/** Medium / Disabled + Selected. */
export const MediumDisabledSelected: Story = {
  args: { label: 'Chip', size: 'medium', modelValue: true, disabled: true },
};

/** Chips with a left icon, a right icon, and both. */
export const WithIcons: Story = {
  render: () => ({
    components: { BaseChip },
    setup() {
      const states = ref({ before: false, after: true, both: false });

      return { states, IconStar };
    },
    template: `
      <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
        <BaseChip v-model="states.before" label="Before icon" :before-icon="IconStar" />
        <BaseChip v-model="states.after" label="After icon" :after-icon="IconStar" />
        <BaseChip v-model="states.both" label="Both icons" :before-icon="IconStar" :after-icon="IconStar" />
        <BaseChip label="Disabled" :before-icon="IconStar" disabled />
      </div>
    `,
  }),
};

/** All design states in a grid for visual comparison with chip.html. */
export const DesignStates: Story = {
  render: () => ({
    components: { BaseChip },
    setup() {
      const states = ref({
        smallDefault: false,
        smallSelected: true,
        mediumDefault: false,
        mediumSelected: true,
        toggleSmall: false,
        toggleMedium: false,
      });

      return { states };
    },
    template: `
      <div style="display: grid; gap: 32px;">
        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #030712;">Small</h3>
          <div style="display: flex; gap: 16px;">
            <BaseChip v-model="states.smallDefault" label="Default" size="small" />
            <BaseChip v-model="states.smallSelected" label="Selected" size="small" />
            <BaseChip label="Disabled" size="small" disabled />
          </div>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #030712;">Medium</h3>
          <div style="display: flex; gap: 16px;">
            <BaseChip v-model="states.mediumDefault" label="Default" size="medium" />
            <BaseChip v-model="states.mediumSelected" label="Selected" size="medium" />
            <BaseChip label="Disabled" size="medium" disabled />
          </div>
        </div>

        <div>
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #030712;">Interactive (click to toggle)</h3>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <BaseChip v-model="states.toggleSmall" label="Toggle Small" size="small" />
            <BaseChip v-model="states.toggleMedium" label="Toggle Medium" size="medium" />
          </div>
        </div>
      </div>
    `,
  }),
};

/** Focus state: press Tab to see the focus ring (2px outline, 3px offset). */
export const FocusState: Story = {
  render: () => ({
    components: { BaseChip },
    setup() {
      const states = ref({ chip1: false, chip2: false });

      return { states };
    },
    template: `
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <BaseChip v-model="states.chip1" label="Focus me" size="small" />
        <BaseChip v-model="states.chip2" label="Focus me" size="medium" />
      </div>
    `,
  }),
};

/** Hover state: unselected chips get a subtle background change. */
export const HoverState: Story = {
  render: () => ({
    components: { BaseChip },
    setup() {
      const states = ref({ chip1: false });

      return { states };
    },
    template: `
      <BaseChip v-model="states.chip1" label="Hover me" size="medium" />
    `,
  }),
};
