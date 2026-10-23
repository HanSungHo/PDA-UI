<template>
  <main class="een-modify-page">
    <section class="een-modify-shell" aria-labelledby="een-modify-title">
      <header class="een-modify-header">
        <h1 id="een-modify-title">EEN 수정</h1>
      </header>

      <div class="een-modify-content">
        <section class="een-modify-card" aria-label="EEN 수정 정보">
          <BaseInput
            class="een-modify-value"
            data-field="lotId"
            label="LOT ID"
            :model-value="context.lotId"
            readonly
            tabindex="-1"
          />
          <BaseInput
            class="een-modify-value"
            data-field="facility"
            label="FACILITY"
            :model-value="context.facility"
            readonly
            tabindex="-1"
          />
          <BaseInput
            class="een-modify-value"
            data-field="product"
            label="제품"
            :model-value="context.product"
            readonly
            tabindex="-1"
          />
          <BaseInput
            class="een-modify-value"
            tone="muted"
            data-field="route"
            label="ROUTE"
            :model-value="context.route || 'Null'"
            readonly
            tabindex="-1"
          >
            <template #suffix>
              <QIcon name="sym_o_expand_more" aria-hidden="true" />
            </template>
          </BaseInput>
          <BaseInput
            class="een-modify-value"
            tone="muted"
            data-field="operation"
            label="공정"
            :model-value="
              [context.operation || 'Null', selectedItem?.poDesc].filter(Boolean).join(' ')
            "
            readonly
            tabindex="-1"
          >
            <template #suffix>
              <QIcon name="sym_o_expand_more" aria-hidden="true" />
            </template>
          </BaseInput>
          <BaseInput
            class="een-modify-value"
            tone="muted"
            data-field="eenId"
            label="EEN ID"
            :model-value="selectedItem?.eenId ?? 'Null'"
            readonly
            tabindex="-1"
          />
          <div class="een-modify-select-wrap">
            <BaseDropdownList
              id="een-modify-action-point"
              label="ACTION POINT"
              :model-value="form.actionPoint === '' ? undefined : form.actionPoint"
              stack-label
              :options="actionPointOptions"
              @update:model-value="form.actionPoint = String($event ?? '')"
            />
          </div>
          <div class="een-modify-select-wrap">
            <BaseDropdownList
              v-model:model-value="form.tagId"
              id="een-modify-tag-id"
              label="TAG ID"
              stack-label
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
            placeholder="Tag Comment"
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
          class="een-modify-action"
          variant="primary"
          size="large"
          :disabled="!selectedItem || isSubmitting"
          @click="requestUpdate"
        >
          확인
        </BaseButton>
        <BaseButton class="een-modify-action" variant="tertiary" size="large" @click="closePage">
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
  tagId: string | undefined;
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
  tagId: undefined,
  tagComment: '',
  modifyReason: '',
});
const actionPointOptions = [
  { label: 'MOVEIN', value: 'MOVEIN' },
  { label: 'MOVEOUT', value: 'MOVEOUT' },
];
const tagDropdownOptions = computed(() => [
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
  const result = await fetchEENModifyData(queryValue('itemId'), context.value.facility);
  isLoading.value = false;

  if (!result.success) {
    showDialog('error', COMMON_FIELD.TXTDIALOGTITLE_ERROR, result.message);
    return;
  }

  selectedItem.value = result.data.item;
  tagOptions.value = result.data.tagOptions;
  Object.assign(form, {
    actionPoint: result.data.item.actionPoint === 'MOVEIN' ? 'MOVEIN' : 'MOVEOUT',
    tagId: result.data.tagOptions.some(({ tagId }) => tagId === result.data.item.tagId)
      ? result.data.item.tagId
      : undefined,
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
      tagId: form.tagId ?? null,
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
  background: var(--border-border-primary);
  font-family: 'Noto Sans KR', sans-serif;
}

.een-modify-page *,
.een-modify-page *::before,
.een-modify-page *::after {
  box-sizing: border-box;
}

.een-modify-shell {
  display: flex;
  width: 100%;
  min-height: 992px;
  flex-direction: column;
  color: var(--text-text-primary);
  background: linear-gradient(
    180deg,
    var(--ds-movein-page-gradient-1) 0%,
    var(--ds-movein-page-gradient-2) 53.85%,
    var(--ds-movein-page-gradient-3) 100%
  );
}

.een-modify-header {
  display: flex;
  height: 60px;
  flex: 0 0 60px;
  align-items: center;
  justify-content: center;
  padding-inline: 16px;
  color: var(--text-text-reversed);
}

.een-modify-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
  letter-spacing: 0;
}

.een-modify-content {
  display: flex;
  height: 864px;
  flex: 0 0 864px;
  flex-direction: column;
  padding: 12px;
}

.een-modify-card {
  display: flex;
  width: 100%;
  height: 840px;
  flex: 0 0 840px;
  flex-direction: column;
  gap: 7.875px;
  padding: 12px;
  border: 1px solid var(--border-border-primary);
  border-radius: 8px;
  background: var(--background-background-secondary);
  box-shadow: 0 8px 24px rgb(13 20 31 / 6%);
  overflow-y: auto;
}

.een-modify-select-wrap {
  width: 100%;
  height: 68px;
  min-width: 0;
  flex: 0 0 68px;
}

.een-modify-select-wrap :deep(.ds-dropdown-list) {
  height: 68px;
}

.een-modify-textarea {
  display: block;
  width: 100%;
  min-height: 100px;
  flex: 0 0 auto;
}

.een-modify-footer {
  display: flex;
  width: min(100%, 360px);
  height: 68px;
  flex: 0 0 68px;
  gap: 8px;
  margin-inline: auto;
  padding: 12px;
}

.een-modify-action {
  flex: 1 1 0;
}

.een-modify-dialog__message {
  margin: 0;
  color: var(--text-text-primary);
}

.een-modify-dialog__confirm,
.een-modify-dialog__cancel {
  min-width: 72px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border-border-primary);
  border-radius: 6px;
  background: var(--background-background-primary);
  cursor: pointer;
  font: inherit;
}

.een-modify-dialog__confirm {
  border-color: var(--background-background-brand);
  color: var(--text-text-reversed);
  background: var(--background-background-brand);
}

/* Layout matches the 360 by 992 design frame while allowing smaller viewports to scroll. */
.een-modify-shell {
  height: 100vh;
  min-height: 992px;
}

.een-modify-content {
  height: 864px;
  min-height: 864px;
  flex: 0 0 864px;
  padding: 12px;
}

.een-modify-card {
  height: 840px;
  min-height: 840px;
  flex: 0 0 840px;
  gap: 8px;
  padding: 12px 11px;
  border-radius: 4px;
  background: var(--background-background-disabled);
  overflow-y: auto;
}

.een-modify-value {
  width: 100%;
  height: 68px;
  min-height: 68px;
  flex: 0 0 68px;
  min-width: 0;
  font-family: inherit;
  gap: 7px;
}

.een-modify-textarea {
  height: 100px;
  min-height: 100px;
  flex: 0 0 100px;
}

@media (max-height: 935px) {
  .een-modify-shell {
    height: auto;
    min-height: 100vh;
  }

  .een-modify-content {
    height: auto;
    min-height: 0;
    flex: 1 1 auto;
  }

  .een-modify-card {
    height: auto;
    flex: 1 1 auto;
  }
}

@media (max-width: 359px) {
  .een-modify-content,
  .een-modify-footer {
    width: 100%;
  }
}
</style>
