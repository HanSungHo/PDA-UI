import type { RemoteCvdMessageBody } from '../types/remote-cvd.types';

export interface RemoteCvdChamberValue {
  name: 'A' | 'B' | 'C' | 'D';
  value: string;
  limit: string;
}

export function mapRecipeOptions(
  messageBody: RemoteCvdMessageBody,
  equipmentType: string,
  equipmentId: string,
  scrubber: string,
  customer: string,
): string[] {
  const recipe = messageBody.RECIPE ?? '';
  const downChannels = messageBody.DOWN_CH ?? '';
  let separatorIndex = -1;
  let recipeHead = '';
  let recipeTail = recipe;

  switch (equipmentType) {
    case 'OMEGA RAPIER':
      separatorIndex = recipe.lastIndexOf('-');
      break;
    case 'DFM':
      separatorIndex = recipe.lastIndexOf('_');
      break;
    case 'UNITY-II':
      separatorIndex = recipe.lastIndexOf('+');
      break;
    case 'ALTUS': {
      const commaIndex = recipe.indexOf(',');
      const altusRecipe = recipe.substring(0, commaIndex > 0 ? commaIndex : 0);
      const suffixStart = Math.max(altusRecipe.length - 2, 0);
      if (recipe.substring(suffixStart, altusRecipe.length) === 'AB') {
        separatorIndex = commaIndex - 3;
        recipeHead = recipe.substring(0, commaIndex - 2);
        recipeTail = recipe.substring(commaIndex - 2);
      } else {
        separatorIndex = recipe.lastIndexOf(':');
      }
      break;
    }
    default:
      separatorIndex = recipe.lastIndexOf(':');
  }

  if (equipmentType !== 'ALTUS' || !recipeHead) {
    recipeHead = recipe.substring(0, separatorIndex + 1);
    recipeTail = recipe.substring(separatorIndex + 1);
  }

  if (equipmentType === 'SEQUEL' || equipmentType === 'CONCEPT2-SEQUEL') {
    recipeTail = recipeTail
      .split(',')
      .filter((part) => !(equipmentId.endsWith('A') && part === 'B'))
      .filter((part) => !(equipmentId.endsWith('B') && part === 'A'))
      .join(',');
  } else if (equipmentId.startsWith('EC04-1') || equipmentId.startsWith('EC04-2')) {
    recipeTail = recipeTail
      .split(',')
      .filter((part) => !(equipmentId.endsWith('A') && part !== 'A'))
      .filter((part) => !(equipmentId.endsWith('B') && part !== 'B'))
      .join(',');
  } else if (equipmentId === 'B01-02' || equipmentId === 'B01-03') {
    recipeTail = recipeTail
      .split(',')
      .filter((part) => !(['1', '2'].includes(scrubber) && part !== 'A'))
      .filter((part) => !(['3', '4'].includes(scrubber) && part !== 'B'))
      .join(',');
  } else if (equipmentType === 'UVAS') {
    recipeTail = recipeTail
      .split(',')
      .map((part) => {
        const withoutParenthetical = part.substring(
          0,
          part.lastIndexOf('(') > -1 ? part.lastIndexOf('(') : part.length,
        );
        return withoutParenthetical.startsWith('#0')
          ? withoutParenthetical.replace('#0', '')
          : withoutParenthetical.replace('#', '');
      })
      .join(',');
  }

  let recipeParts = recipeTail.split(',');
  if (downChannels) {
    recipeParts = recipeParts.filter((part) => {
      for (const down of downChannels.split(',')) {
        if (equipmentType === 'HPT') {
          const underscore = part.lastIndexOf('_');
          const suffix = part.substring(underscore + 1);
          if (suffix.includes(down)) return false;
        } else if (part.includes(down) && separatorIndex > 0) {
          return false;
        }
      }
      return true;
    });
  }

  let recipes = recipeParts.map((part) => `${recipeHead}${part}`);

  if (equipmentType === 'MBB730') {
    recipes = recipes.flatMap((recipeName) => {
      const lastParen = recipeName.lastIndexOf(')');
      const productionRecipe = recipeName.substring(lastParen + 1);
      return [`PRO_${productionRecipe}`, productionRecipe];
    });
  }

  if (
    ['HPT', 'CENTURA5200 MXP', 'eMAX CT', 'DPS METAL', 'DPS POLY'].includes(equipmentType) ||
    (equipmentType === 'UNITY-II' &&
      !['MPS Inc', 'Renesas Electronics Operations', 'Renesas Design Bingen GmbH'].includes(
        customer,
      ))
  ) {
    recipes = recipes.sort((left, right) => right.length - left.length);
  }

  return recipes;
}

