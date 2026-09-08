import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import BaseToggle from './BaseToggle.vue';

const meta = {
  title: 'Base Components/Toggle',
  component: BaseToggle,
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'publish', 'segmented', 'segmented-alt', 'segmented-icon', 'icon'],
    },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    status: {
      control: 'inline-radio',
      options: ['default', 'error', 'success', 'warning'],
    },
    modelValue: { control: 'boolean' },
  },
  args: {
    ariaLabel: 'Toggle setting',
    label: 'Published',
    modelValue: false,
    size: 'medium',
    variant: 'text',
  },
  render: (args) => ({
    components: { BaseToggle },
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
      <BaseToggle
        v-bind="{ ...args, modelValue: value }"
        @update:model-value="value = $event"
      />
    `,
  }),
} satisfies Meta<typeof BaseToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    ariaLabel: 'Hello',
    label: 'ABC',
    modelValue: true,
    status: 'warning',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    modelValue: true,
  },
};

export const Readonly: Story = {
  args: {
    modelValue: true,
    readonly: true,
  },
};

export const Variants: Story = {
  render: () => ({
    components: { BaseToggle },
    setup() {
      const values = ref({ text: true, publish: false, segmented: true, icon: false });
      return { values };
    },
    template: `
      <div style="display: grid; gap: 24px; max-width: 480px">
        <BaseToggle v-model="values.text" label="Text" variant="text" />
        <BaseToggle v-model="values.publish" label="Publish" variant="publish" />
        <BaseToggle v-model="values.segmented" aria-label="Visibility" variant="segmented" />
        <BaseToggle v-model="values.icon" aria-label="Icon toggle" variant="icon" />
      </div>
    `,
  }),
};

export const DesignStates: Story = {
  render: () => ({
    components: { BaseToggle },
    setup() {
      const cases = ref([
        {
          label: 'Default',
          value: false,
          props: { label: 'Default toggle', hint: 'Click to change the value', block: true },
        },
        {
          label: 'Checked',
          value: true,
          props: { label: 'Checked toggle', hint: 'Initial value is true', block: true },
        },
        {
          label: 'Required',
          value: false,
          props: {
            label: 'Required toggle',
            hint: 'Required indicator is displayed',
            required: true,
            block: true,
          },
        },
        {
          label: 'Disabled OFF',
          value: false,
          props: { label: 'Disabled toggle', disabled: true, block: true },
        },
        {
          label: 'Disabled ON',
          value: true,
          props: { label: 'Disabled checked toggle', disabled: true, block: true },
        },
        {
          label: 'Readonly',
          value: true,
          props: { label: 'Readonly toggle', readonly: true, block: true },
        },
        {
          label: 'Loading',
          value: true,
          props: { label: 'Loading toggle', loading: true, block: true },
        },
        {
          label: 'Error',
          value: false,
          props: { label: 'Error toggle', errorMessage: 'This option is required' },
        },
        {
          label: 'Success',
          value: true,
          props: {
            label: 'Success toggle',
            hint: 'Value has been accepted',
            status: 'success',
            block: true,
          },
        },
        {
          label: 'Warning',
          value: false,
          props: {
            label: 'Warning toggle',
            hint: 'Review the selected value',
            status: 'warning',
            block: true,
          },
        },
        {
          label: 'ARIA Label Only',
          value: false,
          props: { ariaLabel: 'Accessible toggle' },
        },
        {
          label: 'Small Size',
          value: true,
          props: { label: 'Small toggle', size: 'small', block: true },
        },
      ]);

      return { cases };
    },
    template: `
      <div style="box-sizing: border-box; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; width: 100%; max-width: 960px; padding: 24px">
        <article v-for="item in cases" :key="item.label" style="box-sizing: border-box; min-height: 124px; padding: 16px; border: 1px solid #d9d9d9; border-radius: 6px">
          <strong style="display: block; margin-bottom: 16px">{{ item.label }}</strong>
          <BaseToggle v-model="item.value" v-bind="item.props" />
        </article>
      </div>
    `,
  }),
  parameters: {
    layout: 'fullscreen',
  },
};
