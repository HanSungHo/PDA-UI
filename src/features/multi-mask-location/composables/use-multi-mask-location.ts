import { computed, ref } from 'vue';

import {
  changeMaskLocation,
  fetchMaskDetailLocations,
  fetchMaskInfo,
  fetchMaskLocationGroups,
  fetchMaskStatuses,
} from '../services/multi-mask-location.service';
import type { MultiMaskDialog, MultiMaskRow } from '../types/multi-mask-location.types';

// Android dialog titles (GetString.TXTDIALOGTITLE_ERROR / BTNOKSTR).
const ERROR_TITLE = '에  러';
const OK_TITLE = '확인';

export const MULTI_MASK_FLOORS = ['2F', '4F', '6F'] as const;
export const MULTI_MASK_USEABLE = ['사용가능', '사용불가'] as const;

interface Context {
  facility: () => string;
  operatorId: () => string;
  focusMaskTag: () => void;
}

/** Android shows ResponseDataToJsonUtil.getErrorMessage (ERRMSG, or the exception message) as is. */
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useMultiMaskLocation(context: Context) {
  const maskTag = ref('');
  const rows = ref<MultiMaskRow[]>([]);
  const floor = ref('');
  const useable = ref('');
  const status = ref('');
  const location = ref('');
  const detailLocation = ref('');
  const statusOptions = ref<string[]>([]);
  const locationOptions = ref<string[]>([]);
  const detailLocationOptions = ref<string[]>([]);
  // Android setMaskInfo has no guard: consecutive scans run in parallel and each adds its mask.
  const pendingScans = ref(0);
  const scanning = computed(() => pendingScans.value > 0);
  const saving = ref(false);
  const loadingOptions = ref(false);
  const dialogs = ref<MultiMaskDialog[]>([]);
  const activeDialog = computed(() => dialogs.value[0]);
  const busy = computed(() => scanning.value || saving.value);
  let nextRowId = 0;
  // Each dependent option request carries a sequence number so a slower, older response
  // cannot overwrite options chosen after it (Android simply resets the adapters).
  let optionRequest = 0;

  function show(message: string, title = ERROR_TITLE): void {
    dialogs.value.push({ title, message });
  }

  function closeDialog(): void {
    dialogs.value.shift();
    if (dialogs.value.length === 0) context.focusMaskTag();
  }

  async function loadOptions(
    load: () => Promise<string[]>,
    apply: (options: string[]) => void,
  ): Promise<void> {
    const requestId = ++optionRequest;
    loadingOptions.value = true;
    try {
      const options = await load();
      if (requestId === optionRequest) apply(options);
    } catch (error) {
      if (requestId === optionRequest) show(errorText(error));
    } finally {
      if (requestId === optionRequest) loadingOptions.value = false;
    }
  }

  function loadStatuses(): Promise<void> {
    return loadOptions(
      () => fetchMaskStatuses(context.facility()),
      (options) => {
        statusOptions.value = options;
      },
    );
  }

  /** Android: choosing a floor clears status, location and detail, then reloads statuses. */
  function selectFloor(value: string): Promise<void> {
    floor.value = value;
    status.value = '';
    location.value = '';
    detailLocation.value = '';
    statusOptions.value = [];
    locationOptions.value = [];
    detailLocationOptions.value = [];
    return loadStatuses();
  }

  function selectStatus(value: string): Promise<void> {
    status.value = value;
    location.value = '';
    detailLocation.value = '';
    locationOptions.value = [];
    detailLocationOptions.value = [];
    if (!status.value) {
      show('상태를 선택해주세요');
      return Promise.resolve();
    }
    return loadOptions(
      () => fetchMaskLocationGroups(status.value, floor.value, context.facility()),
      (options) => {
        locationOptions.value = options;
      },
    );
  }

  function selectLocation(value: string): Promise<void> {
    location.value = value;
    detailLocation.value = '';
    detailLocationOptions.value = [];
    if (!status.value) {
      show('상태를 선택해주세요');
      return Promise.resolve();
    }
    if (!location.value) {
      show('현재위치를 선택해주세요');
      return Promise.resolve();
    }
    return loadOptions(
      () => fetchMaskDetailLocations(status.value, location.value, floor.value, context.facility()),
      (options) => {
        detailLocationOptions.value = options;
      },
    );
  }

  /** Scanned values end with a terminator character that Android strips before MASKINFO. */
  async function scanMask(): Promise<void> {
    const scanned = maskTag.value;
    if (!scanned) {
      show('위치 변경할 Mask를 읽어주세요.');
      return;
    }

    const maskId = scanned.slice(0, -1);
    maskTag.value = '';
    pendingScans.value += 1;
    try {
      const info = await fetchMaskInfo(maskId, context.facility());
      rows.value = [...rows.value, { id: nextRowId++, ...info, MASKID: maskId }];
    } catch (error) {
      show(errorText(error));
    } finally {
      pendingScans.value -= 1;
      if (dialogs.value.length === 0) context.focusMaskTag();
    }
  }

  function clearList(): void {
    if (busy.value) return;
    rows.value = [];
  }

  /**
   * Android starts one CHANGEMASKLOCATION request per row without awaiting the previous one and
   * shows a single summary when the last one answers. Here every row always settles, so an empty
   * list or a missing selection also gets feedback instead of leaving the screen silent.
   */
  async function changeLocations(): Promise<void> {
    if (busy.value) return;
    if (rows.value.length === 0) {
      show('위치 변경할 Mask를 읽어주세요.');
      return;
    }
    if (!status.value) {
      show('변경할 STATUS를 입력하세요.');
      return;
    }
    if (!location.value) {
      show('변경할 위치를 입력하세요.');
      return;
    }
    if (!detailLocation.value) {
      show('변경할 상세위치를 입력하세요.');
      return;
    }

    const target = {
      status: status.value,
      location: location.value,
      detailLocation: detailLocation.value,
      floor: floor.value,
    };
    const requestContext = { facility: context.facility(), operatorId: context.operatorId() };
    saving.value = true;
    try {
      const results = await Promise.allSettled(
        rows.value.map((row) => changeMaskLocation(row.MASKID, target, requestContext)),
      );
      const failures = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );
      for (const failure of failures) {
        show(errorText(failure.reason));
      }
      if (failures.length === 0) {
        show('위치가 변경되었습니다.', OK_TITLE);
        rows.value = [];
      } else {
        show('위치 변경에 실패한 MASK가 있습니다.', OK_TITLE);
      }
    } finally {
      saving.value = false;
    }
  }

  return {
    maskTag,
    rows,
    floor,
    useable,
    status,
    location,
    detailLocation,
    statusOptions,
    locationOptions,
    detailLocationOptions,
    scanning,
    saving,
    loadingOptions,
    busy,
    activeDialog,
    closeDialog,
    loadStatuses,
    selectFloor,
    selectStatus,
    selectLocation,
    scanMask,
    clearList,
    changeLocations,
  };
}
