<template>
  <main class="activity-login" aria-label="로그인">
    <div class="activity-login__backdrop" aria-hidden="true" />
  </main>

  <BaseModal
    v-model:open="isLoginOpen"
    title="계정을 입력해주세요"
    :closable="false"
    :overlay-closable="false"
  >
    <form id="login-form" @submit.prevent="executeLogin">
      <div class="activity-login__fields">
        <BaseInput
          ref="userIdInput"
          label="USER ID"
          layout="vertical"
          size="small"
          data-testid="user-id"
          control-id="edit-user-id"
          name="userId"
          autocomplete="username"
          :model-value="userId"
          @focus="selectUserId"
          @keydown.down.prevent="focusPassword"
          @update:model-value="updateUserId"
        />

        <BaseInput
          ref="passwordInput"
          label="PASSWORD"
          layout="vertical"
          size="small"
          data-testid="password"
          control-id="edit-password"
          name="password"
          type="password"
          autocomplete="current-password"
          :model-value="password"
          @update:model-value="updatePassword"
          @keyup.enter="executeLogin"
        />
      </div>
    </form>

    <template #footer>
      <BaseButton data-testid="btn-cancel" variant="link" @click="finish">취소</BaseButton>
      <BaseButton
        data-testid="btn-ok"
        form="login-form"
        html-type="submit"
        variant="link"
        :loading="isSubmitting"
        >확인</BaseButton
      >
    </template>
  </BaseModal>

  <BaseModal
    v-model:open="dialog.open"
    :title="dialog.title"
    :closable="false"
    :overlay-closable="false"
  >
    <p class="activity-login__alert-message">{{ dialog.message }}</p>
    <template #footer>
      <BaseButton data-testid="dialog-ok" @click="handleDialog">확인</BaseButton>
    </template>
  </BaseModal>

  <DeviceNameCheckModal
    :open="isPdaNameCheckOpen"
    :initial-device-name="mainStore.deviceName"
    @confirm="handlePdaNameChanged"
    @update:open="isPdaNameCheckOpen = $event"
  />
</template>

