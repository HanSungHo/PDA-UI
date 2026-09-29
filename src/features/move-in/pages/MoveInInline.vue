<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { BaseButton } from '~/components/base';
import BaseDropdownList from '~/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInputField from '~/components/base/input-field/BaseInputField.vue';
import BaseModal from '~/components/base/modal/BaseModal.vue';
import { DeviceInfo } from '~/constants/deviceinfo';
import MaskLocationDialog from '~/features/esheet/components/mask-location-dialog/MaskLocationDialog.vue';
import type { MachineSelectParams, MachineSelectResult } from '~/features/machine-select-dialog';
import MachineSelectDialog from '~/features/machine-select-dialog/components/MachineSelectDialog.vue';

import { useMoveInInline } from '../composables/useMoveInInline';
import { useMoveInInlineStore } from '../stores/move-in-inline.store';
import type { InlineSetResponse, MaskLocationInfo } from '../types/move-in-inline.types';
const route = useRoute();
const router = useRouter();
const store = useMoveInInlineStore();

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
const messageModal = ref({ title: 'Error', message: '' });

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
    facility: DeviceInfo.FACILITY,
  };
});

onMounted(loadInfo);

watch(errorMessage, (message) => {
  if (message) {
    showMessage(message);
  }
});

function goBack() {
  router.back();
}
function showMessage(message: string, title = 'Error') {
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

  store.setResult({
    eqpGroup: result.EQPGROUP,
    eqpId: result.EQPID,
    recipe: result.RECIPE,

    commentQty: machineSelectData.value.commentQty,
    nrwCmtCount: machineSelectData.value.nrwCommentQty,

    nest: nest.value,
    identCode: identCodeList.value,
    maskTag: maskTag.value,
  });

  router.back();
}
</script>
<template>
  <div class="move-in-inline-legacy">
    <div class="header">
      <button class="back-btn" aria-label="Back" type="button" @click="goBack">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      </button>

      <span class="title">INLINE 공정 선택</span>
    </div>

    <div class="container">
      <div class="card-product-info">
        <div class="form-row">
          <div class="form-group">
            <span class="label"> LOT No. </span>

            <BaseInputField :model-value="lotId" :disabled="true" />
          </div>

          <div class="form-group">
            <span class="label"> JOB </span>

            <BaseInputField :model-value="info.photoJobCode" :disabled="true" />
          </div>
        </div>

        <div class="form-group">
          <span class="label"> 현재 공정 </span>
          <BaseInputField :model-value="currentProcess" :disabled="true" />
        </div>

        <div class="form-group">
          <span class="label"> MASK TAG </span>
          <BaseInputField
            :model-value="maskTag"
            :disabled="true"
            :class="{ 'is-changed': isMaskTagChanged }"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <span class="label"> 진행 RCP </span>

            <BaseInputField :model-value="info.inlineRecipe" :disabled="true" />
          </div>

          <div class="form-group">
            <div class="select-wrapper">
              <BaseDropdownList v-model="nest" :options="nestOptions" />
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <span class="label"> 제품명 </span>

            <BaseInputField :model-value="info.product" :disabled="true" />
          </div>

          <div class="form-group">
            <span class="label"> 수량 </span>

            <BaseInputField :model-value="info.quantity" :disabled="true" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <BaseButton label="실제 MASK TAG" variant="secondary" @click="onClickRealMaskTag" />
          </div>
          <div class="form-group">
            <div class="select-wrapper">
              <BaseDropdownList v-model="realMaskTag" :options="maskTagOptions" />
            </div>
          </div>
        </div>
      </div>
      <div class="display-table">
        <table class="data-table">
          <thead>
            <tr>
              <th>공정명</th>
              <th>IL</th>
              <th>Local RCP</th>
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
          <span> Align Status</span>
        </div>

        <BaseInputField :model-value="info.criticalStepper" :disabled="true" />
        <BaseInputField :model-value="info.criticalStepper2" :disabled="true" />
        <BaseInputField :model-value="info.criticalStepper3" :disabled="true" />
      </div>
      <div class="bottom-section">
        <BaseButton label="확인" variant="primary" @click="onClickOk" />

        <BaseButton
          label="FULL IL"
          variant="secondary"
          :disabled="hasCompletedRow"
          @click="selectFullIl"
        />

        <BaseButton label="취소" variant="tertiary" @click="goBack" />
      </div>
    </div>
    <BaseModal
      v-model:open="maskLocationModalOpen"
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
