<script setup lang="ts">
import { createAntDesignTheme } from './boot/ant-design-vue';
import OkDialog from './components/OkDialog.vue';
import { okDialog } from './services/ok-dialog.service';

const antDesignTheme = createAntDesignTheme();
const { confirm, confirmLabel, isOpen, message, title } = okDialog;
</script>

<template>
  <a-config-provider :theme="antDesignTheme">
    <router-view />
    <OkDialog
      :open="isOpen"
      :title="title"
      :message="message"
      :confirm-label="confirmLabel"
      @confirm="confirm"
    />
  </a-config-provider>
</template>
