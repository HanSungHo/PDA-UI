<template>
  <main class="wet-auto-page">
    <BaseScreen class="wet-auto-screen" title="WET 자동화">
      <section class="wet-auto-card ds-screen__card" aria-label="장비 정보">
        <div class="ds-screen__card-row">
          <BaseInput
            id="wet-auto-machine"
            ref="machineInputRef"
            class="wet-auto-field"
            label="진행장비"
            layout="horizontal"
            size="small"
            :model-value="screen.machineInput.value"
            type="search"
            autocomplete="off"
            autofocus
            :loading="screen.loading.value"
            @update:model-value="screen.setMachineInput(String($event ?? ''))"
            @keydown.enter.prevent="scanMachine"
          >
            <template #append>
              <QIcon class="wet-auto-search-icon" name="sym_o_search" aria-hidden="true" />
            </template>
          </BaseInput>
          <BaseButton
            class="wet-auto-search wet-auto-search--machine"
            variant="secondary"
            size="small"
            aria-label="진행장비 조회"
            :disabled="screen.loading.value"
            @click="screen.lookupEquipment"
          >
            조회
          </BaseButton>
        </div>
        <BaseInput
          id="wet-auto-reservation"
          class="wet-auto-field"
          label="예약시간"
          layout="horizontal"
          size="small"
          :model-value="screen.reservationTime.value"
          readonly
        />
        <BaseInput
          id="wet-auto-recipe"
          class="wet-auto-field"
          label="RECIPE"
          layout="horizontal"
          size="small"
          :model-value="screen.recipe.value"
          readonly
        />
      </section>

      <section class="wet-auto-card ds-screen__card wet-auto-carry" aria-label="반송 설정">
        <div class="wet-auto-carry-inner">
          <BaseCheckbox
            id="wet-auto-carry"
            class="wet-auto-checkbox"
            label="반송"
            :model-value="screen.carryChecked.value"
            :disabled="!screen.carryEnabled.value || screen.loading.value"
            @update:model-value="screen.setCarry(Boolean($event))"
          />
          <BaseDropdownList
            id="wet-auto-bay"
            class="wet-auto-dropdown"
            label="BAY"
            size="small"
            :model-value="screen.selectedBay.value"
            :options="bayOptions"
            :disabled="!screen.bayEnabled.value || screen.loading.value"
            @update:model-value="handleBayChange"
          />
          <BaseDropdownList
            id="wet-auto-stocker"
            class="wet-auto-dropdown"
            label="STK"
            size="small"
            :model-value="screen.selectedStocker.value"
            :options="stockerOptions"
            :disabled="!screen.stockerEnabled.value || screen.loading.value"
            @update:model-value="handleStockerChange"
          />
        </div>
      </section>

      <section
        class="wet-auto-card ds-screen__card wet-auto-lot wet-auto-front"
        aria-labelledby="wet-front-title"
      >
        <h2 id="wet-front-title" class="wet-auto-section-title">진행 LOT 정보</h2>
        <div class="ds-screen__card-row">
          <BaseInput
            id="wet-auto-front-lot"
            ref="frontInputRef"
            class="wet-auto-field"
            label="FRONT"
            layout="horizontal"
            size="small"
            :model-value="screen.frontInput.value"
            type="search"
            autocomplete="off"
            :disabled="!screen.frontLotEnabled.value"
            @update:model-value="screen.setFrontInput(String($event ?? ''))"
            @keydown.enter.prevent="scanFrontLot"
          >
            <template #append>
              <QIcon class="wet-auto-search-icon" name="sym_o_search" aria-hidden="true" />
            </template>
          </BaseInput>
          <BaseButton
            class="wet-auto-search"
            variant="secondary"
            size="small"
            aria-label="FRONT LOT 조회"
            :disabled="screen.loading.value"
            @click="screen.lookupFrontLot"
          >
            조회
          </BaseButton>
        </div>
        <div class="ds-screen__card-row">
          <span class="ds-field__label wet-auto-output-label">제품명</span>
          <output class="wet-auto-output wet-auto-product" aria-label="FRONT 제품명">
            {{ screen.frontLot.value.product }}
          </output>
        </div>
        <div class="ds-screen__card-row">
          <span class="ds-field__label wet-auto-output-label">공정명</span>
          <output class="wet-auto-output wet-auto-operation" aria-label="FRONT 공정명">
            {{ screen.frontLot.value.operation }}
          </output>
          <output class="wet-auto-output wet-auto-quantity" aria-label="FRONT 수량">
            {{ screen.frontLot.value.quantity }}
          </output>
          <BaseButton
            class="wet-auto-een"
            variant="secondary"
            size="small"
            aria-label="FRONT EEN"
            :disabled="!screen.rearCommentEnabled.value"
            @click="screen.openComment('rear')"
          >
            EEN
          </BaseButton>
        </div>
      </section>

      <section
        class="wet-auto-card ds-screen__card wet-auto-lot wet-auto-rear"
        aria-labelledby="wet-rear-title"
      >
        <h2 id="wet-rear-title" class="wet-auto-section-title">진행 LOT 정보</h2>
        <div class="ds-screen__card-row">
          <BaseInput
            id="wet-auto-rear-lot"
            ref="rearInputRef"
            class="wet-auto-field"
            label="REAR"
            layout="horizontal"
            size="small"
            :model-value="screen.rearInput.value"
            type="search"
            autocomplete="off"
            :disabled="!screen.rearLotEnabled.value"
            @update:model-value="screen.setRearInput(String($event ?? ''))"
            @keydown.enter.prevent="scanRearLot"
          >
            <template #append>
              <QIcon class="wet-auto-search-icon" name="sym_o_search" aria-hidden="true" />
            </template>
          </BaseInput>
          <BaseButton
            class="wet-auto-search"
            variant="secondary"
            size="small"
            aria-label="REAR LOT 조회"
            :disabled="screen.loading.value"
            @click="screen.lookupRearLot"
          >
            조회
          </BaseButton>
        </div>
        <div class="ds-screen__card-row">
          <span class="ds-field__label wet-auto-output-label">제품명</span>
          <output class="wet-auto-output wet-auto-product" aria-label="REAR 제품명">
            {{ screen.rearLot.value.product }}
          </output>
        </div>
        <div class="ds-screen__card-row">
          <span class="ds-field__label wet-auto-output-label">공정명</span>
          <output class="wet-auto-output wet-auto-operation" aria-label="REAR 공정명">
            {{ screen.rearLot.value.operation }}
          </output>
          <output class="wet-auto-output wet-auto-quantity" aria-label="REAR 수량">
            {{ screen.rearLot.value.quantity }}
          </output>
          <BaseButton
            class="wet-auto-een"
            variant="secondary"
            size="small"
            aria-label="REAR EEN"
            :disabled="!screen.frontCommentEnabled.value"
            @click="screen.openComment('front')"
          >
            EEN
          </BaseButton>
        </div>
      </section>

      <template #footer>
        <div class="wet-auto-actions">
          <BaseButton
            class="wet-auto-start"
            size="medium"
            :disabled="!screen.startEnabled.value || screen.loading.value"
            :loading="screen.loading.value"
            @click="screen.start"
          >
            START
          </BaseButton>
          <BaseButton
            class="wet-auto-cancel"
            variant="tertiary"
            size="medium"
            @click="screen.cancel"
          >
            취소
          </BaseButton>
        </div>
      </template>
    </BaseScreen>

    <RemoteRecipeDialog
      :model-value="screen.recipeConfirmationOpen.value"
      :recipe-list="screen.recipe.value"
      lot-no=""
      legacy-back-behavior
      @confirm="screen.confirmRecipe(true)"
      @cancel="screen.confirmRecipe(false)"
    />

    <BaseModal
      :open="!!screen.dialog.value"
      :title="screen.dialog.value?.title"
      :closable="false"
      :overlay-closable="false"
      width="var(--screen-dp-width)"
      @cancel="screen.closeInfo"
    >
      <p class="wet-auto-dialog-message" role="alert">{{ screen.dialog.value?.message }}</p>
      <template #footer>
        <BaseButton @click="screen.closeInfo">{{ COMMON_FIELD.BTNOKSTR }}</BaseButton>
      </template>
    </BaseModal>
  </main>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { BaseButton } from '../../../components/base/button';
