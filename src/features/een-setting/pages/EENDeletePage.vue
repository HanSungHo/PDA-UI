<template>
  <main class="een-delete-page">
    <section class="een-delete-shell" aria-labelledby="een-delete-title">
      <header class="een-delete-header">
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
              <QIcon name="sym_o_expand_more" aria-hidden="true" />
            </output>
          </div>
          <div class="een-delete-field">
            <label class="een-delete-label">공정</label>
            <output class="een-delete-value een-delete-value--arrow" data-field="operation">
              <span>{{ deleteData.operation }}</span>
              <span>{{ deleteData.poDesc }}</span>
              <QIcon name="sym_o_expand_more" aria-hidden="true" />
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
              <QIcon name="sym_o_expand_more" aria-hidden="true" />
            </output>
          </div>
          <div class="een-delete-field">
            <label class="een-delete-label">TAG ID</label>
            <output class="een-delete-value een-delete-value--arrow" data-field="tagId">
              <span>{{ deleteData.tagId || 'Null' }}</span>
              <QIcon name="sym_o_expand_more" aria-hidden="true" />
            </output>
          </div>

          <BaseInput
            :model-value="deleteData.tagComment"
            class="een-delete-textarea een-delete-textarea--readonly"
            mode="textarea"
            resize="vertical"
            aria-label="Tag Comment"
            :rows="3"
            readonly
          />
          <BaseInput
            v-model="deleteReason"
            class="een-delete-textarea"
            mode="textarea"
            aria-label="삭제 사유"
            placeholder="삭제 사유"
            :rows="3"
          />
        </section>
      </div>

      <footer class="een-delete-footer" aria-label="EEN 삭제 작업">
        <BaseButton
          class="een-delete-action een-delete-action--confirm"
          html-type="button"
          variant="primary"
          size="large"
          :disabled="!selectedItem || isDeleting"
          @click="requestDelete"
        >
          확인
        </BaseButton>
        <BaseButton
          class="een-delete-action een-delete-action--cancel"
          html-type="button"
          variant="tertiary"
          size="large"
          @click="returnToSetting"
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
      <p class="een-delete-dialog__message">{{ dialog.message }}</p>
      <template #footer>
        <BaseButton
          v-if="dialog.kind === 'confirm'"
          class="een-delete-dialog__cancel"
          html-type="button"
          variant="secondary"
          @click="closeDialog"
        >
          아니오
        </BaseButton>
        <BaseButton
          class="een-delete-dialog__confirm"
          html-type="button"
          variant="primary"
          @click="acceptDialog"
        >
          {{ dialog.kind === 'confirm' ? '예' : '확인' }}
        </BaseButton>
      </template>
    </BaseModal>
  </main>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ROUTE } from '~/constants/routes.ts';
import { useMainStore } from '~/features/main';

import { BaseButton } from '../../../components/base/button';
import { BaseInput } from '../../../components/base/input';
import { BaseModal } from '../../../components/base/modal';
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
  width: 100%;
  min-height: 992px;
  flex-direction: column;
  color: #101828;
  background: linear-gradient(180deg, #1c493a 0%, #96b1a8 53.85%, #ecf8f1 100%);
}

.een-delete-header {
  display: flex;
  height: 60px;
  flex: 0 0 60px;
  align-items: center;
  justify-content: center;
  padding-inline: 16px;
  color: #f9fafb;
}

.een-delete-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
  letter-spacing: 0;
}

.een-delete-content {
  display: flex;
  height: 864px;
  flex: 0 0 864px;
  flex-direction: column;
  padding: 12px;
}

.een-delete-card {
  display: flex;
  width: 100%;
  height: 840px;
  flex: 0 0 840px;
  flex-direction: column;
  gap: 7.75px;
  padding: 12px 11px;
  border: 1px solid #d1d5dc;
  border-radius: 4px;
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
  flex: 0 0 20px;
  color: #364153;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.een-delete-value {
  display: flex;
  width: 100%;
  height: 40px;
  flex: 0 0 40px;
  min-width: 0;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  padding: 0 12px;
  border: 1px solid #d1d5dc;
  border-radius: 4px;
  background: #fff;
  color: #030712;
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.een-delete-value--arrow > .q-icon {
  display: block;
  flex: 0 0 16px;
  margin-left: auto;
  color: #101828;
  font-size: 16px;
  width: 16px;
  height: 16px;
}

.een-delete-textarea {
  display: block;
  width: 100%;
  height: 100px;
  flex: 0 0 100px;
}

.een-delete-footer {
  display: flex;
  width: min(100%, 360px);
  height: 68px;
  flex: 0 0 68px;
  gap: 8px;
  margin-inline: auto;
  padding: 12px;
}

.een-delete-action {
  width: 100%;
  flex: 1 1 0;
  font-weight: 700;
}

.een-delete-dialog__message {
  margin: 0;
  color: #101828;
}

.een-delete-dialog__confirm,
.een-delete-dialog__cancel {
  min-width: 72px;
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
