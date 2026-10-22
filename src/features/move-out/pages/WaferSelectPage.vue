<template>
  <main class="wafer-select-page">
    <header class="wafer-select-page__header">
      <span>WAFER 선택</span>
    </header>

    <form class="wafer-select-page__content" @submit.prevent="sendWaferList">
      <section class="wafer-select-page__configuration">
        <div class="wafer-select-page__row">
          <!-- Legacy: editLotNo -->
          <BaseInput
            v-model="lotNo"
            label="LOT No."
            :readonly="!context.editable"
            @update:model-value="handleLotNoInput"
          />

          <!-- Legacy: btnSelectAll -->
          <BaseButton
            v-if="showSelectAllButton"
            variant="secondary"
            html-type="button"
            :disabled="selectAllDisabled"
            @click="selectAll"
          >
            전체선택
          </BaseButton>
        </div>

        <div class="wafer-select-page__row">
          <!-- Legacy: editMachineName -->
          <BaseInput
            v-model="machineName"
            label="MACHINE"
            :disabled="machineDisabled"
            @update:model-value="handleMachineNameInput"
            @keydown.enter.prevent="handleMachineEnter"
          />

          <!-- Legacy: btnMachine -->
          <BaseButton
            v-if="showMachineButton"
            variant="secondary"
            html-type="button"
            :disabled="machineDisabled"
            @click="getDummyCMachineInfo(machineName)"
          >
            장비
          </BaseButton>
        </div>

        <!-- Legacy: editCountName — XML inputType="number" -->
        <BaseInput v-model="count" type="number" label="COUNT" :disabled="countDisabled" />

        <!-- Legacy: btnSave -->
        <BaseButton
          v-if="showSaveButton"
          variant="secondary"
          html-type="button"
          block
          :disabled="saveDisabled"
          @click="dummyEqpInput"
        >
          <QIcon name="sym_o_save" aria-hidden="true" />
          저장
        </BaseButton>
      </section>

      <!-- Legacy: rcWaferList -->
      <section
        v-if="context.category !== 'COUNT'"
        class="wafer-select-page__wafer-grid"
        aria-label="Wafer list"
      >
        <BaseButton
          v-for="wafer in waferList"
          :key="wafer.slotNo"
          class="wafer-slot"
          variant="tertiary"
          :class="{
            'wafer-slot--selected': wafer.selected,
            'wafer-slot--disabled': wafer.disabled,
          }"
          :disabled="wafer.disabled || !context.editable"
          @click="toggleWafer(wafer)"
        >
          <span>{{ wafer.slotNo }}</span>

          <span v-if="wafer.machine && wafer.machine !== 'Empty'"> [{{ wafer.machine }}] </span>
        </BaseButton>
      </section>

      <section class="wafer-select-page__result">
        <div class="wafer-select-page__row">
          <!-- Legacy: txtWaferList -->
          <BaseInput :model-value="selectedWaferList" readonly />

          <!-- Legacy: btnModify -->
          <BaseButton
            v-if="showModifyButton"
            variant="secondary"
            html-type="button"
            :disabled="modifyDisabled"
            @click="resetWafer"
          >
            정정
          </BaseButton>
        </div>
      </section>

      <footer class="wafer-select-page__footer">
        <!-- Legacy: btnOk -->
        <BaseButton
          v-if="showOkButton"
          class="wafer-select-page__action"
          variant="primary"
          html-type="submit"
        >
          확인
        </BaseButton>

        <!-- Legacy: btnCancel -->
        <BaseButton
          class="wafer-select-page__action"
          variant="tertiary"
          html-type="button"
          @click="cancel"
        >
          취소
        </BaseButton>
      </footer>
    </form>
  </main>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { BaseButton, BaseInput } from 'src/components/base';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { okDialog } from 'src/services/ok-dialog.service';
