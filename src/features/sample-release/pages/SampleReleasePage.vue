<template>
  <BaseScreen
    class="sample-release-page"
    :show-header="false"
    ok-label="실행"
    cancel-label="닫기"
    :ok-disabled="!isExecutionEnabled || loading"
    :ok-loading="loading"
    :cancel-disabled="loading"
    @ok="execution"
    @cancel="onClose"
  >
    <section class="ds-screen__card" aria-label="SAMPLE LOT 조회">
      <div class="ds-screen__card-row">
        <BaseInput
          v-model="editLotNo"
          label="SAMPLE LOT"
          :disabled="loading"
          @update:model-value="onLotNoInput"
          @keyup.enter="onLotNoEnter"
        >
          <template #append><QIcon name="sym_o_search" size="16px" aria-hidden="true" /></template>
        </BaseInput>
        <BaseButton
          variant="secondary"
          label="조회"
          :loading="loading"
          @click="searchData(editLotNo)"
        />
      </div>
    </section>

    <section class="ds-screen__card" aria-labelledby="sample-release-process-heading">
      <h2 id="sample-release-process-heading" class="ds-screen__card-title">
        SAMPLE RELEASE 공정정보
      </h2>
      <div class="ds-screen__card-row">
        <BaseInput :model-value="txtReleaseProduct" label="제품명" readonly />
        <BaseInput :model-value="txtReleaseRoute" aria-label="ROUTE" readonly />
      </div>
      <BaseInput :model-value="txtReleaseProcessname" label="공정" readonly />
      <BaseInput :model-value="txtReleaseMachinename" label="MACHINE" readonly />
    </section>

    <section class="ds-screen__card" aria-labelledby="sample-release-sample-heading">
      <h2 id="sample-release-sample-heading" class="ds-screen__card-title">SAMPLE LOT정보</h2>
      <div class="ds-screen__card-row">
        <BaseInput :model-value="txtSampleLotname" label="SAMPLE LOT" readonly />
        <BaseInput :model-value="txtSampleQty" aria-label="수량" readonly />
      </div>
      <div class="ds-screen__card-row">
        <BaseInput :model-value="txtSampleProduct" label="제품명" readonly />
        <BaseInput :model-value="txtSampleRoute" aria-label="ROUTE" readonly />
      </div>
      <div class="ds-screen__card-row">
        <BaseInput :model-value="txtSampleProcessname" label="공정" readonly />
        <BaseInput :model-value="txtSampleProcessnamedesc" aria-label="공정 DESC" readonly />
      </div>
    </section>

    <section class="ds-screen__card" aria-labelledby="sample-release-main-heading">
      <h2 id="sample-release-main-heading" class="ds-screen__card-title">MAIN LOT 정보</h2>
      <div class="ds-screen__card-row">
        <BaseInput :model-value="txtMainLotname" label="MAIN LOT" readonly />
        <BaseInput :model-value="txtMainQty" aria-label="수량" readonly />
      </div>
      <BaseInput :model-value="txtMainProduct" label="제품명" readonly />
      <BaseInput :model-value="txtMainRoute" label="ROUTE" readonly />
      <BaseInput :model-value="txtMainProcessname" label="공정" readonly />
      <BaseInput :model-value="txtMainProcessdesc" label="공정 DESC" readonly />
      <BaseInput v-model="txtMainComment" label="COMMENT" :disabled="loading" />
    </section>

    <BaseModal
      :open="dialogOpen"
      :title="dialogTitle"
      :closable="false"
      :overlay-closable="false"
      @update:open="closeDialog"
    >
      <p class="dialog-message" role="alert">{{ dialogMessage }}</p>
      <template #footer>
        <BaseButton variant="link" label="확인" @click="closeDialog" />
      </template>
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { BaseButton, BaseInput, BaseModal, BaseScreen } from 'src/components/base';

import { useSampleRelease } from '../composables/use-sample-release';

defineOptions({ name: 'SampleReleasePage' });

const {
  editLotNo,
  txtReleaseProduct,
  txtReleaseRoute,
  txtReleaseProcessname,
  txtReleaseMachinename,
  txtSampleLotname,
  txtSampleQty,
  txtSampleProduct,
  txtSampleProcessname,
  txtSampleProcessnamedesc,
  txtSampleRoute,
  txtMainLotname,
  txtMainQty,
  txtMainProduct,
  txtMainRoute,
  txtMainProcessname,
  txtMainProcessdesc,
  txtMainComment,
  isExecutionEnabled,
  loading,
  dialogOpen,
  dialogTitle,
  dialogMessage,
  closeDialog,
  searchData,
  onLotNoInput,
  onLotNoEnter,
  execution,
  onClose,
} = useSampleRelease();
</script>

<style scoped>
.dialog-message {
  margin: 0;
  color: var(--text-text-primary, #030712);
  font-size: var(--size-14px, 14px);
  line-height: var(--height-20px, 20px);
}
</style>
