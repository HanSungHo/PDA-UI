<template>
  <router-view />
  <GlobalDialogHost />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

import GlobalDialogHost from './components/GlobalDialogHost.vue';
import { startEQPspcListener } from './features/eqp-spc/eqp-spc.service';
import { startUdpReceiver, stopUdpReceiver } from './services/udp-receiver.service';

onMounted(() => {
  void startEQPspcListener();
  void startUdpReceiver();
});

onBeforeUnmount(() => {
  void stopUdpReceiver();
});
</script>
