<template>
  <main class="system-setting-viewport" aria-label="System Setting" />
  <BaseModal
    class="system-setting-dialog"
    :open="true"
    :title="COMMON_FIELD.TXTDIALOGTITLE_SYSTEMCONF"
    width="min(21.25rem, calc(100vw - 1.25rem))"
    aria-labelledby="system-title"
    :closable="false"
    :overlay-closable="false"
  >
    <template #title>
      <h1 id="system-title">{{ COMMON_FIELD.TXTDIALOGTITLE_SYSTEMCONF }}</h1>
    </template>
    <div class="system-setting-password-row">
      <BaseInput
        ref="passwordInput"
        class="system-setting-field"
        data-testid="edit-password"
        label="비밀번호"
        aria-label="비밀번호"
        type="password"
        autocomplete="off"
        autofocus
        :model-value="editPassword"
        :disabled="saving || loading"
        @update:model-value="editPassword = String($event ?? '')"
      />
      <BaseButton
        class="system-setting-action system-setting-change"
        variant="secondary"
        data-testid="btn-password"
        :disabled="saving || loading"
        @click="onSingleClick('btnPassword')"
        >변경</BaseButton
      >
    </div>

    <section
      v-if="layoutServerInfo"
      class="system-setting-server-info"
      aria-labelledby="mobile-server-title"
      data-testid="layout-server-info"
    >
      <h2 id="mobile-server-title">Mobile Server</h2>
      <div
        class="system-setting-radio-group"
        role="radiogroup"
        aria-labelledby="mobile-server-title"
      >
        <BaseRadio
          label="PROD"
          name="server"
          :model-value="form.selectedServer === PROD_SERVER"
          :disabled="saving"
          data-testid="radio-server1"
          @update:model-value="form.selectedServer = PROD_SERVER"
        />
        <BaseRadio
          label="DEV"
          name="server"
          :model-value="form.selectedServer === DEV_SERVER"
          :disabled="saving"
          data-testid="radio-server2"
          @update:model-value="form.selectedServer = DEV_SERVER"
        />
      </div>
      <BaseInput
        class="system-setting-field"
        label="PROD IP"
        aria-label="PROD IP"
        inputmode="decimal"
        autocomplete="off"
        data-testid="edit-prod-server"
        :model-value="form.editProdServer"
        :disabled="saving"
        @update:model-value="form.editProdServer = normalizeHost($event)"
      />
      <BaseInput
        class="system-setting-field"
        label="DEV IP"
        aria-label="DEV IP"
        inputmode="decimal"
        autocomplete="off"
        data-testid="edit-dev-server"
        :model-value="form.editDevServer"
        :disabled="saving"
        @update:model-value="form.editDevServer = normalizeHost($event)"
      />
    </section>

    <template #footer>
      <div class="system-setting-actions">
        <BaseButton
          class="system-setting-action"
          variant="tertiary"
          data-testid="btn-battery-down"
          :loading="downloading"
          :disabled="downloading || saving || loading"
          @click="onSingleClick('btnBatteryDown')"
          >Battery Monitor</BaseButton
        >
        <BaseButton
          v-show="false"
          class="system-setting-action"
          variant="tertiary"
          data-testid="btn-pmdm-down"
          @click="onSingleClick('btnPmdmDown')"
          >PDMA Agent</BaseButton
        >
        <BaseButton
          class="system-setting-action"
          variant="tertiary"
          data-testid="btn-close"
          :disabled="saving"
          @click="onSingleClick('btnClose')"
          >닫기</BaseButton
        >
        <BaseButton
          class="system-setting-action"
          variant="tertiary"
          data-testid="btn-ok"
          :disabled="!layoutServerInfo || saving || loading"
          :loading="saving"
          @click="onSingleClick('btnOk')"
          >확인</BaseButton
        >
      </div>
    </template>
  </BaseModal>

  <BaseModal
    class="system-setting-message-dialog"
    :open="dialog.open"
    :title="dialog.title"
    width="min(21.25rem, calc(100vw - 1.25rem))"
    :closable="false"
    :overlay-closable="false"
  >
    <p class="system-setting-message">{{ dialog.message }}</p>
    <template #footer>
      <BaseButton
        v-if="dialog.kind === 'confirm'"
        variant="tertiary"
        data-testid="dialog-cancel"
        @click="dialog.open = false"
        >{{ COMMON_FIELD.NEGATIVEBTNSTR }}</BaseButton
      >
      <BaseButton variant="tertiary" data-testid="dialog-ok" @click="handleDialogConfirm">{{
        COMMON_FIELD.BTNOKSTR
      }}</BaseButton>
    </template>
  </BaseModal>
  <BaseToast
    v-if="toast"
    :key="toast.id"
    type="warning"
    :description="toast.message"
    :duration="2000"
    @close="toast = undefined"
  />
