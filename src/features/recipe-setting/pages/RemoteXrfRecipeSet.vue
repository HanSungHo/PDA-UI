<script setup lang="ts">
import { nextTick, ref } from 'vue';

import { BaseButton, BaseModal, BaseScreen } from '~/components/base';
import BaseDropdownList from '~/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInput from '~/components/base/input/BaseInput.vue';

import { useRemoteXrfRecipe } from '../composables/useRemoteXrfRecipeSet';
import type { RemoteXrfRecipeResult } from '../types/remote-xrf-recipe-set.types';

const emit = defineEmits<{
  (e: 'result', value: RemoteXrfRecipeResult): void;
}>();

const slotInputRef = ref<InstanceType<typeof BaseInput>>();

// Android requestFocus() + selectAll() on SLOT when the previous screen passed a SLOT value.
// :autofocus alone doesn't work here since the SLOT value (and the need to focus) is only
// known after the composable's onCreate runs, by which point the input has already mounted.
function focusSlot(): void {
  void nextTick(() => {
    slotInputRef.value?.focus();
    slotInputRef.value?.select();
  });
}

const {
  Item,
  eqpId,
  category,
  sample,
  para,
  txtSlot,
  txtRecipe,
  txtThick,
  linearThick,
  spinnerItemOptions,
  spinnerProdeqpOptions,
  spinnerCategoryOptions,
  spinnerMdsOptions,
  spinnerParaOptions,
  dialog,
  closeDialog,
  itemSelectedListener,
  onSingleClickListener,
} = useRemoteXrfRecipe((intentPayload) => {
  emit('result', intentPayload);
}, focusSlot);
</script>

<template>
  <BaseScreen class="remote-xrf-recipe-set" title="Recipe Setting">
    <div class="ds-screen__card">
      <BaseInput
        id="txt_slot"
        ref="slotInputRef"
        v-model="txtSlot"
        data-field="slot"
        label="SLOT"
        uppercase
        @focus="($event.target as HTMLInputElement).select()"
      />

      <BaseDropdownList
        id="spinner_item"
        :model-value="Item"
        label="ITEM"
        aria-label="ITEM"
        :options="spinnerItemOptions"
        @update:model-value="itemSelectedListener('spinner_item', String($event ?? ''))"
      />

      <BaseDropdownList
        id="spinner_prodeqp"
        :model-value="eqpId"
        label="생산장비"
        aria-label="생산장비"
        :options="spinnerProdeqpOptions"
        @update:model-value="itemSelectedListener('spinner_prodeqp', String($event ?? ''))"
      />

      <BaseDropdownList
        id="spinner_category"
        :model-value="category"
        label="Category"
        aria-label="Category"
        :options="spinnerCategoryOptions"
        @update:model-value="itemSelectedListener('spinner_category', String($event ?? ''))"
      />

      <BaseDropdownList
        id="spinner_mds"
        :model-value="sample"
        label="SAMPLE"
        aria-label="SAMPLE"
        :options="spinnerMdsOptions"
        @update:model-value="itemSelectedListener('spinner_mds', String($event ?? ''))"
      />

      <BaseDropdownList
        id="spinner_para"
        :model-value="para"
        label="Para"
        aria-label="Para"
        :options="spinnerParaOptions"
        @update:model-value="itemSelectedListener('spinner_para', String($event ?? ''))"
      />

      <BaseInput
        id="txt_recipe"
        v-model="txtRecipe"
        data-field="recipe"
        label="RECIPE"
        uppercase
        @focus="($event.target as HTMLInputElement).select()"
      />

      <BaseInput
        v-show="linearThick"
        id="linear_thick"
        v-model="txtThick"
        data-field="thick"
        label="THICK"
        uppercase
        @focus="($event.target as HTMLInputElement).select()"
      />
    </div>

    <template #footer>
      <BaseButton
        id="btn_save"
        label="등록"
        variant="primary"
        size="medium"
        @click="onSingleClickListener('btn_save')"
      />

      <BaseButton
        id="btn_cancel"
        label="취소"
        variant="tertiary"
        size="medium"
        @click="onSingleClickListener('btn_cancel')"
      />
    </template>

    <BaseModal
      :open="dialog.open"
      :title="dialog.title"
      :closable="false"
      :overlay-closable="false"
      @update:open="closeDialog"
    >
      <p>{{ dialog.message }}</p>
      <template #footer>
        <BaseButton variant="link" :label="dialog.buttonText" @click="closeDialog" />
      </template>
    </BaseModal>
  </BaseScreen>
</template>
