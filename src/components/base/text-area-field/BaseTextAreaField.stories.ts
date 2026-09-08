import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { nextTick, onMounted, ref, watch } from 'vue';

import BaseTextAreaField from './BaseTextAreaField.vue';

const meta = {
  title: 'Base Components/Text Area Field',
  component: BaseTextAreaField,
  argTypes: {
    layout: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal'],
    },
  },
  args: {
    disabled: false,
    errorMessage: '',
    hint: 'Helper Text',
    label: 'Label text',
    layout: 'vertical',
    modelValue: '',
    placeholder: 'Placeholder',
    required: false,
    showCount: false,
  },
  render: (args) => ({
    components: { BaseTextAreaField },
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
      <div style="--text-area-story-field-width: 280px; width: var(--text-area-story-field-width)">
        <BaseTextAreaField
          v-bind="{ ...args, modelValue: value }"
          @update:model-value="value = $event"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof BaseTextAreaField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Vertical: Story = {};

export const Horizontal: Story = {
  args: {
    layout: 'horizontal',
  },
  render: (args) => ({
    components: { BaseTextAreaField },
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
      <div style="--text-area-story-field-width: 280px; width: var(--text-area-story-field-width)">
        <BaseTextAreaField
          v-bind="{ ...args, modelValue: value }"
          @update:model-value="value = $event"
        />
      </div>
    `,
  }),
};

export const Filled: Story = {
  args: {
    modelValue: 'Placeholder',
  },
};

export const FocusStyle: Story = {
  render: (args) => ({
    components: { BaseTextAreaField },
    setup() {
      const container = ref<HTMLElement | null>(null);
      const value = ref(args.modelValue);

      onMounted(async () => {
        await nextTick();
        container.value?.querySelector('textarea')?.focus();
      });

      return { args, container, value };
    },
    template: `
      <div ref="container" style="--text-area-story-field-width: 280px; width: var(--text-area-story-field-width)">
        <BaseTextAreaField
          v-bind="{ ...args, modelValue: value }"
          @update:model-value="value = $event"
        />
      </div>
    `,
  }),
};

export const Error: Story = {
  args: {
    errorMessage: 'Helper Text',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DesignStates: Story = {
  render: () => ({
    components: { BaseTextAreaField },
    template: `
      <div class="base-text-area-field-story">
        <style>
          .base-text-area-field-story {
            --text-area-story-border-color: #9747ff;
            --text-area-story-border-radius: 5px;
            --text-area-story-field-width: 280px;
            --text-area-story-horizontal-field-width: 420px;
            --text-area-story-frame-padding: calc(var(--ds-spacing-3) + var(--ds-spacing-2));
            --text-area-story-vertical-gap: calc(var(--ds-spacing-3) + var(--ds-spacing-2) + var(--ds-spacing-2) + var(--ds-spacing-2));
            --text-area-story-horizontal-gap: calc(var(--ds-spacing-3) + var(--ds-spacing-2));
            --text-area-story-offset: calc(var(--ds-spacing-3) * 4);
            --text-area-story-vertical-width: calc(
              var(--text-area-story-field-width) * 5 + var(--text-area-story-vertical-gap) * 4 +
                var(--text-area-story-frame-padding) * 2
            );
            --text-area-story-horizontal-width: calc(
              var(--text-area-story-horizontal-field-width) * 5 +
                var(--text-area-story-horizontal-gap) * 4 +
                var(--text-area-story-frame-padding) * 2
            );

            display: flex;
            flex-direction: column;
            gap: calc(var(--ds-spacing-3) * 2);
            min-width: max-content;
            padding: var(--text-area-story-offset);
          }

          .base-text-area-field-story__row {
            align-items: flex-start;
            border: 1px dashed var(--text-area-story-border-color);
            border-radius: var(--text-area-story-border-radius);
            box-sizing: border-box;
            display: flex;
            gap: var(--text-area-story-vertical-gap);
            padding: var(--text-area-story-frame-padding);
            width: var(--text-area-story-vertical-width);
          }

          .base-text-area-field-story__row--horizontal {
            flex-wrap: wrap;
            gap: var(--text-area-story-horizontal-gap);
            width: var(--text-area-story-horizontal-width);
          }

          .base-text-area-field-story__state {
            width: var(--text-area-story-field-width);
          }

          .base-text-area-field-story__state--horizontal {
            width: var(--text-area-story-horizontal-field-width);
          }

          .base-text-area-field-story__state--focus .ds-text-area-field__control.ant-input {
            border-color: var(--ds-color-primary);
          }

          .base-text-area-field-story__state--focus .ant-input::placeholder {
            color: var(--ds-color-neutral-400);
          }
        </style>
        <section class="base-text-area-field-story__row">
          <div class="base-text-area-field-story__state">
            <BaseTextAreaField
              hint="Helper Text"
              label="Label text"
              placeholder="Placeholder"
            />
          </div>
          <div class="base-text-area-field-story__state">
            <BaseTextAreaField
              hint="Helper Text"
              label="Label text"
              model-value="Placeholder"
              placeholder="Placeholder"
            />
          </div>
          <div class="base-text-area-field-story__state base-text-area-field-story__state--focus">
            <BaseTextAreaField
              hint="Helper Text"
              label="Label text"
              placeholder="Placeholder"
            />
          </div>
          <div class="base-text-area-field-story__state">
            <BaseTextAreaField
              error-message="Helper Text"
              label="Label text"
              placeholder="Placeholder"
            />
          </div>
          <div class="base-text-area-field-story__state">
            <BaseTextAreaField
              disabled
              hint="Helper Text"
              label="Label text"
              placeholder="Placeholder"
            />
          </div>
        </section>

        <section class="base-text-area-field-story__row base-text-area-field-story__row--horizontal">
          <div class="base-text-area-field-story__state base-text-area-field-story__state--horizontal">
            <BaseTextAreaField
              hint="Helper Text"
              label="Label text"
              layout="horizontal"
              placeholder="Placeholder"
            />
          </div>
          <div class="base-text-area-field-story__state base-text-area-field-story__state--horizontal">
            <BaseTextAreaField
              hint="Helper Text"
              label="Label text"
              layout="horizontal"
              model-value="Placeholder"
              placeholder="Placeholder"
            />
          </div>
          <div class="base-text-area-field-story__state base-text-area-field-story__state--horizontal base-text-area-field-story__state--focus">
            <BaseTextAreaField
              hint="Helper Text"
              label="Label text"
              layout="horizontal"
              placeholder="Placeholder"
            />
          </div>
          <div class="base-text-area-field-story__state base-text-area-field-story__state--horizontal">
            <BaseTextAreaField
              error-message="Helper Text"
              label="Label text"
              layout="horizontal"
              placeholder="Placeholder"
            />
          </div>
          <div class="base-text-area-field-story__state base-text-area-field-story__state--horizontal">
            <BaseTextAreaField
              disabled
              hint="Helper Text"
              label="Label text"
              layout="horizontal"
              placeholder="Placeholder"
            />
          </div>
        </section>
      </div>
    `,
  }),
  parameters: {
    layout: 'padded',
  },
};
