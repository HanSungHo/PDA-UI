/**
 * Equipment validation utility matching legacy Android ValidateCheck.equipment behavior.
 */

function toNumber(value: string): number | undefined {
  const numericValue = value.replace(/\D/g, '');
  return numericValue ? Number(numericValue) : undefined;
}

function isMachineNumberInRange(machineNumber: string, start: string, end?: string): boolean {
  if (!end) {
    return false;
  }

  const machineNumberValue = toNumber(machineNumber);
  const startValue = toNumber(start);
  const endValue = toNumber(end);

  if (machineNumberValue === undefined && startValue === undefined) {
    const valueChar = machineNumber.charCodeAt(0);
    return valueChar >= start.charCodeAt(0) && valueChar <= end.charCodeAt(0);
  }

  return (
    machineNumberValue !== undefined &&
    startValue !== undefined &&
    endValue !== undefined &&
    machineNumberValue >= startValue &&
    machineNumberValue <= endValue
  );
}

function validateMachineNumberGroup(machineNumberGroup: string, machineNumber: string): boolean {
  if (machineNumberGroup.includes('~')) {
    const [start, end] = machineNumberGroup.split('~');
    return isMachineNumberInRange(machineNumber, start, end);
  }

  const machineNumberValue = toNumber(machineNumber);
  const groupValue = toNumber(machineNumberGroup);

  if (machineNumberValue === undefined && groupValue === undefined) {
    return machineNumber.charCodeAt(0) === machineNumberGroup.charCodeAt(0);
  }

  return machineNumberValue !== undefined && machineNumberValue === groupValue;
}

/**
 * Validates whether a machine name matches the standard equipment list specification.
 * Corresponds to legacy Android ValidateCheck.equipmentValidate logic.
 */
export function validateEquipment(eqpListString: string, machineName: string): boolean {
  if (!machineName) {
    return false;
  }

  if (eqpListString && !eqpListString.includes('-')) {
    return true;
  }

  const machineNameSeparator = machineName.lastIndexOf('-');
  if (machineNameSeparator < 0) {
    return false;
  }

  const preMachineName = machineName.substring(0, machineNameSeparator);
  const machineNumber = machineName.substring(machineNameSeparator + 1);
  let machineList = '';

  for (const eqpGroup of eqpListString.split('|')) {
    if (!eqpGroup.includes(preMachineName)) {
      continue;
    }

    let tmpMachineList = eqpGroup.substring(
      eqpGroup.indexOf(preMachineName) + preMachineName.length,
    );
    tmpMachineList = tmpMachineList.substring(1);

    if (tmpMachineList.includes(preMachineName) && validateEquipment(tmpMachineList, machineName)) {
      return true;
    }

    if (tmpMachineList.includes('-')) {
      tmpMachineList = tmpMachineList.substring(0, tmpMachineList.indexOf('-'));
      tmpMachineList = tmpMachineList.substring(0, tmpMachineList.lastIndexOf(','));
    }

    machineList = machineList ? `${machineList},${tmpMachineList}` : tmpMachineList;
  }

  if (!machineList) {
    return false;
  }

  return machineList
    .split(',')
    .some((machineNumberGroup) => validateMachineNumberGroup(machineNumberGroup, machineNumber));
}
