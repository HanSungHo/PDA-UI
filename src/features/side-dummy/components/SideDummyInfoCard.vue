<template>
  <section class="side-dummy-card side-dummy-card--info" aria-label="사이드 더미 상세 정보">
    <!-- 1. Process Number (공정번호) -->
    <BaseInput class="side-dummy-card__field" label="공정번호" :model-value="operId" readonly />

    <!-- 2. Process Name (공정명) -->
    <BaseInput class="side-dummy-card__field" label="공정명" :model-value="operDesc" readonly />

    <!-- 3. IN DATE -->
    <BaseInput class="side-dummy-card__field" label="IN DATE" :model-value="inDate" readonly />

    <!-- 4. IN USER -->
    <BaseInput class="side-dummy-card__field" label="IN USER" :model-value="inUser" readonly />
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
