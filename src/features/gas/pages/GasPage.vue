<template>
  <BaseScreen class="gas" title="GAS 사용량 입력" :aria-busy="state.loading">
    <section class="ds-screen__card" aria-label="CABINET 조회">
      <div class="ds-screen__card-row">
        <BaseInput
          size="small"
          ref="cabinetInput"
          data-testid="gas-cabinet-no"
          :inputmode="inputMode('gas-cabinet-no')"
          @pointerdown="releaseKeyboard"
          label="CABINET"
          autocomplete="off"
          uppercase
          :model-value="state.editCabinetNo"
          @update:model-value="state.editCabinetNo = String($event ?? '')"
          @keydown.enter.prevent
          @keyup.enter.prevent="onCabinetEnter"
        >
          <template #append><QIcon name="sym_o_search" size="16px" aria-hidden="true" /></template>
        </BaseInput>
        <BaseButton
          data-testid="gas-search"
          variant="secondary"
          size="small"
          :disabled="state.loading"
          @click="onSingleClick(getData)"
          >조회</BaseButton
        >
      </div>
    </section>

    <section class="ds-screen__card" aria-label="CABINET GAS">
      <BaseInput
        size="small"
        data-testid="gas-cabinet"
        label="CABINET"
        aria-label="CABINET"
        :model-value="state.txtCabinet"
        readonly
      />
      <BaseInput
        size="small"
        data-testid="gas-gas"
        label="GAS"
        aria-label="GAS"
        :model-value="state.txtGas"
        readonly
      />
    </section>

    <section class="ds-screen__card" aria-label="압력 무게">
      <div class="ds-screen__card-row">
        <span class="gas__pair-label">압력</span>
        <BaseInput
          size="small"
          data-testid="gas-pressure-previous"
          aria-label="전조 압력"
          placeholder="전조 압력"
          :model-value="state.txtPressure"
          readonly
        />
        <BaseInput
          size="small"
          ref="pressureInput"
          data-testid="gas-pressure"
          :inputmode="inputMode('gas-pressure')"
          @pointerdown="releaseKeyboard"
          aria-label="현재조 압력"
          placeholder="현재조 압력"
          type="number"
          :model-value="state.editPressure"
          @update:model-value="state.editPressure = String($event ?? '')"
        />
      </div>
      <div v-if="state.weightEnabled" class="ds-screen__card-row">
        <span class="gas__pair-label">무게</span>
        <BaseInput
          size="small"
          data-testid="gas-weight-previous"
          aria-label="전조 무게"
          placeholder="전조 무게"
          :model-value="state.txtWeight"
          readonly
        />
        <BaseInput
          size="small"
          data-testid="gas-weight"
          :inputmode="inputMode('gas-weight')"
          @pointerdown="releaseKeyboard"
          aria-label="현재조 무게"
          placeholder="현재조 무게"
          type="number"
          :model-value="state.editWeight"
          @update:model-value="state.editWeight = String($event ?? '')"
        />
      </div>
    </section>

    <section class="ds-screen__card" aria-label="COMMENT">
      <BaseInput
        size="small"
        data-testid="gas-comment"
        :inputmode="inputMode('gas-comment')"
        @pointerdown="releaseKeyboard"
        label="COMMENT"
        autocomplete="off"
        autocapitalize="characters"
        :model-value="state.editComment"
        @update:model-value="state.editComment = String($event ?? '')"
      />
    </section>

    <template #footer>
      <BaseButton
        class="ds-screen__ok"
        size="medium"
        data-testid="gas-ok"
        :disabled="state.loading"
        :loading="state.loading"
        @click="onSingleClick(setData)"
        >입력</BaseButton
      >
      <BaseButton
        class="ds-screen__cancel"
        variant="tertiary"
        size="medium"
        data-testid="gas-cancel"
        :disabled="state.loading"
        @click="onSingleClick(closeScreen)"
        >{{ CANCEL_LABEL }}</BaseButton
      >
    </template>

    <OkDialog
      :open="okDialog.isOpen.value"
      :title="okDialog.title.value"
      :message="okDialog.message.value"
      :confirm-label="okDialog.confirmLabel.value"
      @confirm="okDialog.confirm"
    />
  </BaseScreen>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { BaseButton, BaseInput, BaseScreen } from 'src/components/base';
import OkDialog from 'src/components/OkDialog.vue';
import { ROUTE } from 'src/constants/routes';
import { okDialog } from 'src/services/ok-dialog.service';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { createSingleClick } from '../composables/single-click';
import { useGas } from '../composables/use-gas';

defineOptions({ name: 'GasPage' });

// Android btn_cancel text is "취소 " (trailing space preserved).
const CANCEL_LABEL = '취소 ';

const router = useRouter();
const cabinetInput = ref<{ focus: () => void; select: () => void } | null>(null);
const pressureInput = ref<{ focus: () => void; select: () => void } | null>(null);

function focusAndSelect(input: typeof cabinetInput) {
  input.value?.focus();
  input.value?.select();
}

// Legacy hideSoftInput keeps focus and only hides the IME; inputmode="none" on the focused field
// does the same on the web until the user touches a field again.
const keyboardHiddenFor = ref<string | null>(null);

function inputMode(field: string) {
  return keyboardHiddenFor.value === field ? 'none' : undefined;
}

function releaseKeyboard() {
  keyboardHiddenFor.value = null;
}

function suppressKeyboard(element: Element | null) {
  keyboardHiddenFor.value = element?.closest<HTMLElement>('[data-testid]')?.dataset.testid ?? null;
}

const { state, getData, setData, onCabinetEnter } = useGas({
  hideKeyboard: () => suppressKeyboard(document.activeElement),
  focusCabinet: () => focusAndSelect(cabinetInput),
  focusPressure: () => focusAndSelect(pressureInput),
});
// One listener instance is shared by the search, OK and cancel buttons, as in GasActivity.
const onSingleClick = createSingleClick();

onMounted(() => cabinetInput.value?.focus());

function closeScreen() {
  if (router.options.history.state.back) router.back();
  else void router.replace(`/${ROUTE.main}`);
}
</script>

<style scoped>
/* Screen-owned element only: Base components and BaseScreen are styled through props. */
.gas__pair-label {
  flex: none;
  color: var(--text-text-primary);
  font-size: var(--font-size-12px);
}
</style>