export function mapChamberValues(messageBody: RemoteCvdMessageBody): RemoteCvdChamberValue[] {
  return (['A', 'B', 'C', 'D'] as const).map((name, index) => ({
    name,
    value: messageBody[`PARA${index + 1}`] ?? '',
    limit: messageBody[`PARA${index + 1}_LIMIT`] ?? '',
  }));
}

export function getChamberStatusClass(limit: string): string {
  switch (limit) {
    case 'OVER':
      return 'over';
    case 'N90':
      return 'warning';
    case 'N80':
      return 'normal';
    default:
      return '';
  }
}

export function getPortStateClass(portState: string): string {
  switch (portState) {
    case 'RUN':
      return 'run';
    case 'PENDING':
      return 'pending';
    case 'READY':
      return 'ready';
    case 'RESERVED':
      return 'reserved';
    case 'COMPLETE':
      return 'complete';
    case 'IDLE':
      return 'idle';
    default:
      return '';
  }
}

export function validateEquipmentGroup(equipmentGroup: string, equipmentId: string): boolean {
  if (!equipmentId) return false;
  if (equipmentGroup && !equipmentGroup.includes('-')) return true;

  const lastHyphen = equipmentId.lastIndexOf('-');
  if (lastHyphen < 0) return false;
  const prefix = equipmentId.substring(0, lastHyphen);
  const machineNumber = equipmentId.substring(lastHyphen + 1);

  for (const group of equipmentGroup.split('|')) {
    if (!group.includes(prefix)) continue;

    let machineList = group.substring(group.indexOf(prefix) + prefix.length);
    machineList = machineList.substring(1);
    if (machineList.includes(prefix)) {
      if (validateEquipmentGroup(machineList, equipmentId)) return true;
    }
    if (machineList.includes('-')) {
      machineList = machineList.substring(0, machineList.indexOf('-'));
      machineList = machineList.substring(0, machineList.lastIndexOf(','));
    }

    for (const candidate of machineList.split(',')) {
      const range = candidate.split('~');
      if (
        range.length === 2 &&
        isMachineNumberInRange(machineNumber, range[0] ?? '', range[1] ?? '')
      ) {
        return true;
      }
      if (range.length === 1 && machineNumbersEqual(machineNumber, candidate)) return true;
    }
  }

  return false;
}

function numericMachineNumber(value: string): number | null {
  const digits = value.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : null;
}

function machineNumbersEqual(left: string, right: string): boolean {
  const leftNumber = numericMachineNumber(left);
  const rightNumber = numericMachineNumber(right);
  if (leftNumber !== null && rightNumber !== null) return leftNumber === rightNumber;
  return left.length === 1 && right.length === 1 && left === right;
}

function isMachineNumberInRange(value: string, start: string, end: string): boolean {
  const number = numericMachineNumber(value);
  const startNumber = numericMachineNumber(start);
  const endNumber = numericMachineNumber(end);
  if (number !== null && startNumber !== null && endNumber !== null) {
    return number >= startNumber && number <= endNumber;
  }

  return (
    value.length === 1 && start.length === 1 && end.length === 1 && value >= start && value <= end
  );
}
