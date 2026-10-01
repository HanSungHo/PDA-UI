<template>
  <section class="ds-screen" :aria-labelledby="titleId">
    <header class="ds-screen__header">
      <BaseButton
        v-if="showBack"
        class="ds-screen__back"
        variant="link"
        size="xs"
        icon-only
        aria-label="뒤로 가기"
        @click="emit('back')"
      >
        <ArrowLeftOutlined aria-hidden="true" />
      </BaseButton>
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
import { ArrowLeftOutlined } from '@ant-design/icons-vue';
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
