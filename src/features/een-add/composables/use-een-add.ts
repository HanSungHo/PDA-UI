import { COMMON_FIELD } from 'src/constants/common-strings';
import { useMainStore } from 'src/features/main/stores/main.store';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { createEenAddMockService, type EenAddMockCase } from '../mocks/een-add.mock';
import * as eenService from '../services/een-add.service';
import { useEenAddStore } from '../stores/een-add.store';
import type {
  EenAddContext,
  EenAddResponse,
  EenOperationOption,
  EenRouteOption,
  EenTagOption,
} from '../types/een-add.types';

const ACTION_POINTS = ['MOVEIN', 'MOVEOUT', 'MOVEIN/OUT'];

function stringValue(value: unknown): string {
  if (Array.isArray(value)) return stringValue(value[0]);
  if (typeof value === 'string' || typeof value === 'number') return String(value);

  return '';
}

function listItems(body: Record<string, unknown>, name: string): Record<string, unknown>[] {
  const list = body[name];
  if (Array.isArray(list)) return list.filter((item): item is Record<string, unknown> => !!item);
  if (!list || typeof list !== 'object') return [];

  const items = (list as Record<string, unknown>).ITEM;
  if (Array.isArray(items)) return items.filter((item): item is Record<string, unknown> => !!item);
  if (items && typeof items === 'object') return [items as Record<string, unknown>];

  return [];
}

function parseTagList(value: string): EenTagOption[] {
  if (!value) return [];

  return value
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t'))
    .filter((columns) => columns.length > 0 && columns[0])
    .map((columns) => ({
      label: columns[0],
      value: columns[0],
      comment: columns[1] ?? '',
    }));
}

