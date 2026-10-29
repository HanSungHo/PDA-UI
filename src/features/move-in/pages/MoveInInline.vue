<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { BaseButton, BaseScreen } from '~/components/base';
import BaseDropdownList from '~/components/base/dropdown-list/BaseDropdownList.vue';
import type { BaseRevoGridColumn, BaseRevoGridKey } from '~/components/base/index.ts';
import BaseInput from '~/components/base/input/BaseInput.vue';
import BaseModal from '~/components/base/modal/BaseModal.vue';
import BaseRevoGrid from '~/components/base/revo-grid/BaseRevoGrid.vue';
import MaskLocationDialog from '~/features/esheet/components/mask-location-dialog/MaskLocationDialog.vue';
import type { MachineSelectParams, MachineSelectResult } from '~/features/machine-select-dialog';
import MachineSelectDialog from '~/features/machine-select-dialog/components/MachineSelectDialog.vue';
import { useMainStore } from '~/features/main/stores/main.store';

import { useMoveInInline } from '../composables/useMoveInInline';
import type {
  IlStatus,
  InlineResult,
  InlineSetResponse,
  MaskLocationInfo,
} from '../types/move-in-inline.types';
const route = useRoute();
const mainStore = useMainStore();
const INLINE_ERROR_DIALOG_TITLE = '에  러';
const emit = defineEmits<{
  'inline-cancel': [];
  'inline-complete': [result: InlineResult];
}>();

const lotId = String(route.query.lotId ?? '');
const operation = String(route.query.operation ?? '');

const {
  info,
  rows,
  nest,
  nestOptions,
  realMaskTag,
  maskTagOptions,
  maskTag,
  isMaskTagChanged,
  currentProcess,
  identCodeList,
  hasCompletedRow,
  errorMessage,
  loadInfo,
  toggleRow,
  selectFullIl,
  fetchMaskLocation,
  submitInlineSet,
} = useMoveInInline(lotId, operation);

// Figma Table List widths at 360px; the last column stretches to fill the grid.
const columns: BaseRevoGridColumn[] = [
  { prop: 'processName', name: '공정명', size: 122 },
  { prop: 'isComplete', name: 'IL', size: 36 },
  { prop: 'localRecipe', name: 'Local Rcp', size: 93 },
  { prop: 'workedEqp', name: '장비', size: 60 },
];

const ROW_CLASS: Partial<Record<IlStatus, string>> = {
  Y: 'move-in-inline__row--selected',
  C: 'move-in-inline__row--complete',
};

const gridRows = computed(() =>
  rows.value.map((row) => ({ ...row, rowClass: ROW_CLASS[row.isComplete] ?? '' })),
);

// Kotlin: DrawerGestureListener.onSingleTapUp
function onRowSelect(rowKey: BaseRevoGridKey) {
  const index = rows.value.findIndex((row) => row.subOperation === rowKey);
  if (index >= 0) toggleRow(index);
}

/**
 * ==============================
 * Dialog states
 * ==============================
 */

/** Kotlin: OkDialog */
const messageModalOpen = ref(false);
const messageModal = ref({ title: INLINE_ERROR_DIALOG_TITLE, message: '' });

/** Kotlin: MaskLocationDialogActivity */
const maskLocationModalOpen = ref(false);
const maskLocation = ref<MaskLocationInfo | null>(null);

/** Kotlin: MachineSelectDialogActivity */
const machineSelectModalOpen = ref(false);
const machineSelectData = ref<InlineSetResponse | null>(null);

const machineSelectParams = computed<MachineSelectParams | null>(() => {
  const data = machineSelectData.value;
  if (!data) return null;

  return {
    identCodeList: identCodeList.value,
    isExposure: data.isExposure,
    eqpGroup: data.eqpGroup,
    expEqpGroup: data.expEqpGroup,
    operation,
    subOperation: data.subOperation,
    product: info.value.product,
    lotId,
    facility: mainStore.facility,
  };
});

onMounted(loadInfo);

watch(errorMessage, (message) => {
  if (message) {
    showMessage(message);
  }
});

function goBack() {
  emit('inline-cancel');
}
function showMessage(message: string, title = INLINE_ERROR_DIALOG_TITLE) {
  messageModal.value = { title, message };
  messageModalOpen.value = true;
}

function closeMessageModal() {
  messageModalOpen.value = false;
  messageModal.value.message = '';
  errorMessage.value = '';
}

async function onClickRealMaskTag() {
  const data = await fetchMaskLocation();

  if (!data) {
    return;
  }

  maskLocation.value = data;
  maskLocationModalOpen.value = true;
}

function closeMaskLocation() {
  maskLocationModalOpen.value = false;
  maskLocation.value = null;
}

