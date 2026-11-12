<template>
  <BaseScreen :show-header="false" aria-label="System Setting">
    <template #footer><span /></template>
  </BaseScreen>
  <BaseModal
    :open="true"
    :title="COMMON_FIELD.TXTDIALOGTITLE_SYSTEMCONF"
    aria-labelledby="system-title"
    :closable="false"
    :overlay-closable="false"
  >
    <template #title>
      <h1 id="system-title" class="system-setting-title">
        {{ COMMON_FIELD.TXTDIALOGTITLE_SYSTEMCONF }}
      </h1>
    </template>
    <div class="ds-screen__card-row">
      <BaseInput
        ref="passwordInput"
        data-testid="edit-password"
        label="비밀번호"
        aria-label="비밀번호"
        type="password"
        size="small"
        autocomplete="off"
        autofocus
        :model-value="editPassword"
        :disabled="saving || loading"
        @update:model-value="editPassword = String($event ?? '')"
      />
      <BaseButton
        variant="secondary"
        size="small"
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
      <h2 id="mobile-server-title" class="system-setting-server-title">Mobile Server</h2>
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
        label="PROD IP"
        aria-label="PROD IP"
        size="small"
        inputmode="decimal"
        autocomplete="off"
        data-testid="edit-prod-server"
        :model-value="form.editProdServer"
        :disabled="saving"
        @update:model-value="form.editProdServer = normalizeHost($event)"
      />
      <BaseInput
        label="DEV IP"
        aria-label="DEV IP"
        size="small"
        inputmode="decimal"
        autocomplete="off"
        data-testid="edit-dev-server"
        :model-value="form.editDevServer"
        :disabled="saving"
        @update:model-value="form.editDevServer = normalizeHost($event)"
      />
    </section>

    <template #footer>
      <BaseButton
        variant="tertiary"
        size="medium"
        data-testid="btn-battery-down"
        :loading="downloading"
        :disabled="downloading || saving || loading"
        @click="onSingleClick('btnBatteryDown')"
        >Battery Monitor</BaseButton
      >
      <BaseButton
        v-show="false"
        variant="tertiary"
        size="medium"
        data-testid="btn-pmdm-down"
        @click="onSingleClick('btnPmdmDown')"
        >PDMA Agent</BaseButton
      >
      <BaseButton
        variant="tertiary"
        size="medium"
        data-testid="btn-close"
        :disabled="saving"
        @click="onSingleClick('btnClose')"
        >닫기</BaseButton
      >
      <BaseButton
        variant="tertiary"
        size="medium"
        data-testid="btn-ok"
        :disabled="!layoutServerInfo || saving || loading"
        :loading="saving"
        @click="onSingleClick('btnOk')"
        >확인</BaseButton
      >
    </template>
  </BaseModal>

  <BaseModal :open="dialog.open" :title="dialog.title" :closable="false" :overlay-closable="false">
    <p class="system-setting-message">{{ dialog.message }}</p>
    <template #footer>
      <BaseButton
        v-if="dialog.kind === 'confirm'"
        variant="tertiary"
        size="medium"
        data-testid="dialog-cancel"
        @click="dialog.open = false"
        >{{ COMMON_FIELD.NEGATIVEBTNSTR }}</BaseButton
      >
      <BaseButton
        variant="tertiary"
        size="medium"
        data-testid="dialog-ok"
        @click="handleDialogConfirm"
        >{{ COMMON_FIELD.BTNOKSTR }}</BaseButton
      >
    </template>
  </BaseModal>
  <BaseToast
    v-if="toast"
    :key="toast.id"
    type="warning"
    :description="toast.message"
    @close="toast = undefined"
  />
</template>

<script setup lang="ts">
import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseRadio,
  BaseScreen,
  BaseToast,
} from 'src/components/base';
import { COMMON_FIELD } from 'src/constants/common-strings';
import { DeviceInfo } from 'src/constants/device-info';
import { ROUTE } from 'src/constants/routes';
import { DEV_SERVER, PROD_SERVER } from 'src/constants/server';
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';

import { systemSettingApi } from '../services/system-setting.api';
import { setBackBlocked } from '../services/system-setting-native.service';
import type { SystemSettingForm } from '../types/system-setting.types';

defineOptions({ name: 'SystemSettingPage' });

const router = useRouter();
const api = systemSettingApi;
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
.system-setting-title {
  margin: 0;
  font: inherit;
}

.system-setting-server-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-1, 8px);
}

.system-setting-server-title {
  margin: 0;
  font-size: var(--size-16px, 16px);
  font-weight: var(--weight-font-bold, 700);
  line-height: var(--height-24px, 24px);
}

.system-setting-radio-group {
  display: flex;
  gap: var(--spacing-space-1, 8px);
}

.system-setting-message {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
