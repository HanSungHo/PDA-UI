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
      <!-- Main Layout: Powered by BaseTableRow & BaseTableCell -->
      <div class="backup-bay-table-wrap">
        <BaseTableRow
          class="backup-bay-table"
          :columns="columns"
          :data-source="tableDataSource"
          :scroll="{ x: 'max-content' }"
        >
          <template #headerCell="{ column }">
            <BaseTableCell
              variant="heading"
              :class="[
                'backup-bay-header-cell',
                column.key === 'lotId' ? 'backup-bay-header-cell--lot' : '',
              ]"
              :align="column.key === 'lotId' ? 'start' : 'center'"
            >
              {{ column.title }}
            </BaseTableCell>
          </template>

          <template #bodyCell="{ column, index }">
            <!-- LOT NO Input Cell (Fixed Left) -->
            <template v-if="column.key === 'lotId'">
              <BaseTableCell variant="body">
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
              <BaseTableCell variant="body">
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
              <BaseTableCell variant="body">
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
              <BaseTableCell variant="body" :value="rows[index].jobCode" truncate>
                <div class="backup-bay-readonly-box">
                  {{ rows[index].jobCode }}
                </div>
              </BaseTableCell>
            </template>

            <!-- QTY Read-Only Cell -->
            <template v-else-if="column.key === 'quantity'">
              <BaseTableCell variant="body" :value="rows[index].quantity" truncate>
                <div class="backup-bay-readonly-box">
                  {{ rows[index].quantity }}
                </div>
              </BaseTableCell>
            </template>

            <!-- Process Name Read-Only Cell -->
            <template v-else-if="column.key === 'processName'">
              <BaseTableCell variant="body" :value="rows[index].processName" truncate>
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
          variant="primary"
          size="large"
          class="backup-bay-btn backup-bay-btn--run"
          label="실행"
          :loading="isExecuting"
          @click="handleRun"
        />
        <BaseButton
          variant="tertiary"
          size="large"
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
          <BaseButton
            variant="primary"
            size="medium"
            class="backup-bay-alert__btn"
            label="확인"
            @click="handleAlertOk"
          />
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
    width: 195,
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

/* Table Wrapper */
.backup-bay-table-wrap {
  width: 100%;
}

.backup-bay-table {
  width: 100%;
}

.backup-bay-input--lot {
  width: 100%;
  height: 36px;
  padding: 4px 8px;
  border: 1px solid var(--ds-color-border, #d1d5db);
  border-radius: var(--radius-6, 6px);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  background: var(--ds-color-bg, #ffffff);
  color: var(--ds-color-text, #101828);
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.backup-bay-input--lot:focus {
  border-color: var(--primary-teal-500, #02b0a5);
  box-shadow: 0 0 0 2px var(--primary-teal-50, #effdfc);
}

.backup-bay-input--valid {
  border-color: var(--ds-color-success, #12b76a);
  background-color: var(--primary-teal-50, #effdfc);
}

/* Select Controls */
.backup-bay-select {
  width: 100%;
  height: 36px;
  padding: 4px 26px 4px 8px;
  border: 1px solid var(--ds-color-border, #d1d5db);
  border-radius: var(--radius-6, 6px);
  background-color: var(--ds-color-bg, #ffffff);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M5 7.5L10 12.5L15 7.5' stroke='%23667085' stroke-width='1.67' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 16px 16px;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  color: var(--ds-color-text, #101828);
  font-size: 13px;
  font-weight: 500;
  outline: none;
  transition: border-color 0.15s ease;
}

.backup-bay-select:focus {
  border-color: var(--primary-teal-500, #02b0a5);
}

/* Readonly fields */
.backup-bay-readonly-box {
  width: 100%;
  height: 36px;
  padding: 6px 8px;
  border: 1px solid var(--ds-color-border-disabled, #e5e7eb);
  border-radius: var(--radius-6, 6px);
  background-color: var(--ds-color-bg-disabled, #f9fafb);
  color: var(--ds-color-text, #101828);
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

.backup-bay-btn {
  min-width: 120px;
}

/* Alert Modal */
.backup-bay-alert__header {
  font-size: 17px;
  font-weight: 700;
  color: var(--ds-color-text, #101828);
}

.backup-bay-alert__body {
  padding: 16px 8px;
}

.backup-bay-alert__text {
  font-size: 15px;
  color: var(--ds-color-text, #101828);
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
