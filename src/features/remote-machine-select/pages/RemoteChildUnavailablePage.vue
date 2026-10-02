<template>
  <main class="remote-child-unavailable">
    <section class="remote-child-unavailable__card">
      <h1>{{ screenTitle }}</h1>
      <p>이 자동화 화면은 atop26-smart에 아직 구현되지 않았습니다.</p>
      <p v-if="lotId">LOT No. {{ lotId }}</p>
      <BaseButton variant="primary" size="large" block @click="returnToESheet">
        eSheet로 돌아가기
      </BaseButton>
    </section>
  </main>
</template>

<script setup lang="ts">
import { BaseButton } from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { RemoteMachineChildFlow } from '../types/remote-machine-select.types';

defineOptions({ name: 'RemoteChildUnavailablePage' });

const props = defineProps<{ flow: RemoteMachineChildFlow }>();
const route = useRoute();
const router = useRouter();
const screenTitle = computed(
  () => ({ meas: 'Remote MEAS', imp: 'Remote IMP', cvd: 'Remote CVD' })[props.flow],
);
const lotId = computed(() => {
  const value = Array.isArray(route.query.LOTID) ? route.query.LOTID[0] : route.query.LOTID;
  return typeof value === 'string' ? value : '';
});

function returnToESheet(): void {
  void router.replace({ path: `/${ROUTE.esheet}`, query: { lotId: lotId.value } });
}
</script>

<style scoped>
.remote-child-unavailable {
  display: grid;
  min-height: 100dvh;
  padding: 20px;
  place-items: center;
  background: linear-gradient(180deg, #1c493a, #ecf8f1);
  font-family: 'Noto Sans KR', sans-serif;
}

.remote-child-unavailable__card {
  width: min(100%, 350px);
  padding: 24px;
  border: 1px solid #d1d5dc;
  border-radius: 8px;
  background: #f9fafb;
}

.remote-child-unavailable__card h1 {
  margin: 0 0 16px;
  font-size: 20px;
}

.remote-child-unavailable__card p {
  margin: 0 0 16px;
  line-height: 1.5;
}
</style>
