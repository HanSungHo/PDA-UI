<template>
  <BaseScreen class="pr-change" title="PR 교체">
    <section class="ds-screen__card" aria-label="PUMP 정보">
      <div class="ds-screen__card-row">
        <BaseInput
          class="pr-change__field"
          layout="horizontal"
          :ref="setInputRef('editPumpId')"
          :model-value="editPumpId"
          label="PUMP ID"
          autofocus
          :disabled="loading"
          @update:model-value="onPumpIdInput"
          @keydown.enter.prevent="onPumpIdEditorAction"
        >
          <template #suffix><QIcon name="sym_o_search" size="16px" aria-hidden="true" /></template>
        </BaseInput>
        <BaseButton size="small" variant="secondary" :disabled="loading" @click="getPumpStats"
          >조회</BaseButton
        >
      </div>
      <BaseInput
        class="pr-change__field"
        layout="horizontal"
        v-for="field in masterFields"
        :key="field.label"
        :model-value="field.value"
        :label="field.label"
        readonly
      />
    </section>

    <section class="ds-screen__card" aria-label="PR 교체 정보">
      <BaseInput
        class="pr-change__field"
        layout="horizontal"
        :ref="setInputRef('editCurrentPr')"
        v-model="editCurrentPr"
        label="현재 PR"
        :disabled="loading || !editCurrentPrEnabled"
        @keydown.enter.prevent="onCurrentPrEditorAction"
      />
      <BaseInput
        class="pr-change__field"
        layout="horizontal"
        :ref="setInputRef('editChangePr')"
        v-model="editChangePr"
        label="교체 PR"
        :disabled="loading"
        @keydown.enter.prevent="onChangePrEditorAction"
      />
      <div v-for="pair in changeFieldPairs" :key="pair[0].label" class="ds-screen__card-row">
        <BaseInput
          class="pr-change__field"
          layout="horizontal"
          v-for="field in pair"
          :key="field.label"
          :model-value="field.value"
          :label="field.label"
          readonly
        />
      </div>
      <BaseInput
        class="pr-change__field"
        layout="horizontal"
        :ref="setInputRef('editInDate')"
        v-model="editInDate"
        label="상온입고"
        :disabled="loading || !editInDateEnabled"
        @keydown.enter.prevent="onInDateEditorAction"
      />
      <BaseInput
        class="pr-change__field"
        layout="horizontal"
        :ref="setInputRef('editOutPr')"
        v-model="editOutPr"
        label="OUT_PR"
        :disabled="loading || !editOutPrEnabled"
        @keydown.enter.prevent="onOutPrEditorAction"
      />
      <BaseRadioGroup
        class="pr-change__field pr-change__leak"
        label="LEAK"
        name="pr-change-leak"
        layout="horizontal"
        :model-value="leakValue"
        :options="leakOptions"
        :disabled="loading"
        @update:model-value="onLeakChange"
      />
      <BaseInput
        v-model="editUserId"
        class="pr-change__field"
        layout="horizontal"
        label="사번"
        :disabled="loading || !editUserIdEnabled"
      />
    </section>

    <OkDialog
      :open="dialog !== null"
      :title="dialog?.title ?? ''"
      :message="dialog?.message ?? ''"
      @update:open="onDialogOpenChange"
    />
    <BaseModal
      class="pr-change__confirm"
      :open="confirmDialog !== null"
      :title="confirmDialog?.title"
      :overlay-closable="false"
      @cancel="answerConfirmDialog(false)"
    >
      <p class="pr-change__dialog-message" role="alert">{{ confirmDialog?.message }}</p>
      <template #footer>
        <BaseButton variant="secondary" block @click="answerConfirmDialog(false)">
          {{ COMMON_FIELD.BTNNOSTR }}
        </BaseButton>
        <BaseButton block @click="answerConfirmDialog(true)">
          {{ COMMON_FIELD.BTNYESSTR }}
        </BaseButton>
      </template>
    </BaseModal>

    <template #footer>
      <BaseButton
        size="small"
        :disabled="!btnChangeEnabled || loading"
        :loading="loading"
        @click="prChange"
        >교체</BaseButton
      >
      <BaseButton variant="tertiary" size="small" @click="finish">취소</BaseButton>
    </template>
  </BaseScreen>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { BaseButton, BaseInput, BaseModal, BaseRadioGroup, BaseScreen } from 'src/components/base';
import OkDialog from 'src/components/OkDialog.vue';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { computed, nextTick, watch } from 'vue';

import { type PrChangeFocusField, usePrChange } from '../composables/usePrChange';

const {
  editPumpId,
  editCurrentPr,
  editChangePr,
  editInDate,
  editOutPr,
  editUserId,
  editCurrentPrEnabled,
  editInDateEnabled,
  editOutPrEnabled,
  editUserIdEnabled,
  txtPumpName,
  txtProductNameMaster,
  txtVendorMaster,
  txtPrIdMaster,
  txtPrId,
  txtVendor,
  txtProductName,
  txtViscosity,
  txtExpDate,
  txtLotNo,
  btnChangeEnabled,
  b_Leak,
  loading,
  dialog,
  confirmDialog,
  focusRequest,
  closeOkDialog,
  answerConfirmDialog,
  getPumpStats,
  prChange,
  checkedRadioButton,
  onPumpIdEditorAction,
  onCurrentPrEditorAction,
  onChangePrEditorAction,
  onInDateEditorAction,
  onOutPrEditorAction,
  finish,
} = usePrChange();

const leakOptions = [
  { label: 'Y', value: 'Y' },
  { label: 'N', value: 'N' },
];
const leakValue = computed(() => (b_Leak.value ? 'Y' : 'N'));

const masterFields = computed(() => [
  { label: 'PUMP', value: txtPumpName.value },
  { label: '제품명', value: txtProductNameMaster.value },
  { label: '제조사', value: txtVendorMaster.value },
  { label: 'PR ID', value: txtPrIdMaster.value },
]);

const changeFieldPairs = computed(() => [
  [
    { label: 'PR ID', value: txtPrId.value },
    { label: '제조사', value: txtVendor.value },
  ],
  [
    { label: '제품명', value: txtProductName.value },
    { label: '점도', value: txtViscosity.value },
  ],
  [
    { label: '유효기간', value: txtExpDate.value },
    { label: 'LotNo', value: txtLotNo.value },
  ],
]);

const inputRefs: Partial<Record<PrChangeFocusField, InstanceType<typeof BaseInput>>> = {};

function setInputRef(field: PrChangeFocusField) {
  return (instance: unknown) => {
    if (instance) inputRefs[field] = instance as InstanceType<typeof BaseInput>;
  };
}

watch(focusRequest, async (request) => {
  if (!request) return;
  await nextTick();
  inputRefs[request.field]?.focus();
});

function onPumpIdInput(value: string | number | undefined): void {
  editPumpId.value = String(value ?? '').toUpperCase();
}

function onLeakChange(value: string | number): void {
  checkedRadioButton(value === 'Y' ? 'LEAK_Y' : 'LEAK_N');
}

function onDialogOpenChange(open: boolean): void {
  if (!open) closeOkDialog();
}
</script>

<style src="../styles/pr-change.css"></style>
