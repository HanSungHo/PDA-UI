import { BaseButton } from 'src/components/base';
import { type Component, defineComponent, h, type PropType, type Ref } from 'vue';

interface ShelfIncomingGridRow {
  id: number;
  c0: string;
  c1: string;
  c2: string;
}

export const ShelfIncomingGridCell = defineComponent({
  name: 'ShelfIncomingGridCell',
  props: {
    model: {
      type: Object as PropType<ShelfIncomingGridRow>,
      required: true,
    },
    prop: {
      type: String,
      required: true,
    },
    selected: {
      type: Object as PropType<Ref<number[]>>,
      required: true,
    },
    loading: {
      type: Object as PropType<Ref<boolean>>,
      required: true,
    },
    onToggle: {
      type: Function as PropType<(index: number) => void>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const columnIndex = Number(props.prop.slice(1));
      const position = columnIndex * 8 + props.model.id;
      const value = props.model[props.prop as keyof ShelfIncomingGridRow] || '';
      const isSelected = props.selected.value.includes(position);

      return h(
        BaseButton as Component,
        {
          class: ['shelf-incoming__cell', { 'shelf-incoming__cell--selected': isSelected }],
          variant: 'link',
          'aria-label': `LOT 위치 ${position + 1}: ${value || '비어 있음'}`,
          'aria-pressed': isSelected,
          disabled: props.loading.value,
          onClick: (event: MouseEvent) => {
            event.stopPropagation();
            props.onToggle(position);
          },
          onKeydown: (event: KeyboardEvent) => event.stopPropagation(),
        },
        { default: () => value },
      );
    };
  },
});
