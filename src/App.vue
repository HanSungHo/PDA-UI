<template>
  <router-view />
  <!-- Add app-wide dialogs in GlobalDialogHost instead of mounting them individually here. -->
  <GlobalDialogHost />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

import GlobalDialogHost from './components/GlobalDialogHost.vue';
import { startUdpReceiver } from './services/udp-receiver.service';

onMounted(() => {
  void startUdpReceiver();
});
</script>
