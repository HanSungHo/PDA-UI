<template>
  <main class="rcp-inquire">
    <section class="rcp-inquire__shell" aria-labelledby="rcp-inquire-title">
      <header class="rcp-inquire__header">
        <BaseButton
          class="rcp-inquire__back"
          variant="tertiary"
          icon-only
          aria-label="Back"
          @click="handleClose"
        >
          <ArrowLeftOutlined aria-hidden="true" />
        </BaseButton>
        <h1 id="rcp-inquire-title">계측 RCP 조회</h1>
      </header>

      <section class="rcp-inquire__content">
        <section class="rcp-inquire__card rcp-inquire__summary">
          <div class="rcp-inquire__search-row">
            <BaseInput
              ref="lotInputRef"
              v-model="lotNo"
              data-testid="rcp-lot-input"
              class="rcp-inquire__lot-input"
              label="LOT NO"
              placeholder="Search"
              aria-label="LOT NO"
              :disabled="isLoading"
              @keyup.enter="handleLotEnter"
            >
              <template #suffix>
                <SearchOutlined aria-hidden="true" />
              </template>
            </BaseInput>
            <BaseButton
              data-testid="rcp-search"
              class="rcp-inquire__search-button"
              variant="secondary"
              :disabled="isLoading"
              @click="getData"
            >
              조회
            </BaseButton>
          </div>

          <BaseInput
            data-testid="rcp-product"
            class="rcp-inquire__readonly"
            :model-value="productName"
            label="PRODUCT"
            aria-label="PRODUCT"
            readonly
            @focus="blurReadonlyInput"
          />
          <BaseInput
            data-testid="rcp-operation"
            class="rcp-inquire__readonly"
            :model-value="processOperationName"
            label="OPERATION"
            aria-label="OPERATION"
            readonly
            @focus="blurReadonlyInput"
          />
          <BaseInput
            data-testid="rcp-description"
            class="rcp-inquire__readonly"
            :model-value="operationDescription"
            label="DESC"
            aria-label="DESC"
            readonly
            @focus="blurReadonlyInput"
          />
        </section>

        <section
          data-testid="rcp-recipes"
          class="rcp-inquire__card rcp-inquire__recipes"
          :class="{ 'rcp-inquire__recipes--empty': isRecipesEmpty }"
        >
          <div v-if="isLoading" class="rcp-inquire__loading">
            <BaseLoading size="medium" />
          </div>
          <div v-else-if="isRecipesEmpty" class="rcp-inquire__empty">
            <BaseEmptyState data-testid="rcp-empty-state" />
          </div>
          <template v-else>
            <table v-for="section in recipeSections" :key="section.id" class="rcp-inquire__table">
              <colgroup v-if="section.machineTitle">
                <col data-testid="rcp-recipe-column" style="width: 58%" />
                <col data-testid="rcp-machine-column" style="width: 42%" />
              </colgroup>
              <colgroup v-else>
                <col style="width: 100%" />
              </colgroup>
              <thead>
                <tr>
                  <th data-testid="rcp-section-title" scope="col">{{ section.title }}</th>
                  <th v-if="section.machineTitle" scope="col">{{ section.machineTitle }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in section.rows" :key="`${section.id}-${index}`">
                  <td>{{ row.recipe }}</td>
                  <td v-if="section.machineTitle" class="rcp-inquire__machine-cell">
                    {{ row.machine }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </section>
      </section>

      <footer class="rcp-inquire__footer">
        <BaseButton class="rcp-inquire__ok" @click="handleClose">확인</BaseButton>
        <BaseButton
          data-testid="rcp-inspection"
          class="rcp-inquire__inspection"
          variant="tertiary"
          :disabled="isInspectionLoading"
          @click="getInspection"
        >
          측정 정보
        </BaseButton>
      </footer>
    </section>

    <div v-if="activeDialog" class="rcp-inquire__scrim" role="presentation">
      <section
        class="rcp-inquire__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rcp-inquire-dialog-title"
      >
        <h2 id="rcp-inquire-dialog-title">{{ activeDialog.title }}</h2>
        <p v-for="line in activeDialogLines" :key="line">{{ line }}</p>
        <footer>
          <BaseButton data-testid="rcp-dialog-ok" @click="closeDialog">확인</BaseButton>
        </footer>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { BaseButton, BaseEmptyState, BaseInput, BaseLoading } from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { barcodeStyleLotId } from 'src/utils/barcode-style';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { type ComponentPublicInstance, computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { checkinspection, metRecipeSearch } from '../services/rcp-inquire.service';
import type {
  CheckInspectionData,
  MetRecipeSearchData,
  RcpRecipeSection,
} from '../types/rcp-inquire.types';

defineOptions({ name: 'RCPInquirePage' });

interface DialogItem {
  title: string;
  message: string;
}

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();

const lotInputRef = ref<ComponentPublicInstance | null>(null);
const lotNo = ref('');
const productName = ref('');
const processOperationName = ref('');
const operationDescription = ref('');
const recipeSections = ref<RcpRecipeSection[]>([]);
const dialogQueue = ref<DialogItem[]>([]);
const isLoading = ref(false);
const isInspectionLoading = ref(false);

const activeDialog = computed(() => dialogQueue.value[0]);
const activeDialogLines = computed(() => activeDialog.value?.message.split('\n') ?? []);
const isRecipesEmpty = computed(() => !isLoading.value && recipeSections.value.length === 0);

onMounted(() => {
  window.addEventListener(NATIVE_ENTER_EVENT, handleNativeEnter);

  const routeLotId = queryString('LOTID');

  if (!routeLotId) return;

  lotNo.value = normalizeLotNo(routeLotId);
  void getData();
});

onUnmounted(() => {
  window.removeEventListener(NATIVE_ENTER_EVENT, handleNativeEnter);
});

function queryString(key: string): string {
  const value = route.query[key];
  return typeof value === 'string' ? value : '';
}

function normalizeLotNo(value: string): string {
  return value.toUpperCase();
}

function isLotNoEmpty(value: string): boolean {
  return value.replace(/\s/g, '') === '';
}

function showDialog(title: string, message: string): void {
  dialogQueue.value = [{ title, message }];
}

function queueDialogs(items: DialogItem[]): void {
  dialogQueue.value = items;
}

function closeDialog(): void {
  dialogQueue.value = dialogQueue.value.slice(1);
}

function clearData(): void {
  productName.value = '';
  processOperationName.value = '';
  operationDescription.value = '';
  focusLotNo();
}

function clearGrid(): void {
  recipeSections.value = [];
}

function getLotNoInput(): HTMLInputElement | undefined {
  const rootElement = lotInputRef.value?.$el as HTMLElement | undefined;
  return rootElement?.querySelector<HTMLInputElement>('input') ?? undefined;
}

function focusLotNo(): void {
  void nextTick(() => {
    const input = getLotNoInput();

    input?.focus();
    input?.select();
  });
}

function handleLotEnter(): void {
  void getData();
}

function handleNativeEnter(): void {
  if (document.activeElement !== getLotNoInput()) {
    return;
  }

  const result = barcodeStyleLotId(lotNo.value.toUpperCase());
  lotNo.value = result.parsedId;

  if (result.isValid) {
    void getData();
    return;
  }

  clearData();
}

function blurReadonlyInput(event: FocusEvent): void {
  if (event.target instanceof HTMLElement) {
    event.target.blur();
  }
}

function buildRecipeSections(data: MetRecipeSearchData): RcpRecipeSection[] {
  if (data.category === 'CDOVERAYVI') {
    return [
      {
        id: 'overlay',
        title: 'OVERLAY RECIPE',
        machineTitle: 'MACHINE',
        rows: data.rcpOvItems.map((item) => ({
          recipe: item.OVRCP ?? '',
          machine: item.OVMACHINE ?? '',
        })),
      },
      {
        id: 'vi',
        title: 'VI RECIPE',
        machineTitle: 'MACHINE',
        rows: data.rcpViItems.map((item) => ({
          recipe: item.MACHINERECIPENAME ?? '',
          machine: item.MACHINENAME ?? '',
        })),
      },
      {
        id: 'cd',
        title: 'CD RECIPE',
        machineTitle: 'MACHINE',
        rows: data.rcpCdItems.map((item) => ({
          recipe: item.CDRCP ?? '',
          machine: item.CDMACHINE ?? '',
        })),
      },
      {
        id: 'mask',
        title: '진행 마스크',
        machineTitle: 'MACHINE',
        rows: data.maskItems.map((item) => ({
          recipe: item.RETICLENAME ?? '',
          machine: item.MACHINENAME ?? '',
        })),
      },
    ].filter((section) => section.rows.length > 0);
  }

  if (data.category === 'PQC') {
    return [
      {
        id: 'pqc',
        title: 'CD RECIPE',
        rows: data.rcpItems.map((item) => ({
          recipe: item.REVIEW_EQUIP ?? '',
          machine: '',
        })),
      },
    ].filter((section) => section.rows.length > 0);
  }

  if (data.category === 'THIK') {
    return [
      {
        id: 'thik',
        title: 'RECIPE',
        machineTitle: 'MACHINE',
        rows: data.rcpItems.map((item) => ({
          recipe: item.MACHINERECIPENAME ?? '',
          machine: item.MACHINENAME ?? '',
        })),
      },
    ].filter((section) => section.rows.length > 0);
  }

  return [];
}

async function syncLotQuery(): Promise<void> {
  await router.replace({
    query: {
      ...route.query,
      LOTID: lotNo.value,
    },
  });
}

async function getData(): Promise<void> {
  lotNo.value = normalizeLotNo(lotNo.value);
  clearGrid();

  if (isLotNoEmpty(lotNo.value)) {
    showDialog('에  러', 'LOT NO가 확인되지 않습니다.');
    focusLotNo();
    return;
  }

  isLoading.value = true;

  try {
    const result = await metRecipeSearch(lotNo.value, mainStore.facility);

    if (!result.ok || !result.data) {
      showDialog('에  러', result.message ?? '');
      return;
    }

    productName.value = result.data.productSpecName;
    processOperationName.value = result.data.processOperationName;
    operationDescription.value = result.data.operationDescription;
    recipeSections.value = buildRecipeSections(result.data);
    await syncLotQuery();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    showDialog('에  러', message);
  } finally {
    isLoading.value = false;
  }
}

async function getInspection(): Promise<void> {
  lotNo.value = normalizeLotNo(lotNo.value);

  if (isLotNoEmpty(lotNo.value)) {
    showDialog('에  러', 'LOT NO가 확인되지 않습니다.');
    return;
  }

  const operationName = processOperationName.value;

  if (operationName === '' || !operationName.includes('-')) {
    return;
  }

  const separatorIndex = operationName.indexOf('-');
  const sMOper = operationName.substring(0, separatorIndex);
  const sSOper = operationName.substring(separatorIndex + 1);

  isInspectionLoading.value = true;

  try {
    const result = await checkinspection({
      lotId: lotNo.value,
      facility: mainStore.facility,
      type: 'RCP',
      mOper: sMOper,
      sOper: sSOper,
    });

    if (!result.ok || !result.data) {
      showDialog('에  러', result.message ?? '');
      return;
    }

    queueDialogs(buildInspectionDialogs(result.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    showDialog('에  러', message);
  } finally {
    isInspectionLoading.value = false;
  }
}

function buildInspectionDialogs(data: CheckInspectionData): DialogItem[] {
  return [
    data.macroMsg
      ? { title: 'Macro 측정 정보', message: `▶ Macro 측정 [ ${data.macroMsg} ]` }
      : undefined,
    data.scopeMsg ? { title: 'Scope 측정 정보', message: data.scopeMsg } : undefined,
    data.cdMsg ? { title: 'CD 측정 POINT', message: `[CD 측정]\n ${data.cdMsg}` } : undefined,
    data.ovMsg ? { title: 'Overlay 측정 정보', message: data.ovMsg } : undefined,
    data.sampleViMsg
      ? { title: 'VI 측정 정보', message: `▶ Macro 측정 [ ${data.sampleViMsg} ]` }
      : undefined,
    data.sampleCdMsg
      ? { title: 'CD 측정 POINT', message: `[CD 측정]\n ${data.sampleCdMsg}` }
      : undefined,
    data.sampleOvMsg ? { title: 'Overlay 측정 정보', message: data.sampleOvMsg } : undefined,
  ].filter((item): item is DialogItem => Boolean(item));
}

function handleClose(): void {
  if (window.history.length > 1) {
    router.back();
    return;
  }

  void router.push(`/${ROUTE.main}`);
}

defineExpose({
  clearData,
  getData,
  getInspection,
});
</script>

<style src="./rcp-inquire.css"></style>
