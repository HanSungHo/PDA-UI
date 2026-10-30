<template>
  <BaseScreen title="EEN 삭제" class="een-delete">
    <section class="ds-screen__card een-delete__card" aria-label="EEN 삭제 정보">
      <BaseInput data-field="lotId" label="LOT ID" :model-value="deleteData.lotId" readonly />
      <BaseInput
        data-field="facility"
        label="FACILITY"
        :model-value="deleteData.facility"
        readonly
      />
      <BaseInput data-field="product" label="제품" :model-value="deleteData.product" readonly />
      <!-- Android shows these as read-only text; Figma draws them as locked dropdowns. -->
      <BaseInput
        data-field="route"
        label="ROUTE"
        tone="muted"
        :model-value="deleteData.route"
        readonly
      >
        <template #suffix><QIcon name="sym_o_expand_more" aria-hidden="true" /></template>
      </BaseInput>
      <BaseInput
        data-field="operation"
        label="공정"
        tone="muted"
        :model-value="[deleteData.operation, deleteData.poDesc].filter(Boolean).join(' ')"
        readonly
      >
        <template #suffix><QIcon name="sym_o_expand_more" aria-hidden="true" /></template>
      </BaseInput>
      <BaseInput
        data-field="eenId"
        label="EEN ID"
        tone="muted"
        :model-value="deleteData.eenId"
        readonly
      />
      <BaseInput
        data-field="actionPoint"
        label="ACTION POINT"
        tone="muted"
        :model-value="deleteData.actionPoint"
        readonly
      >
        <template #suffix><QIcon name="sym_o_expand_more" aria-hidden="true" /></template>
      </BaseInput>
      <BaseInput
        data-field="tagId"
        label="TAG ID"
        tone="muted"
        :model-value="deleteData.tagId"
        readonly
      >
        <template #suffix><QIcon name="sym_o_expand_more" aria-hidden="true" /></template>
      </BaseInput>

      <BaseInput
        :model-value="deleteData.tagComment"
        mode="textarea"
        resize="vertical"
        aria-label="Tag Comment"
        :rows="3"
        readonly
      />
      <BaseInput
        v-model="deleteReason"
        mode="textarea"
        aria-label="삭제 사유"
        placeholder="삭제 사유"
        :rows="3"
      />
    </section>

    <template #footer>
      <BaseButton
        class="een-delete-action--confirm"
        html-type="button"
        variant="primary"
        size="medium"
        :disabled="!hasEen || isDeleting"
        @click="requestDelete"
      >
        확인
      </BaseButton>
      <BaseButton
        class="een-delete-action--cancel"
        html-type="button"
        variant="tertiary"
        size="medium"
        @click="returnToSetting"
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
  </BaseScreen>
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
import { BaseScreen } from '../../../components/base/screen';
import { COMMON_FIELD } from '../../../constants/common-strings';
import { deleteEEN } from '../services/een-setting.service';

type DialogKind = 'alert' | 'confirm' | 'success';

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();
const deleteReason = ref('');
const isDeleting = ref(false);
// EENDeleteActivity reads the selected EEN Setting row from its Intent extras.
const deleteData = computed(() => ({
  lotId: queryValue('lotId'),
  factoryName: queryValue('factoryName'),
  facility: queryValue('factoryName') || queryValue('facility'),
  product: queryValue('product'),
  route: queryValue('route'),
  operation: queryValue('operation'),
  poDesc: queryValue('poDesc'),
  eenId: queryValue('eenId'),
  actionPoint: queryValue('actionPoint'),
  tagId: queryValue('tagId'),
  tagComment: queryValue('tagComment'),
}));
const hasEen = computed(() => Boolean(deleteData.value.eenId));
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
  if (!hasEen.value || isDeleting.value) return;
  if (!deleteReason.value.trim()) {
    showDialog('alert', '삭제 사유 입력', '삭제 사유를 입력하세요.');
    return;
  }

  showDialog('confirm', COMMON_FIELD.TXTDIALOGTITLE_OK, '삭제하시겠습니까?');
}

async function acceptDialog(): Promise<void> {
  if (dialog.kind === 'confirm') {
    if (!hasEen.value || isDeleting.value) return;

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
.een-delete-dialog__message {
  margin: 0;
}
</style>