import { barcodeStyleEqpId } from 'src/utils/barcode-style';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  createWaferGrid,
  resetWaferSelection,
  selectAllWafers,
  selectWaferWithLimit,
  toggleWaferSelection,
} from '../composables/useWaferSelect';
import { waferSelectService } from '../services/wafer-select.service';
import { useWaferSelectStore } from '../stores/wafer-select.store';
import {
  defaultWaferSelectInput,
  type WaferInfo,
  type WaferSelectPageEmits,
  type WaferSelectPageProps,
  type WaferSelectResult,
} from '../types/wafer-select.types';

const props = withDefaults(defineProps<WaferSelectPageProps>(), {
  input: () => defaultWaferSelectInput,
});
const emit = defineEmits<WaferSelectPageEmits>();

const router = useRouter();
const waferSelectStore = useWaferSelectStore();

const lotNo = ref(''); // Legacy: editLotNo
const machineName = ref(''); // Legacy: editMachineName
const count = ref(''); // Legacy: editCountName
const selectedMachine = ref('');
const waferList = ref<WaferInfo[]>([]); // Legacy: rcWaferList

/**
 * Legacy: OnSingleClickListener
 * Prevents duplicate actions from rapid double-taps on OK/Save/Machine.
 */
const actionInFlight = ref(false);

/**
 * Store input replaces Android Intent extras:
 * - sequence           <- SEQUENCE
 * - fixedCount         <- FIXEDCOUNT
 * - lotId              <- LOTID
 * - editable           <- EDITABLE
 * - category           <- CATEGORY
 * - existingWaferList  <- EXISTWAFERLIST
 * - disableWaferList   <- DISABLEWAFERLIST
 * - selectWaferList    <- SELECTWAFERLIST
 */
const context = computed(() => waferSelectStore.input ?? props.input);

// Legacy: txtWaferList
const selectedWaferList = computed(() =>
  waferList.value
    .filter((item) => item.selected)
    .map((item) => item.waferId)
    .sort()
    .join(','),
);

// Legacy: selectWafer.currentCount
const currentCount = computed(() => waferList.value.filter((item) => item.selected).length);

/**
 * Legacy: setInvisibleButton()
 *
 * Android used INVISIBLE/GONE when EDITABLE = "N". The new design uses v-if,
 * which removes the actions from the layout.
 */
const showSelectAllButton = computed(() => context.value.editable);
const showMachineButton = computed(() => context.value.editable);
const showSaveButton = computed(() => context.value.editable);
const showModifyButton = computed(() => context.value.editable);
const showOkButton = computed(() => context.value.editable);

/**
 * Legacy: setDisable()
 */
const machineDisabled = computed(
  () =>
    !context.value.editable ||
    context.value.category === '' ||
    context.value.category === 'COUNT' ||
    (context.value.category === 'SLOT' && context.value.area !== 'DIFF'),
);

const countDisabled = computed(() => !context.value.editable || context.value.category !== 'COUNT');

const saveDisabled = computed(() => !context.value.editable || context.value.category === '');

const selectAllDisabled = computed(
  () => !context.value.editable || context.value.category === 'COUNT',
);

const modifyDisabled = computed(() => !context.value.editable);

/**
 * Legacy: onCreate()
 *
 * The watcher initializes page state whenever the store/prop input changes.
 * createWaferGrid() replaces legacy setWaferButtonList() + makeSlotMapList().
 */
watch(
  context,
  (value) => {
    // Legacy: editLotNo.setText(lotId)
    lotNo.value = String(value.lotId ?? '').toUpperCase();
    machineName.value = '';
    count.value = '';
    selectedMachine.value = '';

    // Legacy: if (createCategoryDummy != "COUNT" && EXISTWAFERLIST is not empty)
    if (value.category !== 'COUNT' && value.existingWaferList) {
      waferList.value = createWaferGrid(
        value.existingWaferList,
        value.disableWaferList,
        value.selectWaferList,
        value.editable,
      );
    } else {
      waferList.value = [];
    }

    // Legacy: setDisable() calls getLotLastEvent() in COUNT/SLOT mode.
    if (value.category === 'COUNT' || value.category === 'SLOT') {
      void getLotLastEvent();
    }
  },
  { immediate: true },
);

