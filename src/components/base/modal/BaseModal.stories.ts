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
    width: { control: 'number' },
  },
  args: {
    closable: false,
    open: true,
    overlayClosable: true,
    title: 'Title',
    width: 340,
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
            <BaseButton variant="tertiary" size="medium" @click="handleClose">
              Button
            </BaseButton>
            <BaseButton variant="primary" size="medium" @click="handleClose">
              Button
            </BaseButton>
          </template>
        </BaseModal>
      </div>
    `,
  }),
} satisfies Meta<typeof BaseModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithStatusFooter: Story = {
  render: (args) => ({
    components: { BaseModal, BaseButton },
    setup() {
      const isOpen = ref(true);

      return { args, isOpen };
    },
    template: `
      <div>
        <BaseButton variant="primary" @click="isOpen = true">Open Modal with Status</BaseButton>
        <BaseModal
          v-bind="args"
          v-model:open="isOpen"
          title="Modal with Status"
          :closable="true"
          @cancel="isOpen = false"
        >
          <div style="min-height: 100px;">
            <p style="margin: 0; color: #475467; font-size: 14px;">
              Modal body content with custom footer status.
            </p>
          </div>
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
          :closable="true"
          @cancel="isOpen = false"
        >
          <p style="margin: 0; color: #475467; font-size: 14px; line-height: 1.5;">
            Modal content goes here. Form fields, tables, or custom elements can be placed inside.
          </p>
          <template #footer>
            <BaseButton variant="tertiary" size="medium" @click="isOpen = false">
              Cancel
            </BaseButton>
            <BaseButton variant="primary" size="medium" @click="isOpen = false">
              Save
            </BaseButton>
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
          :closable="true"
          @cancel="isOpen = false"
        >
          <p style="margin: 0; color: #475467; font-size: 14px; line-height: 1.5;">
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
          :closable="true"
          :overlay-closable="false"
          @cancel="isOpen = false"
        >
          <p style="margin: 0; color: #475467; font-size: 14px; line-height: 1.5;">
            Clicking the dark overlay outside will NOT close this modal.
            You must click the close button (X) or a footer button.
          </p>
          <template #footer>
            <BaseButton variant="tertiary" size="medium" @click="isOpen = false">
              Close
            </BaseButton>
          </template>
        </BaseModal>
      </div>
    `,
  }),
};
