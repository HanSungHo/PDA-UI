<template>
  <BaseScreen v-show="!isCommentListRoute" title="Remote Start" class="remote-cvd">
    <section class="ds-screen__card remote-cvd__lot-info" aria-label="LOT 정보">
      <div class="ds-screen__card-row">
        <BaseInput
          id="remote-cvd-lot"
          class="remote-cvd__field"
          label="LOT No."
          :model-value="state.lotId"
          readonly
          truncate
        />
        <BaseInput
          id="remote-cvd-port-state"
          class="remote-cvd__field"
          :tone="portStateTone"
          font-weight="bold"
          label="PORT 상태"
          :model-value="state.portState"
          readonly
          truncate
        />
      </div>

      <BaseInput
        id="remote-cvd-standard-equipment"
        class="remote-cvd__field"
        :tone="state.isEquipmentGroupChanged ? 'modified' : 'default'"
        label="기준장비"
        :model-value="state.standardEquipment"
        readonly
        truncate
      />

      <!-- Android 정정 (btn_eqp_cancel) is not drawn in Figma 3868:21489; it stays next to the field. -->
      <div class="ds-screen__card-row">
        <BaseInput
          id="remote-cvd-equipment"
          class="remote-cvd__field remote-cvd__equipment-input"
          label="진행장비"
          :model-value="state.equipmentId"
          autocapitalize="characters"
          autocomplete="off"
          :disabled="state.equipmentDisabled || state.loading"
          @update:model-value="state.equipmentId = String($event ?? '').toUpperCase()"
          @keydown.enter.prevent="handleEquipmentEnter"
          truncate
        />
        <BaseButton
          class="remote-cvd__equipment-cancel"
          variant="secondary"
          size="small"
          :disabled="state.equipmentCancelDisabled || state.loading"
          @click="screen.executeEqpCancel"
        >
          정정
        </BaseButton>
      </div>

      <BaseDropdownList
        id="remote-cvd-recipe"
        class="remote-cvd__field"
        label="진행 Rcp"
        placeholder=""
        :model-value="state.selectedRecipe || undefined"
        :options="recipeOptions"
        :disabled="state.recipeDisabled || state.loading || !recipeOptions.length"
        @change="handleRecipeChange"
      />

      <div class="ds-screen__card-row">
        <BaseDropdownList
          id="remote-cvd-port"
          class="remote-cvd__field remote-cvd__field--hug-label remote-cvd__port-select"
          label="PORT"
          placeholder=""
          :model-value="state.selectedPort || undefined"
          :options="portOptions"
          :disabled="state.portDisabled || state.loading || !portOptions.length"
          @change="handlePortChange"
        />
        <BaseButton
          class="remote-cvd__port-clear"
          variant="secondary"
          size="small"
          :disabled="state.clearPortDisabled || state.loading"
          @click="screen.executeClearPort"
        >
          초기화
        </BaseButton>
        <BaseButton
          variant="secondary"
          size="small"
          :disabled="state.doorOpenDisabled || state.loading"
          @click="screen.executeOpen"
        >
          DOOR OPEN
        </BaseButton>
      </div>

      <section
        v-if="state.precedeOptionsVisible"
        class="remote-cvd__precede"
        aria-label="선행 조건"
      >
        <BaseDropdownList
          id="remote-cvd-precede-type"
          class="remote-cvd__field"
          aria-label="선행 구분"
          :model-value="state.selectedPrecedeType"
          :options="precedeTypeOptions"
          @change="handlePrecedeTypeChange"
        />
        <div class="remote-cvd__precede-options">
          <BaseCheckbox
            v-for="choice in state.precedeChoices"
            :key="choice.value"
            :model-value="state.selectedPrecede === choice.value"
            :label="choice.label"
            @update:model-value="handlePrecedeSelection(choice.value, $event)"
          />
        </div>
      </section>
    </section>

    <section class="ds-screen__card remote-cvd__lot-card" aria-label="LOT 상세 정보">
      <!-- Android hides each chamber when it is empty, so an empty row must not leave a gap. -->
      <div
        v-show="hasChamberValue"
        class="ds-screen__card-row remote-cvd__chambers"
        role="group"
        aria-label="Chamber 정보"
      >
        <div
          v-for="chamber in chamberValues"
          v-show="chamber.value"
          :key="chamber.name"
          class="remote-cvd__chamber"
        >
          <BaseInput
            class="remote-cvd__field remote-cvd__field--hug-label"
            :tone="getChamberInputTone(chamber.limit)"
            :label="chamber.name"
            :model-value="chamber.value"
            readonly
            truncate
          />
        </div>
      </div>

      <BaseInput
        class="remote-cvd__field"
        label="JOB CODE"
        :model-value="state.jobCode"
        readonly
        truncate
      />
      <BaseInput
        class="remote-cvd__field"
        label="제품명"
        :model-value="state.product"
        readonly
        truncate
      />
      <BaseInput
        class="remote-cvd__field"
        label="현재공정"
        :model-value="state.currentOperation"
        readonly
        truncate
      />
      <BaseInput
        class="remote-cvd__field"
        label="수량"
        :model-value="state.quantity"
        readonly
        truncate
      />
      <BaseInput
        class="remote-cvd__field"
        label="FACILITY"
        :model-value="state.facility"
        readonly
        truncate
      />
      <BaseInput
        class="remote-cvd__field"
        label="CUSTOMER"
        :model-value="state.customer"
        readonly
        truncate
      />
      <BaseInput
        class="remote-cvd__field"
        label="SALE TYPE"
        :model-value="state.saleType"
        readonly
        truncate
      />
      <BaseInput
        class="remote-cvd__field"
        label="담당 Eng'r"
        :model-value="state.engineer"
        readonly
        truncate
      />
      <BaseInput
        class="remote-cvd__field"
        label="PACKING"
        :model-value="state.packing"
        readonly
        truncate
      />
      <!-- Android GOOD CHIPS is not drawn in Figma; it is kept after PACKING. -->
      <BaseInput
        class="remote-cvd__field"
        label="GOOD CHIPS"
        :model-value="state.goodChips"
        readonly
        truncate
      />
    </section>

    <section class="ds-screen__card remote-cvd__comment-card" aria-label="COMMENT 정보">
      <div class="ds-screen__card-row">
        <div class="remote-cvd__comment-count">
          <BaseInput
            id="remote-cvd-comment-count"
            class="remote-cvd__field remote-cvd__field--hug-label remote-cvd__comment-input"
            label="COMMENT"
            :model-value="state.commentCount"
            readonly
            truncate
          />
          <span class="remote-cvd__comment-unit">개</span>
          <BaseButton
            class="remote-cvd__comment-read"
            variant="secondary"
            size="small"
            :disabled="state.readCommentDisabled || state.loading"
            @click="screen.executeCommentList"
          >
            읽기
          </BaseButton>
        </div>
        <BaseInput
          id="remote-cvd-q-time"
          class="remote-cvd__field remote-cvd__field--hug-label remote-cvd__q-time"
          label="Q :"
          :model-value="state.qTime"
          readonly
          truncate
        />
      </div>
      <BaseButton
        v-if="state.rcpConditionsVisible"
        class="remote-cvd__rcp-conditions"
        variant="tertiary"
        size="small"
        block
        :disabled="state.loading"
        @click="screen.executeCommRcp"
      >
        RCP 조건
      </BaseButton>
    </section>

    <div
      v-if="state.loading"
      class="remote-cvd__loading"
      role="status"
      aria-live="polite"
      aria-label="처리중"
    >
      <BaseLoading size="medium" />
    </div>

    <template #footer>
      <BaseButton
        data-action="start"
        variant="primary"
        size="medium"
        :disabled="state.startDisabled || state.loading"
        :loading="state.loading"
        @click="screen.executeStart"
      >
        START
      </BaseButton>
      <BaseButton
        data-action="restart"
        variant="primary"
        size="medium"
        :disabled="state.restartDisabled || state.loading"
        :loading="state.loading"
        @click="screen.executeReStart"
      >
        RESTART
      </BaseButton>
      <BaseButton
        data-action="cancel"
        variant="tertiary"
        size="medium"
        @click="screen.executeCancel"
      >
        취소
      </BaseButton>
    </template>
  </BaseScreen>

  <BaseModal
    :open="dialog.modalOpen.value"
    :title="dialog.modalTitle.value"
    :closable="false"
    :overlay-closable="false"
  >
    <p class="remote-cvd__dialog-message" role="alert">{{ dialog.modalMessage.value }}</p>
    <template #footer>
      <div class="remote-cvd__dialog-actions">
        <BaseButton
          v-if="dialog.modalType.value === 'confirm'"
          variant="tertiary"
          @click="dialog.resolveModal(false)"
        >
          취소
        </BaseButton>
        <BaseButton variant="primary" @click="dialog.resolveModal(true)">확인</BaseButton>
      </div>
    </template>
  </BaseModal>

  <RemoteRecipeDialog
    :model-value="confirmDialog.open"
    :recipe-list="confirmDialog.recipe"
    :lot-no="confirmDialog.lotId"
    @update:model-value="confirmDialog.open = $event"
    @confirm="resolveRecipeDialog(true)"
    @cancel="resolveRecipeDialog(false)"
  />

  <RemoteEtchCommRcpModal
    v-if="rcpModalOpen"
    :model-value="rcpModalOpen"
    :inbound-params="rcpInboundParams"
    :api="remoteCvdEtchRcpApi"
    @update:model-value="rcpModalOpen = $event"
    @close="rcpModalOpen = false"
  />
  <RouterView v-if="isCommentListRoute" />
