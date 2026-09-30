<template>
  <InputScopeDataView
    :initial-lot-id="initialLotId"
    @complete="handleComplete"
    @cancel="handleCancel"
  />
</template>

<script setup lang="ts">
import { ROUTE } from 'src/constants/routes';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { ScopeDataResult } from '~/features/input-scope-data/types/input-scope-data.types';
import { useMoveOutStore } from '~/features/move-out/stores/move-out.store';

import InputScopeDataView from '../components/InputScopeDataView.vue';

defineOptions({ name: 'InputScopeDataPage' });

const route = useRoute();
const router = useRouter();
const moveOutStore = useMoveOutStore();

const initialLotId = computed(() => {
  const lotQuery = route.query.lotId || route.params.lotId;
  return typeof lotQuery === 'string' ? lotQuery : '';
});

/**
 * Legacy InputScopeDataActivity returns RESULT_OK to MoveOutActivity with
 * LOTID / LOGO / WAFERLIST extras. Persist via Move Out store, then navigate.
 *
 * TODO(legacy-parity): When full MoveOutPage is applied, keep this store handoff
 * (or replace with an equivalent shared contract). See MoveOutPage.vue TODO.
 */
function handleComplete(result: ScopeDataResult) {
  moveOutStore.setPendingInputScopeResult({
    lotId: result.lotId,
    logo: result.logo,
    waferList: result.waferList,
  });
  void router.push(`/${ROUTE.moveOut}`);
}

function handleCancel() {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push(`/${ROUTE.main}`);
  }
}
</script>
