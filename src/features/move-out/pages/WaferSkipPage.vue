<!-- eslint-disable vue/attribute-hyphenation -->
<template>
  <main class="wafer-skip-page">
    <header class="wafer-skip-page__header">
      <h1 class="wafer-skip-page__title">재진행한 WAFER 수량 입력</h1>
    </header>

    <form class="wafer-skip-page__content" @submit.prevent="handleCorrect">
      <section class="wafer-skip-page__summary" aria-label="Quantity summary">
        <BaseInput
          class="wafer-skip-page__field"
          label="현재 LOT QTY"
          :model-value="context.waferQty"
          readonly
        />
        <BaseInput
          class="wafer-skip-page__field"
          label="장비 진행 QTY"
          :model-value="context.machineQty"
          readonly
        />
      </section>

      <div class="wafer-skip-page__notice-card">
        <p class="wafer-skip-page__notice">
          LOT의 수량과 장비에서 진행한 수량이 불일치 합니다.<br />
          재진행한 WAFER 수량을 입력 하신후, Move Out 하시기 바랍니다.
        </p>
      </div>

      <section class="wafer-skip-page__correction" aria-label="Quantity correction">
        <BaseDropdownList
          v-model="reason"
          class="wafer-skip-page__field"
          label="사유 선택"
          placeholder="선택"
          :options="reasonOptions"
        />
        <div class="wafer-skip-page__quantity-row">
          <BaseInput
            v-model="skipWafer"
            class="wafer-skip-page__field wafer-skip-page__quantity-input"
            label="추가 진행한 QTY"
            type="number"
            placeholder="수량 입력"
          />
          <BaseCheckbox v-model="isMinus" class="wafer-skip-page__minus" label="(-) 마이너스" />
        </div>
      </section>

      <footer class="wafer-skip-page__footer">
        <BaseButton
          class="wafer-skip-page__action"
          size="large"
          variant="primary"
          html-type="submit"
        >
          수량 보정
        </BaseButton>
        <BaseButton
          class="wafer-skip-page__action"
          size="large"
          variant="tertiary"
          @click="handleCancel"
        >
          취소
        </BaseButton>
      </footer>
    </form>
  </main>
</template>

<script setup lang="ts">
import { BaseButton, BaseCheckbox, BaseDropdownList, BaseInput } from 'src/components/base';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { okDialog } from 'src/services/ok-dialog.service';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useWaferSkipStore } from '../stores/wafer-skip.store';
import {
  defaultWaferSkipInput,
  type WaferSkipInput,
  type WaferSkipPageEmits,
  type WaferSkipPageProps,
  type WaferSkipResult,
} from '../types/wafer-skip.types';

const props = withDefaults(defineProps<WaferSkipPageProps>(), {
  input: () => defaultWaferSkipInput,
});
const emit = defineEmits<WaferSkipPageEmits>();

const route = useRoute();
const router = useRouter();
const waferSkipStore = useWaferSkipStore();

const reason = ref<string>();
const skipWafer = ref<string | number>('');
const isMinus = ref(false);

const standalonePreviewInput: WaferSkipInput = {
  lotId: 'LOT-A260915-018',
  waferQty: '25',
  machineQty: '20',
  reasonList: ['REWORK', 'EQUIPMENT ERROR', 'SCRAP'],
};

const context = computed<WaferSkipInput>(() => {
  if (waferSkipStore.input) {
    return waferSkipStore.input;
  }
  if (props.input && (props.input.lotId || props.input.reasonList.length > 0)) {
    return props.input;
  }
  const queryLotId = typeof route?.query?.lotId === 'string' ? route.query.lotId : '';
  const queryWaferQty = typeof route?.query?.waferQty === 'string' ? route.query.waferQty : '';
  const queryMachineQty =
    typeof route?.query?.machineQty === 'string' ? route.query.machineQty : '';
  if (queryLotId || queryWaferQty || queryMachineQty) {
    return {
      lotId: queryLotId || standalonePreviewInput.lotId,
      waferQty: queryWaferQty || standalonePreviewInput.waferQty,
      machineQty: queryMachineQty || standalonePreviewInput.machineQty,
      reasonList: standalonePreviewInput.reasonList,
    };
  }
  return standalonePreviewInput;
});
const reasonOptions = computed(() =>
  context.value.reasonList.map((item) => ({ label: item, value: item })),
);

