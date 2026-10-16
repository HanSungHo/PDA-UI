import type { ColumnRegular } from '@revolist/revogrid';

interface ESheetEdcColumnDefinition {
  hideInCompact?: boolean;
  label: string;
  property: string;
  size?: number;
}

const thickColumns: ESheetEdcColumnDefinition[] = [
  { property: 'SLOTID', label: 'SLOT', size: 50 },
  { property: 'PRODEQPID1', label: '생산장비' },
  { property: 'MEASEQPID', label: '계측장비' },
  { property: 'PARAMETER', label: 'PARA' },
  { property: 'RECIPEID', label: 'RECIPE' },
  { property: 'MIN', label: 'MIN' },
  { property: 'MAX', label: 'MAX' },
  { property: 'AVG', label: 'AVG' },
  { property: 'QUL', label: 'QUL', hideInCompact: true },
  { property: 'QCL', label: 'QCL', hideInCompact: true },
  { property: 'QLL', label: 'QLL', hideInCompact: true },
  { property: 'SITECOUNT', label: 'SITECOUNT', hideInCompact: true },
  ...Array.from({ length: 9 }, (_unused, index) => ({
    property: `VALUE${index + 1}`,
    label: String(index + 1),
    hideInCompact: true,
  })),
  { property: 'RANGE', label: 'RANGE' },
];

const overlayColumns: ESheetEdcColumnDefinition[] = [
  { property: 'SLOTID', label: 'SLOT', size: 50 },
  { property: 'PRODEQPID1', label: '생산장비' },
  { property: 'MEASEQPID', label: '계측장비' },
  { property: 'PARAMETER', label: 'PARA' },
  { property: 'RECIPEID', label: 'RECIPE' },
  { property: 'MINX', label: 'MINX' },
  { property: 'MINY', label: 'MINY' },
  { property: 'MAXX', label: 'MAXX' },
  { property: 'MAXY', label: 'MAXY' },
  { property: 'AVGX', label: 'AVGX' },
  { property: 'AVGV', label: 'AVGY' },
  { property: 'QUL', label: 'QUL' },
  { property: 'QCL', label: 'QCL' },
  { property: 'QLL', label: 'QLL' },
  { property: 'SITECOUNT', label: 'SITECOUNT' },
  ...Array.from({ length: 19 }, (_unused, index) => ({
    property: `VALUE${index + 1}`,
    label: String(index + 1),
    hideInCompact: true,
  })),
  { property: 'RANGEX', label: 'RANGEX' },
  { property: 'RANGEY', label: 'RANGEY' },
];

export function getEdcColumns(processType: string, isAllChecked: boolean): ColumnRegular[] {
  if (!['THICK', 'CD', 'OVERLAY'].includes(processType)) return [];

  const definitions = processType === 'OVERLAY' ? overlayColumns : thickColumns;

  return definitions.map((column) => ({
    prop: column.property,
    name: column.label,
    size: !isAllChecked && column.hideInCompact ? 0 : (column.size ?? 120),
  }));
}
