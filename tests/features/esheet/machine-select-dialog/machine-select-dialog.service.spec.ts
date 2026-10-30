import {
  fetchMachineSelectRealEqp,
  fetchMachineSelectRecipeInfo,
} from 'src/features/machine-select-dialog/services/machine-select-dialog.service';
import { describe, expect, it } from 'vitest';

const recipeRequest = {
  lotId: 'LOT-1',
  operation: 'OPER',
  subOperation: '010',
  product: 'PRODUCT-A',
  facility: 'KFAB',
};

describe('machine select dialog service', () => {
  it('returns the trimmed, upper-cased equipment id as the real equipment', async () => {
    await expect(
      fetchMachineSelectRealEqp({ facility: 'KFAB', eqpId: ' eqp-01 ' }),
    ).resolves.toEqual({ ok: true, eqpId: 'EQP-01' });
  });

  it('builds the recipe from the equipment id', async () => {
    await expect(
      fetchMachineSelectRecipeInfo({ ...recipeRequest, eqpId: 'EQP-01' }),
    ).resolves.toEqual({ ok: true, recipe: 'EQP-01-RCP' });
  });

  it('returns an empty recipe when no equipment id is given', async () => {
    await expect(fetchMachineSelectRecipeInfo({ ...recipeRequest, eqpId: '' })).resolves.toEqual({
      ok: true,
      recipe: '',
    });
  });
});