</template>

<script setup lang="ts">
import type { BaseDropdownValue, BaseInputTone } from 'src/components/base';
import {
  BaseButton,
  BaseCheckbox,
  BaseDropdownList,
  BaseInput,
  BaseLoading,
  BaseModal,
  BaseScreen,
} from 'src/components/base';
import RemoteRecipeDialog from 'src/components/esheet/RemoteRecipeDialog.vue';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { useConfirmModal } from 'src/features/move-in/composables/useConfirmModal';
import { useRemoteCvd } from 'src/features/remote-cvd/composables/useRemoteCvd';
import {
  getChamberInputTone,
  getPortStateTone,
} from 'src/features/remote-cvd/utils/remote-cvd.util';
import RemoteEtchCommRcpModal from 'src/features/remote-start/pages/RemoteEtchCommRcpModal.vue';
import { remoteCvdEtchRcpApi } from 'src/features/remote-start/services/remoteCvdEtchRcp.service';
import type { RemoteEtchInboundParams } from 'src/features/remote-start/types/remoteEtchCommRcp.types';
import { getApiBaseUrl, setApiBaseUrl } from 'src/services/api-client';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { RouterView } from 'vue-router';
import { useRoute, useRouter } from 'vue-router';

defineOptions({ name: 'RemoteCvdPage' });

