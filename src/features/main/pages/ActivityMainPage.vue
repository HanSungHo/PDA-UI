<template>
  <ActivityMain
    :device-name="deviceName"
    :is-logged-in="isLoggedIn"
    :main-title="mainTitle"
    :operator-name="operatorName"
    :gas-input="gasInput"
    @select-action="handleAction"
  />
</template>

<script setup lang="ts">
import { message, Modal } from 'ant-design-vue';
import { storeToRefs } from 'pinia';
import { ROUTE } from 'src/constants/routes';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

import {
  ACTIVITY_MAIN_ACTION_ID,
  ActivityMain,
  type ActivityMainAction,
} from '../components/activity-main';
import { useMainStore } from '../stores/main.store';

defineOptions({ name: 'ActivityMainPage' });

const mainStore = useMainStore();
const router = useRouter();
const { deviceName, gasInput, isLoggedIn, isSettingReady, mainTitle, operatorName } =
  storeToRefs(mainStore);

onMounted(() => {
  void mainStore.initMain();
});

async function handleAction(action: ActivityMainAction) {
  if (action.id === ACTIVITY_MAIN_ACTION_ID.out) {
    Modal.confirm({
      title: '종 료',
      content: '프로그램을 종료하시겠습니까?',
      okText: 'OK',
      cancelText: 'Cancel',
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
    message.warning('환경설정 정보가 필요합니다');
    return;
  }

  if (!isLoggedIn.value) {
    message.warning('Log In 정보가 필요합니다');
    return;
  }

  await router.push({ path: action.target });
}

async function handleLoginAction() {
  if (!isSettingReady.value) {
    message.warning('환경설정 정보가 필요합니다');
    return;
  }

  if (!isLoggedIn.value) {
    await router.push({ path: ROUTE.login });
    return;
  }

  Modal.confirm({
    title: 'LOGOUT',
    content: '로그아웃 하시겠습니까?',
    okText: 'OK',
    cancelText: 'Cancel',
    onOk: async () => {
      await mainStore.logout();
      message.success('로그아웃 성공');
    },
  });
}
</script>
