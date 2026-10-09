<template>
  <main class="een-modify-page">
    <section class="een-modify-shell" aria-labelledby="een-modify-title">
      <header class="een-modify-header">
        <BaseButton
          class="een-modify-back"
          variant="link"
          size="xs"
          icon-only
          aria-label="뒤로가기"
          @click="closePage"
        >
          <QIcon name="sym_o_arrow_back" aria-hidden="true" />
        </BaseButton>
        <h1 id="een-modify-title">EEN 수정</h1>
      </header>

      <div class="een-modify-content">
        <section class="een-modify-card" aria-label="EEN 수정 정보">
          <div class="een-modify-field">
            <label class="een-modify-label">LOT ID</label>
            <output class="een-modify-value" data-field="lotId">{{ context.lotId }}</output>
          </div>
          <div class="een-modify-field">
            <label class="een-modify-label">FACILITY</label>
            <output class="een-modify-value" data-field="facility">{{ context.facility }}</output>
          </div>
          <div class="een-modify-field">
            <label class="een-modify-label">제품</label>
            <output class="een-modify-value" data-field="product">{{ context.product }}</output>
          </div>
          <div class="een-modify-field">
            <label class="een-modify-label">ROUTE</label>
            <output class="een-modify-value een-modify-value--arrow" data-field="route">
              {{ context.route }}
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" />
              </svg>
            </output>
          </div>
          <div class="een-modify-field">
            <label class="een-modify-label">공정</label>
            <output class="een-modify-value een-modify-value--arrow" data-field="operation">
              <span>{{ context.operation }}</span>
              <span data-field="podesc">{{ selectedItem?.poDesc ?? '' }}</span>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" />
              </svg>
            </output>
          </div>
          <div class="een-modify-field">
            <label class="een-modify-label">EEN ID</label>
            <output class="een-modify-value" data-field="eenId">{{
              selectedItem?.eenId ?? ''
            }}</output>
          </div>
          <div class="een-modify-field">
            <label class="een-modify-label" for="een-modify-action-point">ACTION POINT</label>
            <BaseDropdownList
              v-model:model-value="form.actionPoint"
              id="een-modify-action-point"
              class="een-modify-select-wrap"
              aria-label="ACTION POINT"
              :options="actionPointOptions"
            />
          </div>
          <div class="een-modify-field">
            <label class="een-modify-label" for="een-modify-tag-id">TAG ID</label>
            <BaseDropdownList
              v-model:model-value="form.tagId"
              id="een-modify-tag-id"
              class="een-modify-select-wrap"
              aria-label="TAG ID"
              :options="tagDropdownOptions"
              @change="updateCommentFromTag"
            />
          </div>

          <BaseInput
            v-model="form.tagComment"
            class="een-modify-textarea"
            mode="textarea"
            resize="vertical"
            aria-label="Tag Comment"
            :rows="3"
          />
          <BaseInput
            v-model="form.modifyReason"
            class="een-modify-textarea"
            mode="textarea"
            resize="vertical"
            aria-label="변경 사유"
            placeholder="변경 사유"
            :rows="3"
          />
        </section>
      </div>

      <footer class="een-modify-footer" aria-label="EEN 수정 작업">
        <BaseButton
          class="een-modify-action een-modify-action--confirm"
          variant="primary"
          :disabled="!selectedItem || isSubmitting"
          @click="requestUpdate"
        >
          확인
        </BaseButton>
        <BaseButton
          class="een-modify-action een-modify-action--cancel"
          variant="tertiary"
          @click="closePage"
        >
          취소
        </BaseButton>
      </footer>
    </section>

    <BaseModal
      :open="dialog.open"
      :title="dialog.title"
      :closable="false"
      :overlay-closable="false"
      @update:open="handleDialogOpenChange"
    >
      <p class="een-modify-dialog__message">{{ dialog.message }}</p>
      <template #footer>
        <BaseButton
          v-if="dialog.kind === 'confirm'"
          class="een-modify-dialog__cancel"
          variant="secondary"
          @click="closeDialog"
        >
          아니오
        </BaseButton>
        <BaseButton class="een-modify-dialog__confirm" variant="primary" @click="acceptDialog">
          {{ dialog.kind === 'confirm' ? '예' : '확인' }}
        </BaseButton>
      </template>
    </BaseModal>
  </main>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { BaseButton } from '../../../components/base/button';
