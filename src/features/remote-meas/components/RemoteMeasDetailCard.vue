<template>
  <section class="ds-screen__card remote-meas-card--detail" aria-label="제품 상세 정보">
    <BaseInput
      class="remote-meas-card__field"
      label="JOB CODE"
      layout="horizontal"
      :model-value="lotInfo?.jobCode || ''"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="제품명"
      layout="horizontal"
      :model-value="lotInfo?.product || ''"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="현재공정"
      layout="horizontal"
      :model-value="currentOperation"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="수량"
      layout="horizontal"
      :model-value="lotInfo?.quantity != null ? String(lotInfo.quantity) : ''"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="FACILITY"
      layout="horizontal"
      :model-value="lotInfo?.facility || ''"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="CUSTOMER"
      layout="horizontal"
      :model-value="lotInfo?.customer || ''"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="SALE TYPE"
      layout="horizontal"
      :model-value="lotInfo?.category || ''"
      disabled
    />
    <BaseInput
      class="remote-meas-card__field"
      label="담당 Eng'r"
      layout="horizontal"
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