</template>

<script setup lang="ts">
import { BaseButton, BaseInput, BaseModal, BaseRadio, BaseToast } from 'src/components/base';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { DeviceInfo } from 'src/constants/device-info';
import { ROUTE } from 'src/constants/routes';
import { DEV_SERVER, PROD_SERVER } from 'src/constants/server';
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';

import { createSystemSettingMockApi } from '../mocks/system-setting.mock';
import { systemSettingApi } from '../services/system-setting.api';
import { setBackBlocked } from '../services/system-setting-native.service';
import {
  SYSTEM_SETTING_MOCK_CASES,
  type SystemSettingForm,
  type SystemSettingMockCase,
} from '../types/system-setting.types';

defineOptions({ name: 'SystemSettingPage' });

const route = useRoute();
const router = useRouter();
const mockMode = import.meta.env.DEV && queryValue('mock') === 'system-setting';
const api = mockMode ? createSystemSettingMockApi(mockCase()) : systemSettingApi;
const editPassword = ref('');
const layoutServerInfo = ref(false);
const loading = ref(true);
const saving = ref(false);
const downloading = ref(false);
const passwordInput = ref<InstanceType<typeof BaseInput>>();
const form = reactive<SystemSettingForm>({
  editProdServer: '',
  editDevServer: '',
  selectedServer: PROD_SERVER,
});
const dialog = reactive({
  open: false,
  title: '',
  message: '',
  kind: 'error',
});
const toast = ref<{ id: number; message: string }>();
let lastClickTime = Number.NEGATIVE_INFINITY;
let closing = false;
let disposed = false;
let toastId = 0;

function queryValue(key: string): string {
  const value = route.query[key];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function mockCase(): SystemSettingMockCase {
  const value = queryValue('case') as SystemSettingMockCase;
  return SYSTEM_SETTING_MOCK_CASES.includes(value) ? value : 'success';
}

function normalizeHost(value: unknown): string {
  return (typeof value === 'string' || typeof value === 'number' ? String(value) : '').replace(
    /[^0-9.]/g,
    '',
  );
}

function showError(error: unknown): void {
  if (disposed) return;
  Object.assign(dialog, {
    open: true,
    kind: 'error',
    title: COMMON_FIELD.TXTDIALOGTITLE_ERROR,
    message: error instanceof Error ? error.message : String(error),
  });
}

function getServerInfo(): void {
  try {
    Object.assign(form, api.getServerInfo());
  } catch (error) {
    showError(error);
  } finally {
    loading.value = false;
  }
}

function passwordCheck(): void {
  layoutServerInfo.value = editPassword.value === DeviceInfo.SystemSettingPW;
  if (!layoutServerInfo.value) toast.value = { id: ++toastId, message: '비밀번호가 다릅니다' };
}

function systemSettingOK(): void {
  if (!layoutServerInfo.value || loading.value || saving.value) return;
  Object.assign(dialog, {
    open: true,
    kind: 'confirm',
    title: COMMON_FIELD.TXTDIALOGTITLE_SYSTEMCONF,
    message: COMMON_FIELD.TXTDIALOGMESSAGE_SYSTEMCONF,
  });
}

async function saveServerInfo(): Promise<void> {
  if (saving.value || !layoutServerInfo.value) return;
  saving.value = true;
  try {
    const success = await api.saveServerInfo({ ...form });
    if (success && !disposed)
      Object.assign(dialog, {
        open: true,
        kind: 'success',
        title: COMMON_FIELD.TXTDIALOGTITLE_SYSTEMCONF,
        message: '시스템 환경설정이 변경 되었습니다.',
      });
  } catch (error) {
    showError(error);
  } finally {
    saving.value = false;
  }
}

async function handleDialogConfirm(): Promise<void> {
  const kind = dialog.kind;
  dialog.open = false;
  if (kind === 'confirm') await saveServerInfo();
  else if (kind === 'success') await finish();
}

async function downLoadBatterMonitor(): Promise<void> {
  await download(() => api.downLoadBatterMonitor());
}

async function downLoadPmdm(): Promise<void> {
  await download(() => api.downLoadPmdm());
}

async function download(action: () => Promise<void>): Promise<void> {
  if (downloading.value || saving.value || loading.value) return;
  downloading.value = true;
  try {
    await action();
  } catch (error) {
    showError(error);
  } finally {
    downloading.value = false;
  }
}

async function finish(): Promise<void> {
  if (saving.value) return;
  closing = true;
  if (router.options.history.state.back) router.back();
  else await router.replace({ path: `/${ROUTE.main}` });
}

function onSingleClick(
  action: 'btnOk' | 'btnClose' | 'btnPassword' | 'btnPmdmDown' | 'btnBatteryDown',
): void {
  const now = Date.now();
  if (now - lastClickTime <= 1000 || dialog.open || saving.value) return;
  lastClickTime = now;
  if (action === 'btnOk') systemSettingOK();
  else if (action === 'btnClose') void finish();
  else if (action === 'btnPassword') passwordCheck();
  else if (action === 'btnPmdmDown') void downLoadPmdm();
  else void downLoadBatterMonitor();
}

function onBackPressed(): void {
  if (dialog.open) void handleDialogConfirm();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  event.stopPropagation();
  onBackPressed();
}

onBeforeRouteLeave(() => {
  if (!closing) onBackPressed();
  return closing;
});
onMounted(() => {
  getServerInfo();
  passwordInput.value?.focus();
  window.addEventListener('keydown', handleKeydown, true);
  window.addEventListener('system-setting-back', onBackPressed);
  void setBackBlocked(true).catch(showError);
});
onBeforeUnmount(() => {
  disposed = true;
  window.removeEventListener('keydown', handleKeydown, true);
  window.removeEventListener('system-setting-back', onBackPressed);
  void setBackBlocked(false).catch(() => undefined);
});
</script>

<style lang="scss">
.system-setting-viewport {
  min-block-size: 100dvh;
  background: var(--ds-movein-page-bg);
}

.system-setting-dialog,
.system-setting-message-dialog {
  .q-dialog__inner {
    padding: calc(var(--ds-spacing-2) + var(--ds-spacing-1) / 2);
  }

  .ds-modal {
    font-family: var(--ds-font-family-sans);
    border-radius: var(--ds-radius-sm);
    box-shadow: var(--ds-dropdown-list-shadow);
  }

  .ds-modal__header {
    padding: var(--ds-spacing-2) var(--ds-spacing-3);
  }

  .ds-modal__body {
    padding: var(--ds-spacing-4);
    background: var(--ds-color-neutral-100);
    gap: var(--ds-spacing-4);
  }

  .ds-modal__footer {
    padding: var(--ds-spacing-3);
  }
}

.system-setting-dialog {
  .q-dialog__backdrop {
    background: rgb(0 0 0 / 32%);
    backdrop-filter: blur(10px);
  }

  #system-title {
    margin: 0;
    font-family: var(--ds-font-family-sans);
    font-size: var(--ds-font-size-xl);
    line-height: var(--ds-line-height-xl);
    font-weight: var(--ds-font-weight-bold);
    letter-spacing: 0;
    color: var(--ds-color-text);
  }
}