/** Legacy: editLotNo.filters = arrayOf(InputFilter.AllCaps()) */
function handleLotNoInput(value: string | number | undefined): void {
  lotNo.value = String(value ?? '').toUpperCase();
}

/** Legacy: editMachineName.filters = arrayOf(InputFilter.AllCaps()) */
function handleMachineNameInput(value: string | number | undefined): void {
  machineName.value = String(value ?? '').toUpperCase();
}

/**
 * Legacy: editorActionListener
 * Handles IME_ACTION_DONE / KEYCODE_ENTER.
 */
function handleMachineEnter(): void {
  const { isValid, parsedId: eqpId } = barcodeStyleEqpId(machineName.value);

  if (!isValid) {
    return;
  }

  machineName.value = eqpId;
  void getDummyCMachineInfo(eqpId);
}

/**
 * Legacy equivalents:
 * - waferButton.performClick()
 * - WaferAdapter click handling
 * - selectWafer.currentCount
 */
function toggleWafer(item: WaferInfo): void {
  const result = toggleWaferSelection(
    item,
    currentCount.value,
    context.value.fixedCount,
    context.value.editable,
  );

  if (result === 'limit') {
    void showOkDialog('에러', '선택한 WAFER개수가 지정된 개수를 초과하였습니다.');
  }
}

/** Legacy: selectAll() */
function selectAll(): void {
  if (selectAllDisabled.value) {
    return;
  }

  selectAllWafers(waferList.value, currentCount.value, context.value.fixedCount);
}

/** Legacy: resetWafer() */
function resetWafer(): void {
  if (modifyDisabled.value) {
    return;
  }

  resetWaferSelection(waferList.value);
}

/**
 * Legacy: sendWaferList()
 * Android: setResult(Activity.RESULT_OK, returnIntent) + finish().
 */
function sendWaferList(): void {
  if (actionInFlight.value) {
    return;
  }
  actionInFlight.value = true;

  try {
    const result: WaferSelectResult = {
      sequence: context.value.sequence,
      selectedWaferList: selectedWaferList.value,
      selectedMachine: selectedMachine.value,
    };

    waferSelectStore.clear();
    waferSelectStore.complete(result);
    emit('select', result);
    router.back();
  } finally {
    actionInFlight.value = false;
  }
}

/**
 * Legacy: cancel()
 * Android: setResult(Activity.RESULT_CANCELED) + finish().
 */
function cancel(): void {
  waferSelectStore.clear();
  emit('cancel');
  router.back();
}

/**
 * Legacy: getDummyCMachineInfo()
 *
 * Replace the marked local fallback with the actual DUMMYEQPINFO service call.
 * The response EQPID must be assigned only to selected wafers whose machine is "Empty".
 */
async function getDummyCMachineInfo(searchEqpId: string): Promise<void> {
  const normalizedEqpId = searchEqpId.trim().toUpperCase();

  if (!normalizedEqpId) {
    await showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, '장비 호기를 입력 하세요.');

    return;
  }

  // Legacy: OnSingleClickListener — ignore taps while a lookup is running.
  if (actionInFlight.value) {
    return;
  }
  actionInFlight.value = true;

  // Legacy: CommonUtil.hideKeyboard()
  (document.activeElement as HTMLElement | null)?.blur();

  try {
    const response = await waferSelectService.getDummyEqpInfo(normalizedEqpId, lotNo.value);

    const eqpId = response.EQPID;

    waferList.value.forEach((item) => {
      if (item.machine === 'Empty') {
        item.machine = eqpId;
      }
    });
  } catch (error) {
    await showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, getErrorMessage(error));
  } finally {
    actionInFlight.value = false;
  }
}

/**
 * Legacy: getLotLastEvent()
 *
 * Integrate the actual LOTLSATEVENT service and pass CREATECATEGORY and
 * LASTEVENTCOMMENT to applyLotLastEvent(). Keeping parsing separate makes the
 * legacy behavior easy to test with mock data.
 */
