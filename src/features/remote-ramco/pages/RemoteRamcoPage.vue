<template>
  <main class="remote-ramco-page">
    <BaseScreen class="remote-ramco-screen" title="Remote Start">
      <section class="ds-screen__card remote-ramco-equipment" aria-label="장비 및 레시피">
        <div class="ds-screen__card-row">
          <BaseInput
            id="remote-ramco-equipment"
            :model-value="screen.equipmentInput.value"
            label="진행장비"
            type="search"
            autocomplete="off"
            :loading="screen.loading.value"
            @update:model-value="screen.setEquipmentInput(String($event ?? ''))"
            @keydown.enter.prevent="scanEquipment"
          >
            <template #suffix>
              <QIcon name="sym_o_search" aria-hidden="true" />
            </template>
          </BaseInput>
          <BaseButton
            class="remote-ramco-search-button"
            variant="secondary"
            aria-label="진행장비 조회"
            :disabled="screen.loading.value"
            @click="screen.lookupEquipment"
          >
            조회
          </BaseButton>
        </div>

        <div class="ds-screen__card-row">
          <BaseDropdownList
            id="remote-ramco-recipe"
            v-model="screen.selectedRecipe.value"
            label="RECIPE"
            aria-label="RECIPE"
            :disabled="screen.recipes.value.length === 0"
            :options="recipeOptions"
          />
          <BaseButton
            variant="secondary"
            icon-only
            aria-label="Delete job code"
            :disabled="screen.loading.value"
            @click="screen.deleteJobs"
          >
            <QIcon name="sym_o_delete" aria-hidden="true" />
          </BaseButton>
        </div>

        <div v-if="screen.isRunningRecipeVisible.value" class="remote-ramco-field">
          <span class="remote-ramco-field-label">진행중</span>
          <output class="remote-ramco-readonly-value">{{ screen.equipment.value?.INGRCP }}</output>
        </div>

        <div v-if="screen.isDualRecipeVisible.value" class="remote-ramco-lu-block">
          <div class="remote-ramco-lu-row">
            <span class="remote-ramco-field-label">(L)</span>
            <output class="remote-ramco-readonly-value">{{
              screen.equipment.value?.INGRCP
            }}</output>
            <output class="remote-ramco-readonly-value">{{
              screen.equipment.value?.COM_TIME1
            }}</output>
          </div>
          <div class="remote-ramco-lu-row">
            <span class="remote-ramco-field-label">(U)</span>
            <output class="remote-ramco-readonly-value">{{
              screen.equipment.value?.INGRCP2
            }}</output>
            <output class="remote-ramco-readonly-value">{{
              screen.equipment.value?.COM_TIME2
            }}</output>
          </div>
        </div>

        <div v-if="screen.isPortVisible.value" class="remote-ramco-port-controls">
          <BaseDropdownList
            id="remote-ramco-port"
            :model-value="screen.selectedPort.value"
            label="PORT"
            aria-label="PORT"
            :disabled="!screen.ports.value.length"
            :options="portOptions"
            @update:model-value="handlePortChange"
          />
          <BaseButton
            class="remote-ramco-clear-port"
            variant="secondary"
            :disabled="screen.loading.value || !screen.clearPortEnabled.value"
            @click="screen.clearPort"
          >
            초기화
          </BaseButton>
          <output class="remote-ramco-port-state" :class="portStateClass" aria-live="polite">
            {{ screen.portState.value }}
          </output>
        </div>
      </section>

      <section class="ds-screen__card remote-ramco-lots" aria-labelledby="remote-ramco-front-title">
        <h2 id="remote-ramco-front-title" class="ds-screen__card-title">진행 LOT 정보</h2>
        <div class="ds-screen__card-row">
          <BaseInput
            id="remote-ramco-front-lot"
            :model-value="screen.frontLot.value.lotId"
            label="FRONT"
            type="search"
            readonly
          >
            <template #suffix>
              <QIcon name="sym_o_search" aria-hidden="true" />
            </template>
          </BaseInput>
          <BaseButton
            class="remote-ramco-search-button"
            variant="secondary"
            aria-label="FRONT LOT 조회"
            :disabled="screen.loading.value || !screen.frontLot.value.lotId"
            @click="screen.searchFrontLot(screen.frontLot.value.lotId)"
          >
            조회
          </BaseButton>
        </div>
        <div class="ds-screen__card-row">
          <BaseInput
            class="remote-ramco-front-quantity"
            :model-value="screen.frontLot.value.quantity"
            aria-label="FRONT EEN"
            readonly
          />
          <BaseButton
            class="remote-ramco-een"
            variant="secondary"
            :disabled="!screen.canReadFrontComment.value"
            @click="screen.openComment(screen.frontLot.value)"
          >
            EEN
          </BaseButton>
        </div>
        <BaseInput
          class="remote-ramco-front-product"
          :model-value="screen.frontLot.value.product"
          label="제품명"
          aria-label="제품명"
          readonly
        />
        <BaseInput
          class="remote-ramco-front-operation"
          :model-value="screen.frontLot.value.operation"
          label="공정명"
          aria-label="공정명"
          readonly
        />
      </section>

      <section class="ds-screen__card remote-ramco-lots" aria-labelledby="remote-ramco-rear-title">
        <h2 id="remote-ramco-rear-title" class="ds-screen__card-title">진행 LOT 정보</h2>
        <div class="ds-screen__card-row">
          <BaseInput
            id="remote-ramco-rear-lot"
            :model-value="screen.rearLotInput.value"
            label="REAR"
            type="search"
            :disabled="!screen.rearLotEnabled.value"
            autocomplete="off"
            @update:model-value="screen.setRearInput(String($event ?? ''))"
            @keydown.enter.prevent="scanRearLot"
          >
            <template #suffix>
              <QIcon name="sym_o_search" aria-hidden="true" />
            </template>
          </BaseInput>
          <BaseButton
            class="remote-ramco-search-button"
            variant="secondary"
            aria-label="REAR LOT 조회"
            :disabled="screen.loading.value || !screen.rearLotEnabled.value"
            @click="screen.searchRearLot"
          >
            조회
          </BaseButton>
        </div>
        <div class="ds-screen__card-row">
          <BaseInput
            class="remote-ramco-rear-quantity"
            :model-value="screen.rearLot.value.quantity"
            aria-label="REAR EEN"
            readonly
          />
          <BaseButton
            class="remote-ramco-een"
            variant="secondary"
            :disabled="!screen.canReadRearComment.value"
            @click="screen.openComment(screen.rearLot.value)"
          >
            EEN
          </BaseButton>
        </div>
        <BaseInput
          class="remote-ramco-rear-product"
          :model-value="screen.rearLot.value.product"
          label="제품명"
          aria-label="제품명"
          readonly
        />
        <BaseInput
          class="remote-ramco-rear-operation"
          :model-value="screen.rearLot.value.operation"
          label="공정명"
          aria-label="공정명"
          readonly
        />
      </section>

      <template #footer>
        <BaseButton
          class="remote-ramco-start"
          size="medium"
          :disabled="!screen.isStartEnabled.value || screen.loading.value"
          :loading="screen.loading.value"
          html-type="button"
          @click="screen.start"
        >
          START
        </BaseButton>
        <BaseButton
          class="remote-ramco-cancel"
          variant="tertiary"
          size="medium"
          html-type="button"
          @click="screen.cancel"
        >
          취소
        </BaseButton>
      </template>
    </BaseScreen>

    <RemoteRecipeDialog
      :model-value="isRecipeConfirmOpen"
      :recipe-list="screen.selectedRecipe.value"
      lot-no=""
      @confirm="handleRecipeConfirm"
      @cancel="handleRecipeCancel"
    />

    <BaseModal
      v-if="!isRecipeConfirmOpen"
      class="action-dialog remote-ramco-info-dialog"
      :open="!!screen.dialog.value"
      :title="screen.dialog.value?.title"
      :closable="false"
      :overlay-closable="false"
      @cancel="handleDialogCancel"
    >
      <p
        class="action-dialog-message remote-ramco-message"
        :role="screen.dialog.value?.kind === 'info' ? 'alert' : undefined"
      >
        {{ screen.dialog.value?.message }}
      </p>
      <template #footer>
        <div class="action-dialog-actions">
          <BaseButton
            v-if="screen.dialog.value?.kind === 'confirm'"
            class="action-dialog-cancel"
            variant="secondary"
            @click="cancelDialog"
          >
            {{ COMMON_FIELD.BTNNOSTR }}
          </BaseButton>
          <BaseButton
            v-if="screen.dialog.value?.kind === 'confirm'"
            class="action-dialog-confirm"
            @click="confirmSubmit"
          >
            {{ COMMON_FIELD.BTNYESSTR }}
          </BaseButton>
          <BaseButton v-else class="action-dialog-confirm" @click="closeDialog">
            {{ COMMON_FIELD.BTNOKSTR }}
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </main>
</template>

