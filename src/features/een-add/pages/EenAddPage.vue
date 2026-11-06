<template>
  <form class="een-add-form" @submit.prevent="submit">
    <BaseScreen title="EEN 정보 입력">
      <section class="ds-screen__card" aria-label="EEN 정보">
        <BaseInput size="small" :model-value="context.lotId" label="LOT ID" readonly />
        <BaseInput size="small" :model-value="context.facility" label="FACILITY" readonly />
        <BaseInput size="small" :model-value="context.product" label="제품" readonly />
        <BaseDropdownList
          v-model="selectedRoute"
          v-bind="selectProps"
          label="ROUTE"
          :options="routeOptions"
          :loading="routeLoading"
          @change="loadOperations"
        >
          <template #indicator><QIcon name="sym_o_arrow_drop_down" /></template>
        </BaseDropdownList>
        <BaseDropdownList
          v-model="selectedOperation"
          v-bind="selectProps"
          label="공정"
          :options="operationOptions"
          :loading="operationLoading"
        >
          <template #indicator><QIcon name="sym_o_arrow_drop_down" /></template>
        </BaseDropdownList>
        <BaseInput size="small" :model-value="processDescription" label="공정 DESC" readonly />
        <BaseDropdownList
          v-model="selectedActionPoint"
          v-bind="selectProps"
          label="ACTION POINT"
          :options="actionPointOptions"
        >
          <template #indicator><QIcon name="sym_o_arrow_drop_down" /></template>
        </BaseDropdownList>
        <div class="ds-screen__card-row een-add-tag-row">
          <BaseDropdownList
            v-model="selectedTagId"
            v-bind="selectProps"
            label="TAG ID"
            :options="tagOptions"
            @change="onTagChange"
          >
            <template #indicator><QIcon name="sym_o_arrow_drop_down" /></template>
          </BaseDropdownList>
          <BaseButton variant="secondary" :disabled="loading" @click="addWaferNumber">
            W/F NO 입력
          </BaseButton>
        </div>
        <BaseInput
          v-model="comment"
          size="small"
          mode="textarea"
          aria-label="추가 내용"
          :disabled="loading"
          :rows="COMMENT_ROWS"
          resize="none"
        />
      </section>

      <template #footer>
        <BaseButton html-type="submit" size="medium" :loading="loading">확인</BaseButton>
        <BaseButton variant="tertiary" size="medium" :disabled="loading" @click="cancel">
          취소
        </BaseButton>
      </template>
    </BaseScreen>
  </form>

  <BaseModal
    :open="dialogMode !== ''"
    :title="dialogTitle"
    :overlay-closable="false"
    @cancel="cancelDialog"
  >
    <p class="een-add-dialog-message" role="alert">{{ dialogMessage }}</p>
    <template #footer>
      <template v-if="dialogMode === 'confirm'">
        <BaseButton variant="secondary" @click="cancelDialog">
          {{ COMMON_FIELD.BTNNOSTR }}
        </BaseButton>
        <BaseButton @click="confirmSubmit">{{ COMMON_FIELD.BTNYESSTR }}</BaseButton>
      </template>
      <BaseButton v-else @click="closeDialog">{{ COMMON_FIELD.BTNOKSTR }}</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { BaseButton, BaseScreen } from 'src/components/base';
import BaseDropdownList from 'src/components/base/dropdown-list/BaseDropdownList.vue';
import { BaseInput } from 'src/components/base/input';
import { BaseModal } from 'src/components/base/modal';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { computed } from 'vue';

import { useEenAdd } from '../composables/use-een-add';

const {
  ACTION_POINTS,
  context,
  routeOptions,
  operationOptions,
  tagOptions,
  selectedRoute,
  selectedOperation,
  selectedActionPoint,
  selectedTagId,
  selectedOperationOption,
  comment,
  loading,
  routeLoading,
  operationLoading,
  dialogTitle,
  dialogMessage,
  dialogMode,
  loadOperations,
  addWaferNumber,
  onTagChange,
  submit,
  confirmSubmit,
  cancel,
  closeDialog,
  cancelDialog,
} = useEenAdd();

// Comment box height is driven by rows × line-height instead of a fixed pixel height.
const COMMENT_ROWS = 7;
const selectProps = {
  clearable: false,
  block: true,
  size: 'small',
} as const;

const actionPointOptions = ACTION_POINTS.map((value) => ({ label: value, value }));
const processDescription = computed(
  () => selectedOperationOption.value?.description || context.value.processStep,
);
</script>

<style scoped src="../styles/een-add.css"></style>