import { BaseDropdownList } from '../../../components/base/dropdown-list';
import { BaseInput } from '../../../components/base/input';
import { BaseModal } from '../../../components/base/modal';
import { useMainStore } from '../../main/stores/main.store';
import { defaultEENSettingContext } from '../mocks/een-setting.mock';
import { fetchEENModifyData, updateEENModifyItem } from '../services/een-setting.service';
import { useEENSettingResultStore } from '../stores/een-setting-result.store';
import type { EENSettingContext, EENSettingItem, EENTagOption } from '../types/een-setting.types';

type DialogKind = 'alert' | 'confirm' | 'error' | 'success';
interface EENModifyForm {
  actionPoint: EENSettingItem['actionPoint'];
  tagId: string;
  tagComment: string;
  modifyReason: string;
}

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();
const resultStore = useEENSettingResultStore();
const context = computed<EENSettingContext>(() => ({
  lotId: queryValue('lotId') || defaultEENSettingContext.lotId,
  factoryName: queryValue('factoryName') || defaultEENSettingContext.factoryName,
  facility:
    queryValue('facility') || queryValue('factoryName') || defaultEENSettingContext.facility,
  product: queryValue('product') || defaultEENSettingContext.product,
  route: queryValue('route') || defaultEENSettingContext.route,
  operation: queryValue('operation') || defaultEENSettingContext.operation,
  processStep: queryValue('processStep') || defaultEENSettingContext.processStep,
}));
const selectedItem = ref<EENSettingItem>();
const tagOptions = ref<EENTagOption[]>([]);
const isLoading = ref(true);
const isSubmitting = ref(false);
const form = reactive<EENModifyForm>({
  actionPoint: '',
  tagId: '',
  tagComment: '',
  modifyReason: '',
});
const actionPointOptions = [
  { label: 'Null', value: '' },
  { label: 'MOVEIN', value: 'MOVEIN' },
  { label: 'MOVEOUT', value: 'MOVEOUT' },
];
const tagDropdownOptions = computed(() => [
  { label: 'Null', value: '' },
  ...tagOptions.value.map(({ tagId }) => ({ label: tagId, value: tagId })),
]);
const dialog = reactive<{ open: boolean; title: string; message: string; kind: DialogKind }>({
  open: false,
  title: '',
  message: '',
  kind: 'alert',
});

onMounted(() => {
  void loadModifyData();
});

