import { computed } from 'vue';

import { useExampleStore } from '../stores/example.store';

export function useExampleSummary() {
  const exampleStore = useExampleStore();
  const total = computed(() => exampleStore.items.length);

  return {
    total,
  };
}
