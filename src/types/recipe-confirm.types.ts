export interface RecipeConfirmDialogProps {
  /**
   * Dialog visibility (v-model)
   */
  modelValue: boolean;

  /**
   * Recipe name or skip message text
   */
  recipe: string;

  /**
   * LOT No (Run No) - optional in skip mode
   */
  lotId?: string;

  /**
   * Skip flag ("OK" for DiCycle skip mode, empty/undefined for normal recipe confirm)
   */
  skip?: string;

  /**
   * Edge far indicator flag ("Y" to display red EDGE FAR badge, "N" or undefined otherwise)
   */
  edgeFar?: string;

  /**
   * Whether hardware Back or Escape triggers confirm (true, matching legacy HiFOS behavior)
   * or cancel (false, safe web default). Defaults to false.
   */
  legacyBackBehavior?: boolean;
}

export interface RecipeConfirmDialogEmits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}