const route = useRoute();
const router = useRouter();
const mainStore = useMainStore();
const dialog = useConfirmModal();

function queryString(value: unknown): string {
  if (Array.isArray(value)) return queryString(value[0]);
  return typeof value === 'string' ? value : '';
}

const lotId = queryString(route.query.LOTID) || queryString(route.query.lotId);
const isCommentListRoute = computed(() => route.name === 'remote-cvd-comment-list');
const isMockPreview = import.meta.env.DEV && queryString(route.query.mock) === '1';
const previousApiBaseUrl = getApiBaseUrl();
if (isMockPreview) setApiBaseUrl('http://127.0.0.1:8080');
const confirmDialog = reactive({ open: false, recipe: '', lotId: '' });
const rcpModalOpen = ref(false);
const rcpInboundParams = ref<RemoteEtchInboundParams>({});
let recipeResolver: ((confirmed: boolean) => void) | undefined;

function confirmRecipe(recipe: string, currentLotId: string): Promise<boolean> {
  confirmDialog.recipe = recipe;
  confirmDialog.lotId = currentLotId;
  confirmDialog.open = true;
  return new Promise((resolve) => {
    recipeResolver = resolve;
  });
}

function resolveRecipeDialog(confirmed: boolean): void {
  confirmDialog.open = false;
  recipeResolver?.(confirmed);
  recipeResolver = undefined;
}

