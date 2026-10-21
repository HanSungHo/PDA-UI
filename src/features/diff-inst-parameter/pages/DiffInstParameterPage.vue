<template>
  <main class="diff-inst-parameter">
    <section class="diff-inst-parameter__shell" aria-labelledby="diff-inst-parameter-title">
      <header class="diff-inst-parameter__header">
        <h1 id="diff-inst-parameter-title">DIFF 계측 PARAMETER 입력</h1>
      </header>

      <div class="diff-inst-parameter__content">
        <section class="diff-inst-parameter__card diff-inst-parameter__lot-card">
          <div class="diff-inst-parameter__search-row">
            <BaseInput
              ref="lotInputRef"
              v-model="lotId"
              class="diff-inst-parameter__lot-input"
              label="LOT NO"
              placeholder="Search"
              aria-label="LOT NO"
              @keyup.enter="handleLotEnter"
            >
              <template #suffix>
                <QIcon name="sym_o_search" aria-hidden="true" />
              </template>
            </BaseInput>
            <BaseButton
              class="diff-inst-parameter__search-button"
              variant="secondary"
              :disabled="isLoading"
              @click="handleSearch"
            >
              조회
            </BaseButton>
          </div>

          <BaseInput
            class="diff-inst-parameter__readonly"
            :model-value="batchId"
            aria-label="BATCHID"
            readonly
            @focus="blurReadonlyInput"
          />
          <div class="diff-inst-parameter__summary-row">
            <BaseInput
              class="diff-inst-parameter__readonly"
              :model-value="machineName"
              aria-label="MACHINENAME"
              readonly
              @focus="blurReadonlyInput"
            />
            <BaseInput
              class="diff-inst-parameter__readonly"
              :model-value="processOperationName"
              aria-label="PROCESSOPERATIONNAME"
              readonly
              @focus="blurReadonlyInput"
            />
          </div>
        </section>

        <section class="diff-inst-parameter__card diff-inst-parameter__grid-card">
          <div v-if="isLoading" class="diff-inst-parameter__loading">
            <BaseLoading size="medium" />
          </div>
          <div v-else-if="isParameterEmpty" class="diff-inst-parameter__empty">
            <BaseEmptyState data-testid="diff-inst-empty-state" />
          </div>
          <div v-else class="diff-inst-parameter__table-wrap">
            <BaseRevoGrid
              class="diff-inst-parameter__grid"
              :rows="parameterGridRows"
              :columns="parameterGridColumns"
              :style="parameterGridStyle"
              row-key="id"
              :row-size="PARAMETER_GRID_ROW_SIZE"
              :resize="false"
              :filter="false"
              :stretch="true"
              aria-label="Parameter data grid"
            />
          </div>
        </section>
      </div>

      <footer class="diff-inst-parameter__footer">
        <BaseButton
          data-testid="diff-inst-save"
          class="diff-inst-parameter__save"
          :disabled="!canSave || isSaving"
          @click="insertParameterData"
        >
          저장
        </BaseButton>
        <BaseButton class="diff-inst-parameter__cancel" variant="tertiary" @click="handleCancel">
          취소
        </BaseButton>
      </footer>
    </section>

    <div v-if="dialogMessage" class="diff-inst-parameter__scrim" role="presentation">
      <section
        class="diff-inst-parameter__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diff-inst-parameter-dialog-title"
      >
        <h2 id="diff-inst-parameter-dialog-title">{{ dialogTitle }}</h2>
        <p v-for="line in dialogLines" :key="line">{{ line }}</p>
        <footer :class="{ 'is-confirm': dialogKind === 'confirm' }">
          <BaseButton
            v-if="dialogKind === 'confirm'"
            variant="tertiary"
            @click="resolveConfirm(false)"
          >
            아니오
          </BaseButton>
          <BaseButton @click="resolveDialogPrimary">
            {{ dialogKind === 'confirm' ? '예' : '확인' }}
          </BaseButton>
        </footer>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { VGridVueTemplate } from '@revolist/vue3-datagrid';
import { QIcon } from 'quasar';
import { barcodeStyleLotId } from 'src/utils/barcode-style';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import {
  type Component,
  type ComponentPublicInstance,
  computed,
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  type PropType,
  ref,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  BaseButton,
  BaseEmptyState,
  BaseInput,
  BaseLoading,
  BaseRevoGrid,
} from '../../../components/base';
import type { BaseRevoGridColumn } from '../../../components/base/revo-grid';
import { useMainStore } from '../../main/stores/main.store';
import { queryString } from '../../move-out/utils/route-query';
import {
  fetchDiffEqpDataInfo,
  fetchEqpParameters,
  insertParameter,
} from '../services/diff-inst-parameter.service';
import type { DiffParameterItem } from '../types/diff-inst-parameter.types';

