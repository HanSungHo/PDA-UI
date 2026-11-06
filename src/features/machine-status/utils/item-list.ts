import type { MachineStatusItemList } from '../types/machine-status.types';

/** ResponseDataToJsonUtil.getMessageBodyList: reads `<list>.ITEM`; a single row may be an object. */
export function toItemArray<T>(list: MachineStatusItemList<T> | undefined): T[] {
  const item = list?.ITEM;
  if (Array.isArray(item)) return item;
  return item && typeof item === 'object' ? [item] : [];
}
