<template>
  <section class="remote-meas-card remote-meas-card--detail" aria-label="제품 상세 정보">
    <BaseInput
      class="remote-meas-card__field"
      label="JOB CODE"
      :model-value="lotInfo?.jobCode || ''"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="제품명"
      :model-value="lotInfo?.product || ''"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="현재공정"
      :model-value="currentOperation"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="수량"
      :model-value="lotInfo?.quantity != null ? String(lotInfo.quantity) : ''"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="FACILITY"
      :model-value="lotInfo?.facility || ''"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="CUSTOMER"
      :model-value="lotInfo?.customer || ''"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="SALE TYPE"
      :model-value="lotInfo?.category || ''"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="담당 Eng'r"
      :model-value="lotInfo?.engineer || ''"
      disabled
    />
  </section>
</template>

<script setup lang="ts">
import { BaseInput } from 'src/components/base';
import { computed } from 'vue';

import type { RemoteMeasLotInfo } from '../types/remote-meas.types';

defineOptions({ name: 'RemoteMeasDetailCard' });

const props = defineProps<{
  lotInfo: RemoteMeasLotInfo | null;
}>();

const currentOperation = computed(() => {
  if (!props.lotInfo) return '';
  const step = props.lotInfo.processStep || '';
  const op = props.lotInfo.operation || '';
  const sub = props.lotInfo.subOperation || '';
  if (!step && !op && !sub) return '';
  if (!op && !sub) return step;
  return `${step}(${op}${sub})`;
});
</script>
