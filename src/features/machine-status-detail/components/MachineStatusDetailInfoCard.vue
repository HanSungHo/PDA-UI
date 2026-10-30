<template>
  <section class="ds-screen__card" aria-label="장비 상태 정보">
    <!-- 1. FACILITY -->
    <BaseInput label="FACILITY" :model-value="facility" layout="horizontal" disabled />

    <!-- 2. MAIN STATUS -->
    <BaseInput label="MAIN STATUS" :model-value="mainStatus" layout="horizontal" disabled />

    <!-- 3. SUB STATUS & FDC STATE -->
    <div class="ds-screen__card-row">
      <BaseInput
        class="ds-screen__card-field"
        label="SUB STATUS"
        :model-value="subStatus"
        layout="horizontal"
        disabled
      />
      <BaseInput
        class="ds-screen__card-field"
        aria-label="FDC STATE"
        :model-value="fdcState"
        layout="horizontal"
        disabled
      />
    </div>

    <!-- 4. 최종작업시간 -->
    <BaseInput label="최종작업시간" :model-value="finalWorkTime" layout="horizontal" disabled />
  </section>
</template>

<script setup lang="ts">
import BaseInput from 'src/components/base/input/BaseInput.vue';

defineOptions({ name: 'MachineStatusDetailInfoCard' });

interface Props {
  facility: string;
  mainStatus: string;
  subStatus: string;
  fdcState: string;
  finalWorkTime: string;
}

defineProps<Props>();
</script>
