<template>
  <main class="een-delete-page">
    <section class="een-delete-shell" aria-labelledby="een-delete-title">
      <header class="een-delete-header">
        <button
          class="een-delete-back"
          type="button"
          aria-label="뒤로가기"
          @click="returnToSetting"
        >
          <ArrowLeftOutlined aria-hidden="true" />
        </button>
        <h1 id="een-delete-title">EEN 삭제</h1>
      </header>

      <div class="een-delete-content">
        <section class="een-delete-card" aria-label="EEN 삭제 정보">
          <div class="een-delete-field">
            <label class="een-delete-label">LOT ID</label>
            <output class="een-delete-value" data-field="lotId">{{ deleteData.lotId }}</output>
          </div>
          <div class="een-delete-field">
            <label class="een-delete-label">FACILITY</label>
            <output class="een-delete-value" data-field="facility">{{
              deleteData.facility
            }}</output>
          </div>
          <div class="een-delete-field">
            <label class="een-delete-label">제품</label>
            <output class="een-delete-value" data-field="product">{{ deleteData.product }}</output>
          </div>
          <div class="een-delete-field">
            <label class="een-delete-label">ROUTE</label>
            <output class="een-delete-value een-delete-value--arrow" data-field="route">
              {{ deleteData.route }}
              <DownOutlined aria-hidden="true" />
            </output>
          </div>
          <div class="een-delete-field">
            <label class="een-delete-label">공정</label>
            <output class="een-delete-value een-delete-value--arrow" data-field="operation">
              <span>{{ deleteData.operation }}</span>
              <span>{{ deleteData.poDesc }}</span>
              <DownOutlined aria-hidden="true" />
            </output>
          </div>
          <div class="een-delete-field">
            <label class="een-delete-label">EEN ID</label>
            <output class="een-delete-value" data-field="eenId">
              {{ deleteData.eenId || 'Null' }}
            </output>
          </div>
          <div class="een-delete-field">
            <label class="een-delete-label">ACTION POINT</label>
            <output class="een-delete-value een-delete-value--arrow" data-field="actionPoint">
              <span>{{ deleteData.actionPoint || 'Null' }}</span>
              <DownOutlined aria-hidden="true" />
            </output>
          </div>
          <div class="een-delete-field">
            <label class="een-delete-label">TAG ID</label>
            <output class="een-delete-value een-delete-value--arrow" data-field="tagId">
              <span>{{ deleteData.tagId || 'Null' }}</span>
              <DownOutlined aria-hidden="true" />
            </output>
          </div>

          <BaseInput
            :model-value="deleteData.tagComment"
            class="een-delete-textarea een-delete-textarea--readonly"
            mode="textarea"
            resize="vertical"
            aria-label="Tag Comment"
            :rows="5"
            readonly
          />
          <BaseInput
            v-model="deleteReason"
            class="een-delete-textarea"
            mode="textarea"
            resize="vertical"
            aria-label="삭제 사유"
            placeholder="삭제 사유"
            :rows="5"
          />
        </section>
      </div>

      <footer class="een-delete-footer" aria-label="EEN 삭제 작업">
        <button
          class="een-delete-action een-delete-action--confirm"
          type="button"
          :disabled="!selectedItem || isDeleting"
          @click="requestDelete"
        >
          확인
        </button>
        <button
          class="een-delete-action een-delete-action--cancel"
          type="button"
          @click="returnToSetting"
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
      <p class="een-delete-dialog__message">{{ dialog.message }}</p>
      <template #footer>
        <button
          v-if="dialog.kind === 'confirm'"
          class="een-delete-dialog__cancel"
          type="button"
          @click="closeDialog"
        >
          아니오
        </button>
        <button class="een-delete-dialog__confirm" type="button" @click="acceptDialog">
          {{ dialog.kind === 'confirm' ? '예' : '확인' }}
        </button>
      </template>
    </BaseModal>
  </main>
</template>

