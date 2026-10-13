<template>
  <section class="ds-screen" :aria-labelledby="showHeader ? titleId : undefined">
    <header v-if="showHeader" class="ds-screen__header">
      <h1 :id="titleId" class="ds-screen__title">{{ title }}</h1>
    </header>

    <div class="ds-screen__content">
      <slot />
    </div>

    <footer class="ds-screen__footer">
      <div class="ds-screen__actions">
        <slot name="footer">
          <BaseButton
            class="ds-screen__ok"
            size="large"
            :disabled="okDisabled"
            :loading="okLoading"
            @click="emit('ok')"
          >
            {{ okLabel }}
          </BaseButton>
          <BaseButton
            class="ds-screen__cancel"
            variant="tertiary"
            size="large"
            :disabled="cancelDisabled"
            @click="emit('cancel')"
          >
            {{ cancelLabel }}
          </BaseButton>
        </slot>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { useId } from 'vue';

import { BaseButton } from '../button';
import {
  baseScreenDefaults,
  type BaseScreenEmits,
  type BaseScreenProps,
} from './base-screen.types';

defineOptions({ name: 'BaseScreen' });

withDefaults(defineProps<BaseScreenProps>(), {
  ...baseScreenDefaults,
});
const emit = defineEmits<BaseScreenEmits>();

defineSlots<{
  default?(): unknown;
  footer?(): unknown;
}>();

const titleId = `ds-screen-title-${useId()}`;
</script>

<style src="./base-screen.css"></style>
