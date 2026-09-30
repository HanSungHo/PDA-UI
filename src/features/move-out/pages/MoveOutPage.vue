<template>
  <main class="move-out-page">
    <header class="move-out-page__header">
      <h1 class="move-out-page__title">Move Out</h1>
    </header>

    <section class="move-out-page__body" aria-live="polite">
      <p class="move-out-page__notice">
        Move Out screen is not applied yet. Input Scope result is held in the Move Out store.
      </p>

      <dl v-if="appliedResult" class="move-out-page__result">
        <div>
          <dt>LOTID</dt>
          <dd>{{ appliedResult.lotId || '-' }}</dd>
        </div>
        <div>
          <dt>LOGO</dt>
          <dd>{{ appliedResult.logo || '-' }}</dd>
        </div>
        <div>
          <dt>WAFERLIST (comment)</dt>
          <dd>{{ commentPreview }}</dd>
        </div>
      </dl>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useMoveOutStore } from '~/features/move-out/stores/move-out.store';
import type { InputScopeReturnResult } from '~/features/move-out/types/move-out.types';

defineOptions({ name: 'MoveOutPage' });

/**
 * TODO(legacy-parity): Replace this stub with full MoveOutActivity UI/behavior.
 *
 * When applying Move Out:
 * 1. On mount, call `useMoveOutStore().consumePendingInputScopeResult()`.
 * 2. If result exists (legacy inputScopeActivityResultLauncher):
 *    - If waferList is non-empty: set comment field to `; W/H:#${waferList}`
 *    - If logo is non-empty: set mask logo field to logo
 * 3. Keep opening Input Scope via ROUTE.inputScopeData with query lotId, then rely on
 *    InputScopeDataPage saving result into this store and redirecting to ROUTE.moveOut.
 * 4. Source: hifos MoveOutActivity.kt + InputScopeDataActivity.kt setResult extras.
 */
const moveOutStore = useMoveOutStore();
const appliedResult = ref<InputScopeReturnResult | null>(null);

const commentPreview = computed(() => {
  const waferList = appliedResult.value?.waferList;
  if (!waferList) return '-';
  return `; W/H:#${waferList}`;
});

onMounted(() => {
  appliedResult.value = moveOutStore.consumePendingInputScopeResult();
});
</script>

<style scoped>
.move-out-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: var(--spacing-space-4, 16px);
  background: var(--ds-color-bg-secondary, #f7f8f9);
  color: var(--ds-color-text, #101828);
  box-sizing: border-box;
}

.move-out-page__header {
  margin-bottom: var(--spacing-space-4, 16px);
}

.move-out-page__title {
  margin: 0;
  font-size: var(--size-18px, 18px);
  font-weight: var(--weight-font-bold, 700);
}

.move-out-page__notice {
  margin: 0 0 var(--spacing-space-4, 16px);
  font-size: var(--size-14px, 14px);
  line-height: 1.5;
}

.move-out-page__result {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-space-3, 12px);
  margin: 0;
  padding: var(--spacing-space-3, 12px);
  background: var(--ds-color-bg, #ffffff);
  border: 1px solid var(--ds-color-border, #d1d5db);
  border-radius: var(--radius-8, 8px);
}

.move-out-page__result dt {
  font-size: var(--size-12px, 12px);
  font-weight: var(--weight-font-medium, 500);
  color: var(--ds-color-text-secondary, #64748b);
}

.move-out-page__result dd {
  margin: 4px 0 0;
  font-size: var(--size-14px, 14px);
  font-weight: var(--weight-font-semibold, 600);
  word-break: break-all;
}
</style>