import { BaseCheckbox } from '../../../components/base/checkbox';
import { BaseDropdownList } from '../../../components/base/dropdown-list';
import { BaseInput } from '../../../components/base/input';
import { BaseModal } from '../../../components/base/modal';
import { BaseScreen } from '../../../components/base/screen';
import { COMMON_FIELD } from '../../../constants/common-strings';
import { ROUTE } from '../../../constants/routes';
import { barcodeStyleLotId } from '../../../utils/barcode-style';
import { useMainStore } from '../../main/stores/main.store';
import RemoteRecipeDialog from '../../remote-ramco/components/RemoteRecipeDialog.vue';
import { useWetAuto } from '../composables/use-wet-auto';
import { useWetAutoStore } from '../stores/wet-auto.store';

const router = useRouter();
const mainStore = useMainStore();
const wetAutoStore = useWetAutoStore();
const machineInputRef = ref<{ focus: () => void }>();
const frontInputRef = ref<{ focus: () => void; select: () => void }>();
const rearInputRef = ref<{ focus: () => void; select: () => void }>();

const screen = useWetAuto({
  facility: mainStore.facility,
  operatorId: mainStore.operatorId,
  onOpenComment(payload) {
    wetAutoStore.saveSessionState(screen.dumpSessionState());
    void router.push({
      path: `/${ROUTE.commentList}`,
      query: {
        lotId: payload.LOTID,
        operation: payload.OPERATION,
        subOperation: payload.SUBOPERATION,
        processStep: payload.PROCESSSTEP,
        operSequence: payload.OPERSEQUENCE,
        facility: mainStore.facility,
        operatorId: mainStore.operatorId,
        operatorName: mainStore.operatorName,
        permission: mainStore.permission,
      },
    });
  },
  onCancel() {
    wetAutoStore.clearSessionState();
    router.back();
  },
  onCompleted() {
    wetAutoStore.clearSessionState();
    router.back();
  },
});