.system-setting-password-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: calc(var(--ds-spacing-2) + var(--ds-spacing-1) / 2);
}

.system-setting-field {
  min-inline-size: 0;

  .q-field__control {
    min-height: var(--ds-input-min-height-md);
    background: var(--ds-color-bg);
    border-radius: 0;
    border-bottom: 0;
    box-shadow: inset 0 0 0 1px var(--ds-color-border);
  }

  .q-field--focused .q-field__control {
    border-bottom: 0;
    box-shadow: inset 0 0 0 1px var(--ds-color-primary);
  }

  .q-field__control::before {
    border: 0;
  }
}

.system-setting-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--ds-spacing-2);
  flex-wrap: wrap;
  inline-size: 100%;
  padding-inline-start: calc(var(--ds-spacing-3) * 2);

  [data-testid='btn-battery-down'] {
    flex: 1;
  }

  .system-setting-action[data-testid='btn-close'] {
    --ds-btn-padding-x: calc(var(--ds-spacing-3) - var(--ds-spacing-1) / 2);
  }

  .system-setting-action[data-testid='btn-ok'] {
    --ds-btn-padding-x: calc(var(--ds-spacing-3) * 2 - var(--ds-spacing-1) / 2);
  }
}

.system-setting-action.ds-btn {
  --ds-btn-height: var(--ds-search-height-md);
  --ds-btn-padding-x: var(--ds-spacing-3);
  --ds-btn-bg: transparent;
  --ds-btn-border-color: transparent;
  min-inline-size: 0;
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-font-size-md);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: 0;
  white-space: nowrap;
}

.system-setting-action.ds-btn:not(.ds-btn--disabled) {
  --ds-btn-fg: var(--ds-color-primary);
}

.system-setting-change.ds-btn {
  --ds-btn-border-color: var(--ds-color-primary);
  --ds-btn-bg: var(--ds-color-bg);
}

.system-setting-server-info {
  display: grid;
  gap: var(--ds-spacing-3);

  h2 {
    margin: 0;
    font-size: var(--ds-font-size-lg);
    font-weight: var(--ds-font-weight-bold);
  }
}

.system-setting-radio-group {
  display: flex;
  gap: var(--ds-spacing-4);
}

.system-setting-message {
  margin: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 22rem) {
  .system-setting-actions {
    padding-inline-start: 0;
  }
}
</style>