async function getLotLastEvent(): Promise<void> {
  try {
    const response = await waferSelectService.getLotLastEvent(
      lotNo.value,
      context.value.area,
      context.value.category,
    );

    applyLotLastEvent(response.CREATECATEGORY, response.LASTEVENTCOMMENT);
  } catch (error) {
    await showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, getErrorMessage(error));
  }
}

/** Parsing logic extracted from legacy getLotLastEvent(). */
function applyLotLastEvent(category: string, rawLastEvent: string): void {
  const lastEvent = rawLastEvent.startsWith(' ') ? rawLastEvent.substring(1) : rawLastEvent;

  if (!lastEvent) {
    return;
  }

  if (category === 'COUNT') {
    // Legacy: lastEvent.substring(6, lastEvent.length)
    count.value = lastEvent.length > 6 ? lastEvent.substring(6) : '';
    return;
  }

  if (category !== 'SLOT' || lastEvent.length < 7) {
    return;
  }

  // Legacy: lastEvent.substring(7, lastEvent.length)
  const slotWafer = lastEvent.substring(7);
  if (!slotWafer) {
    return;
  }

  slotWafer.split(',').forEach((waferText) => {
    const waferId = waferText.substring(0, 2);
    const machine = waferText.length > 2 ? waferText.substring(3, waferText.length - 1) : '';
    const targetWafer = waferList.value.find((item) => item.slotNo === waferId);

    if (!targetWafer) {
      return;
    }

    // Legacy: waferButton.performClick() routes through the adapter listener,
    // which enforces the fixed-count limit and shows the overflow dialog.
    const limitReached = selectWaferWithLimit(
      targetWafer,
      currentCount.value,
      context.value.fixedCount,
    );

    if (limitReached) {
      void showOkDialog(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        '선택한 WAFER개수가 지정된 개수를 초과하였습니다.',
      );
      return;
    }

    if (context.value.area === 'DIFF' && machine && machine !== 'Empty') {
      targetWafer.machine = machine;
    }
  });
}

/**
 * Legacy: dummyEqpInput()
 *
 * Important legacy behavior:
 * - SLOT + DIFF requires a machine per selected wafer.
 * - SLOT + non-DIFF sends only wafer IDs.
 * - COUNT sends count text.
 */
