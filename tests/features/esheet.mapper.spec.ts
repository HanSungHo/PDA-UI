import { mapESheetInfo } from 'src/features/esheet/esheet.mapper';
import type { ESheetInfoResult } from 'src/features/esheet/esheet.types';
import { describe, expect, it } from 'vitest';

const response: ESheetInfoResult = {
  AUTOMOTIVEFLAG: 'Y',
  CUTOFF: 'N',
  ENGR: 'PHOTO',
  ENGR2: '',
  FACILITY: 'GUMI',
  LOTRESUSER: 'operator',
  MAINTITEM: '',
  PHOTOJOBCODE: '20151115',
  PRIORITY: 'NORMAL',
  PRODUCT: 'P-DM-TEST-6F',
  PRODUCTQUANTITY: '25',
  REMAINLAYERS: '4P02-51,52',
  RETICLELIST: 'MASK-1',
  STATUS: 'WAIT',
  TAT: '-3903.4',
  ESHEETITEMS: [
    {
      ACTIONTYPE: '',
      BAY: 'BP04',
      COMMENTCNT: '0',
      ENDTIME: '',
      EQPGROUP: 'PHOTO',
      FUTUREACTIONDESC: '',
      INOPERNAME: '',
      INQTY: '',
      ISCURRENT: 'Y',
      ISDCOL: 'N',
      ISREWORK: 'N',
      OPERATION: 'P00001',
      OUTOPERNAME: '',
      OUTQTY: '',
      PROCESSSTEP: 'BARC COATING',
      REALEQPID: '',
      REALRECIPE: '',
      REALRETICLE: '',
      RECIPE: 'BEWH-K69-76-B81',
      SPEC: 'BEWH-K69-76-B81',
      STARTTIME: '',
      SUBOPERATION: '00',
    },
  ],
};

describe('mapESheetInfo', () => {
  it('maps the legacy-aligned response into the eSheet view model', () => {
    const result = mapESheetInfo(response);

    expect(result).toMatchObject({
      automotive: true,
      currentProcessId: 'P00001:00:0',
      equipmentGroup: 'PHOTO',
      jobCode: '20151115',
      lotStatus: '예약',
      maskActionAvailable: true,
      processCode: 'BP04',
    });
    expect(result.processRows[0]).toMatchObject({
      c: '0',
      current: true,
      i: '–',
      name: 'BARC COATING',
      operationType: 'P',
    });
  });

  it('does not select a process when the response has no current row', () => {
    const result = mapESheetInfo({
      ...response,
      LOTRESUSER: '',
      RETICLELIST: '',
      STATUS: 'HOLD',
      ESHEETITEMS: response.ESHEETITEMS.map((step) => ({ ...step, ISCURRENT: 'N' })),
    });

    expect(result.currentProcessId).toBeUndefined();
    expect(result.lotStatus).toBe('HOLD');
    expect(result.maskActionAvailable).toBe(false);
    expect(result.processCode).toBe('');
  });

  it('preserves the legacy D-column flag and recipe for EDC navigation', () => {
    const result = mapESheetInfo({
      ...response,
      ESHEETITEMS: response.ESHEETITEMS.map((step) => ({
        ...step,
        ISDCOL: 'Y',
        REALRECIPE: 'RCP-EDC-01',
      })),
    });

    expect(result.processRows[0]).toMatchObject({ isDcol: 'Y', realRecipe: 'RCP-EDC-01' });
  });
});