function handleCorrect(): void {
  if (!validateQuantityAdjustment()) {
    return;
  }

  const result: WaferSkipResult = {
    skipWafer: String(skipWafer.value),
    reason: reason.value ?? '',
    minusString: isMinus.value ? 'MINUS' : '',
  };
  waferSkipStore.clear();
  waferSkipStore.complete(result);
  emit('correct', result);
  router.back();
}

/**
 * Legacy-equivalent validation logic migrated from conditionCheck().
 *
 * Ensures that:
 * - A quantity adjustment reason is selected.
 * - Additional quantity is provided.
 * - The calculated quantity matches the expected lot quantity.
 *
 * Calculation:
 * - Minus mode: Machine Qty - Added Qty = Lot Qty
 * - Plus mode: Machine Qty + Added Qty = Lot Qty
 *
 * Returns true when validation succeeds;
 * otherwise shows an error dialogand returns false.
 */
function validateQuantityAdjustment(): boolean {
  if (!reason.value) {
    void showOkDialog('필수 입력', '수량 보정 사유를 선택 하세요 ');
    return false;
  }

  if (String(skipWafer.value).trim() === '') {
    void showOkDialog('필수 입력', '추가 진행 QTY를 입력 하세요.');
    return false;
  }

  const waferQtyNumber = Number(context.value.waferQty);
  const machineQtyNumber = Number(context.value.machineQty);
  const skipWaferNumber = Number(skipWafer.value);

  const calculatedQty = isMinus.value
    ? machineQtyNumber - skipWaferNumber
    : machineQtyNumber + skipWaferNumber;

  if (calculatedQty !== waferQtyNumber) {
    skipWafer.value = '';
    void showOkDialog(
      COMMON_FIELD.TXTDIALOGTITLE_ERROR,
      '입력한 추가진행 수량이 올바르지 않습니다. \n 추가 진행 QTY를 다시 입력 하세요.',
    );
    return false;
  }

  return true;
}

function showOkDialog(title: string, message: string): void {
  void okDialog.show(title, message, COMMON_FIELD.BTNOKSTR);
}

function handleCancel(): void {
  emit('cancel');
  router.back();
}
</script>

<style scoped>
.wafer-skip-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  /* background: linear-gradient(180deg, var(--teal-800) 0%, var(--teal-300) 54%, var(--teal-50) 100%); */
  color: var(--text-text-primary, #030712);
  background: linear-gradient(180deg, #1c493a 0%, #96b1a8 53.85%, #ecf8f1 100%);
}

.wafer-skip-page__header {
  display: flex;
  justify-content: center;
  padding: var(--spacing-space-3, 16px);
  align-items: center;
  align-self: stretch;
}

.wafer-skip-page__title {
  color: var(--text-text-white, #f9fafb);
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
  line-height: 28px;
  margin: 0;
  text-align: center;
}

.wafer-skip-page__content {
  display: flex;
  padding: var(--spacing-space-2, 12px);
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-space-3, 16px);
  flex: 1 0 0;
  align-self: stretch;
}

.wafer-skip-page__summary,
.wafer-skip-page__correction,
.wafer-skip-page__notice-card {
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

.wafer-skip-page__field {
  width: 100%;
}

.wafer-skip-page__notice {
  color: var(--text-text-warning, #ea580b);
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 20px;
  margin: 0;
}

.wafer-skip-page__quantity-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-space-1, 8px);
  align-self: stretch;
}

.wafer-skip-page__minus {
  margin-bottom: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.wafer-skip-page__footer {
  margin-top: auto;
  display: flex;
  padding: var(--spacing-space-2, 12px);
  align-items: flex-start;
  align-self: stretch;
  gap: var(--spacing-space-1, 8px);
}

.wafer-skip-page__action {
  flex: 1;
}
</style>
