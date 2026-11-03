<script setup lang="ts">
import { BaseButton, BaseScreen } from '~/components/base';
import BaseDropdownList from '~/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInput from '~/components/base/input/BaseInput.vue';

import { useRemoteXrfRecipe2 } from '../composables/useRemoteXrfRecipeSet2';
import type {
  RemoteXrfRecipe2Props,
  RemoteXrfRecipe2Result,
} from '../types/remote-xrf-recipe-set2.types';

const props = defineProps<RemoteXrfRecipe2Props>();

const emit = defineEmits<{
  (e: 'result', value: RemoteXrfRecipe2Result): void;
  (e: 'finish'): void;
}>();

const {
  spinnerItem,
  spinnerProdeqp,
  spinnerMds,
  spinnerPara,
  txtSlot,
  txtRecipe,
  txtSlotRef,
  spinnerItemOptions,
  spinnerProdeqpOptions,
  spinnerMdsOptions,
  spinnerParaOptions,
  onItemSelected,
  onSingleClick,
} = useRemoteXrfRecipe2(
  props,
  (resultPayload) => {
    emit('result', resultPayload);
  },
  () => {
    emit('finish');
  },
);
</script>

<template>
  <BaseScreen class="activity-remote-xrf-recipe-set-2" title="Recipe Setting">
    <div class="ds-screen__card">
      <BaseInput
        id="txt_slot"
        ref="txtSlotRef"
        v-model="txtSlot"
        label="SLOT"
        select-on-focus
        autofocus
      />

      <BaseDropdownList
        id="spinner_item"
        :model-value="spinnerItem"
        label="ITEM"
        aria-label="ITEM"
        :options="spinnerItemOptions"
        @update:model-value="onItemSelected('spinner_item', String($event ?? ''))"
      />

      <BaseDropdownList
        id="spinner_prodeqp"
        :model-value="spinnerProdeqp"
        label="생산장비"
        aria-label="생산장비"
        :options="spinnerProdeqpOptions"
        @update:model-value="onItemSelected('spinner_prodeqp', String($event ?? ''))"
      />

      <BaseDropdownList
        id="spinner_mds"
        :model-value="spinnerMds"
        label="SAMPLE"
        aria-label="SAMPLE"
        :options="spinnerMdsOptions"
        @update:model-value="onItemSelected('spinner_mds', String($event ?? ''))"
      />

      <BaseDropdownList
        id="spinner_para"
        :model-value="spinnerPara"
        label="Para"
        aria-label="Para"
        :options="spinnerParaOptions"
        @update:model-value="onItemSelected('spinner_para', String($event ?? ''))"
      />

      <BaseInput id="txt_Recipe" v-model="txtRecipe" label="RECIPE" select-on-focus />
    </div>

    <template #footer>
      <BaseButton
        id="btn_save"
        label="등록"
        variant="primary"
        size="medium"
        @click="onSingleClick('btn_save')"
      />

      <BaseButton
        id="btn_cancel"
        label="취소"
        variant="tertiary"
        size="medium"
        @click="onSingleClick('btn_cancel')"
      />
    </template>
  </BaseScreen>
</template>

<style scoped></style>
