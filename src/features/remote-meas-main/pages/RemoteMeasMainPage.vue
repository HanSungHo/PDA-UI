<template>
  <BaseScreen class="remote-meas-main" title="MEAS Remote" :show-footer="false">
    <section class="ds-screen__card" aria-label="진행장비 조회">
      <div class="ds-screen__card-row">
        <BaseInput
          ref="txtMachineInput"
          :model-value="txtMachine"
          class="remote-meas-main__machine"
          label="진행장비"
          autocomplete="off"
          autocapitalize="characters"
          uppercase
          select-on-focus
          @update:model-value="updateTxtMachine(String($event ?? ''))"
          @keydown.enter.prevent="onEditorAction"
        >
          <template #append><QIcon name="sym_o_search" size="16px" aria-hidden="true" /></template>
        </BaseInput>
        <BaseButton
          class="remote-meas-main__search-button"
          variant="secondary"
          size="small"
          :loading="loading"
          @click="onSingleClickListener(() => void checkEqpType())"
          >조회</BaseButton
        >
      </div>
    </section>

    <section
      class="ds-screen__card remote-meas-main__content"
      aria-label="MEAS 장비"
      :aria-busy="loading"
    >
      <BaseEmptyState />
    </section>
  </BaseScreen>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { BaseButton, BaseEmptyState, BaseInput, BaseScreen } from 'src/components/base';
import { useSingleClick } from 'src/composables/use-single-click';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useRemoteMeasMain } from '../composables/use-remote-meas-main';
import type { RemoteMeasMainTarget } from '../types/remote-meas-main.types';

defineOptions({ name: 'RemoteMeasMainPage' });

const router = useRouter();
const txtMachineInput = ref<InstanceType<typeof BaseInput>>();

/** CommonUtil.hideKeyboard: dropping focus closes the soft keyboard in the WebView. */
function hideKeyboard(): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

/** activityFactoryResultLauncher.launch: RESULT_OK does nothing (setEQPList is commented out). */
function launch(target: RemoteMeasMainTarget, Eqpid: string): void {
  void router.push({ path: `/${target}`, query: { Eqpid } });
}

const { txtMachine, loading, updateTxtMachine, checkEqpType, onEditorAction, onBarcodeEnter } =
  useRemoteMeasMain({ hideKeyboard, launch });

/** OnSingleClickListener: btn_search_ing_machine ignores clicks within 1 second. */
const onSingleClickListener = useSingleClick();

// On the device MainActivity consumes the scanner's Enter key and re-sends it as native-enter.
function handleNativeEnter(): void {
  const field = txtMachineInput.value?.$el as HTMLElement | undefined;
  if (field?.contains(document.activeElement)) onBarcodeEnter();
}

onMounted(() => {
  window.addEventListener(NATIVE_ENTER_EVENT, handleNativeEnter);
  // txt_machine has <requestFocus />.
  void nextTick(() => txtMachineInput.value?.focus());
});

onBeforeUnmount(() => {
  window.removeEventListener(NATIVE_ENTER_EVENT, handleNativeEnter);
});
</script>

<style src="../styles/remote-meas-main.css"></style>