<script setup lang="ts">
import { ArrowLeftOutlined, DownOutlined } from '@ant-design/icons-vue';
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ROUTE } from '~/constants/routes.ts';
import { useMainStore } from '~/features/main';

import { BaseInput, BaseModal } from '../../../components/base';
import { COMMON_FIELD } from '../../../constants/common-strings';
import { defaultEENSettingContext, mockEENSettingItems } from '../mocks/een-setting.mock';
import { deleteEEN } from '../services/een-setting.service';

type DialogKind = 'alert' | 'confirm' | 'success';

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();
const deleteReason = ref('');
const isDeleting = ref(false);
const selectedItem = computed(() =>
  mockEENSettingItems.find(({ id }) => id === queryValue('itemId')),
);
const deleteData = computed(() => {
  const item = selectedItem.value;

  return {
    lotId: queryValue('lotId') || defaultEENSettingContext.lotId,
    factoryName:
      queryValue('factoryName') || item?.factoryName || defaultEENSettingContext.factoryName,
    facility:
      queryValue('factoryName') ||
      queryValue('facility') ||
      item?.factoryName ||
      defaultEENSettingContext.facility,
    product: queryValue('product') || item?.product || defaultEENSettingContext.product,
    route: queryValue('route') || item?.route || defaultEENSettingContext.route,
    operation: queryValue('operation') || item?.operation || defaultEENSettingContext.operation,
    poDesc: queryValue('poDesc') || item?.poDesc || '',
    eenId: queryValue('eenId') || item?.eenId || '',
    actionPoint: queryValue('actionPoint') || item?.actionPoint || '',
    tagId: queryValue('tagId') || item?.tagId || '',
    tagComment: queryValue('tagComment') || item?.tagComment || '',
  };
});
const dialog = reactive<{ open: boolean; title: string; message: string; kind: DialogKind }>({
  open: false,
  title: '',
  message: '',
  kind: 'alert',
});

