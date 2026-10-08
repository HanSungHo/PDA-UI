import type { Component } from 'vue';

/**
 * Props for {@link BaseChip}.
 *
 * Visual reference: chip.html (Base Component → Chips)
 *
 * BaseChip is a toggle control modeled after the Chips pattern in material design.
 * It displays a compact button with optional icon(s), supporting selection state
 * via v-model and aria-pressed.
 *
 * Design is based on ATSOP26 tokens and matches chip.html specification exactly.
 */
export interface BaseChipProps {
  /**
   * Current checked/selected state. Bind with `v-model`.
   * (This is NOT QChip's `modelValue`, which only controls visibility.)
   */
  modelValue?: boolean | undefined;

  /** Size variant. */
  size?: 'small' | 'medium' | undefined;

  /** Main label text. */
  label?: string | undefined;

  /** Whether the chip is disabled. */
  disabled?: boolean | undefined;

  /** Icon component/SVG before the label. */
  beforeIcon?: Component | undefined;

  /** Icon component/SVG after the label. */
  afterIcon?: Component | undefined;
}

/** Emits for {@link BaseChip}. */
export interface BaseChipEmits {
  'update:modelValue': [value: boolean];
  click: [event: MouseEvent];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}

/**
 * @deprecated Use {@link BaseChipProps} instead.
 * Kept for backwards compatibility with existing tag-based API.
 */
export type BaseChipColor = 'pink' | 'red' | 'green' | 'orange' | 'cyan' | 'purple' | 'blue';

/**
 * @deprecated Use {@link BaseChipProps} instead.
 * Kept for backwards compatibility with existing tag-based API.
 */
export interface BaseChipProps {
  text?: string | undefined;
  icon?: Component | undefined;
  color?: BaseChipColor | undefined;
  bordered?: boolean | undefined;
}