function queryValue(key: string): string {
  const value = route.query[key];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function closePage(): void {
  router.back();
}

async function loadModifyData(): Promise<void> {
  isLoading.value = true;
  const result = await fetchEENModifyData(queryValue('itemId'));
  isLoading.value = false;

  if (!result.success) {
    showDialog('error', COMMON_FIELD.TXTDIALOGTITLE_ERROR, result.message);
    return;
  }

  selectedItem.value = result.data.item;
  tagOptions.value = result.data.tagOptions;
  Object.assign(form, {
    actionPoint: result.data.item.actionPoint,
    tagId: result.data.item.tagId,
    tagComment: result.data.item.tagComment,
    modifyReason: result.data.item.modifyReason,
  });
}

function updateCommentFromTag(): void {
  const selectedTag = tagOptions.value.find(({ tagId }) => tagId === form.tagId);
  if (selectedTag) form.tagComment = selectedTag.tagComment;
}

function showDialog(kind: DialogKind, title: string, message: string): void {
  dialog.kind = kind;
  dialog.title = title;
  dialog.message = message;
  dialog.open = true;
}

function requestUpdate(): void {
  if (isLoading.value || !selectedItem.value || isSubmitting.value) return;
  if (!form.actionPoint) {
    showDialog('alert', 'Action Point 입력', 'Action Point를 입력하세요.');
    return;
  }
  if (form.tagComment === '') {
    showDialog('alert', 'Tag Comment 입력', 'Tag Comment를 입력하세요.');
    return;
  }

  showDialog('confirm', '확  인', '수정하시겠습니까?');
}

async function acceptDialog(): Promise<void> {
  if (dialog.kind === 'confirm') {
    if (!selectedItem.value || isSubmitting.value) return;
    if (!form.actionPoint) {
      showDialog('alert', 'Action Point 입력', 'Action Point를 입력하세요.');
      return;
    }

    isSubmitting.value = true;
    const result = await updateEENModifyItem({
      lotId: context.value.lotId,
      userId: mainStore.operatorId,
      facility: context.value.facility.trim(),
      product: context.value.product.trim(),
      operation: context.value.operation.trim(),
      actionPoint: form.actionPoint,
      eenId: selectedItem.value.eenId.trim(),
      processFlow: context.value.route.trim(),
      oldTagComment: selectedItem.value.tagComment,
      tagId: form.tagId,
      tagComment: form.tagComment,
      changeCause: form.modifyReason,
    });
    isSubmitting.value = false;

    if (!result.success) {
      showDialog('error', COMMON_FIELD.TXTDIALOGTITLE_ERROR, result.message);
      return;
    }

    resultStore.publishModifyResult({ lotId: context.value.lotId, item: result.data });
    showDialog('success', COMMON_FIELD.TXTDIALOGTITLE_OK, 'EEN Update가 완료 되었습니다.');
    return;
  }

  const isSuccess = dialog.kind === 'success';
  closeDialog();
  if (isSuccess) closePage();
}

function closeDialog(): void {
  dialog.open = false;
}

function handleDialogOpenChange(open: boolean): void {
  if (!open) closeDialog();
}
</script>

<style scoped>
.een-modify-page {
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  background: #d1d5dc;
  font-family: 'Noto Sans KR', sans-serif;
}

.een-modify-page *,
.een-modify-page *::before,
.een-modify-page *::after {
  box-sizing: border-box;
}

.een-modify-shell {
  display: flex;
  width: min(100%, 360px);
  min-height: 1032px;
  flex-direction: column;
  margin-inline: auto;
  color: #101828;
  background: linear-gradient(180deg, #1c493a 0%, #96b1a8 53.85%, #ecf8f1 100%);
}

.een-modify-header {
  display: flex;
  height: 60px;
  flex: 0 0 60px;
  align-items: center;
  gap: 16px;
  padding-inline: 16px;
  color: #f9fafb;
}

.een-modify-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
}

.een-modify-back {
  display: grid;
  width: 24px;
  height: 36px;
  flex: 0 0 24px;
  place-items: center;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
  font-size: 22px;
}

.een-modify-content {
  display: flex;
  height: 904px;
  flex: 0 0 904px;
  flex-direction: column;
  padding: 12px;
}

.een-modify-card {
  display: flex;
  width: 100%;
  height: 880px;
  flex: 0 0 880px;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #d1d5dc;
  border-radius: 8px;
  background: #f9fafb;
  box-shadow: 0 8px 24px rgb(13 20 31 / 6%);
  overflow-y: auto;
}

.een-modify-field {
  display: flex;
  width: 100%;
  height: 68px;
  flex: 0 0 68px;
  flex-direction: column;
  gap: 8px;
}

.een-modify-label {
  height: 20px;
  color: #030712;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.een-modify-value {
  display: flex;
  width: 100%;
  height: 40px;
  min-width: 0;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  padding: 8px 12px;
  border: 1px solid #d1d5dc;
  border-radius: 8px;
  background: #f3f4f6;
  color: #99a1af;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
}

.een-modify-value {
  text-overflow: ellipsis;
  white-space: nowrap;
}

.een-modify-value--arrow svg {
  flex: 0 0 16px;
  margin-left: auto;
  color: #cbd5e1;
}

.een-modify-select-wrap {
  position: relative;
  display: block;
  width: 100%;
  height: 40px;
  min-width: 0;
  flex: 0 0 40px;
}

.een-modify-select-wrap :deep(.q-field) {
  height: 40px;
  min-width: 0;
  color: var(--text-text-primary);
  font-family: inherit;
  font-size: var(--font-size-14px);
  line-height: var(--line-height-20px);
}

.een-modify-select-wrap :deep(.q-field__control) {
  height: 40px;
  min-height: 40px;
  padding: var(--spacing-space-1) var(--spacing-space-2);
  border: var(--ds-input-medium-border-width, 1px) solid var(--border-border-primary);
  border-radius: var(--radius-4);
  background: var(--background-background-primary);
  box-shadow: none;
}

.een-modify-select-wrap :deep(.q-field__control::before),
.een-modify-select-wrap :deep(.q-field__control::after) {
  display: none;
}

.een-modify-select-wrap :deep(.q-field__control-container),
.een-modify-select-wrap :deep(.q-field__native),
.een-modify-select-wrap :deep(.q-field__input),
.een-modify-select-wrap :deep(.q-field__append),
.een-modify-select-wrap :deep(.q-field__marginal) {
  height: 100%;
  min-height: 0;
  padding: 0;
}

.een-modify-select-wrap :deep(.q-field__native),
.een-modify-select-wrap :deep(.q-field__input) {
  min-width: 0;
  color: var(--ds-input-medium-text-color);
  font: inherit;
  line-height: 20px;
}

.een-modify-select-wrap :deep(.q-select__dropdown-icon) {
  color: var(--text-text-primary);
  font-size: 16px;
}

.een-modify-select-wrap :deep(.q-field--focused .q-field__control),
.een-modify-select-wrap :deep(.q-field:not(.q-field--disabled):hover .q-field__control) {
  border-color: var(--border-border-brand);
}

.een-modify-select-wrap :deep(.q-field__native:focus-visible) {
  outline: 2px solid var(--border-border-brand);
  outline-offset: 2px;
}

.een-modify-back:focus-visible,
.een-modify-action:focus-visible,
.een-modify-dialog__confirm:focus-visible,
.een-modify-dialog__cancel:focus-visible {
  outline: 3px solid #173d32;
  outline-offset: 2px;
}

.een-modify-textarea {
  display: block;
  width: 100%;
  min-height: 120px;
  flex: 0 0 auto;
}

.een-modify-textarea :deep(.ds-input__qinput) {
  min-height: 120px;
}

.een-modify-textarea :deep(.ds-input__qinput .q-field__control) {
  box-sizing: border-box;
  height: auto;
  min-height: 120px;
  padding: 16px 16px 15px;
  border: 0;
  border-bottom: 1px solid #d1d5dc;
  border-radius: 4px 4px 0 0;
  background: #fff;
  color: #030712;
  box-shadow: none;
}

.een-modify-textarea :deep(.ds-input__qinput.q-field--focused .q-field__control) {
  border-bottom: 2px solid var(--border-border-brand);
}

.een-modify-textarea :deep(.ds-input__qinput .q-field__control-container) {
  height: auto;
  min-height: 0;
  padding: 0;
}

.een-modify-textarea :deep(.ds-input__qinput .q-field__native) {
  box-sizing: border-box;
  min-height: 88px;
  padding: 0;
  overflow-y: auto;
  color: #030712;
  font-size: 16px;
  line-height: 24px;
}

.een-modify-textarea :deep(.ds-input__qinput .q-field__native::placeholder) {
  color: #030712;
  opacity: 1;
}

.een-modify-textarea :deep(.ds-input__qinput textarea) {
  align-self: stretch;
  resize: vertical;
}

.een-modify-footer {
  display: flex;
  height: 68px;
  flex: 0 0 68px;
  gap: 8px;
  padding: 12px;
}

.een-modify-action {
  display: flex;
  height: 44px;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border: 1px solid #d1d5dc;
  border-radius: 8px;
  color: #101828;
  background: #fff;
  cursor: pointer;
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  line-height: 28px;
}

.een-modify-action--confirm {
  border-color: #02b0a5;
  color: #f0fdfc;
  background: #02b0a5;
}

.een-modify-dialog__message {
  margin: 0;
  color: #101828;
}

.een-modify-dialog__confirm,
.een-modify-dialog__cancel {
  min-width: 72px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #d1d5dc;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font: inherit;
}

.een-modify-dialog__confirm {
  border-color: #02b0a5;
  color: #fff;
  background: #02b0a5;
}

@media (max-width: 359px) {
  .een-modify-content,
  .een-modify-footer {
    width: 100%;
  }

  .een-modify-action {
    padding-inline: 8px;
    font-size: 14px;
  }
}
</style>
