<template>
  <main class="activity-login" aria-label="로그인">
    <div class="activity-login__backdrop" aria-hidden="true" />
  </main>

  <BaseModal
    v-model:open="isLoginOpen"
    class="activity-login__modal"
    title="계정을 입력해주세요"
    :closable="false"
    :overlay-closable="false"
    width="calc(100vw - 24px)"
  >
    <form id="login-form" class="activity-login__form" @submit.prevent="executeLogin">
      <div class="activity-login__fields">
        <div class="activity-login__field">
          <label class="activity-login__label" for="edit-user-id">USER ID</label>
          <div class="activity-login__field-content">
            <BaseInput
              ref="userIdInput"
              class="activity-login__input"
              data-testid="user-id"
              control-id="edit-user-id"
              name="userId"
              autocomplete="username"
              :model-value="userId"
              @focus="selectUserId"
              @keydown.down.prevent="focusPassword"
              @update:model-value="updateUserId"
            />
          </div>
        </div>

        <div class="activity-login__field">
          <label class="activity-login__label" for="edit-password">PASSWORD</label>
          <div class="activity-login__field-content">
            <BaseInput
              ref="passwordInput"
              class="activity-login__input"
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
        </div>
      </div>
    </form>

    <template #footer>
      <BaseButton
        class="activity-login__button activity-login__button--cancel"
        data-testid="btn-cancel"
        variant="link"
        @click="finish"
        >취소</BaseButton
      >
      <BaseButton
        class="activity-login__button activity-login__button--confirm"
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
    class="activity-login__alert"
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
.activity-login,
.activity-login__modal {
  --login-text: rgb(2.954 7.04 18.328);
  --login-border: rgb(208.85 213.133 219.557);
  --login-panel: rgb(242.974 244.018 246.105);
  --login-brand: #02b0a5;
  --login-surface: #fff;
}

.activity-login {
  display: grid;
  width: 100%;
  min-block-size: max(720px, 100dvh);
  overflow: hidden;
  background: #d1d5dc;
  font-family: var(--family-font-family-default, 'Noto Sans KR', sans-serif);
}

.activity-login__backdrop {
  position: relative;
  width: 100%;
  background: linear-gradient(
    180deg,
    #1c493a 0%,
    rgb(150.331 176.859 168.017) 53.846%,
    rgb(236.3 248.2 241.4) 100%
  );
  isolation: isolate;
}

.activity-login__backdrop::after {
  position: absolute;
  z-index: 1;
  content: '';
  inset: 0;
  background: rgb(0 0 0 / 32%);
  backdrop-filter: blur(10px);
}

.activity-login__modal .q-dialog__backdrop {
  background: transparent;
  backdrop-filter: none;
}

.activity-login__modal {
  --font-family-default: 'Noto Sans KR', sans-serif;
  --family-font-family-default: var(--font-family-default);
  --ds-color-bg: var(--login-surface);
  --ds-color-border: var(--login-border);
  --ds-color-text: var(--login-text);
  font-family: var(--font-family-default);
}

.activity-login__modal .q-dialog__inner {
  padding-inline: 12px;
}

.activity-login__modal .ds-modal {
  border-radius: 4px;
  box-shadow:
    0 8px 10px rgb(0 0 0 / 20%),
    0 6px 30px rgb(0 0 0 / 12%),
    0 16px 24px rgb(0 0 0 / 14%);
}

.activity-login__modal .ds-modal__header {
  block-size: 44px;
  min-block-size: 44px;
  box-sizing: border-box;
  padding: 8px 12px;
}

.activity-login__modal .ds-modal__title {
  color: var(--login-text);
  font-family: inherit;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
}

.activity-login__modal .ds-modal__body {
  padding: 0;
  overflow: visible;
  background: var(--login-panel);
}

.activity-login__form,
.activity-login__fields {
  display: flex;
  flex-direction: column;
}

.activity-login__fields {
  gap: 8px;
  padding: 16px;
}

.activity-login__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-login__field-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.activity-login__label {
  color: var(--login-text);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.activity-login__input {
  --ds-input-focus-border-color: var(--login-brand);
}

.activity-login__modal .ds-modal__footer {
  block-size: 64px;
  min-block-size: 64px;
  box-sizing: border-box;
  gap: 8px;
  padding: 12px;
}

.activity-login__button.ds-btn {
  min-inline-size: 0;
  block-size: 40px;
  padding-inline: 12px;
  color: var(--login-brand);
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
}

.activity-login__button--cancel.ds-btn {
  min-inline-size: 50px;
}

.activity-login__button--confirm.ds-btn {
  min-inline-size: 72px;
}

.activity-login__alert-message {
  margin: 0;
  white-space: pre-line;
}
</style>
