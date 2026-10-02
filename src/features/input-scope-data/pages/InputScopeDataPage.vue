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
import { routeString } from '~/features/move-out/utils/route-query';

import InputScopeDataView from '../components/InputScopeDataView.vue';

defineOptions({ name: 'InputScopeDataPage' });

const route = useRoute();
const router = useRouter();
const moveOutStore = useMoveOutStore();

const initialLotId = computed(() => routeString(route, 'lotId'));

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
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push({ path: `/${ROUTE.moveOut}`, query: { lotId: result.lotId } });
  }
}

function handleCancel() {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push(`/${ROUTE.main}`);
  }
}
</script>
