<template>
  <router-view />
  <GlobalDialogHost />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

import GlobalDialogHost from './components/GlobalDialogHost.vue';
import { startEQPspcListener } from './features/eqp-spc/eqp-spc.service';
import { startMDSSpcListener, stopMDSSpcListener } from './features/mds-spc/mds-spc.service';
import { startUdpReceiver, stopUdpReceiver } from './services/udp-receiver.service';

onMounted(() => {
  void startEQPspcListener();
  void startMDSSpcListener();
  void startUdpReceiver();
});

onBeforeUnmount(() => {
  void stopMDSSpcListener();
  void stopUdpReceiver();
});
</script>
