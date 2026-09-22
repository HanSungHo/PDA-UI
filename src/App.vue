<script setup lang="ts">
import { createAntDesignTheme } from './boot/ant-design-vue';

const antDesignTheme = createAntDesignTheme();
</script>

<template>
  <a-config-provider :theme="antDesignTheme">
    <router-view />
  </a-config-provider>
</template>
