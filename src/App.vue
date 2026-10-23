<template>
  <router-view />
  <GlobalDialogHost />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

import GlobalDialogHost from './components/GlobalDialogHost.vue';
import { startEQPspcListener } from './features/eqp-spc/eqp-spc.service';
import { startUdpReceiver } from './services/udp-receiver.service';

onMounted(() => {
  void startEQPspcListener();
  void startUdpReceiver();
});
</script>
