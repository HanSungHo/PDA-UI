<template>
  <BaseScreen title="EEN 수정" class="een-modify">
    <section class="ds-screen__card een-modify__card" aria-label="EEN 수정 정보">
      <BaseInput
        data-field="lotId"
        label="LOT ID"
        :model-value="context.lotId"
        readonly
        tabindex="-1"
      />
      <BaseInput
        data-field="facility"
        label="FACILITY"
        :model-value="context.facility"
        readonly
        tabindex="-1"
      />
      <BaseInput
        data-field="product"
        label="제품"
        :model-value="context.product"
        readonly
        tabindex="-1"
      />
      <BaseInput
        tone="muted"
        data-field="route"
        label="ROUTE"
        :model-value="context.route"
        readonly
        tabindex="-1"
      >
        <template #suffix>
          <QIcon name="sym_o_expand_more" aria-hidden="true" />
        </template>
      </BaseInput>
      <BaseInput
        tone="muted"
        data-field="operation"
        label="공정"
        :model-value="[context.operation, selectedItem?.poDesc].filter(Boolean).join(' ')"
        readonly
        tabindex="-1"
      >
        <template #suffix>
          <QIcon name="sym_o_expand_more" aria-hidden="true" />
        </template>
      </BaseInput>
      <BaseInput
        tone="muted"
        data-field="eenId"
        label="EEN ID"
        :model-value="selectedItem?.eenId ?? ''"
        readonly
        tabindex="-1"
      />
      <BaseDropdownList
        id="een-modify-action-point"
        label="ACTION POINT"
        :model-value="form.actionPoint === '' ? undefined : form.actionPoint"
        :options="actionPointOptions"
        @update:model-value="form.actionPoint = String($event ?? '')"
      />
      <BaseDropdownList
        v-model:model-value="form.tagId"
        id="een-modify-tag-id"
        label="TAG ID"
        :options="tagDropdownOptions"
        @change="updateCommentFromTag"
      />

      <BaseInput
        v-model="form.tagComment"
        mode="textarea"
        resize="vertical"
        aria-label="Tag Comment"
        placeholder="Tag Comment"
        :rows="3"
      />
      <BaseInput
        v-model="form.modifyReason"
        mode="textarea"
        resize="vertical"
        aria-label="변경 사유"
        placeholder="변경 사유"
        :rows="3"
      />
    </section>

    <template #footer>
      <BaseButton
        class="een-modify-action--confirm"
        variant="primary"
        size="medium"
        :disabled="!selectedItem || isSubmitting"
        @click="requestUpdate"
      >
        확인
      </BaseButton>
      <BaseButton
        class="een-modify-action--cancel"
        variant="tertiary"
        size="medium"
        @click="closePage"
      >
        취소
      </BaseButton>
    </template>

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
  </BaseScreen>
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
import { BaseScreen } from '../../../components/base/screen';
import { useMainStore } from '../../main/stores/main.store';
import { fetchEENTagOptions, updateEENModifyItem } from '../services/een-setting.service';
import type { EENSettingContext, EENTagOption } from '../types/een-setting.types';

type DialogKind = 'alert' | 'confirm' | 'error' | 'success';
interface EENModifyForm {
  actionPoint: string;
  tagId: string | undefined;
  tagComment: string;
  modifyReason: string;
}

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();
// EENModifyActivity reads the selected EEN Setting row from its Intent extras.
const context = computed<EENSettingContext>(() => ({
  lotId: queryValue('lotId'),
  factoryName: queryValue('factoryName'),
  facility: queryValue('factoryName') || queryValue('facility'),
  product: queryValue('product'),
  route: queryValue('route'),
  operation: queryValue('operation'),
  processStep: queryValue('processStep'),
}));
const selectedItem = computed(() =>
  queryValue('eenId')
    ? {
        eenId: queryValue('eenId'),
        tagComment: queryValue('tagComment'),
        actionPoint: queryValue('actionPoint'),
        tagId: queryValue('tagId'),
        poDesc: queryValue('poDesc'),
      }
    : undefined,
);
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
  const item = selectedItem.value;
  if (!item) {
    isLoading.value = false;
    showDialog('error', COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'EEN 정보를 찾을 수 없습니다.');
    return;
  }
  Object.assign(form, {
    actionPoint: item.actionPoint === 'MOVEIN' ? 'MOVEIN' : 'MOVEOUT',
    tagComment: item.tagComment,
  });

  isLoading.value = true;
  const result = await fetchEENTagOptions(context.value.facility);
  isLoading.value = false;

  if (!result.success) {
    showDialog('error', COMMON_FIELD.TXTDIALOGTITLE_ERROR, result.message);
    return;
  }

  tagOptions.value = result.data;
  form.tagId = result.data.some(({ tagId }) => tagId === item.tagId) ? item.tagId : undefined;
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
.een-modify-dialog__message {
  margin: 0;
  color: var(--text-text-primary);
}
</style>