const savedSessionState = wetAutoStore.consumeSessionState();
if (savedSessionState) screen.restoreSessionState(savedSessionState);

const bayOptions = computed(() =>
  screen.bayOptions.value.map((bay) => ({ label: bay, value: bay })),
);
const stockerOptions = computed(() =>
  screen.stockerOptions.value.map((stocker) => ({ label: stocker, value: stocker })),
);

watch(
  () => screen.focusTarget.value,
  async (target) => {
    await nextTick();
    if (target === 'machine') machineInputRef.value?.focus();
    if (target === 'front') frontInputRef.value?.focus();
    if (target === 'rear') {
      rearInputRef.value?.focus();
      rearInputRef.value?.select();
    }
  },
  { immediate: true },
);

function scanMachine(): void {
  const machineBarcode = screen.machineInput.value;
  if (!machineBarcode.startsWith('EQP-')) {
    screen.showInfo('진행할 장비를 읽어주세요.', 'READING ERROR');
    screen.setMachineInput('');
    return;
  }

  const barcodeBody = machineBarcode.slice('EQP-'.length);
  const equipmentId = barcodeBody ? barcodeBody.slice(0, -1) : '';
  screen.setMachineInput(equipmentId);
  if (equipmentId) void screen.lookupEquipment();
}

function scanFrontLot(): void {
  const parsed = barcodeStyleLotId(screen.frontInput.value);
  if (!parsed.isValid) {
    screen.setFrontInput('');
    return;
  }
  screen.setFrontInput(parsed.parsedId);
  void screen.lookupFrontLot();
}

function scanRearLot(): void {
  const parsed = barcodeStyleLotId(screen.rearInput.value);
  if (!parsed.isValid) {
    screen.setRearInput('');
    return;
  }
  screen.setRearInput(parsed.parsedId);
  void screen.lookupRearLot();
}