<script setup lang="ts">
import { getActivePinia } from 'pinia';
import { QIcon } from 'quasar';
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { BaseButton } from '../../../components/base/button';
import { BaseDropdownList } from '../../../components/base/dropdown-list';
import { BaseInput } from '../../../components/base/input';
import { BaseModal } from '../../../components/base/modal';
import { BaseScreen } from '../../../components/base/screen';
import { COMMON_FIELD } from '../../../constants/common-strings';
import { ROUTE } from '../../../constants/routes';
import { useMainStore } from '../../main/stores/main.store';
import RemoteRecipeDialog from '../components/RemoteRecipeDialog.vue';
import { useRemoteRamco } from '../composables/useRemoteRamco';
import { createRemoteRamcoMockApi, REMOTE_RAMCO_MOCK_CASES } from '../mocks/remote-ramco.mock';
import { getRemoteRamcoApi } from '../services/remote-ramco.service';
import { useRemoteRamcoStore } from '../stores/remote-ramco.store';

const props = withDefaults(
  defineProps<{
    initialLotId?: string;
  }>(),
  {
    initialLotId: '',
  },
);

const emit = defineEmits<{
  openComment: [
    payload: {
      LOTID: string;
      OPERATION: string;
      SUBOPERATION: string;
      PROCESSSTEP: string;
      OPERSEQUENCE: string;
    },
  ];
  cancel: [];
  completed: [];
}>();

