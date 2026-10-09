import type {
  RemoteFurnaceKecActionAvailability,
  RemoteFurnaceKecBatchRow,
  RemoteFurnaceKecDummyMode,
} from '../types/remote-furnace-kec.types';

export function readKecString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function getKecBatchItems(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  }

  if (typeof value !== 'object' || value === null) return [];
  const itemValue = (value as Record<string, unknown>).ITEM;
  if (Array.isArray(itemValue)) {
    return itemValue.filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  }
  if (typeof itemValue === 'object' && itemValue !== null && !Array.isArray(itemValue)) {
    return [itemValue as Record<string, unknown>];
  }
  return [];
}

export function mapKecBatchRows(
  items: readonly Record<string, unknown>[],
  dummyMode: RemoteFurnaceKecDummyMode,
  body: Record<string, unknown>,
): RemoteFurnaceKecBatchRow[] {
  const rows: RemoteFurnaceKecBatchRow[] = [];

  items.forEach((item, index) => {
    const row = Object.fromEntries(
      Object.entries(item).map(([key, value]) => [key, readKecString(value)]),
    ) as Record<string, string>;
    const lotId = readKecString(item.LOTID);

    if (dummyMode === 'F') {
      if (readKecString(item.PROCESSNAME) === 'MW_TEST' || !lotId) return;
    } else if (dummyMode === 'T') {
      const dummyLotId = readKecString(body[`LOT${index + 1}`]);
      if (!dummyLotId) return;
      row.LOTID = dummyLotId;
      row.PRODUCT = '';
      row.STATUS = '';
    }

    rows.push({
      LOTID: row.LOTID ?? '',
      COMMENTQTY: row.COMMENTQTY ?? '',
      STATUS: row.STATUS ?? '',
      PROCESSSTEP: row.PROCESSSTEP ?? '',
      PRODUCT: row.PRODUCT ?? '',
      QUANTITY: row.QUANTITY ?? '',
      ERRORMESSAGE: row.ERRORMESSAGE ?? '',
      OPERATION: row.OPERATION ?? '',
      SUBOPERATION: row.SUBOPERATION ?? '',
      LOTSTATE: row.LOTSTATE ?? '',
      NWCOMMENTQTY: row.NWCOMMENTQTY ?? '',
      OPERSEQUENCE: row.OPERSEQUENCE ?? '',
      PROCESSNAME: row.PROCESSNAME ?? '',
    });
  });

  return rows;
}

export function getKecPortAvailability(
  portState: string,
  batchCount: string,
  hasExistingBatch: string,
): RemoteFurnaceKecActionAvailability {
  const availability: RemoteFurnaceKecActionAvailability = {
    clearPort: false,
    start: false,
    restart: false,
    enter: false,
    enterStart: false,
  };

  if (portState === 'IDLE' || portState === 'READY') {
    availability.clearPort = true;
    if (batchCount === '0') {
      availability.enter = true;
      availability.enterStart = true;
    } else if (batchCount === '1' && hasExistingBatch === '1') {
      availability.start = true;
    }
  } else if (portState === 'PENDING') {
    availability.clearPort = true;
    availability.restart = hasExistingBatch === '1';
  } else if (portState === 'RUN') {
    availability.clearPort = true;
    availability.enter = batchCount !== '2';
  } else if (portState !== '') {
    availability.clearPort = true;
  }

  return availability;
}

export function buildKecLotList(
  rows: readonly RemoteFurnaceKecBatchRow[],
  dummyMode: RemoteFurnaceKecDummyMode,
): string {
  if (dummyMode === 'NONLOT') return '';
  return rows.map((row) => `'${row.LOTID}'`).join(',');
}

function onlyDigits(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

function numberOrUndefined(value: string): number | undefined {
  const parsed = Number(value);
  return value !== '' && Number.isInteger(parsed) ? parsed : undefined;
}

function numberWithin(machineNumber: string, start: string, end: string): boolean {
  const machineDigits = onlyDigits(machineNumber);
  const from = numberOrUndefined(start);
  const to = numberOrUndefined(end);
  const machine = numberOrUndefined(machineDigits);

  if (from !== undefined && to !== undefined && machine !== undefined) {
    return machine >= from && machine <= to;
  }

  if (machineNumber.length !== 1 || start.length !== 1 || end.length !== 1) return false;
  const code = machineNumber.charCodeAt(0);
  return code >= start.charCodeAt(0) && code <= end.charCodeAt(0);
}

function machineNumberMatches(machineNumber: string, group: string): boolean {
  const machineDigits = onlyDigits(machineNumber);
  const groupDigits = onlyDigits(group);
  const machine = numberOrUndefined(machineDigits);
  const candidate = numberOrUndefined(groupDigits);

  if (machine !== undefined && candidate !== undefined) return machine === candidate;
  return (
    machineNumber.length === 1 &&
    group.length === 1 &&
    machineNumber.charCodeAt(0) === group.charCodeAt(0)
  );
}

function equipmentValidate(equipmentGroup: string, machineName: string): boolean {
  if (!machineName) return false;
  if (equipmentGroup !== '' && !equipmentGroup.includes('-')) return true;

  const separatorIndex = machineName.lastIndexOf('-');
  if (separatorIndex < 0) return false;
  const machinePrefix = machineName.slice(0, separatorIndex);
  const machineNumber = machineName.slice(separatorIndex + 1);
  let machineList = '';

  for (const equipment of equipmentGroup.split('|')) {
    if (!equipment.includes(machinePrefix)) continue;
    let candidateList = equipment.slice(equipment.indexOf(machinePrefix) + machinePrefix.length);
    candidateList = candidateList.slice(1);

    if (candidateList.includes(machinePrefix) && equipmentValidate(candidateList, machineName)) {
      return true;
    }

    if (candidateList.includes('-')) {
      candidateList = candidateList.slice(0, candidateList.indexOf('-'));
      candidateList = candidateList.slice(0, candidateList.lastIndexOf(','));
    }

    machineList = machineList ? `${machineList},${candidateList}` : candidateList;
  }

  if (!machineList) return false;

  for (const candidate of machineList.split(',')) {
    if (candidate.includes('~')) {
      const [start, end] = candidate.split('~');
      if (end !== undefined && numberWithin(machineNumber, start, end)) return true;
    } else if (machineNumberMatches(machineNumber, candidate)) {
      return true;
    }
  }

  return false;
}

export function isKecEquipmentInGroup(equipmentGroup: string, machineName: string): boolean {
  return equipmentValidate(equipmentGroup, machineName);
}

export function parseKecEquipmentBarcode(value: string): string | undefined {
  if (!value.startsWith('EQP-')) return undefined;
  const equipmentId = value.slice('EQP-'.length);
  return equipmentId ? equipmentId.slice(0, -1) || undefined : undefined;
}
