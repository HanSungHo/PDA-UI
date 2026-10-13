<template>
  <main class="lot-status-canvas">
    <BaseScreen class="lot-status-screen" title="LOT 상태">
      <section class="ds-screen__card lot-status-card" aria-label="LOT 조회">
        <div class="lot-status-row lot-status-search-row">
          <div class="lot-status-search-control">
            <BaseInput
              id="lot-status-lot"
              class="lot-status-field lot-status-search-field"
              label="LOT No."
              :model-value="editLotNo"
              placeholder="Search"
              :disabled="loading"
              autocomplete="off"
              @update:model-value="updateLotNo(String($event ?? ''))"
              @keydown.enter.prevent="handleLotEnter"
            />
            <SearchOutlined class="lot-status-search-icon" aria-hidden="true" />
          </div>
          <BaseButton
            class="lot-status-search-button"
            variant="secondary"
            :loading="loading"
            @click="onSingleClick('search')"
            >조회</BaseButton
          >
        </div>
        <div class="lot-status-row">
          <BaseInput
            class="lot-status-field"
            label="JOB"
            :model-value="fields.txtJobResult"
            readonly
          />
          <BaseInput
            :class="['lot-status-field', `lot-status-field--${statusKind}`]"
            label="상태"
            :model-value="fields.txtStatusResult"
            readonly
          />
        </div>
      </section>

      <section class="ds-screen__card lot-status-card" aria-label="제품 정보">
        <BaseInput
          class="lot-status-field"
          label="제품명"
          :model-value="fields.txtProductName"
          readonly
        />
        <BaseInput
          class="lot-status-field"
          label="현재공정"
          :model-value="fields.txtCurrentOperation"
          readonly
        />
        <BaseInput
          class="lot-status-field"
          label="다음공정"
          :model-value="fields.tOperation"
          readonly
        />
        <div class="lot-status-row">
          <BaseInput
            class="lot-status-field"
            label="REWORK"
            :model-value="fields.txtRework"
            readonly
          />
          <BaseInput
            class="lot-status-field"
            label=""
            :model-value="fields.txtReworkCount"
            readonly
          />
        </div>
        <BaseInput class="lot-status-field" label="RW CD" :model-value="fields.txtRwCd" readonly />
      </section>

      <section class="ds-screen__card lot-status-card" aria-label="HOLD 정보">
        <div class="lot-status-row lot-status-hold-row">
          <BaseInput class="lot-status-field" label="HOLD" :model-value="fields.txtHold" readonly />
          <BaseButton
            class="lot-status-hold-button"
            variant="secondary"
            @click="onSingleClick('hold')"
            >Hold CD</BaseButton
          >
          <BaseInput class="lot-status-field" label="" :model-value="fields.txtHoldCd" readonly />
        </div>
      </section>

      <section class="ds-screen__card lot-status-card" aria-label="상세 정보">
        <div class="lot-status-row">
          <BaseInput class="lot-status-field" label="AREA" :model-value="fields.txtArea" readonly />
          <BaseInput
            class="lot-status-field"
            label="수량"
            :model-value="fields.txtQuantity"
            readonly
          />
        </div>
        <div class="lot-status-row">
          <BaseInput
            class="lot-status-field"
            label="DUE DATA"
            :model-value="fields.txtDueData"
            readonly
          />
          <BaseInput class="lot-status-field" label="BAY" :model-value="fields.txtBay" readonly />
        </div>
        <div class="lot-status-row">
          <BaseInput
            class="lot-status-field"
            label="OWNER"
            :model-value="fields.txtOwner"
            readonly
          />
          <BaseInput
            class="lot-status-field"
            label="FAB"
            :model-value="fields.txtFacility"
            readonly
          />
        </div>
        <div class="lot-status-row">
          <BaseInput
            class="lot-status-field"
            label="LOT 종류"
            :model-value="fields.txtLotKinds"
            readonly
          />
          <BaseInput
            class="lot-status-field"
            label="장비"
            :model-value="fields.txtMachine"
            readonly
          />
        </div>
        <BaseInput class="lot-status-field" label="STOCKER" :model-value="fields.txtStk" readonly />
      </section>
      <template #footer>
        <BaseButton
          class="lot-status-footer-button lot-status-wafer"
          :disabled="!hasResult"
          @click="onSingleClick('wafer')"
          >WAFER</BaseButton
        >
        <BaseButton
          class="lot-status-footer-button lot-status-close"
          variant="tertiary"
          @click="onSingleClick('close')"
          >닫기</BaseButton
        >
      </template>
    </BaseScreen>
  </main>
</template>

<script setup lang="ts">
import { SearchOutlined } from '@ant-design/icons-vue';
import { BaseButton, BaseInput, BaseScreen } from 'src/components/base';
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';

import { useLotStatus } from '../composables/useLotStatus';

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
