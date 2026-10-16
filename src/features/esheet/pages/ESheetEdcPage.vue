<template>
  <BaseScreen class="esheet-edc" title="EDC DATA">
    <section class="ds-screen__card esheet-edc__lot-card" aria-label="LOT 정보">
      <BaseInput :model-value="LOTID" label="LOT No." placeholder="Null" readonly />
      <BaseCheckbox
        :model-value="isAllChecked"
        label="전체 보기"
        :disabled="isLoading"
        @update:model-value="onAllViewChange"
      />
    </section>

    <section
      class="ds-screen__card esheet-edc__grid-region"
      aria-label="EDC 데이터"
      :aria-busy="isLoading"
    >
      <div v-if="isLoading" class="esheet-edc__loading">
        <BaseLoading />
      </div>
      <BaseRevoGrid
        v-else-if="gridColumns.length > 0"
        class="esheet-edc__grid"
        :rows="rows"
        :columns="gridColumns"
        row-key="__rowId"
        :row-size="40"
        :resize="false"
        :filter="false"
        data-testid="esheet-edc-grid"
        aria-label="EDC 데이터 표"
      />
    </section>

    <template #footer>
      <BaseButton class="esheet-edc__close" variant="primary" block @click="closePage">
        닫기
      </BaseButton>
    </template>

    <BaseModal
      :open="isErrorDialogOpen"
      title="에  러"
      :width="340"
      :closable="false"
      :overlay-closable="false"
      @update:open="isErrorDialogOpen = $event"
    >
      <p class="esheet-edc__error-message">{{ errorMessage }}</p>
      <template #footer>
        <div class="esheet-edc__dialog-actions">
          <BaseButton variant="primary" @click="isErrorDialogOpen = false">확인</BaseButton>
        </div>
      </template>
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import type { ColumnRegular } from '@revolist/revogrid';
import {
  BaseButton,
  BaseCheckbox,
  BaseInput,
  BaseLoading,
  BaseModal,
  BaseRevoGrid,
  BaseScreen,
} from 'src/components/base';
import { useMainStore } from 'src/features/main/stores/main.store';
import { isResponseSuccessful, parseMessageBody } from 'src/services/message-response.helper';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { getEdcData } from '../services/esheet-edc.service';
import type { ESheetEdcItem, ESheetEdcResult } from '../types/esheet-edc.types';
import { getEdcColumns } from '../utils/esheet-edc.columns';

interface Props {
  lotId?: string;
  operation?: string;
  processStep?: string;
  realRecipe?: string;
  subOperation?: string;
}

interface ESheetEdcGridRow extends ESheetEdcItem {
  __rowId: string;
}

const props = withDefaults(defineProps<Props>(), {
  lotId: '',
  operation: '',
  processStep: '',
  realRecipe: '',
  subOperation: '',
});
const route = useRoute();
const router = useRouter();
const DeviceInfo = useMainStore();
const LOTID = typeof route.query.LOTID === 'string' ? route.query.LOTID : props.lotId;
const OPERATION =
  typeof route.query.OPERATION === 'string' ? route.query.OPERATION : props.operation;
const SUBOPERATION =
  typeof route.query.SUBOPERATION === 'string' ? route.query.SUBOPERATION : props.subOperation;
const PROCESSSTEP =
  typeof route.query.PROCESSSTEP === 'string' ? route.query.PROCESSSTEP : props.processStep;
const Recipe =
  typeof route.query.REALRECIPE === 'string' ? route.query.REALRECIPE : props.realRecipe;
const gsType = ref('');
const isAllChecked = ref(false);
const isLoading = ref(false);
const rows = ref<ESheetEdcGridRow[]>([]);
const errorMessage = ref('');
const isErrorDialogOpen = ref(false);
const gridColumns = computed<ColumnRegular[]>(() =>
  getEdcColumns(gsType.value, isAllChecked.value),
);

function getEDCErrorMessage(result: string): string {
  try {
    const response = JSON.parse(result) as { ERRMSG?: unknown };
    return typeof response.ERRMSG === 'string' ? response.ERRMSG : '';
  } catch {
    return result;
  }
}

async function getEDCData(): Promise<void> {
  rows.value = [];
  gsType.value = '';
  isLoading.value = true;

  try {
    const response = await getEdcData({
      deviceName: DeviceInfo.deviceName,
      facility: DeviceInfo.facility,
      lotId: LOTID,
      mobileServerName: DeviceInfo.mobileServerName,
      operation: OPERATION,
      processStep: PROCESSSTEP,
      recipe: Recipe,
      subOperation: SUBOPERATION,
    });

    if (!isResponseSuccessful(response)) {
      errorMessage.value = getEDCErrorMessage(response.result);
      isErrorDialogOpen.value = true;
      return;
    }

    const responseBody = JSON.parse(response.result) as { MSGBODY?: unknown };
    const messageBodyValue = responseBody.MSGBODY;
    if (
      messageBodyValue === null ||
      typeof messageBodyValue !== 'object' ||
      Array.isArray(messageBodyValue)
    ) {
      gsType.value = '';
      errorMessage.value = 'BODY가 존재하지 않습니다';
      isErrorDialogOpen.value = true;
      return;
    }

    const messageBody = parseMessageBody(response) as unknown as ESheetEdcResult;
    gsType.value = messageBody.PROCESSTYPE ?? '';
    const itemList = messageBody.ITEMS?.ITEM;
    rows.value = Array.isArray(itemList)
      ? itemList.map((item, index) => ({ ...item, __rowId: String(index) }))
      : [];
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
    isErrorDialogOpen.value = true;
  } finally {
    isLoading.value = false;
  }
}

async function onAllViewChange(isChecked: boolean): Promise<void> {
  isAllChecked.value = isChecked;
  await getEDCData();
}

function closePage(): void {
  void router.back();
}

onMounted(() => {
  void getEDCData();
});
</script>

<style scoped>
.esheet-edc {
  margin-inline: auto;
}

.esheet-edc__grid-region {
  min-height: 280px;
}

.esheet-edc__grid {
  width: 100%;
  height: 240px;
}
.esheet-edc__error-message {
  margin: 0;
  white-space: pre-wrap;
}

.esheet-edc__dialog-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
