import { CloseOutlined, SaveOutlined } from '@ant-design/icons-vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import { BaseButton } from '../button';
import BaseModal from './BaseModal.vue';

const meta = {
  title: 'Base Components/Modal',
  component: BaseModal,
  argTypes: {
    closable: { control: 'boolean' },
    open: { control: 'boolean' },
    overlayClosable: { control: 'boolean' },
    title: { control: 'text' },
  },
  args: {
    closable: true,
    open: true,
    overlayClosable: true,
    title: 'Title',
  },
  render: (args) => ({
    components: { BaseModal, BaseButton },
    setup() {
      const isOpen = ref(args.open);

      watch(
        () => args.open,
        (val) => {
          isOpen.value = val;
        },
      );

      function handleOpen() {
        isOpen.value = true;
      }

      function handleClose() {
        isOpen.value = false;
      }

      return { args, isOpen, handleOpen, handleClose };
    },
    template: `
      <div>
        <BaseButton variant="primary" @click="handleOpen">Open Modal</BaseButton>
        <BaseModal
          v-bind="args"
          v-model:open="isOpen"
          @cancel="handleClose"
        >
          <div style="min-height: 120px;" />
          <template #footer>
            <div class="ds-modal__status">
              <span class="ds-modal__status-dot" />
              <span>0 Components</span>
            </div>
            <div class="ds-modal__actions">
              <BaseButton variant="tertiary" size="medium" @click="handleClose">
                Cancel
              </BaseButton>
              <BaseButton variant="primary" size="medium" @click="handleClose">
                Save
              </BaseButton>
            </div>
          </template>
        </BaseModal>
      </div>
    `,
  }),
} satisfies Meta<typeof BaseModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithButtonIcons: Story = {
  render: (args) => ({
    components: { BaseModal, BaseButton, CloseOutlined, SaveOutlined },
    setup() {
      const isOpen = ref(true);

      return { args, isOpen };
    },
    template: `
      <div>
        <BaseButton variant="primary" @click="isOpen = true">Open Modal with Button Icons</BaseButton>
        <BaseModal
          v-bind="args"
          v-model:open="isOpen"
          title="Modal with Icons in Buttons"
          @cancel="isOpen = false"
        >
          <p style="margin: 0; color: var(--ds-color-text-secondary); font-size: 14px;">
            Developers can easily place icons inside BaseButton within the #footer slot.
          </p>
          <template #footer>
            <div class="ds-modal__status">
              <span class="ds-modal__status-dot" />
              <span>0 Components</span>
            </div>
            <div class="ds-modal__actions">
              <BaseButton variant="tertiary" size="medium" @click="isOpen = false">
                <template #icon><CloseOutlined /></template>
                Cancel
              </BaseButton>
              <BaseButton variant="primary" size="medium" @click="isOpen = false">
                <template #icon><SaveOutlined /></template>
                Save
              </BaseButton>
            </div>
          </template>
        </BaseModal>
      </div>
    `,
  }),
};

export const WithContent: Story = {
  render: (args) => ({
    components: { BaseModal, BaseButton },
    setup() {
      const isOpen = ref(false);

      return { args, isOpen };
    },
    template: `
      <div>
        <BaseButton variant="primary" @click="isOpen = true">Open Modal with Content</BaseButton>
        <BaseModal
          v-bind="args"
          v-model:open="isOpen"
          title="Edit Configuration"
          @cancel="isOpen = false"
        >
          <p style="margin: 0; color: var(--ds-color-text-secondary); font-size: 14px; line-height: 1.5;">
            Modal content goes here. You can put form fields, tables, or any custom elements inside.
          </p>
          <template #footer>
            <div class="ds-modal__status">
              <span class="ds-modal__status-dot" />
              <span>3 Components</span>
            </div>
            <div class="ds-modal__actions">
              <BaseButton variant="tertiary" size="medium" @click="isOpen = false">
                Cancel
              </BaseButton>
              <BaseButton variant="primary" size="medium" @click="isOpen = false">
                Save
              </BaseButton>
            </div>
          </template>
        </BaseModal>
      </div>
    `,
  }),
};

export const NoFooter: Story = {
  render: (args) => ({
    components: { BaseModal, BaseButton },
    setup() {
      const isOpen = ref(true);

      return { args, isOpen };
    },
    template: `
      <div>
        <BaseButton variant="primary" @click="isOpen = true">Open Modal without Footer</BaseButton>
        <BaseModal
          v-bind="args"
          v-model:open="isOpen"
          title="Modal Without Footer"
          @cancel="isOpen = false"
        >
          <p style="margin: 0; color: var(--ds-color-text-secondary); font-size: 14px; line-height: 1.5;">
            Simply omit the #footer slot to render a clean modal without footer.
          </p>
        </BaseModal>
      </div>
    `,
  }),
};

export const OverlayClosableDisabled: Story = {
  render: (args) => ({
    components: { BaseModal, BaseButton },
    setup() {
      const isOpen = ref(true);

      return { args, isOpen };
    },
    template: `
      <div>
        <BaseButton variant="primary" @click="isOpen = true">Open Modal (Overlay Click Disabled)</BaseButton>
        <BaseModal
          v-bind="args"
          v-model:open="isOpen"
          title="Overlay Click Disabled"
          :overlay-closable="false"
          @cancel="isOpen = false"
        >
          <p style="margin: 0; color: var(--ds-color-text-secondary); font-size: 14px; line-height: 1.5;">
            Clicking the dark overlay outside will NOT close this modal.
            You must click the close button (X) or a footer button.
          </p>
          <template #footer>
            <div class="ds-modal__actions">
              <BaseButton variant="tertiary" size="medium" @click="isOpen = false">
                Close
              </BaseButton>
            </div>
          </template>
        </BaseModal>
      </div>
    `,
  }),
};
