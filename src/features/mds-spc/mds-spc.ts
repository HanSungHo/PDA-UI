import type { BaseInputTone } from 'src/components/base';

export interface MDSSpcFields {
  Time: string;
  Slot: string;
  Equipid: string;
  Measeqpid: string;
  Area: string;
  Proctype: string;
  Item: string;
  Sample: string;
  SpcResult: string;
  Parameter: string;
  Avg: string;
  Min: string;
  Max: string;
  Std: string;
  Unif: string;
  Sul: string;
  Scl: string;
  Sll: string;
  Ucl: string;
  Lcl: string;
  Sucl: string;
  CreateTime: string;
}

export type MDSSpcFieldKey = keyof MDSSpcFields;

export const emptyMDSSpcFields = (): MDSSpcFields => ({
  Time: '',
  Slot: '',
  Equipid: '',
  Measeqpid: '',
  Area: '',
  Proctype: '',
  Item: '',
  Sample: '',
  SpcResult: '',
  Parameter: '',
  Avg: '',
  Min: '',
  Max: '',
  Std: '',
  Unif: '',
  Sul: '',
  Scl: '',
  Sll: '',
  Ucl: '',
  Lcl: '',
  Sucl: '',
  CreateTime: '',
});

const segmentIndexes: Partial<Record<MDSSpcFieldKey, number>> = {
  Time: 0,
  Equipid: 1,
  Measeqpid: 3,
  Area: 4,
  Item: 5,
  Proctype: 6,
  Sample: 7,
  Slot: 9,
  SpcResult: 10,
  Parameter: 13,
  Avg: 16,
  Min: 17,
  Max: 18,
  Std: 19,
  Unif: 20,
  CreateTime: 21,
  Sul: 26,
  Scl: 27,
  Sll: 28,
  Ucl: 29,
  Lcl: 31,
  Sucl: 33,
};

export const MDS_SPC_ROWS: ReadonlyArray<ReadonlyArray<{ key: MDSSpcFieldKey; label: string }>> = [
  [
    { key: 'Time', label: '발생시간' },
    { key: 'Slot', label: 'ALARM_LEVEL' },
  ],
  [
    { key: 'Equipid', label: '장비' },
    { key: 'Measeqpid', label: '계측장비' },
  ],
  [
    { key: 'Area', label: 'AREA' },
    { key: 'Proctype', label: 'PROCTYPE' },
  ],
  [
    { key: 'Item', label: 'LOTID' },
    { key: 'Sample', label: 'PORTID' },
  ],
  [
    { key: 'Parameter', label: 'FACILITY' },
    { key: 'SpcResult', label: 'SPC 결과' },
  ],
];

/** Android highlights FACILITY (yellow background) and the SPC result (red text). */
export const MDS_SPC_FIELD_TONES: Partial<Record<MDSSpcFieldKey, BaseInputTone>> = {
  Parameter: 'warning-subtle',
  SpcResult: 'error-text',
};

export const MDS_SPC_STATISTIC_ROWS: ReadonlyArray<
  ReadonlyArray<{ key: MDSSpcFieldKey; label: string }>
> = [
  [
    { key: 'Avg', label: 'AVG' },
    { key: 'Min', label: 'MIN' },
    { key: 'Max', label: 'MAX' },
  ],
  [
    { key: 'Std', label: 'STD' },
    { key: 'Unif', label: 'UNIF' },
  ],
];

export const MDS_SPC_LIMIT_ROWS: ReadonlyArray<
  ReadonlyArray<{ key: MDSSpcFieldKey; label: string }>
> = [
  [
    { key: 'Sul', label: 'SUL' },
    { key: 'Ucl', label: 'UCL' },
  ],
  [
    { key: 'Scl', label: 'SCL' },
    { key: 'Lcl', label: 'LCL' },
  ],
  [
    { key: 'Sll', label: 'SLL' },
    { key: 'Sucl', label: 'SUCL' },
  ],
];

/** Field rows in the Figma modal order: identity, statistics, then limits. */
export const MDS_SPC_FIELD_ROWS = [
  ...MDS_SPC_ROWS,
  ...MDS_SPC_STATISTIC_ROWS,
  ...MDS_SPC_LIMIT_ROWS,
];

export function parseSPCResult(SPCResult: string): string {
  const list_spc: string[] = [];
  for (let ruleCnt = 0; ruleCnt < SPCResult.length - 1; ruleCnt++) {
    if (SPCResult[ruleCnt] === 'F') list_spc.push(String(ruleCnt + 1));
  }
  return `[${list_spc.join(', ')}]`;
}

function valueAfterLastTag(fragment: string): string {
  return fragment.slice(fragment.lastIndexOf('>') + 1);
}

function getLegacyValue(parts: string[], index: number): string | undefined {
  const fragment = parts[index];
  return fragment === undefined ? undefined : valueAfterLastTag(fragment);
}

/** Parses the positional closing-tag segments used by the legacy MDSspcActivity. */
export function parseMDSSpcMessage(receiverMessage?: string | null): MDSSpcFields {
  const fields = emptyMDSSpcFields();
  if (!receiverMessage?.includes('INTERLOCKMANAGER')) return fields;

  for (const table of receiverMessage.split('<Table diffgr:').slice(1)) {
    const parts = table.split('</');
    for (const [key, index] of Object.entries(segmentIndexes) as [MDSSpcFieldKey, number][]) {
      const value = getLegacyValue(parts, index);
      if (value === undefined || !(value > '0')) continue;

      if (key === 'Time') {
        const timestamp = value.includes('+') ? value.slice(0, value.indexOf('+')) : value;
        fields.Time += timestamp.replace('T', ' ');
      } else if (key === 'SpcResult') {
        fields.SpcResult += parseSPCResult(value);
      } else {
        fields[key] += value;
      }
    }
  }

  return fields;
}
