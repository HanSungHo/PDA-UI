import { COMMON_FIELD } from 'src/constants/common-strings';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  remoteXrfRecipeService,
  ResponseDataToJsonUtil,
} from '../services/remote-xrf-recipe-set.service';
import { useRemoteXrfRecipeSetStore } from '../stores/remote-xrf-recipe-set.store';
import type {
  BayItem,
  DialogState,
  DropdownOption,
  RemoteXrfRecipeResult,
} from '../types/remote-xrf-recipe-set.types';

export function useRemoteXrfRecipe(
  onResult?: (result: RemoteXrfRecipeResult) => void,
  focusSlot?: () => void,
) {
  const route = useRoute();
  const router = useRouter();
  const mainStore = useMainStore();
  const xrfStore = useRemoteXrfRecipeSetStore();

  const DeviceInfo = {
    get FACILITY(): string {
      return mainStore.facility;
    },
    get AREA(): string {
      return mainStore.area;
    },
  };

  let getItem = '';
  let ItemIdx = 0;
  let getEqp = '';
  let EqpIdx = 0;
  let getCategory = '';
  let CategoryIdx = 0;
  let getSample = '';
  let SampleIdx = 0;
  let getPara = '';
  let ParaIdx = 0;

  const Item = ref('');
  const eqpId = ref('');
  const category = ref('');
  const sample = ref('');
  const para = ref('');

  const txtSlot = ref('');
  const txtRecipe = ref('');
  const txtThick = ref('');
  const linearThick = ref(false);

  const spinnerItemOptions = ref<DropdownOption[]>([]);
  const spinnerProdeqpOptions = ref<DropdownOption[]>([]);
  const spinnerCategoryOptions = ref<DropdownOption[]>([]);
  const spinnerMdsOptions = ref<DropdownOption[]>([]);
  const spinnerParaOptions = ref<DropdownOption[]>([]);

  const dialog = reactive<DialogState>({
    open: false,
    title: '',
    message: '',
    buttonText: COMMON_FIELD.BTNOKSTR,
  });

  function showOkDialog(title: string, message: string): void {
    dialog.title = title;
    dialog.message = message;
    dialog.buttonText = COMMON_FIELD.BTNOKSTR;
    dialog.open = true;
  }

  function closeDialog(): void {
    dialog.open = false;
  }

  // Android finish() — go back or fall back to main when opened directly by URL
  function finish(): void {
    if (window.history.state?.back) {
      router.back();
    } else {
      void router.push(`/${ROUTE.main}`);
    }
  }

  // Clear para and everything below it (recipe, thick)
  function clearFromPara(): void {
    para.value = '';
    spinnerParaOptions.value = [];
    txtRecipe.value = '';
    linearThick.value = false;
    txtThick.value = '';
  }

  // Clear sample and everything below it
  function clearFromSample(): void {
    sample.value = '';
    spinnerMdsOptions.value = [];
    clearFromPara();
  }

  // Clear category and everything below it
  function clearFromCategory(): void {
    category.value = '';
    spinnerCategoryOptions.value = [];
    clearFromSample();
  }

  // Clear eqp and everything below it (called when ITEM changes)
  function clearFromEqp(): void {
    eqpId.value = '';
    spinnerProdeqpOptions.value = [];
    clearFromCategory();
  }

  async function getXrfItem(): Promise<void> {
    try {
      clearFromEqp();

      const message = await remoteXrfRecipeService.getXrfItem(DeviceInfo.FACILITY, DeviceInfo.AREA);
      const isSuccessFul = message.isSuccessFul;
      const result = message.result;

      if (isSuccessFul) {
        const bayListJSON: BayItem[] = ResponseDataToJsonUtil.getMessageBodyList(result, 'BAYS');
        const spinnerBayItems: string[] = [];

        for (let i = 0; i < bayListJSON.length; i++) {
          const bay = bayListJSON[i];
          spinnerBayItems.push(bay.BAY);
          if (bay.BAY === getItem) {
            ItemIdx = i + 1;
          }
        }

        spinnerItemOptions.value = spinnerBayItems.map((val) => ({ label: val, value: val }));

        if (getItem !== 'null' && getItem !== '') {
          if (ItemIdx > 0 && spinnerBayItems[ItemIdx - 1]) {
            Item.value = spinnerBayItems[ItemIdx - 1];
            itemSelectedListener('spinner_item', Item.value);
          }
          getItem = '';
        }
      } else {
        const errorMessage =
          ResponseDataToJsonUtil.getErrorMessage(result) || (message.errorMessage ?? '');
        showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorMessage);
      }
    } catch {
      // Errors are handled via dialog in the success/failure branches
    }
  }

  async function getXrfProdeqp(): Promise<void> {
    clearFromEqp();

    const message = await remoteXrfRecipeService.getXrfProdeqp(
      DeviceInfo.FACILITY,
      DeviceInfo.AREA,
      Item.value,
    );
    const isSuccessFul = message.isSuccessFul;
    const result = message.result;

    if (isSuccessFul) {
      const bayListJSON: BayItem[] = ResponseDataToJsonUtil.getMessageBodyList(result, 'BAYS');
      const spinnerBayItems: string[] = [];

      for (let i = 0; i < bayListJSON.length; i++) {
        const bay = bayListJSON[i];
        spinnerBayItems.push(bay.BAY);
        if (bay.BAY === getEqp) {
          EqpIdx = i + 1;
        }
      }

      spinnerProdeqpOptions.value = spinnerBayItems.map((val) => ({ label: val, value: val }));

      if (getEqp !== 'null' && getEqp !== '') {
        if (EqpIdx > 0 && spinnerBayItems[EqpIdx - 1]) {
          eqpId.value = spinnerBayItems[EqpIdx - 1];
          itemSelectedListener('spinner_prodeqp', eqpId.value);
        }
        getEqp = '';
      }
    } else {
      const errorMessage =
        ResponseDataToJsonUtil.getErrorMessage(result) || (message.errorMessage ?? '');
      showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorMessage);
    }
  }

  async function getXrfCategory(): Promise<void> {
    clearFromCategory();

    const message = await remoteXrfRecipeService.getXrfCategory(
      DeviceInfo.FACILITY,
      DeviceInfo.AREA,
      Item.value,
      eqpId.value,
    );
    const isSuccessFul = message.isSuccessFul;
    const result = message.result;

    if (isSuccessFul) {
      const bayListJSON: BayItem[] = ResponseDataToJsonUtil.getMessageBodyList(result, 'BAYS');
      const spinnerBayItems: string[] = [];

      for (let i = 0; i < bayListJSON.length; i++) {
        const bay = bayListJSON[i];
        spinnerBayItems.push(bay.BAY);
        if (bay.BAY === getCategory) {
          CategoryIdx = i + 1;
        }
      }

      spinnerCategoryOptions.value = spinnerBayItems.map((val) => ({ label: val, value: val }));

      if (getCategory !== 'null' && getCategory !== '') {
        if (CategoryIdx > 0 && spinnerBayItems[CategoryIdx - 1]) {
          category.value = spinnerBayItems[CategoryIdx - 1];
          itemSelectedListener('spinner_category', category.value);
        }
        getCategory = '';
      }
    } else {
      const errorMessage =
        ResponseDataToJsonUtil.getErrorMessage(result) || (message.errorMessage ?? '');
      showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorMessage);
    }
  }

  async function getXrfSample(): Promise<void> {
    clearFromSample();

    const message = await remoteXrfRecipeService.getXrfSample(
      DeviceInfo.FACILITY,
      DeviceInfo.AREA,
      Item.value,
      eqpId.value,
      category.value,
    );
    const isSuccessFul = message.isSuccessFul;
    const result = message.result;

    if (isSuccessFul) {
      const bayListJSON: BayItem[] = ResponseDataToJsonUtil.getMessageBodyList(result, 'BAYS');
      const spinnerBayItems: string[] = [];

      for (let i = 0; i < bayListJSON.length; i++) {
        const bay = bayListJSON[i];
        spinnerBayItems.push(bay.BAY);
        if (bay.BAY === getSample) {
          SampleIdx = i + 1;
        }
      }

      spinnerMdsOptions.value = spinnerBayItems.map((val) => ({ label: val, value: val }));

      if (getSample !== 'null' && getSample !== '') {
        if (SampleIdx > 0 && spinnerBayItems[SampleIdx - 1]) {
          sample.value = spinnerBayItems[SampleIdx - 1];
          itemSelectedListener('spinner_mds', sample.value);
        }
        getSample = '';
      }
    } else {
      const errorMessage =
        ResponseDataToJsonUtil.getErrorMessage(result) || (message.errorMessage ?? '');
      showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorMessage);
    }
  }

  async function getXrfPara(): Promise<void> {
    clearFromPara();

    const message = await remoteXrfRecipeService.getXrfPara(
      DeviceInfo.FACILITY,
      DeviceInfo.AREA,
      Item.value,
      eqpId.value,
      category.value,
      sample.value,
    );
    const isSuccessFul = message.isSuccessFul;
    const result = message.result;

    if (isSuccessFul) {
      const bayListJSON: BayItem[] = ResponseDataToJsonUtil.getMessageBodyList(result, 'BAYS');
      const spinnerBayItems: string[] = [];

      for (let i = 0; i < bayListJSON.length; i++) {
        const bay = bayListJSON[i];
        spinnerBayItems.push(bay.BAY);
        if (bay.BAY === getPara) {
          ParaIdx = i + 1;
        }
      }

      spinnerParaOptions.value = spinnerBayItems.map((val) => ({ label: val, value: val }));

      if (getPara !== 'null' && getPara !== '') {
        if (ParaIdx > 0 && spinnerBayItems[ParaIdx - 1]) {
          para.value = spinnerBayItems[ParaIdx - 1];
          itemSelectedListener('spinner_para', para.value);
        }
        getPara = '';
      }
    } else {
      const errorMessage =
        ResponseDataToJsonUtil.getErrorMessage(result) || (message.errorMessage ?? '');
      showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorMessage);
    }
  }

  async function getXrfRecipe(): Promise<void> {
    const message = await remoteXrfRecipeService.getXrfRecipe(
      DeviceInfo.FACILITY,
      DeviceInfo.AREA,
      Item.value,
      eqpId.value,
      category.value,
      sample.value,
      para.value,
    );
    const isSuccessFul = message.isSuccessFul;
    const result = message.result;

    if (isSuccessFul) {
      const bayListJSON: BayItem[] = ResponseDataToJsonUtil.getMessageBodyList(result, 'BAYS');

      for (let i = 0; i < bayListJSON.length; i++) {
        const bay = bayListJSON[i];
        txtRecipe.value = bay.BAY;
        linearThick.value = bay.CONTEXT01 === 'Y';
        if (!linearThick.value) {
          txtThick.value = '';
        }
      }
    } else {
      const errorMessage =
        ResponseDataToJsonUtil.getErrorMessage(result) || (message.errorMessage ?? '');
      showOkDialog(COMMON_FIELD.TXTDIALOGTITLE_ERROR, errorMessage);
    }
  }

  function itemSelectedListener(parentId: string, selectedValue: string): void {
    switch (parentId) {
      case 'spinner_item':
        if (selectedValue !== null && selectedValue !== undefined && selectedValue !== '') {
          Item.value = selectedValue;
          void getXrfProdeqp();
        }
        break;
      case 'spinner_prodeqp':
        if (selectedValue !== null && selectedValue !== undefined && selectedValue !== '') {
          eqpId.value = selectedValue;
          void getXrfCategory();
        }
        break;
      case 'spinner_category':
        if (selectedValue !== null && selectedValue !== undefined && selectedValue !== '') {
          category.value = selectedValue;
          void getXrfSample();
        }
        break;
      case 'spinner_mds':
        if (selectedValue !== null && selectedValue !== undefined && selectedValue !== '') {
          sample.value = selectedValue;
          void getXrfPara();
        }
        break;
      case 'spinner_para':
        if (selectedValue !== null && selectedValue !== undefined && selectedValue !== '') {
          para.value = selectedValue;
          void getXrfRecipe();
        }
        break;
    }
  }

  function Null_check(): boolean {
    if (Item.value === '' || Item.value === null || Item.value === undefined) {
      return false;
    }
    if (eqpId.value === '' || eqpId.value === null || eqpId.value === undefined) {
      return false;
    }
    if (category.value === '' || category.value === null || category.value === undefined) {
      return false;
    }
    if (sample.value === '' || sample.value === null || sample.value === undefined) {
      return false;
    }
    if (para.value === '' || para.value === null || para.value === undefined) {
      return false;
    }
    if (txtRecipe.value === '') {
      return false;
    }
    if (txtSlot.value === '') {
      return false;
    }
    return true;
  }

  // Android execute(): passes result to caller via store (and emit for component use)
  function execute(): void {
    if (Null_check() === false) {
      return;
    }

    const intentPayload: RemoteXrfRecipeResult = {
      ITEM: Item.value,
      PRODEQP: eqpId.value,
      CATEGORY: category.value,
      SAMPLE: sample.value,
      PARA: para.value,
      RECIPE: txtRecipe.value,
      SLOT: txtSlot.value,
      THICK: txtThick.value,
    };

    xrfStore.setResult(intentPayload);
    if (onResult) {
      onResult(intentPayload);
    }
    finish();
  }

  function onSingleClickListener(buttonId: string): void {
    switch (buttonId) {
      case 'btn_save':
        execute();
        break;
      case 'btn_cancel':
        finish();
        break;
    }
  }

  async function onCreate(): Promise<void> {
    if (route.query.SLOT && String(route.query.SLOT).length > 0) {
      txtSlot.value = String(route.query.SLOT);
      focusSlot?.();
    }

    getItem =
      route.query.ITEM !== undefined && route.query.ITEM !== null
        ? String(route.query.ITEM)
        : 'null';
    getEqp =
      route.query.PRODEQP !== undefined && route.query.PRODEQP !== null
        ? String(route.query.PRODEQP)
        : 'null';
    getCategory =
      route.query.CATEGORY !== undefined && route.query.CATEGORY !== null
        ? String(route.query.CATEGORY)
        : 'null';
    getSample =
      route.query.SAMPLE !== undefined && route.query.SAMPLE !== null
        ? String(route.query.SAMPLE)
        : 'null';
    getPara =
      route.query.PARA !== undefined && route.query.PARA !== null
        ? String(route.query.PARA)
        : 'null';

    // Opening the screen directly (deep link / dev reload) can race ahead of the
    // device bootstrap, leaving FACILITY/AREA empty; make sure it's ready first.
    if (!mainStore.isSettingReady || !mainStore.mobileServerName) {
      await mainStore.initMain();
    }

    void getXrfItem();
  }

  onMounted(() => {
    void onCreate();
  });

  return {
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
    onCreate,
    showOkDialog,
    closeDialog,
    finish,
    clearFromEqp,
    clearFromCategory,
    clearFromSample,
    clearFromPara,
    getXrfItem,
    getXrfProdeqp,
    getXrfCategory,
    getXrfSample,
    getXrfPara,
    getXrfRecipe,
    itemSelectedListener,
    Null_check,
    execute,
    onSingleClickListener,
  };
}