async function dummyEqpInput(): Promise<void> {
  // Legacy: OnSingleClickListener — ignore taps while a save is running.
  if (actionInFlight.value) {
    return;
  }
  actionInFlight.value = true;

  try {
    let comment = '';

    if (context.value.category === 'SLOT') {
      const selectedWafers = waferList.value.filter((item) => item.selected);

      for (const wafer of selectedWafers) {
        if (context.value.area === 'DIFF') {
          if (!wafer.machine || wafer.machine === 'Empty') {
            await showOkDialog(
              COMMON_FIELD.TXTDIALOGTITLE_ERROR,
              '선택된 Wafer는 반드시 장비가 선택 되어야 합니다.',
            );
            return;
          }

          comment += comment
            ? `,${wafer.waferId}(${wafer.machine})`
            : `${wafer.waferId}(${wafer.machine})`;
        } else {
          comment += comment ? `,${wafer.waferId}` : wafer.waferId;
        }
      }
    } else if (context.value.category === 'COUNT') {
      if (!count.value.trim()) {
        await showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'COUNT를 입력 하세요.');
        return;
      }

      comment = count.value;
    }

    const response = await waferSelectService.dummyEqpInput(
      lotNo.value,
      context.value.category,
      comment,
    );

    const lotComment = response.LOTCOMMENT;

    const message = response.MSG;

    if (context.value.category === 'SLOT') {
      selectedMachine.value = lotComment;
      await showOkDialog('확인 COMMENT', '정상 처리 되었습니다.');
      return;
    }

    if (context.value.category === 'COUNT') {
      if (!message) {
        await showOkDialog('확인 COMMENT', '정상 처리 되었습니다.');
        count.value = lotComment.length > 6 ? lotComment.substring(6) : lotComment;
        selectedMachine.value = lotComment;
        return;
      }

      await showOkDialog('확인 COMMENT', message);
      selectedMachine.value = '';
    }
  } catch (error) {
    await showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, getErrorMessage(error));
  } finally {
    actionInFlight.value = false;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function showOkDialog(title: string, message: string): Promise<void> {
  await okDialog.show(title, message, COMMON_FIELD.BTNOKSTR);
}
</script>

<style scoped>
.wafer-select-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  color: var(--text-text-primary, #030712);
  background: linear-gradient(180deg, #1c493a 0%, #96b1a8 53.85%, #ecf8f1 100%);
}

.wafer-select-page__header {
  display: flex;
  padding: var(--spacing-space-3, 16px);
  align-items: center;
  justify-content: center;
  align-self: stretch;
}

.wafer-select-page__header span {
  color: var(--text-text-white, #f9fafb);
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
  line-height: 28px;
}

.wafer-select-page__content {
  display: flex;
  padding: var(--spacing-space-2, 12px);
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-space-3, 16px);
  flex: 1 0 0;
  align-self: stretch;
}

.wafer-select-page__configuration,
.wafer-select-page__result {
  display: flex;
  padding: var(--spacing-space-2, 12px);
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-space-1, 8px);
  align-self: stretch;
  border-radius: var(--8, 8px);
  border: 1px solid var(--border-border-primary, #d1d5dc);
  background: var(--background-background-secondary, #f9fafb);
  box-shadow: 0 8px 24px 0 rgba(13, 20, 31, 0.06);
}

.wafer-select-page__wafer-grid {
  display: inline-grid;
  padding: var(--spacing-space-2, 12px);
  row-gap: 8px;
  column-gap: 8px;
  align-self: stretch;
  grid-template-rows: repeat(5, fit-content(100%));
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-auto-flow: row;
  border-radius: var(--8, 8px);
  border: 1px solid var(--border-border-primary, #d1d5dc);
  background: var(--background-background-secondary, #f9fafb);
  box-shadow: 0 8px 24px 0 rgba(13, 20, 31, 0.06);
}

.wafer-select-page__configuration {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--spacing-space-1, 8px);
}

.wafer-select-page__row {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-space-1, 8px);
  align-self: stretch;
}

.wafer-select-page__row > :first-child {
  flex: 1;
  min-width: 0;
}

.wafer-select-page__wafer-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--spacing-space-1, 8px);
}

.wafer-slot {
  display: flex;
  height: auto;
  min-width: 0;
  min-height: 48px;
  padding: 4px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  overflow: visible;
  border-radius: var(--8, 8px);
  border: 1px solid var(--border-border-primary, #d1d5dc);
  color: var(--text-text-primary, #111827);
  background: var(--background-background-secondary, #fff);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.wafer-slot span {
  max-width: 100%;
  overflow: visible;
  overflow-wrap: anywhere;
  text-overflow: clip;
  white-space: normal;
}

.wafer-slot :deep(.ds-btn__label) {
  display: flex;
  min-width: 0;
  width: 100%;
  flex-direction: column;
  align-items: center;
  overflow: visible;
  white-space: normal;
}

.wafer-slot--selected {
  border-color: var(--button-primary-default-btn-primary-default, #0bb5aa);
  color: var(--text-text-white, #fff);
  background: var(--button-primary-default-btn-primary-default, #0bb5aa);
}

.wafer-slot--disabled {
  color: var(--text-text-disabled, #9ca3af);
  background: var(--background-background-disabled, #f3f4f6);
  cursor: not-allowed;
  opacity: 1;
}

.wafer-select-page__footer {
  display: flex;
  margin-top: auto;
  align-items: flex-start;
  align-self: stretch;
  gap: var(--spacing-space-1, 8px);
}

.wafer-select-page__action {
  flex: 1;
}
</style>
