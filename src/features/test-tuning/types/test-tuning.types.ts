export type ScreenMode = 'TEST' | 'TUNING';

export interface CvdTestMainInfoResult {
  ok: boolean;
  rcpGroup?: string;
  message?: string;
}

export interface CvdTestSubInfoResult {
  ok: boolean;
  subId?: string;
  message?: string;
}

export interface TestGridRow {
  SLOT?: string;
  RECIPE?: string;
  CHAMBER?: string;
  MEAS_RECIPE?: string;
}

export interface TuningGridRow {
  PROD_RCP?: string;
  CHAM_STEP?: string;
  BE_TIME?: string;
  AF_TIME?: string;
}

export type GridRowData = TestGridRow | TuningGridRow;

export interface CvdTestBodyInfoResult {
  ok: boolean;
  lotId?: string;
  body?: GridRowData[];
  message?: string;
}

export interface DropdownItem {
  label: string;
  value: string;
}

export interface RevoGridColumn {
  prop: string;
  name: string;
  size?: number;
  cellAlign?: 'left' | 'center' | 'right';
  cellProperties?: () => {
    style?: Record<string, string>;
    class?: Record<string, boolean>;
  };
}
