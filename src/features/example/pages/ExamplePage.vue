<template>
  <q-page padding>
    <AppSectionHeader eyebrow="Feature example" title="Feature Based Module" />

    <ExampleFeatureCard
      class="q-mt-md"
      title="Example feature"
      :description="`This module exposes ${total} placeholder item.`"
    />

    <q-card flat bordered class="q-mt-md">
      <q-card-section class="row items-center justify-between q-gutter-md">
        <div>
          <div class="text-subtitle1">Shared app store</div>
          <div class="text-body2 text-grey-7">
            App is {{ appStore.isReady ? 'ready' : 'not ready' }}
          </div>
        </div>

        <q-btn color="primary" no-caps @click="toggleAppReady">
          {{ appStore.isReady ? 'Mark not ready' : 'Mark ready' }}
        </q-btn>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import AppSectionHeader from 'components/AppSectionHeader.vue';
import { useAppStore } from 'stores/app.store';

import ExampleFeatureCard from '../components/ExampleFeatureCard.vue';
import { useExampleSummary } from '../composables/use-example-summary';

const appStore = useAppStore();
const { total } = useExampleSummary();

function toggleAppReady() {
  appStore.setReady(!appStore.isReady);
}
</script>
