import { mapESheetInfo } from 'src/features/esheet/esheet.mapper';
import type { ESheetInfoResult } from 'src/features/esheet/esheet.types';
import { describe, expect, it } from 'vitest';

const response: ESheetInfoResult = {
  AUTOMOTIVEFLAG: 'Y',
  CUTOFF: 'N',
  ENGR: 'PHOTO',
  ENGR2: '',
  FACTORYNAME: 'GUMI-FACTORY',
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
  PROCESSFLOWNAME: 'PHOTO-DEMO',
  SAFELAUNCHLOT: '',
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
      OPERTYPE: 'P',
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
      lotStatusCode: 'WAIT',
      lotStatusTone: 'wait',
      lotTypeTone: 'default',
      jobCodeTone: 'default',
      qTimeTarget: false,
      engineerSecondaryWarning: false,
      showLastLoggedOutTime: false,
      maskActionAvailable: true,
      processCode: 'BP04',
      factoryName: 'GUMI-FACTORY',
      routeName: 'PHOTO-DEMO',
      safeLaunch: false,
    });
    expect(result.processRows[0]).toMatchObject({
      c: '0',
      current: true,
      i: '',
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

  it('preserves secondary engineer and automotive safe-launch state', () => {
    const result = mapESheetInfo({
      ...response,
      ENGR2: 'ENGR-SECONDARY',
      SAFELAUNCHLOT: 'SAFE-LOT',
    });

    expect(result).toMatchObject({
      automotive: true,
      safeLaunch: true,
      engineer: 'PHOTO',
      engineerSecondary: 'ENGR-SECONDARY',
    });
  });

  it('preserves legacy row-state styling when comments override only the main cells', () => {
    const mapRow = (overrides: Partial<ESheetInfoResult['ESHEETITEMS'][number]>) =>
      mapESheetInfo({
        ...response,
        ESHEETITEMS: [{ ...response.ESHEETITEMS[0], ...overrides }],
      }).processRows[0].rowClass;

    expect(mapRow({ COMMENTCNT: '1', ACTIONTYPE: 'HOLD' })).toBe(
      'esheet-process-row--hold esheet-process-row--comment',
    );
    expect(mapRow({ ACTIONTYPE: 'HOLD' })).toBe('esheet-process-row--hold');
    expect(mapRow({ ACTIONTYPE: 'SKIP' })).toBe('esheet-process-row--skip');
    expect(mapRow({ OPERTYPE: 'S' })).toBe('esheet-process-row--completed');
    expect(mapRow({ OPERTYPE: 'X' })).toBe('esheet-process-row--other');
    // Android reads OPERTYPE only; the P prefix of OPERATION does not make the row a P step.
    expect(mapRow({ OPERATION: 'P00001', OPERTYPE: '' })).toBe('esheet-process-row--other');
    expect(mapRow({ ISCURRENT: 'Y' })).toBe('esheet-process-row--current');
    expect(mapRow({ ISCURRENT: 'N' })).toBe('esheet-process-row--upcoming');
  });

  it('maps legacy Q-time, CESC, rework, job-code, and metrology states', () => {
    const result = mapESheetInfo({
      ...response,
      CESC: 'Y',
      LASTLOGGEDOUTTIME: '2026-10-23 08:30',
      LOTPROCESSSTATE: 'WAIT',
      LOTRESUSER: '',
      MAINTITEM: '긴급',
      PROCESSOPERATIONTYPE: 'Metrology',
      PRIORITY: 'H1',
      QTIMECHECK: 'Y',
      REWORK_BACKCOL: 'REWORK',
    });

    expect(result).toMatchObject({
      engineerSecondaryWarning: true,
      jobCodeTone: 'orange',
      lastLoggedOutTime: '2026-10-23 08:30',
      lotStatusCode: 'WAIT',
      lotStatusTone: 'rework',
      lotTypeTone: 'yellow',
      qTimeTarget: true,
      showLastLoggedOutTime: true,
    });
  });

  it('maps the current-process fields of a LOT that is not moved in, with GoldenPath', () => {
    const result = mapESheetInfo({ ...response, GOLDENPATHEQP: 'EQP-LIMIT-01' });

    expect(result.currentProcessSummary).toEqual({
      bay: 'BP04',
      operationName: 'BARC COATING',
      moveInTime: '',
      realRecipe: '',
      recipe: 'BEWH-K69-76-B81',
      machine: 'PHOTO',
      recipeDetails: 'BEWH-K69-76-B81',
      machineDetails: 'PHOTO\n\nGoldenPath 제한장비\nEQP-LIMIT-01',
    });
  });

  it('shows the running equipment and no recipe or dialogs once the LOT is moved in', () => {
    const result = mapESheetInfo({
      ...response,
      ESHEETITEMS: response.ESHEETITEMS.map((step) => ({
        ...step,
        REALEQPID: 'EQP-01',
        REALRECIPE: 'RCP-THK-01',
        STARTTIME: '2026-09-15 10:30:00',
      })),
    });

    expect(result.currentProcessSummary).toMatchObject({
      moveInTime: '2026-09-15 10:30:00',
      realRecipe: 'RCP-THK-01',
      recipe: '',
      machine: 'EQP-01',
      recipeDetails: '',
      machineDetails: '',
    });
  });

  it('shows the last logout time in the machine field for a Metrology WAIT LOT', () => {
    const result = mapESheetInfo({
      ...response,
      LASTLOGGEDOUTTIME: '2026-10-23 08:30',
      LOTPROCESSSTATE: 'WAIT',
      PROCESSOPERATIONTYPE: 'Metrology',
    });

    expect(result.currentProcessSummary).toMatchObject({
      machine: '2026-10-23 08:30',
      machineDetails: 'PHOTO',
    });
  });

  it('leaves the current-process fields blank without a current row', () => {
    const result = mapESheetInfo({
      ...response,
      ESHEETITEMS: response.ESHEETITEMS.map((step) => ({ ...step, ISCURRENT: 'N' })),
    });

    expect(Object.values(result.currentProcessSummary).every((value) => value === '')).toBe(true);
  });

  it('shows changed recipe and equipment-group values while retaining the legacy row values', () => {
    const result = mapESheetInfo({
      ...response,
      ESHEETITEMS: [
        {
          ...response.ESHEETITEMS[0],
          CHANGEEQPGROUP: 'EQP-NEW',
          CHANGERECIPE: 'RCP-NEW',
        },
      ],
    });

    expect(result.processRows[0]).toMatchObject({
      equipmentGroup: 'EQP-NEW',
      equipmentGroupChanged: true,
      recipe: 'RCP-NEW',
      recipeChanged: true,
    });
  });

  it('treats legacy N change markers as no recipe or equipment-group override', () => {
    const result = mapESheetInfo({
      ...response,
      ESHEETITEMS: [
        {
          ...response.ESHEETITEMS[0],
          CHANGEEQPGROUP: 'N',
          CHANGERECIPE: 'N',
          EQPGROUP: 'EQP-01',
          RECIPE: 'RCP-01',
        },
      ],
    });

    expect(result.processRows[0]).toMatchObject({
      equipmentGroup: 'EQP-01',
      equipmentGroupChanged: false,
      recipe: 'RCP-01',
      recipeChanged: false,
    });
  });
});
