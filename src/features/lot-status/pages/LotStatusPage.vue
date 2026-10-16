<template>
  <main class="lot-status-canvas">
    <BaseScreen class="lot-status-screen" title="LOT 상태">
      <section class="ds-screen__card lot-status-card" aria-label="LOT 조회">
        <div class="lot-status-row lot-status-row--center">
          <BaseInput
            id="lot-status-lot"
            class="lot-status-field lot-status-search-field"
            label="LOT No."
            :model-value="editLotNo"
            placeholder="Search"
            :disabled="loading"
            autocomplete="off"
            stack-label
            @update:model-value="updateLotNo(String($event ?? ''))"
            @keydown.enter.prevent="handleLotEnter"
          >
            <template #append>
              <QIcon name="sym_o_search" class="lot-status-search-icon" aria-hidden="true" />
            </template>
          </BaseInput>
          <BaseButton
            class="lot-status-action-button lot-status-search-button"
            variant="secondary"
            :loading="loading"
            @click="onSingleClick('search')"
            >조회</BaseButton
          >
        </div>
        <div class="lot-status-row">
          <BaseInput
            class="lot-status-field lot-status-field--readonly"
            label="JOB"
            :model-value="fields.txtJobResult"
            readonly
            stack-label
          />
          <BaseInput
            :class="[
              'lot-status-field',
              'lot-status-field--readonly',
              `lot-status-field--${statusKind}`,
            ]"
            label="상태"
            :model-value="fields.txtStatusResult"
            readonly
            stack-label
          />
        </div>
      </section>

      <section class="ds-screen__card lot-status-card" aria-label="제품 정보">
        <div v-for="(row, rowIndex) in PRODUCT_ROWS" :key="rowIndex" class="lot-status-row">
          <BaseInput
            v-for="field in row"
            :key="field.key"
            v-bind="readonlyFieldProps(field)"
            :model-value="fields[field.key]"
          />
        </div>
      </section>

      <section class="ds-screen__card lot-status-card" aria-label="HOLD 정보">
        <div class="lot-status-row lot-status-row--center">
          <BaseInput
            class="lot-status-field lot-status-field--readonly"
            label="HOLD"
            :model-value="fields.txtHold"
            readonly
            stack-label
          />
          <BaseButton
            class="lot-status-action-button lot-status-hold-button"
            variant="secondary"
            @click="onSingleClick('hold')"
            >HOLD CD</BaseButton
          >
          <BaseInput v-bind="readonlyFieldProps(HOLD_CD_FIELD)" :model-value="fields.txtHoldCd" />
        </div>
      </section>

      <section class="ds-screen__card lot-status-card" aria-label="상세 정보">
        <div v-for="(row, rowIndex) in DETAIL_ROWS" :key="rowIndex" class="lot-status-row">
          <BaseInput
            v-for="field in row"
            :key="field.key"
            v-bind="readonlyFieldProps(field)"
            :model-value="fields[field.key]"
          />
        </div>
      </section>
      <template #footer>
        <BaseButton
          class="lot-status-footer-button lot-status-wafer"
          size="large"
          :disabled="!hasResult"
          @click="onSingleClick('wafer')"
          >WAFER</BaseButton
        >
        <BaseButton
          class="lot-status-footer-button lot-status-close"
          size="large"
          variant="tertiary"
          @click="onSingleClick('close')"
          >닫기</BaseButton
        >
      </template>
    </BaseScreen>
  </main>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { BaseButton, BaseInput, BaseScreen } from 'src/components/base';
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';

import { useLotStatus } from '../composables/useLotStatus';

type LotStatusFieldKey = keyof ReturnType<typeof useLotStatus>['fields'];

/** A read-only field; `label` is omitted for value-only cells that sit beside a labelled one. */
interface ReadonlyField {
  key: LotStatusFieldKey;
  label?: string;
  ariaLabel?: string;
}

const PRODUCT_ROWS: ReadonlyField[][] = [
  [{ key: 'txtProductName', label: '제품명' }],
  [{ key: 'txtCurrentOperation', label: '현재공정' }],
  [{ key: 'tOperation', label: '다음공정' }],
  [
    { key: 'txtRework', label: 'REWORK' },
    { key: 'txtReworkCount', ariaLabel: 'REWORK 횟수' },
  ],
  [{ key: 'txtRwCd', label: 'RW CD' }],
];

const HOLD_CD_FIELD: ReadonlyField = { key: 'txtHoldCd', ariaLabel: 'HOLD CD' };

const DETAIL_ROWS: ReadonlyField[][] = [
  [
    { key: 'txtArea', label: 'AREA' },
    { key: 'txtQuantity', label: '수량' },
  ],
  [
    { key: 'txtDueData', label: 'DUE DATA' },
    { key: 'txtBay', label: 'BAY' },
  ],
  [
    { key: 'txtOwner', label: 'OWNER' },
    { key: 'txtFacility', label: 'FAB' },
  ],
  [
    { key: 'txtLotKinds', label: 'LOT 종류' },
    { key: 'txtMachine', label: '장비' },
  ],
  [{ key: 'txtStk', label: 'STOCKER' }],
];

function readonlyFieldProps({ label, ariaLabel }: ReadonlyField) {
  return {
    class: [
      'lot-status-field',
      'lot-status-field--readonly',
      { 'lot-status-field--value-only': !label },
    ],
    label,
    ariaLabel,
    readonly: true,
    stackLabel: Boolean(label),
  };
}

const route = useRoute();
const routeLot = route.query.LOTID;
const {
  editLotNo,
  fields,
  loading,
  hasResult,
  statusKind,
  updateLotNo,
  searchData,
  handleLotEnter,
  onSingleClick,
} = useLotStatus();

onMounted(() => {
  if (typeof routeLot !== 'string' || !routeLot) return;
  updateLotNo(routeLot);
  void searchData(routeLot);
});
</script>

<style scoped src="../styles/lot-status.css"></style>
