import { computed, ref } from 'vue';

import { moveInInlineService } from '../services/move-in-inline.service';
import type {
  InlineInfo,
  InlineItem,
  InlineRow,
  InlineSetResponse,
  MaskLocationInfo,
} from '../types/move-in-inline.types';

const emptyInfo = (): InlineInfo => ({
  product: '',
  operation: '',
  photoJobCode: '',
  maskTag: '',
  changeMaskTag: '',
  inlineRecipe: '',
  processStep: '',
  quantity: '',
  criticalStepper: '',
  criticalStepper2: '',
  criticalStepper3: '',
});

function getErrorMessage(error: unknown, fallback = 'Error'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error) {
    return error;
  }
  return fallback;
}

export function useMoveInInline(lotId: string, operation: string) {
  const loading = ref(false);
  const info = ref<InlineInfo>(emptyInfo());
  const rows = ref<InlineRow[]>([]);
  const selectedItems = ref<InlineItem[]>([]);
  const nest = ref('');
  const realMaskTag = ref('');
  const errorMessage = ref('');

  const nestOptions = ['1', '2', '3', '4'].map((v) => ({ label: v, value: v }));

  // Kotlin: If CHANGEMASKTAG differs from MASKTAG, use CHANGEMASKTAG and highlight it in red
  const maskTag = computed(() =>
    info.value.changeMaskTag && info.value.maskTag !== info.value.changeMaskTag
      ? info.value.changeMaskTag
      : info.value.maskTag,
  );
  const isMaskTagChanged = computed(
    () => !!info.value.changeMaskTag && info.value.maskTag !== info.value.changeMaskTag,
  );
  const maskTagOptions = computed(() =>
    maskTag.value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => ({ label: v, value: v })),
  );

  const currentProcess = computed(() => `${info.value.processStep}(${info.value.operation})`);
  const identCodeList = ref('');
  const hasCompletedRow = computed(() => rows.value.some((r) => r.isComplete === 'C'));

  async function loadInfo() {
    loading.value = true;
    errorMessage.value = '';

    try {
      const res = await moveInInlineService.getInlineInfo(lotId, operation);

      if (res.isSuccessful) {
        // Android's InitSpinnerAdapter starts at its empty "nothing selected" row.
        nest.value = '';
        const messageBody = res.info;

        const sProduct = messageBody.product ?? '';
        const sOperation = messageBody.operation ?? '';
        const sPhotoJobCode = messageBody.photoJobCode ?? '';
        const sReticleTag = messageBody.maskTag ?? '';
        const sChangeReticleTag = messageBody.changeMaskTag ?? '';
        const sInlineRecipe = messageBody.inlineRecipe ?? '';
        const sProcesStep = messageBody.processStep ?? '';
        const sQuantity = messageBody.quantity ?? '';
        const sCriticalStepper = messageBody.criticalStepper ?? '';
        const sCriticalStepper2 = messageBody.criticalStepper2 ?? '';
        const sCriticalStepper3 = messageBody.criticalStepper3 ?? '';

        info.value = {
          ...messageBody,

          maskTag: sReticleTag,
          changeMaskTag: sChangeReticleTag,
          operation: sOperation,
          product: sProduct,
          photoJobCode: sPhotoJobCode,
          inlineRecipe: sInlineRecipe,
          processStep: sProcesStep,
          quantity: sQuantity,
          criticalStepper: sCriticalStepper,
          criticalStepper2: sCriticalStepper2,
          criticalStepper3: sCriticalStepper3,
        };

        realMaskTag.value = maskTagOptions.value[0]?.value ?? '';

        const inLineListJSON = res.rows;
        rows.value = inLineListJSON.map((row) => ({
          ...row,
          isComplete: row.isComplete === 'Y' ? 'C' : row.isComplete,
        }));

        selectedItems.value = [];
        identCodeList.value = '';
      } else {
        errorMessage.value = res.errorMessage ?? 'Get Inline Info failed';
      }
    } catch (e: unknown) {
      errorMessage.value = getErrorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  /** Kotlin: DrawerGestureListener.onSingleTapUp */
  function toggleRow(index: number): void {
    const row = rows.value[index];
    if (!row) {
      return;
    }
    const previousRow = rows.value[index - 1];
    const nextRow = rows.value[index + 1];
    const canSelect = row.isComplete === 'N' && (!previousRow || previousRow.isComplete !== 'N');
    if (canSelect) {
      row.isComplete = 'Y';
      selectedItems.value.push({ subOperation: row.subOperation, identCode: row.identCode });
      identCodeList.value += row.identCode;
      return;
    }
    const canUnselect = row.isComplete === 'Y' && (!nextRow || nextRow.isComplete !== 'Y');
    if (canUnselect) {
      row.isComplete = 'N';
      selectedItems.value = selectedItems.value.filter(
        (item) => item.subOperation !== row.subOperation,
      );

      identCodeList.value = identCodeList.value.slice(0, -1);
    }
  }

  /** Kotlin: fullIinline() */
  function selectFullIl() {
    if (hasCompletedRow.value) return;

    identCodeList.value = 'CED';
    selectedItems.value = rows.value.map((r) => {
      r.isComplete = 'Y';

      return {
        subOperation: r.subOperation,
        identCode: r.identCode,
      };
    });
  }

  async function fetchMaskLocation(): Promise<MaskLocationInfo | null> {
    errorMessage.value = '';

    if (!realMaskTag.value) {
      errorMessage.value = 'Mask Tag를 선택 해 주세요.';
      return null;
    }

    try {
      const reticleId = realMaskTag.value;

      const response = await moveInInlineService.getMaskLocationInfo(reticleId);

      if (!response) {
        errorMessage.value = 'Mask Location 정보를 찾을 수 없습니다.';
        return null;
      }

      const maskLocationInfo: MaskLocationInfo = {
        maskTag: response.maskTag ?? '',
        product: response.product ?? '',
        giben: response.giben ?? '',
        status: response.status ?? '',

        isUse: response.isUse === 'Y' ? '사용가능' : '사용불가',

        currentLoc: response.currentLoc ?? '',
        subLocation3: response.subLocation3 ?? '',
        afterInsp: response.afterInsp ?? '',
      };

      return maskLocationInfo;
    } catch (e: unknown) {
      errorMessage.value = getErrorMessage(e);
      return null;
    }
  }

  /** Kotlin: inlineSet() -> Return data so the page opens the MachineSelectDialog*/

  async function submitInlineSet(): Promise<InlineSetResponse | null> {
    errorMessage.value = '';

    // Kotlin:
    // if (inlineItems.count() == 0)
    if (selectedItems.value.length === 0) {
      errorMessage.value = '진행 할 공정을 선택하세요';
      return null;
    }

    // Kotlin checks inLineitemsSum before adding selected rows, so this mask guard never runs.

    // Kotlin:
    // if (spinnerNest.selectedItem?.toString().isNullOrBlank())
    if (!nest.value) {
      errorMessage.value = '진행할 NEST를 선택하세요.';
      return null;
    }

    // Kotlin:
    // if (inlineItems.count() == 3)
    const isFullInline = selectedItems.value.length === 3 ? 'Y' : 'N';

    try {
      const response = await moveInInlineService.inlineSet({
        lotId,
        operation,
        maskTag: maskTag.value,
        quantity: info.value.quantity,
        isFullInline,
        items: selectedItems.value,
      });

      if (!response?.isSuccessful) {
        errorMessage.value = response?.errorMessage ?? 'Inline Set failed';

        return null;
      }

      return {
        isSuccessful: response.isSuccessful ?? '',
        isExposure: response.isExposure ?? '',
        eqpGroup: response.eqpGroup ?? '',
        expEqpGroup: response.expEqpGroup ?? '',
        subOperation: response.subOperation ?? '',
        commentQty: response.commentQty ?? '',
        nrwCommentQty: response.nrwCommentQty ?? '',
      };
    } catch (e: unknown) {
      errorMessage.value = getErrorMessage(e);

      return null;
    }
  }

  return {
    loading,
    info,
    rows,
    nest,
    nestOptions,
    realMaskTag,
    maskTagOptions,
    maskTag,
    isMaskTagChanged,
    currentProcess,
    identCodeList,
    hasCompletedRow,
    errorMessage,
    loadInfo,
    toggleRow,
    selectFullIl,
    fetchMaskLocation,
    submitInlineSet,
  };
}
