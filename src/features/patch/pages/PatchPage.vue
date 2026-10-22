<template>
  <BaseModal
    :open="modelValue"
    width="100%"
    :closable="false"
    :overlay-closable="false"
    class="patch-modal"
    @cancel="handleClose"
    @update:open="handleModalOpenChange"
  >
    <!-- Header: TitleLayout -->
    <template #title>
      <span class="patch-modal__title">Patch</span>
    </template>

    <div class="patch-modal__body">
      <!-- txt_patch_text -->
      <div class="patch-message-card">
        <p class="patch-message-card__text">
          {{ viewBinding.txtPatchText }}
        </p>
      </div>

      <!-- progressBar -->
      <div class="patch-progress-section">
        <QLinearProgress
          id="progressBar"
          :value="viewBinding.progressBar / 100"
          color="primary"
          track-color="grey-3"
          size="12px"
          rounded
          :indeterminate="isDownloading && viewBinding.progressBar === 0"
        />
      </div>
    </div>

    <!-- Footer: btn_download -->
    <template #footer>
      <div class="patch-modal__footer">
        <BaseButton
          class="patch-btn--action"
          :label="viewBinding.btnDownload.text"
          variant="link"
          size="large"
          :disabled="!viewBinding.btnDownload.isEnabled"
          :loading="
            !viewBinding.btnDownload.isEnabled && viewBinding.btnDownload.text === 'Download'
          "
          @click="singleClickListener.onSingleClick()"
        />
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { QLinearProgress } from 'quasar';
import { watch } from 'vue';

import BaseButton from '~/components/base/button/BaseButton.vue';
import BaseModal from '~/components/base/modal/BaseModal.vue';

import { usePatch } from '../composables/usePatch';
import type { PatchInboundParams } from '../types/patch.types';

interface Props {
  modelValue: boolean;
  inboundParams?: PatchInboundParams;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  inboundParams: () => ({}),
});

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'close'): void;
}>();

const { viewBinding, isDownloading, singleClickListener, onBackPressed, handleResume } = usePatch();

function handleModalOpenChange(val: boolean) {
  // Prevent modal from closing if not permitted
  if (!val && !onBackPressed()) {
    return;
  }
  emit('update:modelValue', val);
  if (!val) {
    emit('close');
  }
}

function handleClose() {
  if (!onBackPressed()) return;
  emit('update:modelValue', false);
  emit('close');
}

// When the modal reappears (equivalent to onResume), only switch to INSTALL if the download really finished
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      handleResume();
    }
  },
);
</script>

<style scoped src="../styles/patch.css"></style>
