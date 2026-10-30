<template>
  <BaseScreen
    ref="screen"
    class="wafer-code-check"
    title="Wafer 자재 정보 Check"
    :aria-busy="state.loading"
    :ok-disabled="state.loading"
    :ok-loading="state.loading"
    :cancel-disabled="state.loading"
    ok-label="확인"
    cancel-label="닫기"
    @ok="store.executewf"
    @cancel="closeScreen"
  >
    <section class="ds-screen__card" aria-label="RUN BOX 및 INITIAL BOX 조회">
      <div class="ds-screen__card-row">
        <BaseInput
          ref="runInput"
          data-testid="wafer-code-check-run-search"
          label="RUN BOX"
          autocomplete="off"
          :model-value="state.editRunBoxNo"
          :disabled="state.loading"
          @update:model-value="state.editRunBoxNo = String($event ?? '').toUpperCase()"
          @keydown.enter.prevent
          @keyup.enter.prevent="onRunEnter"
        >
          <template #append><QIcon name="sym_o_search" size="16px" aria-hidden="true" /></template>
        </BaseInput>
        <BaseButton
          data-testid="wafer-code-check-run-lookup"
          variant="secondary"
          :disabled="state.loading"
          :loading="state.loading"
          @click="onRunSearch"
          >조회</BaseButton
        >
      </div>
      <div class="ds-screen__card-row">
        <BaseInput
          ref="initialInput"
          data-testid="wafer-code-check-initial-search"
          label="INITIAL BOX"
          autocomplete="off"
          :model-value="state.editInitialboxNo"
          :disabled="state.loading"
          @update:model-value="state.editInitialboxNo = String($event ?? '').toUpperCase()"
          @keydown.enter.prevent
          @keyup.enter.prevent="onInitialEnter"
        >
          <template #append><QIcon name="sym_o_search" size="16px" aria-hidden="true" /></template>
        </BaseInput>
        <BaseButton
          data-testid="wafer-code-check-initial-lookup"
          variant="secondary"
          :disabled="state.loading"
          @click="onInitialSearch"
          >조회</BaseButton
        >
      </div>
    </section>

    <section class="ds-screen__card" aria-labelledby="wafer-code-check-run-heading">
      <h2 id="wafer-code-check-run-heading" class="ds-screen__card-title">RUN BOX</h2>
      <BaseInput
        data-testid="wafer-code-check-lot-name"
        label="LOT NAME"
        :model-value="state.txtLotName"
        readonly
        stack-label
      />
      <BaseInput
        data-testid="wafer-code-check-wafer-type"
        label="WAFER"
        :model-value="state.txtWaferName"
        readonly
        stack-label
      />
    </section>

    <section class="ds-screen__card" aria-labelledby="wafer-code-check-initial-heading">
      <h2 id="wafer-code-check-initial-heading" class="ds-screen__card-title">INITIAL BOX</h2>
      <BaseInput
        class="wafer-code-check__initial-display"
        data-testid="wafer-code-check-initial-name"
        aria-label="INITIAL BOX 이름"
        mode="textarea"
        :model-value="state.txtInitialName"
        :rows="4"
        readonly
      />
      <BaseDropdownList
        data-testid="wafer-code-check-reason"
        label="사유 선택"
        aria-label="사유 선택"
        :model-value="state.selectedReason"
        :options="state.reasonOptions"
        :disabled="!state.reasonEnabled || state.loading"
        @update:model-value="
          state.selectedReason = $event === undefined ? undefined : String($event)
        "
      />
    </section>

    <BaseModal
      class="wafer-code-check__dialog"
      :open="Boolean(state.dialog)"
      :title="state.dialog?.title"
      :closable="false"
      :overlay-closable="false"
      :width="320"
    >
      <p class="ds-dialog-message" :role="state.dialog?.kind === 'alert' ? 'alert' : undefined">
        {{ state.dialog?.message }}
      </p>
      <template #footer>
        <div v-if="state.dialog?.kind === 'confirm'" class="ds-dialog-actions">
          <BaseButton variant="link" @click="store.cancelDialog">{{
            COMMON_FIELD.BTNNOSTR
          }}</BaseButton>
          <BaseButton variant="link" @click="store.confirmExecution">{{
            COMMON_FIELD.BTNYESSTR
          }}</BaseButton>
        </div>
        <BaseButton v-else variant="link" @click="acknowledgeDialog">
          {{ COMMON_FIELD.BTNOKSTR }}
        </BaseButton>
      </template>
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { BaseButton } from 'src/components/base/button';
import { BaseDropdownList } from 'src/components/base/dropdown-list';
import { BaseInput } from 'src/components/base/input';
import { BaseModal } from 'src/components/base/modal';
import { BaseScreen } from 'src/components/base/screen';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useWafercodecheck } from '../composables/use-wafer-code-check';

defineOptions({ name: 'WaferCodeCheckPage' });

const router = useRouter();
const store = useWafercodecheck();
const { state } = store;
const screen = ref<{ focusOkButton: () => void } | null>(null);
const runInput = ref<{ focus: () => void; select: () => void } | null>(null);
const initialInput = ref<{ focus: () => void } | null>(null);

async function onInitialEnter() {
  if (!store.getinitialInfo()) return;
  await nextTick();
  runInput.value?.focus();
  runInput.value?.select();
}

async function onInitialSearch() {
  if (!store.getinitialInfo()) return;
  await nextTick();
  screen.value?.focusOkButton();
}

async function onRunSearch() {
  if (await store.getWaferInfo()) {
    await nextTick();
    initialInput.value?.focus();
  }
}

async function onRunEnter() {
  if (await store.handleRunEnter()) {
    await nextTick();
    initialInput.value?.focus();
  }
}

async function acknowledgeDialog() {
  const focusTarget = store.acknowledgeDialog();
  await nextTick();
  if (focusTarget === 'initial') initialInput.value?.focus();
  if (focusTarget === 'run') {
    runInput.value?.focus();
    runInput.value?.select();
  }
}

function closeScreen() {
  if (router.options.history.state.back) router.back();
  else void router.replace(`/${ROUTE.main}`);
}
</script>

<style scoped src="../styles/wafer-code-check.css"></style>
