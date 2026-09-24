<template>
  <BaseModal
    :open="modelValue"
    title="Backup Bay 변경"
    :closable="true"
    :overlay-closable="false"
    class="backup-bay-modal"
    @cancel="handleClose"
    @update:open="handleModalOpenChange"
  >
    <template #title>
      <span class="backup-bay-modal__title">Backup Bay 변경</span>
    </template>

    <div class="backup-bay-content">
      <!-- Dev Simulator Bar (Quick Scanner Testing)
      <div class="backup-bay-devbar">
        <span class="backup-bay-devbar__label">Scanner Mode:</span>
        <label class="backup-bay-devbar__toggle">
          <input v-model="allowDirectInput" type="checkbox" />
          <span>{{ allowDirectInput ? 'Direct Input' : 'Strict Legacy Barcode (" WA...")' }}</span>
        </label>
        <div class="backup-bay-devbar__chips">
          <button
            type="button"
            class="backup-bay-devbar__chip backup-bay-devbar__chip--fill"
            title="Pre-fill all 7 rows with mock valid LOTs"
            @click="fillAllMockLots"
          >
            ⚡ Fill 7 LOTs
          </button>
          <button
            type="button"
            class="backup-bay-devbar__chip"
            title="Scan Valid LOT"
            @click="simulateScan('WA2409001')"
          >
            + Valid LOT
          </button>
          <button
            type="button"
            class="backup-bay-devbar__chip backup-bay-devbar__chip--warn"
            title="Scan RUN LOT (Interlock check)"
            @click="simulateScan('WA2409002')"
          >
            + RUN LOT
          </button>
          <button
            type="button"
            class="backup-bay-devbar__chip backup-bay-devbar__chip--warn"
            title="Scan OnHold LOT (Interlock check)"
            @click="simulateScan('WA2409003')"
          >
            + OnHold LOT
          </button>
          <button
            type="button"
            class="backup-bay-devbar__chip backup-bay-devbar__chip--warn"
            title="Scan Unreleased LOT (Interlock check)"
            @click="simulateScan('WA2409004')"
          >
            + Created LOT
          </button>
        </div>
      </div>
      -->

      <!-- Main Layout: Powered by BaseTableRow & BaseTableCell -->
      <div class="backup-bay-table-wrap">
        <BaseTableRow class="backup-bay-table" :columns="columns" :data-source="tableDataSource">
          <template #headerCell="{ column }">
            <BaseTableCell
              variant="heading"
              :class="[
                'backup-bay-header-cell',
                column.key === 'lotId' ? 'backup-bay-header-cell--lot' : '',
              ]"
            >
              {{ column.title }}
            </BaseTableCell>
          </template>

          <template #bodyCell="{ column, index }">
            <!-- LOT NO Input Cell (Fixed Left) -->
            <template v-if="column.key === 'lotId'">
              <BaseTableCell variant="body" class="backup-bay-cell--lot">
                <input
                  :ref="(el) => setInputRef(el, index)"
                  v-model="rows[index].lotId"
                  type="text"
                  autocapitalize="characters"
                  class="backup-bay-input backup-bay-input--lot"
                  :class="{ 'backup-bay-input--valid': rows[index].isValid }"
                  placeholder="Scan/Enter"
                  @keydown="handleLotKeydown(index, $event)"
                  @focus="handleLotFocus($event)"
                />
              </BaseTableCell>
            </template>

            <!-- Level (Floor) Dropdown Cell -->
            <template v-else-if="column.key === 'selectedFloor'">
              <BaseTableCell variant="body" class="backup-bay-cell--level">
                <select
                  class="backup-bay-select"
                  :value="rows[index].selectedFloor"
                  @change="handleFloorChange(index, $event)"
                >
                  <option v-for="floor in floorList" :key="floor" :value="floor">
                    {{ floor }}
                  </option>
                </select>
              </BaseTableCell>
            </template>

            <!-- BAY Dropdown Cell -->
            <template v-else-if="column.key === 'selectedBay'">
              <BaseTableCell variant="body" class="backup-bay-cell--bay">
                <select
                  class="backup-bay-select"
                  :value="rows[index].selectedBay"
                  @change="handleBayChange(index, $event)"
                >
                  <option value="" disabled>Select</option>
                  <option v-for="bay in rows[index].bayOptions" :key="bay" :value="bay">
                    {{ bay }}
                  </option>
                </select>
              </BaseTableCell>
            </template>

            <!-- JOB Read-Only Cell -->
            <template v-else-if="column.key === 'jobCode'">
              <BaseTableCell
                variant="body"
                class="backup-bay-cell--job"
                :value="rows[index].jobCode"
                truncate
              >
                <div class="backup-bay-readonly-box">
                  {{ rows[index].jobCode }}
                </div>
              </BaseTableCell>
            </template>

            <!-- QTY Read-Only Cell -->
            <template v-else-if="column.key === 'quantity'">
              <BaseTableCell
                variant="body"
                class="backup-bay-cell--qty"
                :value="rows[index].quantity"
                truncate
              >
                <div class="backup-bay-readonly-box">
                  {{ rows[index].quantity }}
                </div>
              </BaseTableCell>
            </template>

            <!-- Process Name Read-Only Cell -->
            <template v-else-if="column.key === 'processName'">
              <BaseTableCell
                variant="body"
                class="backup-bay-cell--process"
                :value="rows[index].processName"
                truncate
              >
                <div class="backup-bay-readonly-box backup-bay-readonly-box--process">
                  {{ rows[index].processName }}
                </div>
              </BaseTableCell>
            </template>
          </template>
        </BaseTableRow>
      </div>
    </div>

    <template #footer>
      <div class="backup-bay-actions">
        <BaseButton
          class="backup-bay-btn backup-bay-btn--run"
          label="실행"
          :loading="isExecuting"
          @click="handleRun"
        />
        <BaseButton
          class="backup-bay-btn backup-bay-btn--close"
          label="닫기"
          :disabled="isExecuting"
          @click="handleClose"
        />
      </div>
    </template>

    <!-- OkDialog / Alert Modal for Errors and Completion -->
    <BaseModal
      :open="alertState.open"
      :closable="false"
      :overlay-closable="false"
      class="backup-bay-alert-modal"
      @update:open="store.closeAlert"
    >
      <template #title>
        <div class="backup-bay-alert__header">
          <span>{{ alertState.title }}</span>
        </div>
      </template>

      <div class="backup-bay-alert__body">
        <p class="backup-bay-alert__text">{{ alertState.message }}</p>
      </div>

      <template #footer>
        <div class="backup-bay-alert__footer">
          <BaseButton class="backup-bay-alert__btn" label="확인" @click="handleAlertOk" />
        </div>
      </template>
    </BaseModal>
  </BaseModal>
