import { defineStore } from 'pinia';
import { type ApiError, normalizeApiError } from 'src/services/api-error';
import { computed, ref } from 'vue';

import { getExampleSummaries } from '../services/example.service';
import type { ExampleSummary } from '../types/example.types';

export const useExampleStore = defineStore('example', () => {
  const items = ref<ExampleSummary[]>([]);
  const loading = ref(false);
  const error = ref<ApiError | null>(null);
  const activeItems = computed(() => items.value.filter((item) => item.status === 'active'));

  async function fetchSummaries() {
    loading.value = true;
    error.value = null;

    try {
      items.value = await getExampleSummaries();
    } catch (cause: unknown) {
      error.value = normalizeApiError(cause);
    } finally {
      loading.value = false;
    }
  }

  return {
    activeItems,
    error,
    fetchSummaries,
    items,
    loading,
  };
});
