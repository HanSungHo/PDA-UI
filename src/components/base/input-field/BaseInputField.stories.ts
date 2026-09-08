import { UserOutlined } from '@ant-design/icons-vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { nextTick, onMounted, ref, watch } from 'vue';

import BaseInputField from './BaseInputField.vue';

const meta = {
  title: 'Base Components/Input Field',
  component: BaseInputField,
  argTypes: {
    layout: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal'],
    },
    type: {
      control: 'inline-radio',
      options: ['text', 'password'],
    },
    prefixIcon: {
      control: false,
    },
  },
  args: {
    allowClear: false,
    disabled: false,
    errorMessage: '',
    hint: 'Helper Text',
    label: 'Label text',
    layout: 'vertical',
    modelValue: '',
    placeholder: 'Placeholder',
    required: false,
    showCount: false,
    type: 'text',
  },
  render: (args) => ({
    components: { BaseInputField },
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
      <div style="width: 280px">
        <BaseInputField
          v-bind="{ ...args, modelValue: value }"
          @update:model-value="value = $event"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof BaseInputField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Vertical: Story = {};

export const Horizontal: Story = {
  args: {
    layout: 'horizontal',
  },
  render: (args) => ({
    components: { BaseInputField },
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
      <div style="width: 360px">
        <BaseInputField
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
    components: { BaseInputField },
    setup() {
      const container = ref<HTMLElement | null>(null);
      const value = ref(args.modelValue);

      onMounted(async () => {
        await nextTick();
        container.value?.querySelector('input')?.focus();
      });

      return { args, container, value };
    },
    template: `
      <div ref="container" style="width: 280px">
        <BaseInputField
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

export const Password: Story = {
  args: {
    type: 'password',
  },
};

export const WithPrefixAndClear: Story = {
  args: {
    allowClear: true,
    modelValue: 'Placeholder',
    prefixIcon: UserOutlined,
  },
};

export const DesignStates: Story = {
  render: () => ({
    components: { BaseInputField },
    setup() {
      const focusVertical = ref<HTMLElement | null>(null);
      const focusHorizontal = ref<HTMLElement | null>(null);

      onMounted(async () => {
        await nextTick();
        focusVertical.value?.querySelector('input')?.focus();
        focusHorizontal.value?.querySelector('input')?.focus();
      });

      return {
        UserOutlined,
        focusHorizontal,
        focusVertical,
      };
    },
    template: `
      <div class="base-input-field-story">
        <section class="base-input-field-story__row">
          <BaseInputField
            hint="Helper Text"
            label="Label text"
            placeholder="Placeholder"
            :prefix-icon="UserOutlined"
          />
          <BaseInputField
            allow-clear
            hint="Helper Text"
            label="Label text"
            model-value="Placeholder"
            placeholder="Placeholder"
            :prefix-icon="UserOutlined"
          />
          <div ref="focusVertical">
            <BaseInputField
              hint="Helper Text"
              label="Label text"
              placeholder="Placeholder"
              :prefix-icon="UserOutlined"
            />
          </div>
          <BaseInputField
            error-message="Helper Text"
            label="Label text"
            placeholder="Placeholder"
            :prefix-icon="UserOutlined"
          />
          <BaseInputField
            disabled
            hint="Helper Text"
            label="Label text"
            placeholder="Placeholder"
            :prefix-icon="UserOutlined"
          />
        </section>

        <section class="base-input-field-story__row base-input-field-story__row--horizontal">
          <BaseInputField
            hint="Helper Text"
            label="Label text"
            layout="horizontal"
            placeholder="Placeholder"
            :prefix-icon="UserOutlined"
          />
          <BaseInputField
            allow-clear
            hint="Helper Text"
            label="Label text"
            layout="horizontal"
            model-value="Placeholder"
            placeholder="Placeholder"
            :prefix-icon="UserOutlined"
          />
          <div ref="focusHorizontal">
            <BaseInputField
              hint="Helper Text"
              label="Label text"
              layout="horizontal"
              placeholder="Placeholder"
              :prefix-icon="UserOutlined"
            />
          </div>
          <BaseInputField
            error-message="Helper Text"
            label="Label text"
            layout="horizontal"
            placeholder="Placeholder"
            :prefix-icon="UserOutlined"
          />
          <BaseInputField
            disabled
            hint="Helper Text"
            label="Label text"
            layout="horizontal"
            placeholder="Placeholder"
            :prefix-icon="UserOutlined"
          />
        </section>
      </div>
    `,
  }),
  parameters: {
    layout: 'fullscreen',
  },
};
