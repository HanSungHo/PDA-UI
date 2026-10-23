export interface EQPspcFields {
  Lotid: string;
  Equipid: string;
  Recipe: string;
  Chamber: string;
  Parameter: string;
  Measeqpid: string;
  Slot: string;
  Min: string;
  Runtype: string;
  Max: string;
  Ocapsheet: string;
  AVG: string;
  Spcaction: string;
  Time: string;
  SPCResult: string;
}

export const emptyEQPspcFields = (): EQPspcFields => ({
  Lotid: '',
  Equipid: '',
  Recipe: '',
  Chamber: '',
  Parameter: '',
  Measeqpid: '',
  Slot: '',
  Min: '',
  Runtype: '',
  Max: '',
  Ocapsheet: '',
  AVG: '',
  Spcaction: '',
  Time: '',
  SPCResult: '',
});

// EQPspcActivity reads the closing-tag segments by position, not by XML tag name.
const segmentIndexes: Partial<Record<keyof EQPspcFields, number>> = {
  Lotid: 1,
  Recipe: 5,
  Equipid: 6,
  Chamber: 7,
  Measeqpid: 8,
  SPCResult: 9,
  Spcaction: 10,
  Slot: 11,
  Runtype: 12,
  Ocapsheet: 13,
  Parameter: 17,
  AVG: 19,
  Min: 20,
  Max: 21,
  Time: 24,
};

export function concat(s1: string, s2: string): string {
  return s1 === '' ? s2 : `${s1}$${s2}`;
}

export function parseSPCResult(SPCResult: string): string {
  const list_spc: string[] = [];
  // The legacy loop deliberately stops before the final character.
  for (let ruleCnt = 0; ruleCnt < SPCResult.length - 1; ruleCnt++) {
    if (SPCResult[ruleCnt] === 'F') list_spc.push(String(ruleCnt + 1));
  }
  return `[${list_spc.join(', ')}]`;
}

export function parseEQPspcMessage(receiverMessage: string | null | undefined): EQPspcFields {
  const fields = emptyEQPspcFields();
  if (!receiverMessage?.includes('INTERLOCKMANAGER')) return fields;

  for (const table of receiverMessage.split('<Table diffgr:').slice(1)) {
    const parts = table.split('</');
    for (const [key, index] of Object.entries(segmentIndexes) as [keyof EQPspcFields, number][]) {
      const segment = parts[index];
      if (!segment) continue;
      const value = segment.substring(segment.lastIndexOf('>') + 1);
      if (value > '0') {
        fields[key] += key === 'SPCResult' ? parseSPCResult(value) : value;
      }
    }
  }
  return fields;
}

export const EQP_SPC_ROWS: ReadonlyArray<
  ReadonlyArray<{ key: keyof EQPspcFields; label: string }>
> = [
  [
    { key: 'Lotid', label: 'LotID' },
    { key: 'Equipid', label: '생산장비' },
  ],
  [
    { key: 'Recipe', label: 'Recipe' },
    { key: 'Chamber', label: 'Chamber' },
  ],
  [
    { key: 'Parameter', label: 'Parameter' },
    { key: 'Measeqpid', label: '계측장비' },
  ],
  [
    { key: 'Slot', label: 'Slot' },
    { key: 'Min', label: 'MIN' },
  ],
  [
    { key: 'Runtype', label: 'RunType' },
    { key: 'Max', label: 'MAX' },
  ],
  [
    { key: 'Ocapsheet', label: 'OCAPSheet' },
    { key: 'AVG', label: 'AVG' },
  ],
  [
    { key: 'Spcaction', label: 'SpcRule' },
    { key: 'Time', label: '시간' },
  ],
  [{ key: 'SPCResult', label: 'SpcResult' }],
];
