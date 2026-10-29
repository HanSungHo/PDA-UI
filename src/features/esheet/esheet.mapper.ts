import type {
  ESheetCurrentProcessSummary,
  ESheetInfoResult,
  ESheetInfoStepResponse,
  ESheetProcessRow,
  ESheetViewData,
} from './esheet.types';

function displayLotStatus(response: ESheetInfoResult): string {
  return response.STATUS === 'WAIT' && response.LOTRESUSER ? '예약' : response.STATUS;
}

function displayDescription(step: ESheetInfoStepResponse): string {
  if (step.ACTIONTYPE === 'HOLD') {
    return [step.SPEC, step.FUTUREACTIONDESC].filter(Boolean).join(' ▶ ');
  }
  if (step.ACTIONTYPE === 'SKIP') return 'Engr 에 의해서 공정이 Skip 되었습니다.';
  return step.SPEC;
}

function rowStateClass(step: ESheetInfoStepResponse, operationType: string): string {
  if (step.ACTIONTYPE === 'HOLD') return 'esheet-process-row--hold';
  if (step.ACTIONTYPE === 'SKIP') return 'esheet-process-row--skip';
  if (operationType === 'S' || operationType === 'C') return 'esheet-process-row--completed';
  if (operationType !== 'P' && operationType !== 'M') return 'esheet-process-row--other';
  return step.ISCURRENT === 'Y' ? 'esheet-process-row--current' : 'esheet-process-row--upcoming';
}

function rowClass(step: ESheetInfoStepResponse, operationType: string): string {
  const classes = [rowStateClass(step, operationType)];
  if (step.COMMENTCNT && step.COMMENTCNT !== '0') {
    classes.push('esheet-process-row--comment');
  }
  return classes.join(' ');
}

function lotTypeTone(priority: string): ESheetViewData['lotTypeTone'] {
  if (['PS', 'PH', 'PH1', 'PH2', 'PN'].includes(priority)) return 'green';
  if (priority === 'S') return 'orange';
  if (priority === 'H' || priority === 'H1') return 'yellow';
  if (priority === 'H2') return 'cyan';
  return 'default';
}

function lotStatusTone(status: string, reworkBackColor: string): ESheetViewData['lotStatusTone'] {
  if (reworkBackColor === 'REWORK') return 'rework';
  if (status === 'HOLD') return 'hold';
  if (status === 'RUN') return 'run';
  if (status === 'WAIT') return 'wait';
  return 'default';
}

function jobCodeTone(maintenanceItem: string): ESheetViewData['jobCodeTone'] {
  if (maintenanceItem.includes('매출') || maintenanceItem.includes('물량')) return 'green';
  if (maintenanceItem.includes('긴급')) return 'orange';
  if (maintenanceItem.includes('CODE FIX')) return 'cyan';
  return 'default';
}

function mapProcessRow(step: ESheetInfoStepResponse, index: number): ESheetProcessRow {
  // ESheetActivity reads OPERTYPE as returned; OPERATION is not used to infer the type.
  const operationType = step.OPERTYPE;
  const recipeOverride = step.CHANGERECIPE && step.CHANGERECIPE !== 'N' ? step.CHANGERECIPE : '';
  const equipmentGroupOverride =
    step.CHANGEEQPGROUP && step.CHANGEEQPGROUP !== 'N' ? step.CHANGEEQPGROUP : '';
  const recipeChanged = Boolean(recipeOverride && recipeOverride !== step.RECIPE);
  const equipmentGroupChanged = Boolean(
    equipmentGroupOverride && equipmentGroupOverride !== step.EQPGROUP,
  );
  const processName = step.CPN === 'Y' ? `★${step.PROCESSSTEP}` : step.PROCESSSTEP;

  return {
    id: `${step.OPERATION}:${step.SUBOPERATION}:${index}`,
    operation: step.OPERATION,
    operationNumber: step.OPERATION,
    subOperation: step.SUBOPERATION,
    subOperationNumber: step.SUBOPERATION,
    operationType,
    name: step.PROCESSSTEP,
    displayName: processName,
    c: step.COMMENTCNT,
    i: step.INQTY,
    isDcol: step.ISDCOL,
    o: step.OUTQTY,
    description: displayDescription(step),
    realRecipe: step.REALRECIPE,
    realEquipmentId: step.REALEQPID,
    realReticle: step.REALRETICLE,
    recipe: recipeChanged ? recipeOverride : step.RECIPE,
    recipeChanged,
    equipmentGroupChanged,
    isRework: step.ISREWORK,
    bay: step.BAY,
    actionType: step.ACTIONTYPE,
    current: step.ISCURRENT === 'Y',
    commentCount: step.COMMENTCNT,
    endTime: step.ENDTIME,
    lotStatus: '',
    operSequence: step.OPERSEQUENCE || String(index + 1).padStart(4, '0'),
    inOperationName: step.INOPERNAME,
    outOperationName: step.OUTOPERNAME,
    startTime: step.STARTTIME,
    futureActionDescription: step.FUTUREACTIONDESC,
    facility: '',
    equipmentGroup: equipmentGroupChanged ? equipmentGroupOverride : step.EQPGROUP,
    rowClass: rowClass(step, operationType),
  };
}