function queryValue(key: string): string {
  const value = route.query[key];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function returnToSetting(): void {
  if (router.options.history.state.back) {
    router.back();
    return;
  }

  void router.replace({
    path: `/${ROUTE.eenSetting}`,
    query: {
      lotId: deleteData.value.lotId,
      factoryName: deleteData.value.factoryName,
      facility: deleteData.value.facility,
      product: deleteData.value.product,
      route: deleteData.value.route,
      operation: deleteData.value.operation,
    },
  });
}

function showDialog(kind: DialogKind, title: string, message: string): void {
  dialog.kind = kind;
  dialog.title = title;
  dialog.message = message;
  dialog.open = true;
}

function requestDelete(): void {
  if (!selectedItem.value || isDeleting.value) return;
  if (!deleteReason.value.trim()) {
    showDialog('alert', COMMON_FIELD.TXTDIALOGTITLE_ERROR, '삭제 사유를 입력하세요.');
    return;
  }

  showDialog('confirm', COMMON_FIELD.TXTDIALOGTITLE_OK, '삭제하시겠습니까?');
}

async function acceptDialog(): Promise<void> {
  if (dialog.kind === 'confirm') {
    const item = selectedItem.value;
    if (!item || isDeleting.value) return;

    isDeleting.value = true;
    try {
      const result = await deleteEEN({
        lotId: deleteData.value.lotId,
        userId: mainStore.operatorId,
        facility: deleteData.value.facility.trim(),
        product: deleteData.value.product.trim(),
        operation: deleteData.value.operation.trim(),
        actionPoint: deleteData.value.actionPoint.trim(),
        eenId: deleteData.value.eenId.trim(),
        route: deleteData.value.route.trim(),
        comment: deleteData.value.tagComment,
        tagId: deleteData.value.tagId.trim(),
        deleteReason: deleteReason.value,
      });

      if (result.success) {
        showDialog('success', COMMON_FIELD.TXTDIALOGTITLE_OK, 'EEN 삭제가 완료 되었습니다.');
      } else {
        showDialog('alert', COMMON_FIELD.TXTDIALOGTITLE_ERROR, result.errorMessage);
      }
    } catch (error) {
      showDialog(
        'alert',
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        error instanceof Error ? error.message : 'EEN 삭제에 실패하였습니다.',
      );
    } finally {
      isDeleting.value = false;
    }
    return;
  }

  if (dialog.kind === 'success') {
    dialog.open = false;
    returnToSetting();
    return;
  }

  closeDialog();
}

function closeDialog(): void {
  dialog.open = false;
}

function handleDialogOpenChange(open: boolean): void {
  if (!open) closeDialog();
}
</script>

<style scoped>
.een-delete-page {
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  background: #d1d5dc;
  font-family: 'Noto Sans KR', sans-serif;
}

.een-delete-page *,
.een-delete-page *::before,
.een-delete-page *::after {
  box-sizing: border-box;
}

.een-delete-shell {
  display: flex;
  width: min(100%, 360px);
  min-height: 1032px;
  flex-direction: column;
  margin-inline: auto;
  color: #101828;
  background: linear-gradient(180deg, #1c493a 0%, #96b1a8 53.85%, #ecf8f1 100%);
}

.een-delete-header {
  display: flex;
  height: 60px;
  flex: 0 0 60px;
  align-items: center;
  gap: 16px;
  padding-inline: 16px;
  color: #f9fafb;
}

.een-delete-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
}

.een-delete-back {
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

.een-delete-content {
  display: flex;
  height: 904px;
  flex: 0 0 904px;
  flex-direction: column;
  padding: 12px;
}

.een-delete-card {
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

.een-delete-field {
  display: flex;
  width: 100%;
  height: 68px;
  flex: 0 0 68px;
  flex-direction: column;
  gap: 8px;
}

.een-delete-label {
  height: 20px;
  color: #030712;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.een-delete-value {
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
  text-overflow: ellipsis;
  white-space: nowrap;
}

.een-delete-value--arrow :deep(.anticon) {
  display: flex;
  flex: 0 0 16px;
  margin-left: auto;
  color: #cbd5e1;
}

.een-delete-value--arrow :deep(.anticon svg) {
  display: block;
  width: 16px;
  height: 16px;
}

.een-delete-textarea {
  display: block;
  width: 100%;
  height: 120px;
  flex: 0 0 120px;
}

.een-delete-textarea :deep(.ds-input__control) {
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

.een-delete-textarea :deep(.ds-input__native) {
  align-self: stretch;
  overflow-y: auto;
  color: #4a5565;
}

.een-delete-textarea :deep(.ds-input__native::placeholder) {
  color: #4a5565;
  opacity: 1;
}

.een-delete-textarea--readonly :deep(.ds-input__control) {
  background: #f3f4f6;
}

.een-delete-textarea :deep(.ds-input__resize-handle) {
  color: #e5e7eb;
}

.een-delete-footer {
  display: flex;
  height: 68px;
  flex: 0 0 68px;
  gap: 8px;
  padding: 12px;
}

.een-delete-action {
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

.een-delete-action--confirm {
  border-color: #02b0a5;
  color: #f0fdfc;
  background: #02b0a5;
}

.een-delete-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.een-delete-back:focus-visible,
.een-delete-action:focus-visible,
.een-delete-dialog__confirm:focus-visible,
.een-delete-dialog__cancel:focus-visible {
  outline: 3px solid #173d32;
  outline-offset: 2px;
}

.een-delete-dialog__message {
  margin: 0;
  color: #101828;
}

.een-delete-dialog__confirm,
.een-delete-dialog__cancel {
  min-width: 72px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #d1d5dc;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font: inherit;
}

.een-delete-dialog__confirm {
  border-color: #02b0a5;
  color: #fff;
  background: #02b0a5;
}

@media (max-width: 359px) {
  .een-delete-content,
  .een-delete-footer {
    width: 100%;
  }

  .een-delete-action {
    padding-inline: 8px;
    font-size: 14px;
  }
}
</style>