function onCancel(): void {
  if (router.options.history.state.back) {
    void router.back();
    return;
  }
  void router.replace({
    path: `/${ROUTE.remoteMachineSelect}`,
    query: { LOTID: state.lotId },
  });
}

function onComplete(): void {
  void router.replace({ path: `/${ROUTE.esheet}`, query: { lotId: state.lotId } });
}

const screen = useRemoteCvd({
  lotId,
  facility: mainStore.facility,
  operatorId: mainStore.operatorId,
  dialog: {
    alert(messageTitle, message) {
      return dialog.alert(message, messageTitle).then(() => undefined);
    },
    confirm(messageTitle, message) {
      return dialog.confirm(message, messageTitle);
    },
  },
  confirmRecipe,
  onComplete,
  onCancel,
  onOpenCommentList(context) {
    void router.push({
      path: `/${ROUTE.remoteCvd}/comment-list`,
      query: {
        lotId: context.lotId,
        operation: context.operation,
        subOperation: context.subOperation,
        processStep: context.processStep,
        operSequence: context.operSequence,
        facility: context.facility,
        ...(isMockPreview ? { mock: '1' } : {}),
      },
    });
  },
  onOpenRcpConditions(context) {
    rcpInboundParams.value = {
      LOTID: context.lotId,
      EQPID: context.equipmentId,
      RECIPE: context.recipe,
      OPERID: context.operation,
      OPERDESC: context.processStep,
    };
    rcpModalOpen.value = true;
  },
});

const { state } = screen;
const recipeOptions = computed(() => state.recipeOptions.map((value) => ({ label: value, value })));
const portOptions = computed(() => state.portOptions.map((value) => ({ label: value, value })));
const precedeTypeOptions = computed(() =>
  state.precedeTypeOptions.map((value) => ({ label: value, value })),
);
const chamberValues = computed(() =>
  (['A', 'B', 'C', 'D'] as const).map((name) => ({
    name,
    value: state.chamberValues[name],
    limit: state.chamberLimits[name],
  })),
);
const hasChamberValue = computed(() => chamberValues.value.some((chamber) => chamber.value));
const portStateTone = computed<BaseInputTone>(() => getPortStateTone(state.portState));

function handleEquipmentEnter(): void {
  void screen.onEquipmentEnter(state.equipmentId);
}

function handleRecipeChange(value: BaseDropdownValue): void {
  void screen.handleRecipeChange(String(value ?? ''));
}

function handlePortChange(value: BaseDropdownValue): void {
  void screen.handlePortChange(String(value ?? ''));
}

function handlePrecedeTypeChange(value: BaseDropdownValue): void {
  state.selectedPrecedeType = String(value ?? '');
}

function handlePrecedeSelection(value: string, checked: boolean): void {
  state.selectedPrecede = checked ? value : '';
}

onMounted(async () => {
  if (state.lotId) await screen.searchData(state.lotId);
});

onUnmounted(() => {
  if (isMockPreview) setApiBaseUrl(previousApiBaseUrl);
});
</script>

<style src="../styles/remote-cvd.css"></style>
