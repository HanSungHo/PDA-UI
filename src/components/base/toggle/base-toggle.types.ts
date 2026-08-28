import type { BaseFieldProps } from '../shared/base-field.types';

/**
 * Props for {@link BaseToggle}.
 *
 * Visual reference: Toggle.pdf (Base Component → Toggle) — track +
 * handle switch with an optional label rendered to the right, and a
 * visually muted disabled state.
 */
export interface BaseToggleProps extends BaseFieldProps {
  /** Current checked state. Bind with `v-model`. */
  modelValue?: boolean | undefined;

  checkedValue?: AntSwitchCheckedValue | undefined;

  uncheckedValue?: AntSwitchCheckedValue | undefined;

  /** Visual form shown in the Toggle reference. */
  variant?:
    | 'text'
    | 'publish'
    | 'segmented'
    | 'segmented-alt'
    | 'segmented-icon'
    | 'icon'
    | undefined;

  /** Text displayed next to the control when checked. */
  checkedText?: string | undefined;

  /** Text displayed next to the control when unchecked. */
  uncheckedText?: string | undefined;

  /** Position of the label relative to the switch. PDF shows "end" (right). */
  labelPlacement?: 'start' | 'end' | undefined;
}

/** Emits for {@link BaseToggle}. */
export interface BaseToggleEmits {
  'update:modelValue': [value: boolean];
  change: [value: boolean, event: Event];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}

export type AntSwitchCheckedValue = boolean | string | number;

/**
 * Ant Design Vue's `<a-switch>` reports its checked state as `boolean |
 * string | number` depending on `checked-value`/`unchecked-value`
 * configuration. See `base-toggle.constants.ts` for the normalization
 * logic that keeps this out of BaseToggle's public contract.
 */
