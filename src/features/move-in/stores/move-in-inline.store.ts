import { defineStore } from 'pinia';

import type { InlineResult } from '../types/move-in-inline.types';

export const useMoveInInlineStore = defineStore('moveInInline', {
  state: () => ({
    result: null as InlineResult | null,
  }),
  actions: {
    setResult(result: InlineResult) {
      this.result = result;
    },
    clear() {
      this.result = null;
    },
  },
});
