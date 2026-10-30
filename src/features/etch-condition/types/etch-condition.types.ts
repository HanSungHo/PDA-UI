/** Grid layouts ETCHActivity builds from PROCESS_TYPE; `none` adds no grid. */
export type EtchConditionGridKind = 'chamber' | 'te8500' | 'none';

/** One COMMRCP item. Android reads CHAMBER…CHKCHK or COL/VALUE depending on PROCESS_TYPE. */
export type EtchConditionRow = Record<string, string>;

export interface EtchConditionResult {
  processType: string;
  operDesc: string;
  para2nd: string;
  value2nd: string;
  comm2nd: string;
  hmEen: string;
  rows: EtchConditionRow[];
}

export interface EtchConditionDialog {
  title: string;
  message: string;
}