</template>

<script setup lang="ts">
import type { TableColumnsType } from 'ant-design-vue';
import { storeToRefs } from 'pinia';
import type { BaseTableRowRecord } from 'src/components/base';
import { BaseButton, BaseModal, BaseTableCell, BaseTableRow } from 'src/components/base';
// import { formatAsLegacyBarcode } from 'src/services/backup-bay.service';
import { useBackupBayStore } from 'src/stores/backup-bay.store';
import type { BackupBayDialogEmits, BackupBayDialogProps } from 'src/types/backup-bay.types';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

defineOptions({ name: 'BackupBayDialog' });

const props = defineProps<BackupBayDialogProps>();
const emit = defineEmits<BackupBayDialogEmits>();

const store = useBackupBayStore();
const { floorList, rows, isExecuting, alertState } = storeToRefs(store);

const tableDataSource = computed(() => rows.value as unknown as BaseTableRowRecord[]);

const columns: TableColumnsType = [
  {
    title: 'LOT NO',
    dataIndex: 'lotId',
    key: 'lotId',
    width: 145,
    fixed: 'left',
  },
  {
    title: '층',
    dataIndex: 'selectedFloor',
    key: 'selectedFloor',
    width: 90,
  },
  {
    title: 'BAY',
    dataIndex: 'selectedBay',
    key: 'selectedBay',
    width: 120,
  },
  {
    title: 'JOB',
    dataIndex: 'jobCode',
    key: 'jobCode',
    width: 110,
  },
  {
    title: 'QTY',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 80,
  },
  {
    title: 'Process Name',
    dataIndex: 'processName',
    key: 'processName',
    minWidth: 195,
  },
];

const inputElements = ref<(HTMLInputElement | null)[]>([]);
const pendingFocusIndex = ref<number | null>(null);

function setInputRef(el: unknown, index: number) {
  inputElements.value[index] = el as HTMLInputElement | null;
}