<script setup lang="ts">
import { BaseButton, BaseInput, type BaseInputValue, BaseModal } from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import { DeviceNameCheckModal } from 'src/features/device-name-check';
import { getWifiIpAddress } from 'src/features/system-setting/services/system-setting-native.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';
import { CommonUtil } from 'src/utils/common-util';
import { nextTick, onActivated, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { mainApi } from '../../main/services/main-message.service';
import {
  buildConfigMessage,
  buildLoginMessage,
} from '../../main/services/main-message-payload.helper';
import { useMainStore } from '../../main/stores/main.store';

defineOptions({ name: 'ActivityLoginPage' });

type DialogAction = 'clear-password' | 'finish' | 'send-config' | 'none';

interface BaseInputInstance {
  focus(): void;
  select(): void;
}

const router = useRouter();
const mainStore = useMainStore();
const userIdInput = ref<BaseInputInstance | null>(null);
const passwordInput = ref<BaseInputInstance | null>(null);
const isLoginOpen = ref(true);
const isPdaNameCheckOpen = ref(false);
const isSubmitting = ref(false);
const userId = ref('');
const password = ref('');
const dialog = reactive<{
  action: DialogAction;
  message: string;
  open: boolean;
  title: string;
}>({
  action: 'none',
  message: '',
  open: false,
  title: '',
});

function updateUserId(value: BaseInputValue): void {
  userId.value = String(value ?? '').toUpperCase();
}

function updatePassword(value: BaseInputValue): void {
  password.value = String(value ?? '');
}

async function selectUserId(): Promise<void> {
  await nextTick();
  userIdInput.value?.select();
}

function focusPassword(): void {
  passwordInput.value?.focus();
}

function openDialog(title: string, message: string, action: DialogAction = 'none'): void {
  Object.assign(dialog, { action, message, open: true, title });
}

function warning(message: string): void {
  openDialog('경  고', message);
}

async function checkPdaName(): Promise<boolean> {
  if (!(await CommonUtil.requiresPdaNameCorrection())) return false;

  isPdaNameCheckOpen.value = true;

  return true;
}

function handlePdaNameChanged(name: string): void {
  mainStore.setDeviceName(name);
}

async function executeLogin(): Promise<void> {
  if (isSubmitting.value) return;

  const normalizedUserId = userId.value.trim().toUpperCase();
  const normalizedPassword = password.value.toUpperCase();
  userId.value = normalizedUserId;

  if (!normalizedUserId) return warning('아이디를 입력해주세요');
  if (!normalizedPassword) return warning('패스워드를 입력해주세요');

  await loginCheck(normalizedUserId, normalizedPassword);
}

async function loginCheck(operatorId: string, operatorPassword: string): Promise<void> {
  isSubmitting.value = true;
  try {
    const response = await mainApi.sendMessage({
      messageName: 'login',
      payload: {
        sMsg: buildLoginMessage({
          bay: mainStore.bay,
          deviceName: mainStore.deviceName,
          facility: mainStore.facility,
          mobileServerName: mainStore.mobileServerName,
          password: operatorPassword,
          userId: operatorId,
        }),
      },
    });

    if (!isResponseSuccessful(response)) {
      openDialog('에  러', getResponseErrorMessage(response), 'clear-password');
      return;
    }

    await loginOK(parseMessageBody(response));
  } catch (error) {
    openDialog('에  러', error instanceof Error ? error.message : String(error), 'clear-password');
  } finally {
    isSubmitting.value = false;
  }
}

async function loginOK(messageBody: Record<string, string>): Promise<void> {
  const operatorId = messageBody.OPERID ?? '';
  const operatorName = messageBody.OPERNAME ?? '';
  const permission = messageBody.PERMISSTION ?? '';
  const gasInput = messageBody.GASINPUT ?? '';

  await mainStore.saveUserInfo({
    operId: operatorId,
    operName: operatorName,
    permission,
    facility: mainStore.facility,
    area: mainStore.area,
    bay: mainStore.bay,
  });
  mainStore.applyLoginState({ operatorId, operatorName, permission, gasInput });
  openDialog('LOG IN', `${operatorName} 님\n로그인 성공 하였습니다.`, 'send-config');
}

async function handleDialog(): Promise<void> {
  const action = dialog.action;
  Object.assign(dialog, { action: 'none', open: false });

  if (action === 'clear-password') {
    password.value = '';
    await nextTick();
    passwordInput.value?.focus();
    return;
  }
  if (action === 'send-config') return sendConfigAfterLogin();
  if (action === 'finish') return finish();
}

async function sendConfigAfterLogin(): Promise<void> {
  let wifiIp: string | null;
  try {
    wifiIp = await getWifiIpAddress();
  } catch {
    // Legacy only sends CONFIG when a Wi-Fi address is available.
    return finish();
  }
  if (!wifiIp) return finish();

  try {
    const response = await mainApi.sendMessage({
      messageName: 'config',
      payload: {
        sMsg: buildConfigMessage({
          area: mainStore.area,
          bay: mainStore.bay,
          deviceName: mainStore.deviceName,
          facility: mainStore.facility,
          mobileServerName: mainStore.mobileServerName,
          operatorId: mainStore.operatorId,
          wifiIp,
        }),
      },
    });
    if (!isResponseSuccessful(response)) {
      throw new Error(getResponseErrorMessage(response));
    }
  } catch (error) {
    openDialog('에  러', error instanceof Error ? error.message : String(error), 'finish');
    return;
  }

  await finish();
}

async function finish(): Promise<void> {
  isLoginOpen.value = false;
  if (router.options.history.state.back) {
    router.back();
    return;
  }
  await router.replace(`/${ROUTE.main}`);
}

onMounted(async () => {
  await mainStore.initMain();
  userId.value = (await mainStore.loadHistoryUserInfo())?.operId ?? '';
  const isPdaNameInvalid = await checkPdaName();
  await nextTick();
  if (userId.value && !isPdaNameInvalid) passwordInput.value?.focus();
});

onActivated(() => {
  void checkPdaName();
});
</script>

<style lang="scss">
.activity-login {
  display: grid;
  min-block-size: 100dvh;
  background: var(--border-border-primary);
  font-family: var(--ds-font-family-sans);
}

.activity-login__backdrop {
  background: linear-gradient(
    180deg,
    #1c493a 0%,
    rgb(150.331 176.859 168.017) 53.846%,
    rgb(236.3 248.2 241.4) 100%
  );
}

.activity-login__fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-1);
}

.activity-login__alert-message {
  margin: 0;
  white-space: pre-line;
}
</style>
