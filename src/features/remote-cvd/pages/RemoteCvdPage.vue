<template>
  <div class="remote-cvd-canvas">
    <main v-show="!isCommentListRoute" class="remote-cvd" aria-labelledby="remote-cvd-title">
      <QToolbar class="remote-cvd__header">
        <h1 id="remote-cvd-title">Remote Start</h1>
      </QToolbar>

      <div class="remote-cvd__content">
        <QCard
          flat
          bordered
          class="remote-cvd__card remote-cvd__primary-card"
          aria-label="LOT 정보"
        >
          <div class="remote-cvd__field-row">
            <BaseInput
              id="remote-cvd-lot"
              class="remote-cvd__field"
              label="LOT No."
              :model-value="state.lotId"
              stack-label
              readonly
            />
            <BaseInput
              id="remote-cvd-port-state"
              class="remote-cvd__field remote-cvd__port-state"
              :class="`remote-cvd__port-state--${portStateClass}`"
              label="PORT 상태"
              :model-value="state.portState"
              stack-label
              readonly
            />
          </div>

          <BaseInput
            id="remote-cvd-standard-equipment"
            class="remote-cvd__field"
            :class="{ 'remote-cvd__field--changed': state.isEquipmentGroupChanged }"
            label="기준장비"
            :model-value="state.standardEquipment"
            stack-label
            readonly
          />

          <div class="remote-cvd__field-row remote-cvd__equipment-row">
            <BaseInput
              id="remote-cvd-equipment"
              class="remote-cvd__field remote-cvd__equipment-input"
              label="진행장비"
              :model-value="state.equipmentId"
              stack-label
              autocapitalize="characters"
              autocomplete="off"
              :disabled="state.equipmentDisabled || state.loading"
              @update:model-value="state.equipmentId = String($event ?? '').toUpperCase()"
              @keydown.enter.prevent="handleEquipmentEnter"
            />
            <BaseButton
              class="remote-cvd__equipment-cancel"
              variant="secondary"
              :disabled="state.equipmentCancelDisabled || state.loading"
              @click="screen.executeEqpCancel"
            >
              정정
            </BaseButton>
          </div>

          <BaseDropdownList
            id="remote-cvd-recipe"
            class="remote-cvd__field"
            label="진행 RCP"
            placeholder=""
            :model-value="state.selectedRecipe || undefined"
            :options="recipeOptions"
            :disabled="state.recipeDisabled || state.loading || !recipeOptions.length"
            @change="handleRecipeChange"
          >
            <template #indicator>
              <QIcon name="sym_o_keyboard_arrow_down" size="18px" aria-hidden="true" />
            </template>
          </BaseDropdownList>

          <div class="remote-cvd__field-row remote-cvd__port-row">
            <BaseDropdownList
              id="remote-cvd-port"
              class="remote-cvd__field remote-cvd__port-select"
              label="PORT"
              placeholder=""
              :model-value="state.selectedPort || undefined"
              :options="portOptions"
              :disabled="state.portDisabled || state.loading || !portOptions.length"
              @change="handlePortChange"
            >
              <template #indicator>
                <QIcon name="sym_o_keyboard_arrow_down" size="18px" aria-hidden="true" />
              </template>
            </BaseDropdownList>
            <BaseButton
              class="remote-cvd__port-clear"
              variant="secondary"
              :disabled="state.clearPortDisabled || state.loading"
              @click="screen.executeClearPort"
            >
              초기화
            </BaseButton>
          </div>

          <BaseButton
            class="remote-cvd__door-open"
            variant="secondary"
            :disabled="state.doorOpenDisabled || state.loading"
            @click="screen.executeOpen"
          >
            DOOR OPEN
          </BaseButton>

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
        </QCard>

        <QCard
          flat
          bordered
          class="remote-cvd__card remote-cvd__lot-card"
          aria-label="LOT 상세 정보"
        >
          <div class="remote-cvd__chambers" aria-label="Chamber 정보">
            <div
              v-for="chamber in chamberValues"
              v-show="chamber.value"
              :key="chamber.name"
              class="remote-cvd__chamber"
            >
              <BaseInput
                class="remote-cvd__field"
                :class="`remote-cvd__chamber--${getChamberStatusClass(chamber.limit)}`"
                :label="chamber.name"
                :model-value="chamber.value"
                stack-label
                readonly
              />
            </div>
          </div>

          <BaseInput
            class="remote-cvd__field"
            label="JOB CODE"
            :model-value="state.jobCode"
            stack-label
            readonly
          />
          <BaseInput
            class="remote-cvd__field"
            label="제품명"
            :model-value="state.product"
            stack-label
            readonly
          />
          <BaseInput
            class="remote-cvd__field"
            label="현재공정"
            :model-value="state.currentOperation"
            stack-label
            readonly
          />
          <BaseInput
            class="remote-cvd__field"
            label="수량"
            :model-value="state.quantity"
            stack-label
            readonly
          />
          <BaseInput
            class="remote-cvd__field"
            label="FACILITY"
            :model-value="state.facility"
            stack-label
            readonly
          />
          <BaseInput
            class="remote-cvd__field"
            label="CUSTOMER"
            :model-value="state.customer"
            stack-label
            readonly
          />
          <BaseInput
            class="remote-cvd__field"
            label="SALE TYPE"
            :model-value="state.saleType"
            stack-label
            readonly
          />
          <BaseInput
            class="remote-cvd__field"
            label="담당 Eng'r"
            :model-value="state.engineer"
            stack-label
            readonly
          />
          <BaseInput
            class="remote-cvd__field"
            label="PACKING"
            :model-value="state.packing"
            stack-label
            readonly
          />
          <BaseInput
            v-if="showAndroidOnlyFields"
            class="remote-cvd__field"
            label="GOOD CHIPS"
            :model-value="state.goodChips"
            stack-label
            readonly
          />
        </QCard>

        <QCard
          flat
          bordered
          class="remote-cvd__card remote-cvd__comment-card"
          aria-label="COMMENT 정보"
        >
          <div class="remote-cvd__comment-row">
            <BaseInput
              id="remote-cvd-comment-count"
              class="remote-cvd__field"
              label="COMMENT"
              :model-value="state.commentCount"
              stack-label
              readonly
            />
            <span class="remote-cvd__comment-unit">개</span>
            <BaseButton
              class="remote-cvd__comment-read"
              variant="secondary"
              :disabled="state.readCommentDisabled || state.loading"
              @click="screen.executeCommentList"
            >
              읽기
            </BaseButton>
          </div>
          <BaseInput
            id="remote-cvd-q-time"
            class="remote-cvd__field"
            label="Q"
            :model-value="state.qTime"
            stack-label
            readonly
          />
          <BaseButton
            v-if="state.rcpConditionsVisible && showAndroidOnlyFields"
            class="remote-cvd__rcp-conditions"
            variant="secondary"
            :disabled="state.loading"
            @click="screen.executeCommRcp"
          >
            RCP 조건
          </BaseButton>
        </QCard>
      </div>

      <footer class="remote-cvd__footer">
        <BaseButton
          class="remote-cvd__action remote-cvd__action--primary"
          variant="primary"
          size="large"
          :disabled="state.startDisabled || state.loading"
          :loading="state.loading"
          @click="screen.executeStart"
        >
          START
        </BaseButton>
        <BaseButton
          class="remote-cvd__action remote-cvd__action--primary"
          variant="primary"
          size="large"
          :disabled="state.restartDisabled || state.loading"
          :loading="state.loading"
          @click="screen.executeReStart"
        >
          RESTART
        </BaseButton>
        <BaseButton
          class="remote-cvd__action remote-cvd__action--cancel"
          variant="tertiary"
          size="large"
          @click="screen.executeCancel"
        >
          취소
        </BaseButton>
      </footer>

      <div
        v-if="state.loading"
        class="remote-cvd__loading"
        role="status"
        aria-live="polite"
        aria-label="처리중"
      >
        <BaseLoading size="medium" />
      </div>

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
            <BaseButton variant="primary" @click="dialog.resolveModal(true)">
              {{ dialog.modalType.value === 'confirm' ? '확인' : '확인' }}
            </BaseButton>
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
    </main>
    <RouterView v-if="isCommentListRoute" />
  </div>
</template>

<script setup lang="ts">
import { QCard, QIcon, QToolbar } from 'quasar';
import type { BaseDropdownValue } from 'src/components/base';
import {
  BaseButton,
  BaseCheckbox,
  BaseDropdownList,
  BaseInput,
  BaseLoading,
  BaseModal,
} from 'src/components/base';
import RemoteRecipeDialog from 'src/components/esheet/RemoteRecipeDialog.vue';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { useConfirmModal } from 'src/features/move-in/composables/useConfirmModal';
import { useRemoteCvd } from 'src/features/remote-cvd/composables/useRemoteCvd';
import {
  getChamberStatusClass,
  getPortStateClass,
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
const portStateClass = computed(() => getPortStateClass(state.portState));
const showAndroidOnlyFields = true;

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
