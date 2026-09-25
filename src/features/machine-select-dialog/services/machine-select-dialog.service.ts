import type {
  MachineSelectRealEqpRequest,
  MachineSelectRealEqpResult,
  MachineSelectRecipeInfoRequest,
  MachineSelectRecipeInfoResult,
} from '../types/machine-select-dialog.types';

export async function fetchMachineSelectRealEqp(
  request: MachineSelectRealEqpRequest,
): Promise<MachineSelectRealEqpResult> {
  await Promise.resolve();

  return { ok: true, eqpId: request.eqpId.trim().toUpperCase() };
}

export async function fetchMachineSelectRecipeInfo(
  request: MachineSelectRecipeInfoRequest,
): Promise<MachineSelectRecipeInfoResult> {
  await Promise.resolve();

  return { ok: true, recipe: request.eqpId ? `${request.eqpId}-RCP` : '' };
}
