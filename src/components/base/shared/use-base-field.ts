import { computed, type ComputedRef, useId } from 'vue';

import type { BaseComponentStatus, BaseFieldProps } from './base-field.types';

export interface UseBaseFieldResult {
  controlId: ComputedRef<string>;
  labelId: ComputedRef<string>;
  messageId: ComputedRef<string>;
  status: ComputedRef<BaseComponentStatus>;
  message: ComputedRef<string | undefined>;
  isStructurallyDisabled: ComputedRef<boolean>;
  isValueLocked: ComputedRef<boolean>;
}

export function useBaseField(
  props: Readonly<BaseFieldProps>,
  idPrefix: string,
): UseBaseFieldResult {
  const generatedId = useId();

  const controlId = computed(() => props.id ?? `${idPrefix}-${generatedId}`);
  const labelId = computed(() => `${controlId.value}-label`);
  const messageId = computed(() => `${controlId.value}-message`);

  const status = computed<BaseComponentStatus>(() =>
    props.error || props.errorMessage ? 'error' : (props.status ?? 'default'),
  );

  const message = computed(() => props.errorMessage || props.hint);

  const isStructurallyDisabled = computed(() => Boolean(props.disabled) || Boolean(props.loading));

  const isValueLocked = computed(
    () => Boolean(props.disabled) || Boolean(props.readonly) || Boolean(props.loading),
  );

  return {
    controlId,
    labelId,
    messageId,
    status,
    message,
    isStructurallyDisabled,
    isValueLocked,
  };
}
