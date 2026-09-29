import type { WaferInfo } from '../types/wafer-select.types';

const SLOT_COUNT = 25;

export type WaferToggleResult = 'selected' | 'deselected' | 'blocked' | 'limit';

// Legacy: makeSlotMapList()
//
// Matching note: the legacy WaferAdapter used selectList.contains(waferName),
// which is substring matching (e.g. 'LOT001.1' matches 'LOT001.11'). We use
// exact full-waferName matching instead — a documented intentional deviation
// that fixes the latent legacy false-positive bug.
export function createWaferGrid(
  waferList: string,
  disableList = '',
  selectList = '',
  editable = true,
): WaferInfo[] {
  const source = splitList(waferList);
  const disabled = new Set(splitList(disableList));
  const selected = new Set(splitList(selectList));

  return Array.from({ length: SLOT_COUNT }, (_, index) => {
    const slotNo = String(index + 1).padStart(2, '0');
    const waferId = source.find((item) => getSlotNo(item) === slotNo);

    if (!waferId) {
      return {
        waferId: 'empty',
        slotNo,
        machine: '',
        selected: false,
        disabled: true,
      };
    }

    const isSelected = editable ? selected.has(waferId) : true;

    return {
      waferId,
      slotNo,
      machine: isSelected ? 'Empty' : '',
      selected: isSelected,
      disabled: disabled.has(waferId),
    };
  });
}

export function toggleWaferSelection(
  item: WaferInfo,
  currentCount: number,
  maxCount: number,
  editable: boolean,
): WaferToggleResult {
  if (!editable || item.disabled) {
    return 'blocked';
  }

  if (!item.selected && currentCount >= maxCount) {
    return 'limit';
  }

  item.selected = !item.selected;
  item.machine = item.selected ? 'Empty' : '';

  return item.selected ? 'selected' : 'deselected';
}

export function selectAllWafers(items: WaferInfo[], currentCount: number, maxCount: number): void {
  let remaining = maxCount - currentCount;

  if (remaining === 0) {
    items.forEach((item) => {
      if (item.disabled || !item.selected) {
        return;
      }

      item.selected = false;
      item.machine = '';
    });
    return;
  }

  items.forEach((item) => {
    if (item.disabled || item.selected || remaining <= 0) {
      return;
    }

    item.selected = true;
    item.machine = 'Empty';
    remaining--;
  });
}

export function resetWaferSelection(items: WaferInfo[]): void {
  items.forEach((item) => {
    if (item.disabled || !item.selected) {
      return;
    }

    item.selected = false;
    item.machine = '';
  });
}

/**
 * Legacy: getLotLastEvent() restores wafers via waferButton.performClick(),
 * which routes through the WaferAdapter listener and therefore enforces
 * SelectWafer.currentCount < maxCount with the overflow dialog.
 * Returns true if the restore hit the fixed-count limit (caller shows dialog).
 */
export function selectWaferWithLimit(
  item: WaferInfo,
  currentCount: number,
  maxCount: number,
): boolean {
  if (item.disabled || item.selected) {
    return false;
  }

  if (currentCount >= maxCount) {
    return true;
  }

  item.selected = true;
  item.machine = 'Empty';
  return false;
}

export function getSlotNo(value: string): string {
  const normalized = value.trim();
  const separatorIndex = normalized.lastIndexOf('.');
  const slotNo = separatorIndex >= 0 ? normalized.slice(separatorIndex + 1) : normalized;

  return slotNo.padStart(2, '0');
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
