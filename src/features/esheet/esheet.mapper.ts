import type {
  ESheetInfoResult,
  ESheetInfoStepResponse,
  ESheetProcessRow,
  ESheetViewData,
} from './esheet.types';

function displayLotStatus(response: ESheetInfoResult): string {
  return response.STATUS === 'WAIT' && response.LOTRESUSER ? '예약' : response.STATUS;
}

function mapProcessRow(step: ESheetInfoStepResponse, index: number): ESheetProcessRow {
  const operationType = step.OPERATION.slice(0, 1).toUpperCase();

  return {
    id: `${step.OPERATION}:${step.SUBOPERATION}:${index}`,
    operation: step.OPERATION,
    subOperation: step.SUBOPERATION,
    operationType,
    name: step.PROCESSSTEP,
    c: step.COMMENTCNT || '–',
    i: step.INQTY || '–',
    isDcol: step.ISDCOL,
    o: step.OUTQTY || '–',
    description: step.SPEC,
    realRecipe: step.REALRECIPE,
    bay: step.BAY,
    actionType: step.ACTIONTYPE,
    current: step.ISCURRENT === 'Y',
    commentCount: step.COMMENTCNT,
    endTime: step.ENDTIME,
    lotStatus: '',
    operSequence: String(index + 1).padStart(4, '0'),
    facility: '',
    equipmentGroup: step.EQPGROUP,
  };
}

export function mapESheetInfo(response: ESheetInfoResult): ESheetViewData {
  const processRows = response.ESHEETITEMS.map(mapProcessRow);
  const currentProcess = processRows.find((row) => row.current);
  const currentStep = currentProcess
    ? response.ESHEETITEMS[processRows.indexOf(currentProcess)]
    : undefined;

  return {
    automotive: response.AUTOMOTIVEFLAG === 'Y',
    cutoff: response.CUTOFF,
    ...(currentProcess ? { currentProcessId: currentProcess.id } : {}),
    engineer: response.ENGR,
    engineerSecondary: response.ENGR2,
    equipmentGroup: currentStep?.EQPGROUP ?? '',
    facility: response.FACILITY,
    jobCode: response.PHOTOJOBCODE,
    lotQuantity: response.PRODUCTQUANTITY,
    lotStatus: displayLotStatus(response),
    lotType: response.PRIORITY,
    maintenanceItem: response.MAINTITEM,
    maskActionAvailable: response.RETICLELIST.length > 0,
    processCode: currentProcess?.bay ?? '',
    processRows: processRows.map((row) => ({
      ...row,
      lotStatus: response.STATUS,
      facility: response.FACILITY,
    })),
    product: response.PRODUCT,
    remainingLayers: response.REMAINLAYERS,
    tat: response.TAT,
  };
}
