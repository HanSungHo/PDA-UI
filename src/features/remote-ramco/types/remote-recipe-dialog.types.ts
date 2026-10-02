export interface RemoteRecipeDialogProps {
  /**
   * Dialog visibility (v-model)
   */
  modelValue: boolean;

  /**
   * Recipe list text to display (RECIPE_LIST param from legacy)
   */
  recipeList: string;

  /**
   * LOT No / Run No. When empty, the "Selected Run No" row is hidden entirely.
   * Mirrors legacy: if LOT_NO is empty, txtSelectLot and txtLotNo are set to GONE.
   */
  lotNo?: string;

  /**
   * Whether hardware Back or Escape triggers confirm (true, matching legacy HiFOS behavior)
   * or cancel (false, safe web default). Defaults to true to match legacy RemoteRecipeDialog.
   */
  legacyBackBehavior?: boolean;
}

export interface RemoteRecipeDialogEmits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}
