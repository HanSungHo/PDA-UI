<template>
  <div class="example-page">
    <AppSectionHeader eyebrow="Feature example" title="Feature Based Module" />

    <div style="margin-top: 24px">
      <ExampleFeatureCard
        title="Example feature"
        :description="`This module exposes ${total} placeholder item.`"
      />
    </div>

    <a-card style="margin-top: 24px" :bordered="true">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px">
        <div>
          <div style="font-size: 16px; font-weight: 500">Shared app store</div>
          <div style="font-size: 14px; color: #8c8c8c">
            App is {{ appStore.isReady ? 'ready' : 'not ready' }}
          </div>
        </div>

        <a-button type="primary" @click="toggleAppReady">
          {{ appStore.isReady ? 'Mark not ready' : 'Mark ready' }}
        </a-button>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import AppSectionHeader from '../../../components/AppSectionHeader.vue';
import { useAppStore } from '../../../stores/app.store';
import ExampleFeatureCard from '../components/ExampleFeatureCard.vue';
import { useExampleSummary } from '../composables/use-example-summary';

const appStore = useAppStore();
const { total } = useExampleSummary();

function toggleAppReady() {
  appStore.setReady(!appStore.isReady);
}
</script>

<style scoped>
.example-page {
  padding: 24px;
}
</style>