function focusLotInput(index: number) {
  void nextTick(() => {
    const input = inputElements.value[index];
    if (input) {
      input.focus();
      input.select();
    }
  });
}

function handleLotFocus(event: FocusEvent) {
  const target = event.target as HTMLInputElement;
  target?.select();
}

async function handleLotKeydown(index: number, event: KeyboardEvent) {
  // Disregard IME composition confirmation (Korean/CJK input handling per project conventions)
  if (event.isComposing) return;

  if (event.key === 'Enter') {
    event.preventDefault();
    const rawVal = rows.value[index]?.lotId ?? '';
    const result = await store.processLotInput(index, rawVal);

    if (result.success) {
      focusLotInput(result.focusIndex);
    } else {
      pendingFocusIndex.value = result.focusIndex;
    }
  }
}

function handleAlertOk() {
  store.closeAlert();
  if (pendingFocusIndex.value !== null) {
    focusLotInput(pendingFocusIndex.value);
    pendingFocusIndex.value = null;
  }
}

async function handleFloorChange(index: number, event: Event) {
  const target = event.target as HTMLSelectElement;
  await store.setFloor(index, target.value);
}

function handleBayChange(index: number, event: Event) {
  const target = event.target as HTMLSelectElement;
  store.setBay(index, target.value);
}

async function handleRun() {
  const result = await store.executeRun();
  if (result.success) {
    emit('completed', result.count || 0);
    focusLotInput(0);
  }
}

function handleClose() {
  emit('update:modelValue', false);
}

function handleModalOpenChange(open: boolean) {
  emit('update:modelValue', open);
}

// Dev scanner simulation tool (Commented out with devbar)
/*
async function simulateScan(lotId: string) {
  // Find first empty row or row 0
  let targetIndex = rows.value.findIndex((r) => !r.lotId.trim());
  if (targetIndex === -1) targetIndex = 0;
 
  const rawBarcode = allowDirectInput.value ? lotId : formatAsLegacyBarcode(lotId);
  rows.value[targetIndex].lotId = rawBarcode;
 
  const result = await store.processLotInput(targetIndex, rawBarcode);
  if (result.success) {
    focusLotInput(result.focusIndex);
  } else {
    pendingFocusIndex.value = result.focusIndex;
  }
}
 
async function fillAllMockLots() {
  const sampleLots = [
    'WA2409001',
    'WA2409005',
    'WA2409006',
    'WA2409007',
    'WA2409008',
    'WA2409009',
    'WA2409010',
  ];
  for (let i = 0; i < 7; i++) {
    const lotId = sampleLots[i];
    const rawBarcode = allowDirectInput.value ? lotId : formatAsLegacyBarcode(lotId);
    rows.value[i].lotId = rawBarcode;
    await store.processLotInput(i, rawBarcode);
  }
}
*/

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      await store.initDialog();
      focusLotInput(0);
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (props.modelValue) {
    void store.initDialog();
    focusLotInput(0);
  }
});
</script>

<style scoped>
.backup-bay-modal__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--ds-color-neutral-900, #101828);
  line-height: 1.3;
}

.backup-bay-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 4px;
  background-color: var(--ds-color-bg-secondary, #f7f8f9);
}

/* Dev Bar (Commented out)
.backup-bay-devbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 10px;
  background: var(--ds-color-neutral-100, #f3f4f6);
  border-radius: var(--ds-radius-sm);
  font-size: 11px;
}
 
.backup-bay-devbar__label {
  font-weight: 600;
  color: var(--ds-color-text-secondary);
}
 
.backup-bay-devbar__toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--ds-color-text);
}
 
.backup-bay-devbar__chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-left: auto;
}
 
.backup-bay-devbar__chip {
  padding: 2px 6px;
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-color-bg);
  cursor: pointer;
  font-size: 10px;
  font-weight: 500;
  color: var(--ds-color-text);
  transition: all 0.15s ease;
}
 
.backup-bay-devbar__chip:hover {
  background: var(--ds-color-brand-50, #eef2ff);
  border-color: var(--ds-color-primary);
}
 
.backup-bay-devbar__chip--warn {
  color: var(--ds-color-error);
}
 
.backup-bay-devbar__chip--fill {
  background: var(--ds-color-brand-50, #eef2ff);
  color: var(--ds-color-primary, #1976d2);
  font-weight: 700;
  border-color: var(--ds-color-primary, #1976d2);
}
*/

