<template>
  <div class="een-add-canvas">
    <main class="een-add-screen" aria-labelledby="een-add-title">
      <header class="een-add-header">
        <h1 id="een-add-title" class="een-add-title">EEN 정보 입력</h1>
      </header>

      <form class="een-add-form" @submit.prevent="submit">
        <div class="een-add-content">
          <section class="een-add-card" aria-label="EEN 정보">
            <BaseInput
              class="een-add-field"
              :model-value="context.lotId"
              label="LOT ID"
              stack-label
              readonly
            />
            <BaseInput
              class="een-add-field"
              :model-value="context.facility"
              label="FACILITY"
              stack-label
              readonly
            />
            <BaseInput
              class="een-add-field"
              :model-value="context.product"
              label="제품"
              stack-label
              readonly
            />
            <BaseSelect
              v-model="selectedRoute"
              class="een-add-field een-add-select"
              v-bind="selectProps"
              label="ROUTE"
              :options="routeOptions"
              :loading="routeLoading"
              @change="loadOperations"
            >
              <template #indicator>
                <QIcon name="sym_o_arrow_drop_down" class="een-add-select-icon" />
              </template>
            </BaseSelect>
            <BaseSelect
              v-model="selectedOperation"
              class="een-add-field een-add-select"
              v-bind="selectProps"
              label="공정"
              :options="operationOptions"
              :loading="operationLoading"
            >
              <template #indicator>
                <QIcon name="sym_o_arrow_drop_down" class="een-add-select-icon" />
              </template>
            </BaseSelect>
            <BaseInput
              class="een-add-field"
              :model-value="processDescription"
              label="공정 DESC"
              stack-label
              readonly
            />
            <BaseSelect
              v-model="selectedActionPoint"
              class="een-add-field een-add-select"
              v-bind="selectProps"
              label="ACTION POINT"
              :options="actionPointOptions"
            >
              <template #indicator>
                <QIcon name="sym_o_arrow_drop_down" class="een-add-select-icon" />
              </template>
            </BaseSelect>
            <div class="een-add-tag-row">
              <BaseSelect
                class="een-add-field een-add-select"
                v-bind="selectProps"
                label="TAG ID"
                v-model="selectedTagId"
                :options="tagOptions"
                @change="onTagChange"
              >
                <template #indicator>
                  <QIcon name="sym_o_arrow_drop_down" class="een-add-select-icon" />
                </template>
              </BaseSelect>
              <BaseButton
                class="een-add-wafer"
                variant="secondary"
                :disabled="loading"
                @click="addWaferNumber"
              >
                W/F NO 입력
              </BaseButton>
            </div>
            <BaseInput
              v-model="comment"
              class="een-add-comment"
              mode="textarea"
              aria-label="추가 내용"
              :disabled="loading"
              :rows="COMMENT_ROWS"
              resize="none"
            />
          </section>
        </div>

        <footer class="een-add-footer">
          <BaseButton
            class="een-add-action een-add-action--confirm"
            html-type="submit"
            size="large"
            :loading="loading"
          >
            확인
          </BaseButton>
          <BaseButton
            class="een-add-action een-add-action--cancel"
            variant="tertiary"
            size="large"
            :disabled="loading"
            @click="cancel"
          >
            취소
          </BaseButton>
        </footer>
      </form>
    </main>

    <BaseModal
      :open="dialogMode !== ''"
      :title="dialogTitle"
      :overlay-closable="false"
      @cancel="cancelDialog"
    >
      <p class="een-add-dialog-message" role="alert">{{ dialogMessage }}</p>
      <template #footer>
        <template v-if="dialogMode === 'confirm'">
          <BaseButton class="een-add-dialog-action" variant="secondary" @click="cancelDialog">
            {{ COMMON_FIELD.BTNNOSTR }}
          </BaseButton>
          <BaseButton class="een-add-dialog-action" @click="confirmSubmit">
            {{ COMMON_FIELD.BTNYESSTR }}
          </BaseButton>
        </template>
        <BaseButton v-else class="een-add-dialog-action" @click="closeDialog">
          {{ COMMON_FIELD.BTNOKSTR }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { BaseButton } from 'src/components/base/button';
import BaseSelect from 'src/components/base/dropdown-list/BaseDropdownList.vue';
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
  size: 'medium',
} as const;

const actionPointOptions = ACTION_POINTS.map((value) => ({ label: value, value }));
const processDescription = computed(
  () => selectedOperationOption.value?.description || context.value.processStep,
);
</script>

<style scoped src="../styles/een-add.css"></style>
