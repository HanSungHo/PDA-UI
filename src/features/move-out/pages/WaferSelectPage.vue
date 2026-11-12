<template>
  <BaseScreen title="WAFER 선택">
    <section class="ds-screen__card" aria-label="LOT 및 장비 설정">
      <div class="ds-screen__card-row">
        <!-- Legacy: editLotNo -->
        <BaseInput
          v-model="lotNo"
          label="LOT No."
          :disabled="!context.editable"
          @update:model-value="handleLotNoInput"
        />

        <!-- Legacy: btnSelectAll -->
        <BaseButton
          :class="{ 'wafer-select__action--invisible': !context.editable }"
          variant="secondary"
          size="small"
          label="전체선택"
          :disabled="selectAllDisabled"
          @click="selectAll"
        />
      </div>

      <div class="ds-screen__card-row">
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
          :class="{ 'wafer-select__action--invisible': !context.editable }"
          variant="secondary"
          size="small"
          label="장비"
          :disabled="machineDisabled"
          @click="getDummyCMachineInfo(machineName)"
        />
      </div>

      <!-- Legacy: editCountName — XML inputType="number" -->
      <BaseInput v-model="count" type="number" label="COUNT" :disabled="countDisabled" />

      <!-- Legacy: btnSave -->
      <BaseButton
        :class="{ 'wafer-select__action--invisible': !context.editable }"
        variant="secondary"
        size="medium"
        block
        :disabled="saveDisabled"
        @click="dummyEqpInput"
      >
        <template #icon><QIcon name="sym_o_save" aria-hidden="true" /></template>
        저장
      </BaseButton>
    </section>

    <!-- Legacy: rcWaferList -->
    <section
      v-if="context.category !== 'COUNT'"
      class="ds-screen__card wafer-grid"
      aria-label="Wafer list"
    >
      <BaseButton
        v-for="wafer in waferList"
        :key="wafer.slotNo"
        class="wafer-slot"
        :variant="wafer.selected ? 'primary' : 'tertiary'"
        :disabled="wafer.disabled"
        :aria-disabled="wafer.disabled || !context.editable || undefined"
        @click="toggleWafer(wafer)"
      >
        <!-- Legacy: empty slots never get their text set -->
        <span v-if="wafer.waferId !== 'empty'">{{ wafer.slotNo }}</span>
        <span v-if="wafer.machine && wafer.machine !== 'Empty'">[{{ wafer.machine }}]</span>
      </BaseButton>
    </section>

    <section class="ds-screen__card" aria-label="선택된 WAFER">
      <div class="ds-screen__card-row">
        <!-- Legacy: txtWaferList -->
        <BaseInput :model-value="selectedWaferList" aria-label="선택된 WAFER" readonly />

        <!-- Legacy: btnModify -->
        <BaseButton
          v-if="context.editable"
          variant="secondary"
          size="small"
          label="정정"
          @click="resetWafer"
        />
      </div>
    </section>

    <template #footer>
      <!-- Legacy: btnOk -->
      <BaseButton v-if="context.editable" size="medium" label="확인" @click="sendWaferList" />
      <!-- Legacy: btnCancel -->
      <BaseButton variant="tertiary" size="medium" label="취소" @click="cancel" />
    </template>
  </BaseScreen>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { BaseButton, BaseInput, BaseScreen } from 'src/components/base';
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

/*
 * Legacy: setInvisibleButton()
 *
 * EDITABLE = "N": btnSelectAll/btnMachine/btnSave are INVISIBLE (keep their
 * space, see .wafer-select__action--invisible); btnModify/btnOk are GONE (v-if).
 */

/**
 * Legacy: setDisable()
 *
 * Legacy never disables fields because of EDITABLE; setInvisibleButton() only
 * hides buttons and disables editLotNo.
 */
const machineDisabled = computed(
  () =>
    context.value.category === '' ||
    context.value.category === 'COUNT' ||
    (context.value.category === 'SLOT' && context.value.area !== 'DIFF'),
);

const countDisabled = computed(
  () => context.value.category === '' || context.value.category === 'SLOT',
);

const saveDisabled = computed(() => context.value.category === '');

const selectAllDisabled = computed(() => context.value.category === 'COUNT');

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
    }

    // Legacy: in DIFF, waferInfo.machine = machineName even when it is empty.
    if (context.value.area === 'DIFF') {
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

          // Legacy: waferInfo.waferId is the slot number ("01"); waferName is the full key.
          comment += comment
            ? `,${wafer.slotNo}(${wafer.machine})`
            : `${wafer.slotNo}(${wafer.machine})`;
        } else {
          comment += comment ? `,${wafer.slotNo}` : wafer.slotNo;
        }
      }
    } else if (context.value.category === 'COUNT') {
      // BaseInput type="number" emits numbers; legacy compares the raw text.
      const countText = String(count.value ?? '');
      if (!countText) {
        await showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, 'COUNT를 입력 하세요.');
        return;
      }

      comment = countText;
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
/* Android View.INVISIBLE: hidden but keeps its layout space. */
.wafer-select__action--invisible {
  visibility: hidden;
}

/* Figma "Process Table": fixed 5-column slot grid. */
.wafer-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

/* Figma "Select Item": 12px medium label, 12px padding, stacked slot/machine. */
.wafer-slot {
  --ds-btn-height: auto;
  --ds-btn-padding: var(--spacing-space-2, 12px);

  min-width: 0;
  min-height: 48px;
  font-size: 12px;
  font-weight: 500;
}

.wafer-slot :deep(.ds-btn__label) {
  flex-direction: column;
  white-space: normal;
}
</style>
