import { describe, expect, it, vi } from 'vitest';

import { useRemoteXrfRecipe2 } from '../../../src/features/recipe-setting/composables/useRemoteXrfRecipeSet2';

describe('useRemoteXrfRecipe2', () => {
  it('should initialize states with default values', () => {
    const emitResult = vi.fn();
    const emitFinish = vi.fn();

    const composable = useRemoteXrfRecipe2({}, emitResult, emitFinish);

    expect(composable.spinnerItem.value).toBeUndefined();
    expect(composable.spinnerProdeqp.value).toBeUndefined();
    expect(composable.spinnerMds.value).toBeUndefined();
    expect(composable.spinnerPara.value).toBeUndefined();
    expect(composable.txtSlot.value).toBe('');
    expect(composable.txtRecipe.value).toBe('');
    expect(composable.mainEqpId.value).toBe('');
  });

  it('should populate txtRecipe with TEST RECIPE when spinner_para selection changes', () => {
    const emitResult = vi.fn();
    const emitFinish = vi.fn();

    const composable = useRemoteXrfRecipe2({}, emitResult, emitFinish);

    composable.onItemSelected('spinner_para', 'CH3');
    expect(composable.spinnerPara.value).toBe('CH3');
    expect(composable.txtRecipe.value).toBe('TEST RECIPE');
  });

  it('should not update txtRecipe if spinner_para selection is empty', () => {
    const emitResult = vi.fn();
    const emitFinish = vi.fn();

    const composable = useRemoteXrfRecipe2({}, emitResult, emitFinish);

    composable.onItemSelected('spinner_para', '');
    expect(composable.spinnerPara.value).toBe('');
    expect(composable.txtRecipe.value).toBe('');
  });

  it('should update selected values for other dropdowns', () => {
    const emitResult = vi.fn();
    const emitFinish = vi.fn();

    const composable = useRemoteXrfRecipe2({}, emitResult, emitFinish);

    composable.onItemSelected('spinner_item', '2010_계측기');
    expect(composable.spinnerItem.value).toBe('2010_계측기');

    composable.onItemSelected('spinner_prodeqp', '4M12-03');
    expect(composable.spinnerProdeqp.value).toBe('4M12-03');

    composable.onItemSelected('spinner_mds', 'Al 두께');
    expect(composable.spinnerMds.value).toBe('Al 두께');
  });

  it('should emit result payload and call finish on btn_save click', () => {
    const emitResult = vi.fn();
    const emitFinish = vi.fn();

    const composable = useRemoteXrfRecipe2({}, emitResult, emitFinish);
    composable.txtSlot.value = 'SLOT-01';
    composable.onItemSelected('spinner_prodeqp', '4M12-03');
    composable.onItemSelected('spinner_mds', 'MDS SAMPLE');
    composable.onItemSelected('spinner_para', 'CH4');

    composable.onSingleClick('btn_save');

    expect(emitResult).toHaveBeenCalledTimes(1);
    expect(emitResult).toHaveBeenCalledWith({
      PRODEQP: '4M12-03',
      SAMPLE: 'MDS SAMPLE',
      PARA: 'CH4',
      RECIPE: 'TEST RECIPE',
      SLOT: 'SLOT-01',
    });
    expect(emitFinish).toHaveBeenCalledTimes(1);
  });

  it('should emit finish without result on btn_cancel click', () => {
    const emitResult = vi.fn();
    const emitFinish = vi.fn();

    const composable = useRemoteXrfRecipe2({}, emitResult, emitFinish);

    composable.onSingleClick('btn_cancel');

    expect(emitResult).not.toHaveBeenCalled();
    expect(emitFinish).toHaveBeenCalledTimes(1);
  });

  it('should emit empty selections when saved before any dropdown is chosen', () => {
    const emitResult = vi.fn();
    const emitFinish = vi.fn();

    const composable = useRemoteXrfRecipe2({}, emitResult, emitFinish);

    composable.onSingleClick('btn_save');

    expect(emitResult).toHaveBeenCalledWith({
      PRODEQP: '',
      SAMPLE: '',
      PARA: '',
      RECIPE: '',
      SLOT: '',
    });
  });

  it('should ignore unrecognized button clicks', () => {
    const emitResult = vi.fn();
    const emitFinish = vi.fn();

    const composable = useRemoteXrfRecipe2({}, emitResult, emitFinish);

    composable.onSingleClick('unknown_button');

    expect(emitResult).not.toHaveBeenCalled();
    expect(emitFinish).not.toHaveBeenCalled();
  });
});
