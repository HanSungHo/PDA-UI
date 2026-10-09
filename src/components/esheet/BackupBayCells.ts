/* eslint-disable vue/one-component-per-file */
import { storeToRefs } from 'pinia';
import { BaseDropdownList, BaseInput } from 'src/components/base';
import type { BaseDropdownValue } from 'src/components/base/dropdown-list';
import { useBackupBayStore } from 'src/stores/backup-bay.store';
import type { BackupBayRowItem } from 'src/types/backup-bay.types';
import { computed, defineComponent, h, type PropType } from 'vue';

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
    const handleInput = (val: unknown) => {
      const str = typeof val === 'string' ? val : typeof val === 'number' ? String(val) : '';
      props.onLotUpdate?.(props.rowIndex, str.toUpperCase());
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        props.onLotEnter?.(props.rowIndex);
      }
    };

    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLInputElement;
      target?.select();
    };

    return () =>
      h('div', { class: 'backup-bay-cell-wrap' }, [
        h(BaseInput, {
          modelValue: props.model.lotId,
          size: 'small',
          class: [
            'backup-bay-input',
            'backup-bay-input--lot',
            props.model.isValid ? 'backup-bay-input--valid' : '',
          ],
          'onUpdate:modelValue': handleInput,
          onKeydown: handleKeydown,
          onFocus: handleFocus,
        }),
      ]);
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

    return () =>
      h('div', { class: 'backup-bay-cell-wrap' }, [
        h(BaseDropdownList, {
          modelValue: props.model.selectedFloor,
          options: options.value,
          size: 'small',
          class: ['backup-bay-select', 'backup-bay-select--floor'],
          'onUpdate:modelValue': handleUpdate,
        }),
      ]);
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

    return () =>
      h('div', { class: 'backup-bay-cell-wrap' }, [
        h(BaseDropdownList, {
          modelValue: props.model.selectedBay,
          options: options.value,
          size: 'small',
          class: ['backup-bay-select', 'backup-bay-select--bay'],
          'onUpdate:modelValue': handleUpdate,
        }),
      ]);
  },
});

export const ReadOnlyCell = defineComponent({
  name: 'ReadOnlyCell',
  props: {
    model: {
      type: Object as PropType<BackupBayRowItem>,
      required: true,
    },
    prop: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const record = props.model as unknown as Record<string, unknown>;
      const raw = record[props.prop];
      const val = typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : '';
      const isProcess = props.prop === 'processName';

      return h('div', { class: 'backup-bay-cell-wrap' }, [
        h(
          'div',
          {
            class: ['backup-bay-readonly-box', isProcess ? 'backup-bay-readonly-box--process' : ''],
          },
          val,
        ),
      ]);
    };
  },
});
