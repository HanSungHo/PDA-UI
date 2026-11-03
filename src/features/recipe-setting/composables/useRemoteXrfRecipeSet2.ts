import { type ComponentPublicInstance, nextTick, onMounted, ref } from 'vue';

import { remoteXrfRecipe2Service } from '../services/remote-xrf-recipe-set2.service';
import type {
  DropdownOption,
  RemoteXrfRecipe2Props,
  RemoteXrfRecipe2Result,
} from '../types/remote-xrf-recipe-set2.types';

export function useRemoteXrfRecipe2(
  props: RemoteXrfRecipe2Props,
  emitResult: (result: RemoteXrfRecipe2Result) => void,
  emitFinish: () => void,
) {
  const mainEqpId = ref('');

  const spinnerItemOptions = ref<DropdownOption[]>(remoteXrfRecipe2Service.getItemList());
  const spinnerProdeqpOptions = ref<DropdownOption[]>(remoteXrfRecipe2Service.getEqpList());
  const spinnerMdsOptions = ref<DropdownOption[]>(remoteXrfRecipe2Service.getSampleList());
  const spinnerParaOptions = ref<DropdownOption[]>(remoteXrfRecipe2Service.getParaList());

  const spinnerItem = ref<string>(spinnerItemOptions.value[0]?.value ?? '');
  const spinnerProdeqp = ref<string>(spinnerProdeqpOptions.value[0]?.value ?? '');
  const spinnerMds = ref<string>(spinnerMdsOptions.value[0]?.value ?? '');
  const spinnerPara = ref<string>(spinnerParaOptions.value[0]?.value ?? '');

  const txtSlot = ref<string>('');
  const txtRecipe = ref<string>('');

  const txtSlotRef = ref<ComponentPublicInstance | null>(null);

  onMounted(async () => {
    if (props.slot && props.slot.length > 0) {
      txtSlot.value = props.slot;

      await nextTick();
      const inputEl: HTMLInputElement | undefined =
        txtSlotRef.value?.$el?.querySelector('input') ?? undefined;
      inputEl?.focus();
      inputEl?.select();
    }
  });

  const onItemSelected = (id: string, value: string) => {
    switch (id) {
      case 'spinner_item':
        spinnerItem.value = value;
        break;
      case 'spinner_prodeqp':
        spinnerProdeqp.value = value;
        break;
      case 'spinner_mds':
        spinnerMds.value = value;
        break;
      case 'spinner_para':
        spinnerPara.value = value;
        if (value != null && value !== '') {
          txtRecipe.value = 'TEST RECIPE';
        }
        break;
    }
  };

  const execute = () => {
    emitResult({
      PRODEQP: spinnerProdeqp.value,
      SAMPLE: spinnerMds.value,
      PARA: spinnerPara.value,
      RECIPE: txtRecipe.value,
      SLOT: txtSlot.value,
    });
    emitFinish();
  };

  const onSingleClick = (id: string) => {
    if (id === 'btn_save') {
      execute();
    } else if (id === 'btn_cancel') {
      emitFinish();
    }
  };

  return {
    mainEqpId,
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
    execute,
  };
}
