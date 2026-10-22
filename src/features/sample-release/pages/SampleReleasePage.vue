<template>
  <main class="sample-release-page">
    <BaseScreen
      :show-header="false"
      :ok-disabled="!isExecutionEnabled || loading"
      :ok-loading="loading"
      :cancel-disabled="loading"
      @ok="execution"
      @cancel="onClose"
    >
      <!-- 1. Search Bar Card -->
      <section class="ds-screen__card sample-release-card card-search" aria-label="SAMPLE LOT 조회">
        <div class="sample-release-search-row">
          <BaseInput
            v-model="editLotNo"
            label="SAMPLE LOT"
            placeholder="Search"
            class="sample-release-search-input"
            :disabled="loading"
            stack-label
            @update:model-value="onLotNoInput"
            @keyup.enter="onLotNoEnter"
          >
            <template #append>
              <QIcon name="sym_o_search" class="search-icon" aria-hidden="true" />
            </template>
          </BaseInput>
          <BaseButton
            variant="secondary"
            label="조회"
            class="sample-release-search-btn"
            :loading="loading"
            @click="searchData(editLotNo)"
          />
        </div>
      </section>

      <!-- 2. Sample Release 공정정보 Card -->
      <section class="ds-screen__card sample-release-card" aria-label="SAMPLE RELEASE 공정정보">
        <h2 class="card-title">SAMPLE RELEASE 공정정보</h2>
        <div class="sample-release-row">
          <BaseInput :model-value="txtReleaseProduct" label="제품명" readonly class="col-half" />
          <BaseInput :model-value="txtReleaseRoute" label="ROUTE" readonly class="col-half" />
        </div>
        <div class="sample-release-row-single">
          <BaseInput :model-value="txtReleaseProcessname" label="공정" readonly class="col-full" />
        </div>
        <div class="sample-release-row-single">
          <BaseInput
            :model-value="txtReleaseMachinename"
            label="MACHINE"
            readonly
            class="col-full"
          />
        </div>
      </section>

      <!-- 3. SAMPLE LOT 정보 Card -->
      <section class="ds-screen__card sample-release-card" aria-label="SAMPLE LOT정보">
        <h2 class="card-title">SAMPLE LOT정보</h2>
        <div class="sample-release-row">
          <BaseInput :model-value="txtSampleLotname" label="SAMPLE LOT" readonly class="col-half" />
          <BaseInput :model-value="txtSampleQty" label="수량" readonly class="col-half" />
        </div>
        <div class="sample-release-row">
          <BaseInput :model-value="txtSampleProduct" label="제품명" readonly class="col-half" />
          <BaseInput :model-value="txtSampleRoute" label="ROUTE" readonly class="col-half" />
        </div>
        <div class="sample-release-row">
          <BaseInput :model-value="txtSampleProcessname" label="공정" readonly class="col-half" />
          <BaseInput
            :model-value="txtSampleProcessnamedesc"
            label="공정 DESC"
            readonly
            class="col-half"
          />
        </div>
      </section>

      <!-- 4. MAIN LOT 정보 Card -->
      <section class="ds-screen__card sample-release-card" aria-label="MAIN LOT 정보">
        <h2 class="card-title">MAIN LOT 정보</h2>
        <div class="sample-release-row">
          <BaseInput :model-value="txtMainLotname" label="MAIN LOT" readonly class="col-half" />
          <BaseInput :model-value="txtMainQty" label="수량" readonly class="col-half" />
        </div>
        <div class="sample-release-row-single">
          <BaseInput :model-value="txtMainProduct" label="제품명" readonly class="col-full" />
        </div>
        <div class="sample-release-row-single">
          <BaseInput :model-value="txtMainRoute" label="ROUTE" readonly class="col-full" />
        </div>
        <div class="sample-release-row-single">
          <BaseInput :model-value="txtMainProcessname" label="공정" readonly class="col-full" />
        </div>
        <div class="sample-release-row-single">
          <BaseInput
            :model-value="txtMainProcessdesc"
            label="공정 DESC"
            readonly
            class="col-full"
          />
        </div>
        <div class="sample-release-row-single">
          <BaseInput
            v-model="txtMainComment"
            mode="textarea"
            :rows="2"
            :disabled="loading"
            class="col-full"
          />
        </div>
      </section>

      <template #footer>
        <BaseButton
          size="large"
          variant="primary"
          label="실행"
          class="bottom-action-btn"
          :disabled="!isExecutionEnabled || loading"
          :loading="loading"
          @click="execution"
        />
        <BaseButton
          size="large"
          variant="tertiary"
          label="닫기"
          class="bottom-action-btn"
          :disabled="loading"
          @click="onClose"
        />
      </template>
    </BaseScreen>

    <!-- Alert / Inform Modal -->
    <BaseModal
      :open="dialogOpen"
      :title="dialogTitle"
      :closable="false"
      :overlay-closable="false"
      @update:open="closeDialog"
    >
      <p class="dialog-message" role="alert">{{ dialogMessage }}</p>
      <template #footer>
        <div class="dialog-actions">
          <BaseButton label="확인" @click="closeDialog" />
        </div>
      </template>
    </BaseModal>
  </main>
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
.sample-release-page {
  display: flex;
  width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
}

.sample-release-page :deep(.ds-screen) {
  margin: 0 auto;
}

/* .sample-release-card {
  display: flex;
  flex-direction: column;
  gap: var(--size-8px, 8px);
  padding: var(--size-12px, 12px);
  background: var(--gray-100, #f3f4f6);
  border: 1px solid var(--gray-300, #d1d5dc);
  border-radius: var(--size-4px, 4px);
  box-shadow: 0px 8px 24px 0px rgba(13, 20, 31, 0.06);
  box-sizing: border-box;
  width: 100%;
}
 */
.card-title {
  margin: 0;
  font-family: var(--font-family-default, 'Noto Sans KR', sans-serif);
  font-size: var(--size-16px, 16px);
  font-weight: 700;
  line-height: var(--height-24px, 24px);
  color: var(--gray-900, #030712);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sample-release-search-row {
  display: flex;
  gap: var(--size-8px, 8px);
  align-items: flex-end;
  width: 100%;
}

.sample-release-search-input {
  flex: 1;
  min-width: 0;
}

.search-icon {
  font-size: var(--size-18px, 18px);
  color: var(--gray-500, #99a1af);
}

.sample-release-search-btn {
  height: 40px;
  white-space: nowrap;
}

.sample-release-row {
  display: flex;
  gap: var(--size-8px, 8px);
  width: 100%;
}

.sample-release-row-single {
  display: flex;
  width: 100%;
}

.col-half {
  flex: 1;
  min-width: 0;
}

.col-full {
  width: 100%;
}

.bottom-action-btn {
  flex: 1 1 0;
}

.dialog-message {
  margin: 0;
  font-size: var(--size-14px, 14px);
  line-height: var(--height-20px, 20px);
  color: var(--gray-900, #101828);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding-top: var(--size-8px, 8px);
}
</style>
