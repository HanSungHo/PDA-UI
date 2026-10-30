import { computed, ref } from 'vue';

import type {
  WaferSelectAitInput,
  WaferSelectAitResult,
  WaferSelectAitSlot,
} from '../types/waferselect-ait.types';

const LIMIT_MESSAGE = '선택한 WAFER개수가 지정된 개수를 초과하였습니다.';

export function useWaferSelectAit(input: WaferSelectAitInput = {}) {
  const editable = input.EDITABLE !== 'N';
  const countText = String(input.FIXEDCOUNT ?? '');
  const fixedCount = countText === '' ? 0 : Number(countText);
  // Android String.toInt rejects whitespace, fractions and values outside Int bounds.
  if (
    countText !== '' &&
    (!/^[+-]?\d+$/.test(countText) ||
      !Number.isInteger(fixedCount) ||
      fixedCount < -2147483648 ||
      fixedCount > 2147483647)
  ) {
    throw new RangeError('FIXEDCOUNT must be a 32-bit integer');
  }
  const lot = ref((input.LOTID ?? '').toUpperCase());
  const lotNo = computed({
    get: () => lot.value,
    set: (value: string) => {
      lot.value = value.toUpperCase();
    },
  });
  const error = ref('');
  const slots = ref<WaferSelectAitSlot[]>([]);
  let preselectionIndex = 0;
  const selectedWaferList = computed(() =>
    slots.value
      .filter((slot) => slot.selected)
      .map((slot) => slot.waferName)
      .sort()
      .join(','),
  );
  const currentCount = computed(() => slots.value.filter((slot) => slot.selected).length);

  // Android matches the exact two-digit suffix, without trimming/padding the source.
  if (input.CATEGORY !== 'COUNT' && input.EXISTWAFERLIST) {
    const wafers = input.EXISTWAFERLIST.split(',');
    slots.value = Array.from({ length: 25 }, (_, index) => {
      const slotNo = String(index + 1).padStart(2, '0');
      const waferName =
        wafers.filter((name) => name.slice(name.lastIndexOf('.') + 1) === slotNo).pop() ?? '';
      return {
        slotNo,
        waferName,
        selected: !editable && waferName !== '',
        disabled: !waferName || (editable && !!input.DISABLEWAFERLIST?.includes(waferName)),
      };
    });
    continuePreselection();
  }

  function continuePreselection(): void {
    if (!editable || error.value) return;
    while (preselectionIndex < slots.value.length) {
      const slot = slots.value[preselectionIndex++];
      // Keep substring matching and disabled performClick. Android's blocking
      // OkDialog pauses binding at each overflow until the user acknowledges it.
      if (slot.waferName && input.SELECTWAFERLIST?.includes(slot.waferName)) {
        applySelection(slot);
        if (error.value) return;
      }
    }
  }

  function toggleWafer(index: number): void {
    const slot = slots.value[index];
    if (!editable || !slot || slot.disabled) return;
    applySelection(slot);
  }

  function applySelection(slot: WaferSelectAitSlot): void {
    if (!slot.selected && currentCount.value >= fixedCount) {
      error.value = LIMIT_MESSAGE;
      return;
    }
    slot.selected = !slot.selected;
  }

  function selectAll(): void {
    if (!editable) return;
    let remaining = fixedCount - currentCount.value;
    if (remaining === 0) {
      resetWafer();
      return;
    }
    slots.value.forEach((slot, index) => {
      if (!slot.disabled && !slot.selected && remaining > 0) {
        toggleWafer(index);
        remaining--;
      }
    });
  }

  function resetWafer(): void {
    if (!editable) return;
    slots.value.forEach((slot) => {
      if (!slot.disabled) slot.selected = false;
    });
  }

  function sendWaferList(): WaferSelectAitResult {
    return {
      SEQUENCE: input.SEQUENCE ?? 'null',
      SELECTEDWAFERLIST: selectedWaferList.value,
      SELECTEDMACHINE: '',
    };
  }

  return {
    lotNo,
    editable,
    slots,
    selectedWaferList,
    error,
    continuePreselection,
    toggleWafer,
    selectAll,
    resetWafer,
    sendWaferList,
  };
}