// ESheetActivity sets these fields while building the current row: a moved-in LOT shows the
// running equipment and no recipe or dialogs; Metrology WAIT shows LASTLOGGEDOUTTIME instead.
function mapCurrentProcessSummary(
  row: ESheetProcessRow | undefined,
  response: ESheetInfoResult,
  showLastLoggedOutTime: boolean,
): ESheetCurrentProcessSummary {
  const movedIn = Boolean(row?.startTime);
  const goldenEquipment = response.GOLDENPATHEQP ?? '';
  const equipmentGroup = row?.equipmentGroup ?? '';
  const machine = movedIn ? (row?.realEquipmentId ?? '') : equipmentGroup;

  return {
    bay: row?.bay ?? '',
    operationName: row?.displayName ?? '',
    moveInTime: row?.startTime ?? '',
    realRecipe: row?.realRecipe ?? '',
    recipe: movedIn ? '' : (row?.recipe ?? ''),
    machine: showLastLoggedOutTime ? (response.LASTLOGGEDOUTTIME ?? '') : machine,
    recipeDetails: movedIn ? '' : (row?.recipe ?? ''),
    machineDetails:
      movedIn || !row
        ? ''
        : `${equipmentGroup}${goldenEquipment ? `\n\nGoldenPath 제한장비\n${goldenEquipment}` : ''}`,
  };
}

export function mapESheetInfo(response: ESheetInfoResult): ESheetViewData {
  const processRows = response.ESHEETITEMS.map(mapProcessRow);
  const currentProcess = processRows.find((row) => row.current);
  const currentStep = currentProcess
    ? response.ESHEETITEMS[processRows.indexOf(currentProcess)]
    : undefined;
  const lotStatus = response.STATUS;
  const maintenanceItem = response.MAINTITEM;
  const reworkBackColor = response.REWORK_BACKCOL ?? '';
  const showLastLoggedOutTime =
    response.PROCESSOPERATIONTYPE === 'Metrology' && response.LOTPROCESSSTATE === 'WAIT';

  return {
    automotive: response.AUTOMOTIVEFLAG === 'Y',
    cutoff: response.CUTOFF,
    ...(currentProcess ? { currentProcessId: currentProcess.id } : {}),
    currentProcessSummary: mapCurrentProcessSummary(
      currentProcess,
      response,
      showLastLoggedOutTime,
    ),
    engineer: response.ENGR,
    engineerSecondary: response.ENGR2,
    engineerSecondaryWarning: lotStatus === 'WAIT' && Boolean(response.CESC),
    equipmentGroup: currentProcess?.equipmentGroup ?? currentStep?.EQPGROUP ?? '',
    facility: response.FACILITY,
    factoryName: response.FACTORYNAME ?? response.FACILITY,
    jobCode: response.PHOTOJOBCODE,
    jobCodeTone: jobCodeTone(maintenanceItem),
    lotQuantity: response.PRODUCTQUANTITY,
    lotStatus: displayLotStatus(response),
    lotStatusCode: lotStatus,
    lotStatusTone: lotStatusTone(lotStatus, reworkBackColor),
    lotType: response.PRIORITY,
    lotTypeTone: lotTypeTone(response.PRIORITY),
    maintenanceItem,
    qTimeTarget: Boolean(response.QTIMECHECK),
    showLastLoggedOutTime,
    lastLoggedOutTime: response.LASTLOGGEDOUTTIME ?? '',
    reworkBackColor,
    maskActionAvailable: response.RETICLELIST.length > 0,
    processCode: currentProcess?.bay ?? '',
    routeName: response.PROCESSFLOWNAME ?? '',
    processRows: processRows.map((row) => ({
      ...row,
      lotStatus: response.STATUS,
      facility: response.FACILITY,
    })),
    product: response.PRODUCT,
    holdComment: response.HOLD_COMMENT ?? '',
    reticleList: response.RETICLELIST,
    remainingLayers: response.REMAINLAYERS,
    rootLotName: response.ROOTLOTNAME ?? '',
    tat: response.TAT,
    goldenEquipment: response.GOLDENPATHEQP ?? '',
    safeLaunch: response.AUTOMOTIVEFLAG === 'Y' && Boolean(response.SAFELAUNCHLOT),
  };
}
