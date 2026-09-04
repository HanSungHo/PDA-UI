<script setup lang="ts">
import type { BaseAvatarProps } from './BaseAvatar.types';

withDefaults(defineProps<BaseAvatarProps>(), {
  type: 'image',
});
</script>
<template>
  <div class="ds-avatar">
    <a-avatar v-if="type == 'image'" class="ds-avatar__image" :src="src" :alt="alt" />
    <div v-else class="ds-avatar__text-wrapper">
      <a-avatar class="ds-avatar__text-avatar">
        <span class="base-avatar__text">
          <slot>
            {{ text }}
          </slot>
        </span>
      </a-avatar>
    </div>
  </div>
</template>
<style scoped src="./base-avatar.css"></style>
