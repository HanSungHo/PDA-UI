<template>
  <a-list-item>
    <a-list-item-meta>
      <template #avatar v-if="icon">
        <a-avatar>{{ icon }}</a-avatar>
      </template>
      <template #title>
        <a :href="link" target="_blank">{{ label }}</a>
      </template>
      <template #description>
        {{ caption }}
      </template>
    </a-list-item-meta>
  </a-list-item>
</template>

<script setup lang="ts">
export interface EssentialLinkProps {
  label: string;
  caption?: string;
  link?: string;
  icon?: string;
}

withDefaults(defineProps<EssentialLinkProps>(), {
  caption: '',
  link: '#',
  icon: '',
});
</script>