async function onClickOk() {
  const data = await submitInlineSet();

  if (!data) {
    return;
  }

  machineSelectData.value = data;
  machineSelectModalOpen.value = true;
}

function closeMachineSelect() {
  machineSelectModalOpen.value = false;
  machineSelectData.value = null;
}

function onMachineSelected(result: MachineSelectResult) {
  if (!machineSelectData.value) {
    return;
  }

  emit('inline-complete', {
    eqpGroup: result.EQPGROUP,
    eqpId: result.EQPID,
    recipe: result.RECIPE,

    commentQty: machineSelectData.value.commentQty,
    nrwCmtCount: machineSelectData.value.nrwCommentQty,

    nest: nest.value,
    identCode: identCodeList.value,
    maskTag: maskTag.value,
  });
}
</script>
<template>
  <BaseScreen class="move-in-inline" title="INLINE 공정선택">
    <div class="ds-screen__card">
      <BaseInput label="LOT No." :model-value="lotId" readonly />
      <BaseInput label="JOB" :model-value="info.photoJobCode" readonly />
      <BaseInput label="현재공정" :model-value="currentProcess" readonly />
      <BaseInput
        label="MASK TAG"
        :model-value="maskTag"
        readonly
        :class="{ 'is-changed': isMaskTagChanged }"
      />

      <div class="ds-screen__card-row">
        <BaseInput label="Inline Rcp" :model-value="info.inlineRecipe" readonly />
        <BaseDropdownList v-model="nest" aria-label="Nest" :options="nestOptions" :block="false" />
      </div>

      <div class="ds-screen__card-row">
        <BaseInput label="제품명" :model-value="info.product" readonly />
        <BaseInput
          class="move-in-inline__quantity"
          label="수량"
          :model-value="info.quantity"
          readonly
        />
      </div>

      <div class="ds-screen__card-row">
        <BaseDropdownList
          v-model="realMaskTag"
          aria-label="실 MASKTAG"
          :options="maskTagOptions"
          block
        />
        <BaseButton
          label="실 MASKTAG"
          variant="secondary"
          size="small"
          @click="onClickRealMaskTag"
        />
      </div>
    </div>

    <div class="ds-screen__card move-in-inline__grid">
      <BaseRevoGrid
        :rows="gridRows"
        :columns="columns"
        row-key="subOperation"
        :resize="false"
        :filter="false"
        stretch
        accessible-label="INLINE 공정"
        @row-select="onRowSelect"
      />
    </div>

    <div class="ds-screen__card">
      <h2 class="ds-screen__card-title">Align St.</h2>

      <div class="ds-screen__card-row">
        <BaseInput :model-value="info.criticalStepper" aria-label="Align St. 1" readonly />
        <BaseInput :model-value="info.criticalStepper2" aria-label="Align St. 2" readonly />
        <BaseInput :model-value="info.criticalStepper3" aria-label="Align St. 3" readonly />
      </div>
    </div>

    <template #footer>
      <BaseButton label="확인" variant="primary" size="medium" @click="onClickOk" />

      <BaseButton
        label="Full IL"
        variant="secondary"
        size="medium"
        :disabled="hasCompletedRow"
        @click="selectFullIl"
      />

      <BaseButton label="취소" variant="tertiary" size="medium" @click="goBack" />
    </template>

    <BaseModal
      v-model:open="maskLocationModalOpen"
      class="move-in-inline-mask-modal"
      :footer="null"
      :closable="false"
      :mask-closable="false"
      :width="480"
    >
      <MaskLocationDialog
        v-if="maskLocation"
        :mask-tag="maskLocation.maskTag"
        :product-name="maskLocation.product"
        :giben="maskLocation.giben"
        :status="maskLocation.status"
        :is-use="maskLocation.isUse"
        :current-location="maskLocation.currentLoc"
        :sub-machine="maskLocation.subLocation3"
        :test-hour="maskLocation.afterInsp"
        :lot-id="lotId"
        @ok="closeMaskLocation"
        @close="closeMaskLocation"
      />
    </BaseModal>

    <MachineSelectDialog
      v-if="machineSelectModalOpen && machineSelectParams"
      :params="machineSelectParams"
      @confirm="onMachineSelected"
      @cancel="closeMachineSelect"
    />

    <BaseModal
      v-model:open="messageModalOpen"
      :title="messageModal.title"
      :closable="false"
      :mask-closable="false"
      :keyboard="false"
      :footer="null"
      :width="400"
    >
      <div class="message-modal">
        <div class="message-modal__content">{{ messageModal.message }}</div>
        <div class="message-modal__footer">
          <BaseButton label="확인" variant="primary" @click="closeMessageModal" />
        </div>
      </div>
    </BaseModal>
  </BaseScreen>
</template>
<style scoped src="../styles/move-in-inline.css"></style>