/* Table Wrapper */
.backup-bay-table-wrap {
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-color-bg);
  overflow-x: auto;
  overflow-y: hidden;
}

.backup-bay-table {
  min-width: 740px;
}

/* Hide selection column (checkboxes) rendered by default in BaseTableRow */
.backup-bay-table :deep(.ant-table-selection-column),
.backup-bay-table :deep(.ant-table-selection-col) {
  display: none !important;
  width: 0 !important;
  padding: 0 !important;
}

/* BaseTableRow Ant Table Customization */
.backup-bay-table :deep(.ant-table) {
  background: var(--ds-color-bg);
}

.backup-bay-table :deep(.ant-table-thead > tr > th) {
  padding: 0 !important;
  background-color: var(--figma-global-colors-blue-500, #2096fb) !important;
  border-bottom: none !important;
}

.backup-bay-table :deep(.ant-table-tbody > tr > td) {
  padding: 0 !important;
  border-bottom: 1px solid var(--ds-color-neutral-100) !important;
}

/* BaseTableCell in Header */
:deep(.backup-bay-header-cell) {
  background-color: var(--figma-global-colors-blue-500, #2096fb);
  color: var(--figma-global-colors-white-opacity-100, #ffffff);
  font-weight: 700;
  font-size: 14px;
  height: 44px;
  padding: 0 10px;
  box-sizing: border-box;
}

:deep(.backup-bay-header-cell--lot) {
  padding-left: 12px;
}

/* BaseTableCell in Body */
:deep(.backup-bay-cell--lot),
:deep(.backup-bay-cell--level),
:deep(.backup-bay-cell--bay),
:deep(.backup-bay-cell--job),
:deep(.backup-bay-cell--qty),
:deep(.backup-bay-cell--process) {
  height: 48px;
  padding: 6px 8px;
  box-sizing: border-box;
  align-items: center;
}

.backup-bay-input--lot {
  width: 100%;
  height: 36px;
  padding: 4px 8px;
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-sm);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  background: var(--ds-color-bg);
  color: var(--ds-color-text);
  outline: none;
  transition: border-color 0.15s ease;
}

.backup-bay-input--lot:focus {
  border-color: var(--ds-color-primary);
  box-shadow: 0 0 0 2px var(--ds-color-brand-50);
}

.backup-bay-input--valid {
  border-color: var(--ds-color-success);
  background-color: #f6ffed;
}

/* Select Controls */
.backup-bay-select {
  width: 100%;
  height: 36px;
  padding: 4px 26px 4px 8px;
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-sm);
  background-color: var(--ds-color-bg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M5 7.5L10 12.5L15 7.5' stroke='%23667085' stroke-width='1.67' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 16px 16px;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  color: var(--ds-color-text);
  font-size: 13px;
  font-weight: 500;
  outline: none;
}

.backup-bay-select:focus {
  border-color: var(--ds-color-primary);
}

/* Readonly fields */
.backup-bay-readonly-box {
  width: 100%;
  height: 36px;
  padding: 6px 8px;
  border: 1px solid var(--ds-color-border-disabled);
  border-radius: var(--ds-radius-sm);
  background-color: var(--ds-color-bg-disabled);
  color: var(--ds-color-text);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
}

.backup-bay-readonly-box--process {
  font-size: 12px;
}

/* Action Buttons Footer */
.backup-bay-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  width: 100%;
}

:deep(.backup-bay-btn) {
  min-width: 120px;
  height: 44px;
  font-size: 16px;
  font-weight: 700;
  border-radius: var(--ds-radius-sm);
}

:deep(.backup-bay-btn--run) {
  background-color: #31bbfb !important;
  border-color: #31bbfb !important;
  color: #ffffff !important;
}

:deep(.backup-bay-btn--close) {
  background-color: #130067 !important;
  border-color: #130067 !important;
  color: #ffffff !important;
}

/* Alert Modal */
.backup-bay-alert__header {
  font-size: 17px;
  font-weight: 700;
  color: var(--ds-color-text);
}

.backup-bay-alert__body {
  padding: 16px 8px;
}

.backup-bay-alert__text {
  font-size: 15px;
  color: var(--ds-color-text);
  line-height: 1.4;
  margin: 0;
  white-space: pre-line;
}

.backup-bay-alert__footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

.backup-bay-alert__btn {
  min-width: 80px;
}
</style>
