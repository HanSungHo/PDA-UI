<template>
  <ActivityMain
    :device-name="deviceName"
    :is-logged-in="isLoggedIn"
    :main-title="mainTitle"
    :operator-name="operatorName"
    :gas-input="gasInput"
    @select-action="handleAction"
  />
  <BaseToast
    v-if="toast"
    :key="toast.id"
    :type="toast.type"
    :description="toast.description"
    @close="toast = undefined"
  />
  <DeviceNameCheckModal
    :open="isPdaNameCheckOpen"
    :initial-device-name="deviceName"
    @confirm="handlePdaNameChanged"
    @update:open="isPdaNameCheckOpen = $event"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useQuasar } from 'quasar';
import { BaseToast, type BaseToastType } from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import { CommonUtil } from 'src/utils/common-util';
import { onActivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { DeviceNameCheckModal } from '../../device-name-check';
import {
  ACTIVITY_MAIN_ACTION_ID,
  ActivityMain,
  type ActivityMainAction,
} from '../components/activity-main';
import { useMainStore } from '../stores/main.store';

defineOptions({ name: 'ActivityMainPage' });

const mainStore = useMainStore();
const router = useRouter();
const $q = useQuasar();
const { deviceName, gasInput, isLoggedIn, isSettingReady, mainTitle, operatorName } =
  storeToRefs(mainStore);
const isPdaNameCheckOpen = ref(false);
const toast = ref<{ id: number; type: BaseToastType; description: string }>();
let toastId = 0;

onMounted(async () => {
  await mainStore.initMain();
  await checkPdaName();
});

async function checkPdaName(): Promise<void> {
  isPdaNameCheckOpen.value = await CommonUtil.requiresPdaNameCorrection();
}

onActivated(() => {
  void checkPdaName();
});

function handlePdaNameChanged(name: string): void {
  mainStore.setDeviceName(name);
}

async function handleAction(action: ActivityMainAction) {
  if (action.id === ACTIVITY_MAIN_ACTION_ID.out) {
    confirmAction({
      title: '종 료',
      message: '프로그램을 종료하시겠습니까?',
      onOk: async () => {
        await mainStore.logout();
        await router.push({ path: ROUTE.exit });
      },
    });
    return;
  }

  if (action.id === ACTIVITY_MAIN_ACTION_ID.systemSetting) {
    await router.push({ path: ROUTE.systemSetting });
    return;
  }

  if (action.id === ACTIVITY_MAIN_ACTION_ID.setting) {
    await router.push({ path: ROUTE.setting });
    return;
  }

  if (action.id === ACTIVITY_MAIN_ACTION_ID.login) {
    await handleLoginAction();
    return;
  }

  if (!isSettingReady.value) {
    showToast('warning', '환경설정 정보가 필요합니다');
    return;
  }

  if (!isLoggedIn.value) {
    showToast('warning', 'Log In 정보가 필요합니다');
    return;
  }

  await router.push({ path: action.target });
}

async function handleLoginAction() {
  if (!isSettingReady.value) {
    showToast('warning', '환경설정 정보가 필요합니다');
    return;
  }

  if (!isLoggedIn.value) {
    await router.push({ path: ROUTE.login });
    return;
  }

  confirmAction({
    title: 'LOGOUT',
    message: '로그아웃 하시겠습니까?',
    onOk: async () => {
      await mainStore.logout();
      showToast('success', '로그아웃 성공');
    },
  });
}

function showToast(type: BaseToastType, description: string): void {
  toast.value = { id: ++toastId, type, description };
}

function confirmAction(options: { title: string; message: string; onOk: () => Promise<void> }) {
  $q.dialog({
    title: options.title,
    message: options.message,
    ok: { label: 'OK', flat: true, noCaps: true },
    cancel: { label: 'Cancel', flat: true, noCaps: true },
    persistent: true,
  }).onOk(() => {
    void options.onOk();
  });
}
</script>
