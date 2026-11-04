<template>
  <section class="ds-screen__card" aria-label="사이드 더미 상세 정보">
    <!-- 1. Process Number (공정번호) -->
    <BaseInput label="공정번호" layout="horizontal" :model-value="operId" readonly />

    <!-- 2. Process Name (공정명) -->
    <BaseInput label="공정명" layout="horizontal" :model-value="operDesc" readonly />

    <!-- 3. IN DATE -->
    <BaseInput label="IN DATE" layout="horizontal" :model-value="inDate" readonly />

    <!-- 4. IN USER -->
    <BaseInput label="IN USER" layout="horizontal" :model-value="inUser" readonly />
  </section>
</template>

<script setup lang="ts">
import BaseInput from 'src/components/base/input/BaseInput.vue';

interface Props {
  operId: string;
  operDesc: string;
  inDate: string;
  inUser: string;
}

defineProps<Props>();
</script>
