<template>
  <main class="een-modify-page">
    <section class="een-modify-shell" aria-labelledby="een-modify-title">
      <header class="een-modify-header">
        <button class="een-modify-back" type="button" aria-label="뒤로가기" @click="closePage">
          <ArrowLeftOutlined aria-hidden="true" />
        </button>
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
              <DownOutlined aria-hidden="true" />
            </output>
          </div>
          <div class="een-modify-field">
            <label class="een-modify-label">공정</label>
            <output class="een-modify-value een-modify-value--arrow" data-field="operation">
              <span>{{ context.operation }}</span>
              <span data-field="podesc">{{ selectedItem?.poDesc ?? '' }}</span>
              <DownOutlined aria-hidden="true" />
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
            <span class="een-modify-select-wrap">
              <select
                id="een-modify-action-point"
                v-model="form.actionPoint"
                aria-label="ACTION POINT"
                class="een-modify-select"
              >
                <option value="">Null</option>
                <option value="MOVEIN">MOVEIN</option>
                <option value="MOVEOUT">MOVEOUT</option>
              </select>
              <DownOutlined aria-hidden="true" />
            </span>
          </div>
          <div class="een-modify-field">
            <label class="een-modify-label" for="een-modify-tag-id">TAG ID</label>
            <span class="een-modify-select-wrap">
              <select
                id="een-modify-tag-id"
                v-model="form.tagId"
                aria-label="TAG ID"
                class="een-modify-select"
                @change="updateCommentFromTag"
              >
                <option value="">Null</option>
                <option v-for="tag in tagOptions" :key="tag.tagId" :value="tag.tagId">
                  {{ tag.tagId }}
                </option>
              </select>
              <DownOutlined aria-hidden="true" />
            </span>
          </div>

          <BaseInput
            v-model="form.tagComment"
            class="een-modify-textarea"
            mode="textarea"
            resize="vertical"
            aria-label="Tag Comment"
            :rows="5"
          />
          <BaseInput
            v-model="form.modifyReason"
            class="een-modify-textarea"
            mode="textarea"
            resize="vertical"
            aria-label="변경 사유"
            placeholder="변경 사유"
            :rows="5"
          />
        </section>
      </div>

      <footer class="een-modify-footer" aria-label="EEN 수정 작업">
        <button
          class="een-modify-action een-modify-action--confirm"
          type="button"
          :disabled="!selectedItem || isSubmitting"
          @click="requestUpdate"
        >
          확인
        </button>
        <button
          class="een-modify-action een-modify-action--cancel"
          type="button"
          @click="closePage"
        >
          취소
        </button>
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
        <button
          v-if="dialog.kind === 'confirm'"
          class="een-modify-dialog__cancel"
          type="button"
          @click="closeDialog"
        >
          아니오
        </button>
        <button class="een-modify-dialog__confirm" type="button" @click="acceptDialog">
          {{ dialog.kind === 'confirm' ? '예' : '확인' }}
        </button>
      </template>
    </BaseModal>
  </main>
</template>

<script setup lang="ts">
import { ArrowLeftOutlined, DownOutlined } from '@ant-design/icons-vue';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { BaseInput, BaseModal } from '../../../components/base';
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

.een-modify-value,
.een-modify-select-wrap {
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
  background: #fff;
  color: #4a5565;
}

.een-modify-select-wrap svg {
  position: absolute;
  top: 50%;
  right: 12px;
  color: #030712;
  font-size: 14px;
  pointer-events: none;
  transform: translateY(-50%);
}

.een-modify-select {
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 0 28px 0 0;
  appearance: none;
  border: 0;
  outline: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  cursor: pointer;
}

.een-modify-select:focus-visible,
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
  height: 120px;
  flex: 0 0 120px;
}

.een-modify-textarea :deep(.ds-input__control) {
  height: 120px;
  min-height: 120px;
  padding: 12px;
  border: 1px solid #d1d5dc;
  border-radius: 8px;
  background: #fff;
  color: #4a5565;
  font-size: 14px;
  line-height: 20px;
}

.een-modify-textarea :deep(.ds-input__native) {
  align-self: stretch;
  overflow-y: auto;
  color: #4a5565;
}

.een-modify-textarea :deep(.ds-input__native::placeholder) {
  color: #4a5565;
  opacity: 1;
}

.een-modify-textarea :deep(.ds-input__resize-handle) {
  color: #e5e7eb;
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