export function useEenAdd() {
  const route = useRoute();
  const router = useRouter();
  const mainStore = useMainStore();
  const eenAddStore = useEenAddStore();
  const mockMode = stringValue(route.query.mock).toLowerCase() === 'een-add';

  if (mockMode) {
    const requestedCase = stringValue(route.query.mockCase) as EenAddMockCase;
    const supportedCases: EenAddMockCase[] = [
      'success',
      'tag-id-error',
      'route-error',
      'operation-error',
      'position-error',
      'insert-error',
      'empty-tags',
      'empty-routes',
      'empty-operations',
    ];
    const mockCase = supportedCases.includes(requestedCase) ? requestedCase : 'success';
    eenService.setEenAddService(createEenAddMockService(mockCase));
  } else {
    eenService.resetEenAddService();
  }

  const context = ref<EenAddContext>({
    lotId: stringValue(route.query.LOTID || route.query.lotId),
    facility: stringValue(route.query.FACTORYNAME || route.query.facility || mainStore.facility),
    product: stringValue(route.query.PRODUCT || route.query.product),
    route: stringValue(route.query.ROUTE || route.query.route),
    operation: stringValue(route.query.OPERATION || route.query.operation),
    processStep: stringValue(route.query.PROCESSSTEP || route.query.processStep),
    operSequence: stringValue(route.query.OPERSEQUENCE || route.query.operSequence),
  });

  const routeOptions = ref<EenRouteOption[]>([]);
  const operationOptions = ref<EenOperationOption[]>([]);
  const tagOptions = ref<EenTagOption[]>([]);
  const selectedRoute = ref<string | undefined>(undefined);
  const selectedOperation = ref<string | undefined>(undefined);
  const selectedActionPoint = ref(ACTION_POINTS[0]);
  const selectedTagId = ref<string | undefined>(undefined);
  const comment = ref('');
  const loading = ref(false);
  const routeLoading = ref(false);
  const operationLoading = ref(false);
  const dialogTitle = ref('');
  const dialogMessage = ref('');
  const dialogMode = ref<'alert' | 'confirm' | ''>('');
  const dialogAfterClose = ref<(() => void) | undefined>();

  const selectedOperationOption = computed(() =>
    operationOptions.value.find((option) => option.value === selectedOperation.value),
  );

  function showAlert(title: string, message: string, afterClose?: () => void): void {
    dialogTitle.value = title;
    dialogMessage.value = message;
    dialogMode.value = 'alert';
    dialogAfterClose.value = afterClose;
  }

  function closeDialog(): void {
    const callback = dialogAfterClose.value;
    dialogAfterClose.value = undefined;
    dialogMode.value = '';
    callback?.();
  }

  function cancelDialog(): void {
    dialogAfterClose.value = undefined;
    dialogMode.value = '';
  }

  function responseItems(response: EenAddResponse, name: string): Record<string, unknown>[] {
    return listItems(response.messageBody, name);
  }

  async function loadTagIds(): Promise<void> {
    try {
      const response = await eenService.getTagId(context.value.facility);
      if (!response.isSuccess) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, response.errorMessage);
        return;
      }

      tagOptions.value = parseTagList(stringValue(response.messageBody.TAGLIST));
      if (tagOptions.value.length > 0) {
        selectedTagId.value = tagOptions.value[0].value;
        comment.value = tagOptions.value[0].comment;
      }
    } catch (error: unknown) {
      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async function loadRoutes(): Promise<void> {
    routeLoading.value = true;
    try {
      const response = await eenService.getProcessFlow(
        context.value.facility,
        context.value.product,
        context.value.operation,
      );
      if (!response.isSuccess) {
        routeOptions.value = [];
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, response.errorMessage);
        return;
      }

      routeOptions.value = responseItems(response, 'ITEMS').map((item) => {
        const value = stringValue(item.PROCESSFLOWNAME);
        return { label: value, value };
      });
      const responseRoute = stringValue(response.messageBody.PROCESSFLOWNAME);
      selectedRoute.value =
        routeOptions.value.find((option) => option.value === responseRoute)?.value ??
        (responseRoute || undefined);
      if (selectedRoute.value) await loadOperations();
    } catch (error: unknown) {
      routeOptions.value = [];
      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      routeLoading.value = false;
    }
  }

  async function loadOperations(): Promise<void> {
    if (!selectedRoute.value) return;

    operationLoading.value = true;
    try {
      const response = await eenService.getProcessOperation(
        context.value.facility,
        context.value.product,
        selectedRoute.value,
      );
      if (!response.isSuccess) {
        operationOptions.value = [];
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, response.errorMessage);
        return;
      }

      operationOptions.value = responseItems(response, 'ITEMS').map((item) => {
        const operation = stringValue(item.PROCESSOPERATIONNAME);
        const description = stringValue(item.PODESC);
        const value = `${operation} ${description}`.trim();
        return { label: value, value, operation, description };
      });

      if (context.value.operation) {
        selectedOperation.value = operationOptions.value.find(
          (option) => option.operation === context.value.operation,
        )?.value;
        context.value.operation = '';
      }
      selectedOperation.value ??= operationOptions.value[0]?.value;
    } catch (error: unknown) {
      operationOptions.value = [];
      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      operationLoading.value = false;
    }
  }

  async function addWaferNumber(): Promise<void> {
    try {
      const response = await eenService.getTagPosition(context.value.lotId);
      if (!response.isSuccess) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, response.errorMessage);
        return;
      }

      const positions = responseItems(response, 'ITEMS').map((item) => stringValue(item.POSITION));
      comment.value = `#${positions.join(',')}${comment.value}`;
    } catch (error: unknown) {
      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  function onTagChange(value: string | number | Array<string | number> | undefined): void {
    if (Array.isArray(value)) return;

    selectedTagId.value = value === undefined ? undefined : String(value);
    const selected = tagOptions.value.find((option) => option.value === selectedTagId.value);
    comment.value = selected?.comment ?? '';
  }

  function validate(): boolean {
    if (!selectedRoute.value) {
      showAlert('Route 입력', 'Route를 입력하세요.');
      return false;
    }
    if (!selectedOperation.value) {
      showAlert('공정 입력', '공정을 입력하세요.');
      return false;
    }
    if (!selectedActionPoint.value) {
      showAlert('Action Point 입력', 'Action Point를 입력하세요.');
      return false;
    }
    if (comment.value === '') {
      showAlert('Tag Comment 입력', 'Tag Comment를 입력하세요.');
      return false;
    }
    return true;
  }

  function submit(): void {
    if (loading.value || !validate()) return;

    dialogTitle.value = COMMON_FIELD.TXTDIALOGTITLE_OK;
    dialogMessage.value = '입력하시겠습니까?';
    dialogMode.value = 'confirm';
  }

  async function confirmSubmit(): Promise<void> {
    dialogMode.value = '';
    loading.value = true;
    try {
      const response = await eenService.insertEen(
        context.value.lotId,
        mainStore.operatorId,
        context.value.facility.trim(),
        context.value.product.trim(),
        selectedOperationOption.value?.operation ?? '',
        selectedActionPoint.value,
        selectedRoute.value?.trim() ?? '',
        comment.value,
        selectedTagId.value ?? '',
      );
      if (!response.isSuccess) {
        showAlert(COMMON_FIELD.TXTDIALOGTITLE_ERROR, response.errorMessage);
        return;
      }

      eenAddStore.setReturnLotId(context.value.lotId);
      if (mockMode && stringValue(route.query.source) === 'een-setting') {
        eenAddStore.setSettingResult({
          lotId: context.value.lotId,
          facility: context.value.facility.trim(),
          product: context.value.product.trim(),
          route: selectedRoute.value?.trim() ?? '',
          operation: selectedOperationOption.value?.operation ?? '',
          poDesc: selectedOperationOption.value?.description ?? context.value.processStep,
          actionPoint: selectedActionPoint.value,
          tagId: selectedTagId.value ?? '',
          tagComment: comment.value,
        });
      }
      showAlert(COMMON_FIELD.TXTDIALOGTITLE_OK, 'EEN을 성공적으로 저장하였습니다.', () =>
        router.back(),
      );
    } catch (error: unknown) {
      showAlert(
        COMMON_FIELD.TXTDIALOGTITLE_ERROR,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      loading.value = false;
    }
  }

  function cancel(): void {
    router.back();
  }

  onMounted(() => {
    void Promise.all([loadTagIds(), loadRoutes()]);
  });

  onUnmounted(() => {
    eenService.resetEenAddService();
  });

  return {
    ACTION_POINTS,
    context,
    routeOptions,
    operationOptions,
    tagOptions,
    selectedRoute,
    selectedOperation,
    selectedActionPoint,
    selectedTagId,
    selectedOperationOption,
    comment,
    loading,
    routeLoading,
    operationLoading,
    dialogTitle,
    dialogMessage,
    dialogMode,
    loadOperations,
    addWaferNumber,
    onTagChange,
    submit,
    confirmSubmit,
    cancel,
    closeDialog,
    cancelDialog,
  };
}
