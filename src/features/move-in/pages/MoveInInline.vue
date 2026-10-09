<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { BaseButton } from '~/components/base';
import BaseDropdownList from '~/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInput from '~/components/base/input/BaseInput.vue';
import BaseModal from '~/components/base/modal/BaseModal.vue';
import MaskLocationDialog from '~/features/esheet/components/mask-location-dialog/MaskLocationDialog.vue';
import type { MachineSelectParams, MachineSelectResult } from '~/features/machine-select-dialog';
import MachineSelectDialog from '~/features/machine-select-dialog/components/MachineSelectDialog.vue';
import { useMainStore } from '~/features/main/stores/main.store';

import { useMoveInInline } from '../composables/useMoveInInline';
import type {
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
  <div class="move-in-inline-legacy">
    <div class="header">
      <BaseButton
        class="move_in_inline_back"
        variant="link"
        size="xs"
        icon-only
        aria-label="Back"
        @click="goBack"
      >
        <q-icon name="sym_o_arrow_back" aria-hidden="true" />
      </BaseButton>

      <span class="title">INLINE 공정선택</span>
    </div>

    <div class="container">
      <div class="card-product-info">
        <div class="form-row">
          <BaseInput label="LOT No." :model-value="lotId" stack-label readonly />

          <BaseInput label="JOB" :model-value="info.photoJobCode" stack-label readonly />
        </div>

        <BaseInput label="현재공정" :model-value="currentProcess" stack-label readonly />

        <BaseInput
          label="MASK TAG"
          :model-value="maskTag"
          stack-label
          readonly
          :class="{ 'is-changed': isMaskTagChanged }"
        />

        <div class="form-row">
          <BaseInput label="Inline Rcp" :model-value="info.inlineRecipe" stack-label readonly />

          <BaseDropdownList v-model="nest" label="Nest" :options="nestOptions" />
        </div>

        <div class="form-row">
          <BaseInput label="제품명" :model-value="info.product" stack-label readonly />

          <BaseInput label="수량" :model-value="info.quantity" stack-label readonly />
        </div>

        <div class="form-row">
          <BaseButton label="실 MASKTAG" variant="secondary" @click="onClickRealMaskTag" />

          <BaseDropdownList
            v-model="realMaskTag"
            aria-label="실 MASKTAG"
            :options="maskTagOptions"
          />
        </div>
      </div>

      <div class="display-table">
        <table class="data-table">
          <thead>
            <tr>
              <th>공정명</th>
              <th>IL</th>
              <th>Local Rcp</th>
              <th>장비</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(row, index) in rows"
              :key="row.subOperation"
              :class="{
                'row--selected': row.isComplete === 'Y',
                'row--complete': row.isComplete === 'C',
              }"
              @click="toggleRow(index)"
            >
              <td>{{ row.processName }}</td>
              <td>{{ row.isComplete }}</td>
              <td>{{ row.localRecipe }}</td>
              <td>{{ row.workedEqp }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="align-status-area">
        <div class="align-label">
          <span> Align St.</span>
        </div>

        <BaseInput :model-value="info.criticalStepper" readonly />
        <BaseInput :model-value="info.criticalStepper2" readonly />
        <BaseInput :model-value="info.criticalStepper3" readonly />
      </div>

      <div class="bottom-section">
        <BaseButton label="확인" variant="primary" @click="onClickOk" />

        <BaseButton
          label="Full IL"
          variant="secondary"
          :disabled="hasCompletedRow"
          @click="selectFullIl"
        />

        <BaseButton label="취소" variant="tertiary" @click="goBack" />
      </div>
    </div>

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
  </div>
</template>
<style scoped src="../styles/move-in-inline.css"></style>
