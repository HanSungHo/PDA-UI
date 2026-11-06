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
        <p
          v-for="(line, index) in patchMessageLines"
          :key="index"
          class="patch-message-card__text"
          :class="{ 'patch-message-card__text--secondary': index === 0 }"
        >
          {{ line }}
        </p>
      </div>

      <!-- progressBar -->
      <QLinearProgress
        id="progressBar"
        class="patch-progress-bar"
        :value="viewBinding.progressBar / 100"
        color="primary"
        size="4px"
        rounded
        :indeterminate="isDownloading && viewBinding.progressBar === 0"
      />
    </div>

    <!-- Footer: btn_download -->
    <template #footer>
      <div class="patch-modal__footer">
        <BaseButton
          class="patch-btn--action"
          :label="viewBinding.btnDownload.text"
          variant="link"
          size="medium"
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
import { computed, watch } from 'vue';

import BaseButton from '~/components/base/button/BaseButton.vue';
import BaseModal from '~/components/base/modal/BaseModal.vue';

import { usePatch } from '../composables/usePatch';
import type { PatchInboundParams } from '../types/patch.types';

interface Props {
  modelValue: boolean;
  inboundParams?: PatchInboundParams;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: true,
  inboundParams: () => ({}),
});

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'close'): void;
}>();

const { viewBinding, isDownloading, singleClickListener, onBackPressed, handleResume } = usePatch();

const patchMessageLines = computed(() => viewBinding.txtPatchText.split('\n'));

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
