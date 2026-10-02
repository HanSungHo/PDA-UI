<template>
  <main class="een-add-canvas">
    <section class="een-add-screen" aria-labelledby="een-add-title">
      <header class="een-add-header">
        <BaseButton
          class="een-add-back"
          variant="link"
          size="xs"
          icon-only
          aria-label="뒤로 가기"
          @click="cancel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M19 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H19v-2Z"
              fill="currentColor"
            />
          </svg>
        </BaseButton>
        <h1 id="een-add-title">EEN 정보 입력</h1>
      </header>

      <form class="een-add-form" @submit.prevent="submit">
        <section class="een-add-content">
          <div class="een-add-card">
            <div class="een-add-field">
              <BaseInput :model-value="context.lotId" label="LOT ID" readonly />
            </div>
            <div class="een-add-field">
              <BaseInput :model-value="context.facility" label="FACILITY" readonly />
            </div>
            <div class="een-add-field">
              <BaseInput :model-value="context.product" label="제품" readonly />
            </div>
            <div class="een-add-field">
              <BaseDropdownList
                v-model:model-value="selectedRoute"
                label="ROUTE"
                :options="routeOptions"
                :loading="routeLoading"
                @change="loadOperations"
              />
            </div>
            <div class="een-add-field">
              <BaseDropdownList
                v-model:model-value="selectedOperation"
                label="공정"
                :options="operationOptions"
                :loading="operationLoading"
              />
            </div>
            <div class="een-add-field">
              <BaseInput :model-value="processDescription" label="공정 DESC" readonly />
            </div>
            <div class="een-add-field">
              <BaseDropdownList
                v-model:model-value="selectedActionPoint"
                label="ACTION POINT"
                :options="actionPointOptions"
              />
            </div>
            <div class="een-add-field">
              <label class="een-add-label" for="een-add-tag-id">TAG ID</label>
              <div class="een-add-tag-row">
                <BaseDropdownList
                  id="een-add-tag-id"
                  v-model:model-value="selectedTagId"
                  aria-label="TAG ID"
                  :options="tagOptions"
                  @change="onTagChange"
                />
                <BaseButton
                  class="een-add-barcode"
                  variant="secondary"
                  :disabled="loading"
                  @click="addWaferNumber"
                >
                  W/F NO 입력
                </BaseButton>
              </div>
            </div>
            <div class="een-add-field een-add-comment-field">
              <BaseInput
                v-model:model-value="comment"
                mode="textarea"
                aria-label="상세 정보"
                :disabled="loading"
                :rows="6"
                resize="none"
              />
            </div>
          </div>
        </section>

        <footer class="een-add-bottom">
          <div class="een-add-actions">
            <BaseButton class="een-add-confirm" html-type="submit" :loading="loading">
              확인
            </BaseButton>
            <BaseButton
              class="een-add-cancel"
              variant="tertiary"
              :disabled="loading"
              @click="cancel"
            >
              취소
            </BaseButton>
          </div>
        </footer>
      </form>
    </section>

    <BaseModal
      class="action-dialog"
      :open="dialogMode !== ''"
      :width="340"
      :title="dialogTitle"
      :closable="false"
      :overlay-closable="false"
      @update:open="cancelDialog"
    >
      <p class="action-dialog-message" role="alert">{{ dialogMessage }}</p>
      <template #footer>
        <div class="action-dialog-actions">
          <BaseButton
            v-if="dialogMode === 'confirm'"
            class="action-dialog-cancel"
            variant="secondary"
            @click="cancelDialog"
          >
            취소
          </BaseButton>
          <BaseButton
            v-if="dialogMode === 'confirm'"
            class="action-dialog-confirm"
            @click="confirmSubmit"
            >확인</BaseButton
          >
          <BaseButton v-else class="action-dialog-confirm" @click="closeDialog">확인</BaseButton>
        </div>
      </template>
    </BaseModal>
  </main>
</template>

<script setup lang="ts">
import { BaseButton, BaseDropdownList, BaseInput, BaseModal } from 'src/components/base';
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

const actionPointOptions = ACTION_POINTS.map((value) => ({ label: value, value }));
const processDescription = computed(
  () => selectedOperationOption.value?.description || context.value.processStep,
);
</script>

<style scoped src="../styles/een-add.css"></style>
<style src="../../../components/base/modal/action-dialog.css"></style>
