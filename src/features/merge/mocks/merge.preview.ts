import type { MergeLotInfo } from '../services/merge.service';

export const previewMergeLotId = 'LOT-A260915-018';

export function createPreviewMergeInfo(): MergeLotInfo {
  const row = {
    PRODUCTSPECNAME: 'PRODUCT-A',
    PROCESSFLOWNAME: 'ROUTE-01',
    OPERATIONDESCRIPTION: 'ETCH DESC',
    PROCESSOPERATIONNAME: '1100',
    JOBCODE: 'JOB-01',
  };

  return {
    AREA: 'ETCH',
    LOTHOLDSTATE: 'N',
    PROCESSOPERATIONNAME: row.PROCESSOPERATIONNAME,
    OPERATIONDESCRIPTION: row.OPERATIONDESCRIPTION,
    PRODUCTSPECNAME: row.PRODUCTSPECNAME,
    PRODUCTQUANTITY: '25',
    REWORKSTATE: 'N',
    PROCESSFLOWNAME: row.PROCESSFLOWNAME,
    CHECKMFGGROUP2: '',
    CHILDLOT: '',
    items: [
      { ...row, LOTNAME: 'LOT-A260915-019', PRODUCTQUANTITY: '12' },
      { ...row, LOTNAME: 'LOT-A260915-020', PRODUCTQUANTITY: '13' },
      { ...row, LOTNAME: 'LOT-A260915-021', PRODUCTQUANTITY: '8' },
      { ...row, LOTNAME: 'LOT-A260915-022', PRODUCTQUANTITY: '10' },
      { ...row, LOTNAME: 'LOT-A260915-023', PRODUCTQUANTITY: '6' },
    ],
  };
}

export function executePreviewMerge(): { FAILLOTNAME: string; SUCCESS: string } {
  return { SUCCESS: 'Y', FAILLOTNAME: '' };
}