const router = useRouter();
const route = useRoute();
const mockMode = queryString(route.query.mock).toLowerCase() === 'remote-ramco';
const requestedMockCase = queryString(route.query.mockCase);
const mockCase = REMOTE_RAMCO_MOCK_CASES.find((item) => item === requestedMockCase) ?? 'default';
const api = mockMode ? createRemoteRamcoMockApi(mockCase) : getRemoteRamcoApi();
const mainStore = useMainStore();
let remoteRamcoStore: ReturnType<typeof useRemoteRamcoStore> | undefined;
try {
  remoteRamcoStore = getActivePinia() ? useRemoteRamcoStore() : undefined;
} catch {
  remoteRamcoStore = undefined;
}

function handleOpenComment(payload: {
  LOTID: string;
  OPERATION: string;
  SUBOPERATION: string;
  PROCESSSTEP: string;
  OPERSEQUENCE: string;
}): void {
  emit('openComment', payload);
  if (router) {
    const side = payload.LOTID === screen.frontLot.value.lotId ? 'front' : 'rear';
    remoteRamcoStore?.saveSessionState(screen.dumpSessionState(side));
    void router.push({
      path: `/${ROUTE.commentList}`,
      query: {
        lotId: payload.LOTID,
        operation: payload.OPERATION,
        subOperation: payload.SUBOPERATION,
        processStep: payload.PROCESSSTEP,
        operSequence: payload.OPERSEQUENCE,
        facility: mainStore.facility,
      },
    });
  }
}