function handleBayChange(value: string | number | Array<string | number> | undefined): void {
  const bay = Array.isArray(value) ? value[0] : value;
  void screen.setBay(typeof bay === 'string' || typeof bay === 'number' ? String(bay) : '');
}

function handleStockerChange(value: string | number | Array<string | number> | undefined): void {
  const stocker = Array.isArray(value) ? value[0] : value;
  screen.selectedStocker.value =
    typeof stocker === 'string' || typeof stocker === 'number' ? String(stocker) : '';
}
</script>

<style scoped>
/*
 * Layout/geometry beyond this point is screen-specific (HTML visual spec) and is not covered
 * by BaseScreen/base-component defaults. Rules that only repeated an existing Base default
 * (card border/bg/shadow, field height/font, button border/bg/color, field label color) were
 * removed in favor of `ds-screen__card`, `ds-screen__card-row`, and BaseInput/BaseDropdownList/
 * BaseButton props (`label`, `layout`, `size`, `variant`) so a future design-token update only
 * needs to change the shared Base Component, not this file.
 */

/*
 * BaseScreen's own `.ds-screen` is a fixed-height, fully opaque flex column (header/content/
 * footer), so the outer <main> wrapper never shows its own background and needs no layout
 * CSS of its own.
 */

.wet-auto-screen.ds-screen {
  position: relative;
  min-height: 100dvh;
  overflow: visible;
}

/*
 * BaseScreen's own defaults for header/content/footer already match the HTML spec exactly once
 * the footer buttons use size="medium" (see below) — no header/footer/content CSS is needed here.
 */

/* Keep the existing ~72px label column instead of the component's 80px default. */
.wet-auto-field {
  --ds-field-label-width: 72px;
}

.wet-auto-search-icon {
  color: var(--ds-color-text);
  font-size: var(--ds-input-icon-size);
}

.wet-auto-carry-inner {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--ds-search-height-sm);
  gap: var(--ds-spacing-2);
}

/* Quasar insets the visible box by 25% of its 2x-size inner area; cancel it so the box aligns with the card's left edge. */
.wet-auto-checkbox {
  margin-inline-start: calc(var(--ds-checkbox-size) / -2);
}

/* BAY/STK sit in a tight row; use a narrower label column than the 72px main fields. */
.wet-auto-dropdown {
  --ds-field-label-width: 34px;

  flex: 1 1 0;
  min-width: 0;
}

.wet-auto-section-title {
  margin: 0;
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-line-height-md);
}

/* 제품명/공정명/수량 are plain read-only text, not a Base field component. */
.wet-auto-output-label {
  display: flex;
  flex: 0 0 72px;
  align-items: center;
  height: var(--ds-search-height-sm);
}

.wet-auto-output {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  box-sizing: border-box;
  min-width: 0;
  height: var(--ds-search-height-sm);
  padding: 0 var(--ds-spacing-2);
  overflow: hidden;
  border: var(--ds-border-width-sm) solid var(--ds-color-border);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-color-bg);
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-lg);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* HTML spec: .process-a{width:51px} .process-b{width:138px} — reproduce that 51:138 ratio. */
.wet-auto-operation {
  flex: 51 1 0;
}

.wet-auto-quantity {
  flex: 138 1 0;
}

.wet-auto-actions {
  display: flex;
  width: 100%;
  gap: var(--ds-spacing-2);
}

/* variant="primary" (default) already supplies the bg; pin fg to pure white per the HTML spec
 * (the token default is a near-white tint, --primary-teal-50). size="medium" already gives the
 * HTML's 36px/14px/700 button; no height override needed. */
.wet-auto-start {
  flex: 1 1 0;
  color: var(--ds-color-on-primary);
  white-space: nowrap;
}

/* variant="tertiary" already supplies border/bg/fg matching this screen's spec. */
.wet-auto-cancel {
  flex: 1 1 0;
  white-space: nowrap;
}

.wet-auto-dialog-message {
  margin: 0;
  white-space: pre-line;
}
</style>
