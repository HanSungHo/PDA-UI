/* eslint-disable vue/one-component-per-file */
import { storeToRefs } from 'pinia';
import { BaseDropdownList, BaseInput } from 'src/components/base';
import type { BaseDropdownValue } from 'src/components/base/dropdown-list';
import { useBackupBayStore } from 'src/stores/backup-bay.store';
import type { BackupBayRowItem } from 'src/types/backup-bay.types';
import { computed, defineComponent, h, type PropType, ref, watch } from 'vue';

export const LotInputCell = defineComponent({
  name: 'LotInputCell',
  props: {
    model: {
      type: Object as PropType<BackupBayRowItem>,
      required: true,
    },
    rowIndex: {
      type: Number,
      required: true,
    },
    onLotEnter: {
      type: Function as PropType<(index: number) => void>,
      default: undefined,
    },
    onLotUpdate: {
      type: Function as PropType<(index: number, val: string) => void>,
      default: undefined,
    },
  },
  setup(props) {
    const localLot = ref(props.model.lotId || '');

    watch(
      () => props.model.lotId,
      (newVal) => {
        if (newVal !== localLot.value) {
          localLot.value = newVal || '';
        }
      },
    );

    const handleInput = (val: unknown) => {
      const str = typeof val === 'string' ? val : typeof val === 'number' ? String(val) : '';
      localLot.value = str;
      props.onLotUpdate?.(props.rowIndex, str);
    };

    const handleBlur = () => {
      const upper = localLot.value.toUpperCase();
      if (localLot.value !== upper) {
        localLot.value = upper;
        props.onLotUpdate?.(props.rowIndex, upper);
      }
    };

    const handleKeydown = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.isComposing) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        const upper = localLot.value.toUpperCase();
        localLot.value = upper;
        props.onLotUpdate?.(props.rowIndex, upper);
        props.onLotEnter?.(props.rowIndex);
      }
    };

    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLInputElement;
      target?.select();
    };

    const stopGridInteraction = (event: Event) => {
      event.stopPropagation();
    };

    return () =>
      h(
        'div',
        {
          class: 'backup-bay-cell-wrap',
          onClick: stopGridInteraction,
          onDblclick: stopGridInteraction,
          onMousedown: stopGridInteraction,
          onPointerdown: stopGridInteraction,
          onTouchstart: stopGridInteraction,
        },
        [
          h(BaseInput, {
            modelValue: localLot.value,
            size: 'small',
            status: props.model.isValid ? 'success' : 'default',
            class: ['backup-bay-input', 'backup-bay-input--lot'],
            'onUpdate:modelValue': handleInput,
            onKeydown: handleKeydown,
            onKeyup: stopGridInteraction,
            onFocus: handleFocus,
            onBlur: handleBlur,
          }),
        ],
      );
  },
});

export const FloorSelectCell = defineComponent({
  name: 'FloorSelectCell',
  props: {
    model: {
      type: Object as PropType<BackupBayRowItem>,
      required: true,
    },
    rowIndex: {
      type: Number,
      required: true,
    },
    onFloorChange: {
      type: Function as PropType<(index: number, val: string) => void>,
      default: undefined,
    },
  },
  setup(props) {
    const store = useBackupBayStore();
    const { floorList } = storeToRefs(store);

    const options = computed(() => floorList.value.map((f) => ({ label: f, value: f })));

    const handleUpdate = (val: BaseDropdownValue) => {
      const str = typeof val === 'string' ? val : typeof val === 'number' ? String(val) : '';
      props.onFloorChange?.(props.rowIndex, str);
    };

    const stopGridInteraction = (event: Event) => {
      event.stopPropagation();
    };

    return () =>
      h(
        'div',
        {
          class: 'backup-bay-cell-wrap',
          onClick: stopGridInteraction,
          onMousedown: stopGridInteraction,
          onPointerdown: stopGridInteraction,
        },
        [
          h(BaseDropdownList, {
            modelValue: props.model.selectedFloor,
            options: options.value,
            size: 'small',
            class: ['backup-bay-select', 'backup-bay-select--floor'],
            'onUpdate:modelValue': handleUpdate,
          }),
        ],
      );
  },
});

export const BaySelectCell = defineComponent({
  name: 'BaySelectCell',
  props: {
    model: {
      type: Object as PropType<BackupBayRowItem>,
      required: true,
    },
    rowIndex: {
      type: Number,
      required: true,
    },
    onBayChange: {
      type: Function as PropType<(index: number, val: string) => void>,
      default: undefined,
    },
  },
  setup(props) {
    const options = computed(() =>
      (props.model.bayOptions ?? []).map((bay: string) => ({
        label: bay,
        value: bay,
      })),
    );

    const handleUpdate = (val: BaseDropdownValue) => {
      const str = typeof val === 'string' ? val : typeof val === 'number' ? String(val) : '';
      props.onBayChange?.(props.rowIndex, str);
    };

    const stopGridInteraction = (event: Event) => {
      event.stopPropagation();
    };

    return () =>
      h(
        'div',
        {
          class: 'backup-bay-cell-wrap',
          onClick: stopGridInteraction,
          onMousedown: stopGridInteraction,
          onPointerdown: stopGridInteraction,
        },
        [
          h(BaseDropdownList, {
            modelValue: props.model.selectedBay,
            options: options.value,
            size: 'small',
            class: ['backup-bay-select', 'backup-bay-select--bay'],
            'onUpdate:modelValue': handleUpdate,
          }),
        ],
      );
  },
});
