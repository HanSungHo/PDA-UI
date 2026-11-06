<template>
  <BaseScreen class="test-tuning" title="TEST | TUNING">
    <div class="ds-screen__card">
      <div class="ds-screen__card-row">
        <BaseInput
          id="edit_eqp_id"
          ref="editEqpIdRef"
          v-model="editEqpId"
          label="Machine"
          uppercase
          @keyup.enter="handleEditorAction"
        />

        <BaseButton variant="secondary" size="small" label="조회" @click="handleSearchClick" />
      </div>

      <BaseRadioGroup
        label="TYPE"
        layout="horizontal"
        name="screenMode"
        :model-value="radioMode"
        :options="radioModeOptions"
        @update:model-value="handleRadioChange"
      />

      <BaseDropdownList
        label="MAIN"
        :options="spinnerMainOptions"
        :model-value="selectedMain"
        @update:model-value="onMainSpinnerChange(String($event ?? ''))"
      />

      <BaseDropdownList
        label="SUB"
        :options="spinnerSubOptions"
        :model-value="selectedSub"
        @update:model-value="onSubSpinnerChange(String($event ?? ''))"
      />

      <BaseInput label="일련번호" :model-value="txtLot" readonly />
    </div>

    <div ref="mainBodyRef" class="ds-screen__card test-tuning__grid">
      <BaseRevoGrid
        :rows="gridData"
        :columns="columns"
        :resize="false"
        :filter="false"
        stretch
        accessible-label="TEST TUNING Grid"
      />
    </div>

    <template #footer>
      <BaseButton
        id="btn_cancel"
        label="취소"
        variant="primary"
        size="medium"
        @click="handleCancelClick"
      />
    </template>

    <OkDialog
      :open="okDialog.isOpen.value"
      :title="okDialog.title.value"
      :message="okDialog.message.value"
      :confirm-label="okDialog.confirmLabel.value"
      @confirm="okDialog.confirm"
    />
  </BaseScreen>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';

import BaseButton from '~/components/base/button/BaseButton.vue';
import BaseDropdownList from '~/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInput from '~/components/base/input/BaseInput.vue';
import BaseRadioGroup from '~/components/base/radio/BaseRadioGroup.vue';
import BaseRevoGrid from '~/components/base/revo-grid/BaseRevoGrid.vue';
import BaseScreen from '~/components/base/screen/BaseScreen.vue';
import OkDialog from '~/components/OkDialog.vue';
import { okDialog } from '~/services/ok-dialog.service';

import { useTestTuningLogic } from '../composables/useTestTuning';

const editEqpIdRef = ref<InstanceType<typeof BaseInput>>();

// Android: edit_eqp_id carries <requestFocus /> in the layout, and getMainInfo() re-focuses
// it after a failed lookup. The ref isn't mounted yet when the composable is created, so the
// composable calls this callback instead of reaching into the DOM itself.
function focusEqpIdInput(): void {
  void nextTick(() => {
    editEqpIdRef.value?.focus();
  });
}

const {
  editEqpId,
  txtLot,
  radioMode,
  radioModeOptions,
  spinnerMainOptions,
  spinnerSubOptions,
  selectedMain,
  selectedSub,
  gridData,
  columns,
  baseWidth,
  handleEditorAction,
  handleSearchClick,
  handleCancelClick,
  handleRadioChange,
  onMainSpinnerChange,
  onSubSpinnerChange,
} = useTestTuningLogic(focusEqpIdInput);

const mainBodyRef = ref<HTMLDivElement | null>(null);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  focusEqpIdInput();

  if (mainBodyRef.value) {
    baseWidth.value = mainBodyRef.value.clientWidth;

    resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        baseWidth.value = entry.contentRect.width;
        if (resizeObserver && mainBodyRef.value) {
          resizeObserver.unobserve(mainBodyRef.value);
          resizeObserver.disconnect();
          resizeObserver = null;
        }
      }
    });
    resizeObserver.observe(mainBodyRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});
</script>

<style scoped>
.test-tuning__grid {
  flex: 1;
  width: 100%;
  min-height: 200px;
  overflow: hidden;
}
</style>