function handleCancel(): void {
  emit('cancel');
  if (router) {
    router.back();
  }
}

function handleCompleted(): void {
  remoteRamcoStore?.setReturnLotId(screen.frontLot.value.lotId);
  emit('completed');
  if (router) {
    router.back();
  }
}

const screen = useRemoteRamco({
  api,
  facility: mainStore.facility,
  operatorId: mainStore.operatorId,
  initialLotId: props.initialLotId,
  onOpenComment: handleOpenComment,
  onCancel: handleCancel,
  onCompleted: handleCompleted,
});

const recipeOptions = computed(() =>
  screen.recipes.value.map((recipe) => ({ label: recipe, value: recipe })),
);

const portOptions = computed(() =>
  screen.ports.value.map((port) => ({ label: port, value: port })),
);

let hasRestoredSession = false;
const savedSession = remoteRamcoStore?.consumeSessionState();
if (savedSession) {
  hasRestoredSession = true;
  screen.restoreSessionState(savedSession);
  if (savedSession.commentSide) {
    void screen.syncLotComment(savedSession.commentSide);
  }
}

const isRecipeConfirmOpen = computed(
  () => screen.dialog.value?.kind === 'confirm' && screen.dialog.value.intent === 'recipe',
);

function handleRecipeConfirm(): void {
  screen.resolveDialog(true);
}

function handleRecipeCancel(): void {
  screen.resolveDialog(false);
}

const portStateClass = computed(() => {
  const state = screen.portState.value.toLowerCase();
  return state ? `remote-ramco-port-state--${state}` : '';
});

function closeDialog(): void {
  screen.closeInfo();
}

function cancelDialog(): void {
  screen.resolveDialog(false);
}

function confirmSubmit(): void {
  screen.resolveDialog(true);
}

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown);
});
onUnmounted(() => window.removeEventListener('keydown', handleWindowKeydown));

watch(
  () => props.initialLotId,
  (initialLotId) => {
    if (hasRestoredSession) {
      hasRestoredSession = false;
      return;
    }
    screen.setInitialFrontLot(initialLotId);
  },
  { immediate: true },
);

function queryString(value: unknown): string {
  if (Array.isArray(value)) return queryString(value[0]);
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function scanEquipment(): void {
  const value = screen.equipmentInput.value.trim().toUpperCase();
  if (!value.startsWith('EQP-')) {
    screen.setEquipmentInput('');
    screen.showInfo('진행할 장비를 읽어주세요.', 'READING ERROR');
    return;
  }
  const body = value.slice(4);
  screen.setEquipmentInput(body ? body.slice(0, -1) : body);
  void screen.lookupEquipment();
}

function scanRearLot(): void {
  const value = screen.rearLotInput.value;
  if (!value.startsWith(' ')) {
    screen.setRearInput('');
    screen.showInfo('LOT#를 읽어주세요.', 'READING ERROR');
    return;
  }
  let body = value.slice(1);
  if (body.startsWith('$')) body = body.slice(1).trimStart();
  screen.setRearInput(body ? body.slice(0, -1) : body);
  void screen.searchRearLot();
}

function handlePortChange(value: string | number | Array<string | number> | undefined): void {
  const selectedValue = Array.isArray(value) ? value[0] : value;
  screen.changePort(
    typeof selectedValue === 'string' || typeof selectedValue === 'number'
      ? String(selectedValue)
      : '',
  );
}

function handleDialogCancel(): void {
  if (screen.dialog.value?.kind === 'confirm') {
    cancelDialog();
  } else {
    closeDialog();
  }
}

function handleWindowKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && !isRecipeConfirmOpen.value && screen.dialog.value) {
    event.preventDefault();
    handleDialogCancel();
  }
}
</script>

<style src="../../../components/base/modal/action-dialog.css"></style>
<style scoped src="../styles/remote-ramco.css"></style>