defineOptions({ name: 'DiffInstParameterPage' });

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();

const lotInputRef = ref<ComponentPublicInstance | null>(null);
const lotId = ref('');
const batchId = ref('');
const machineName = ref('');
const processOperationName = ref('');
const parameterItems = ref<DiffParameterItem[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const dialogTitle = ref('');
const dialogMessage = ref('');
const dialogKind = ref<'error' | 'info' | 'confirm'>('info');
let dialogCloseHandler: (() => void) | undefined;
let confirmResolver: ((value: boolean) => void) | undefined;

type ParameterGridRow = Pick<DiffParameterItem, 'no' | 'para' | 'min' | 'max'> & {
  id: string | number;
  sourceIndex: number;
};

const canSave = computed(() => parameterItems.value.length > 0);
const isParameterEmpty = computed(() => parameterItems.value.length === 0);
const dialogLines = computed(() => dialogMessage.value.split('\n').filter(Boolean));
const parameterGridRows = computed<ParameterGridRow[]>(() =>
  parameterItems.value.map((item, index) => ({
    no: item.no,
    para: item.para,
    min: item.min,
    max: item.max,
    id: item.no || index,
    sourceIndex: index,
  })),
);

const PARAMETER_GRID_HEADER_SIZE = 40;
const PARAMETER_GRID_ROW_SIZE = 50;
const parameterGridStyle = computed(() => ({
  height: `${PARAMETER_GRID_HEADER_SIZE + parameterGridRows.value.length * PARAMETER_GRID_ROW_SIZE}px`,
}));

const ParameterDataInputCell = defineComponent({
  name: 'ParameterDataInputCell',
  props: {
    model: {
      type: Object as PropType<ParameterGridRow>,
      required: true,
    },
  },
  setup(props) {
    const inputValue = computed(() => parameterItems.value[props.model.sourceIndex]?.data ?? '');

    function updateData(value: string | number | null) {
      const item = parameterItems.value[props.model.sourceIndex];
      if (!item) return;

      item.data = value == null ? '' : String(value);
    }

    function handleKeyup(event: KeyboardEvent) {
      if (event.key === 'Enter') focusNextDataInput(props.model.sourceIndex);
    }

    function stopGridInteraction(event: Event) {
      event.stopPropagation();
    }

    return () =>
      h(
        'div',
        {
          class: 'diff-inst-parameter__data-cell',
          onClick: stopGridInteraction,
          onDblclick: stopGridInteraction,
          onMousedown: stopGridInteraction,
          onPointerdown: stopGridInteraction,
          onTouchstart: stopGridInteraction,
        },
        h(BaseInput as Component, {
          mode: 'input',
          modelValue: inputValue.value,
          class: 'diff-inst-parameter__data-input',
          type: 'number',
          'aria-label': `${props.model.para} DATA`,
          'onUpdate:modelValue': updateData,
          onKeyup: handleKeyup,
        }),
      );
  },
});

const parameterGridColumns: BaseRevoGridColumn[] = [
  { prop: 'no', name: 'NO', size: 52 },
  { prop: 'para', name: 'PARA', size: 92 },
  { prop: 'min', name: 'MIN', size: 64 },
  { prop: 'max', name: 'MAX', size: 66 },
  {
    prop: 'data',
    name: 'DATA',
    size: 124,
    cellTemplate: VGridVueTemplate(ParameterDataInputCell),
  },
];

onMounted(() => {
  window.addEventListener(NATIVE_ENTER_EVENT, handleNativeEnter);

  const queryLotId = queryString(route, 'lotId');
  if (!queryLotId) return;

  lotId.value = queryLotId.toUpperCase();
  void getEqpData();
});

onUnmounted(() => {
  window.removeEventListener(NATIVE_ENTER_EVENT, handleNativeEnter);
});

function handleCancel() {
  router.back();
}

function clearData(options: { clearLot?: boolean } = {}) {
  batchId.value = '';
  machineName.value = '';
  processOperationName.value = '';
  parameterItems.value = [];

  if (options.clearLot) {
    lotId.value = '';
  }
}

function blurReadonlyInput(event: FocusEvent) {
  const target = event.target as HTMLElement | null;
  const input = target?.closest('input') ?? target?.querySelector('input');

  input?.blur();
}

function getLotIdInput(): HTMLInputElement | undefined {
  const rootElement = lotInputRef.value?.$el as HTMLElement | undefined;
  return rootElement?.querySelector<HTMLInputElement>('input') ?? undefined;
}

function handleSearch() {
  lotId.value = lotId.value.toUpperCase();

  if (!lotId.value.replace(/\s/g, '')) {
    void showDialog('에  러', 'LOT을 입력하세요.');
    return;
  }

  void getEqpData();
}

function handleLotEnter() {
  handleSearch();
}

function handleNativeEnter(): void {
  if (document.activeElement !== getLotIdInput()) {
    return;
  }

  const result = barcodeStyleLotId(lotId.value.toUpperCase());
  lotId.value = result.parsedId;

  if (result.isValid) {
    void getEqpData();
    return;
  }

  clearData();
}

async function getEqpData() {
  clearData();
  isLoading.value = true;

  try {
    const result = await fetchDiffEqpDataInfo(lotId.value);
    if (!result.ok || !result.data) {
      void showDialog('에  러', result.message || '');
      return;
    }

    if (result.data.lotProcessState !== 'RUN') {
      void showDialog('선측정 불가', 'MOVE IN 후에만 DATA 입력이 가능합니다.');
      clearData({ clearLot: true });
      return;
    }

    if (result.data.reUpdate !== 'N') {
      const confirmed = await showConfirm(
        '확  인',
        `[${result.data.reUpdate}]에 이미 데이터가 입력 되었습니다.\n데이터를 다시 입력하시겠습니까?`,
      );

      if (!confirmed) {
        clearData({ clearLot: true });
        return;
      }
    }

    batchId.value = result.data.batchId;
    machineName.value = result.data.machineName;
    processOperationName.value = result.data.processOperationName;

    const loadedParameters = await getDiffParameter(result.data.machineName);
    if (loadedParameters) {
      syncLotQuery();
    }
  } finally {
    isLoading.value = false;
    await nextTick();
    focusNextDataInput(-1);
  }
}

async function getDiffParameter(machine: string): Promise<boolean> {
  const result = await fetchEqpParameters({
    machineName: machine,
    facility: mainStore.facility,
  });

  if (!result.ok) {
    void showDialog('에  러', result.message || '');
    return false;
  }

  if (result.getDate === 'N') {
    void showDialog('에  러', '입력가능한 Parameter가 없습니다.');
    clearData({ clearLot: true });
    return false;
  }

  parameterItems.value = (result.items ?? []).map((item) => ({ ...item, data: item.data ?? '' }));
  return true;
}

function syncLotQuery() {
  if (queryString(route, 'lotId') === lotId.value) return;

  void router.replace({
    query: {
      ...route.query,
      lotId: lotId.value,
    },
  });
}

async function insertParameterData() {
  for (const item of parameterItems.value) {
    if (!item.data) {
      void showDialog('에  러', '모든 Parameter에 대해, 계측값을 입력하시기 바랍니다');
      return;
    }
  }

  isSaving.value = true;
  try {
    const result = await insertParameter({
      userId: mainStore.operatorId,
      batchId: batchId.value,
      machineName: machineName.value,
      facility: mainStore.facility,
      eqpPara: parameterItems.value.map((item) => item.data).join('|'),
      eqpParaNo: parameterItems.value.map((item) => item.no).join('|'),
      eqpParaMax: parameterItems.value.map((item) => item.max).join('|'),
    });

    if (!result.ok) {
      void showDialog('에  러', result.message || '');
      return;
    }

    if (result.machineState) {
      await showDialog('장비 상태 변경', result.machineState);
    }

    await showDialog('완료', '정상 입력 되었습니다.', () => {
      clearData({ clearLot: true });
    });
  } finally {
    isSaving.value = false;
  }
}

function focusNextDataInput(index: number) {
  const inputs = document.querySelectorAll<HTMLInputElement>(
    '.diff-inst-parameter__data-input input',
  );
  const nextInput = inputs[index + 1];
  nextInput?.focus();
}

function showDialog(title: string, message: string, onClose?: () => void): Promise<void> {
  dialogKind.value = 'info';
  dialogTitle.value = title;
  dialogMessage.value = message;
  dialogCloseHandler = onClose;

  return new Promise((resolve) => {
    const previousCloseHandler = dialogCloseHandler;
    dialogCloseHandler = () => {
      previousCloseHandler?.();
      resolve();
    };
  });
}

function showConfirm(title: string, message: string): Promise<boolean> {
  dialogKind.value = 'confirm';
  dialogTitle.value = title;
  dialogMessage.value = message;

  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function resolveDialogPrimary() {
  if (dialogKind.value === 'confirm') {
    resolveConfirm(true);
    return;
  }

  const closeHandler = dialogCloseHandler;
  dialogMessage.value = '';
  dialogTitle.value = '';
  dialogCloseHandler = undefined;
  closeHandler?.();
}

function resolveConfirm(value: boolean) {
  const resolver = confirmResolver;
  dialogMessage.value = '';
  dialogTitle.value = '';
  confirmResolver = undefined;
  resolver?.(value);
}
</script>

<style scoped src="./DiffInstParameterPage.css"></style>
