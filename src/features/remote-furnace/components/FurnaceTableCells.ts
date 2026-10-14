/* eslint-disable vue/one-component-per-file */
import { defineComponent, h, type PropType } from 'vue';

import type { BatchLotItem } from '../types/remote-furnace.types';

export const FurnaceCommentCell = defineComponent({
  name: 'FurnaceCommentCell',
  props: {
    model: {
      type: Object as PropType<BatchLotItem>,
      required: true,
    },
    onReadComment: {
      type: Function as PropType<(item: BatchLotItem) => void>,
      default: undefined,
    },
  },
  setup(props) {
    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      props.onReadComment?.(props.model);
    };

    return () =>
      h('div', { class: 'furnace-cell-comment' }, [
        props.model.commentQty > 0
          ? h(
              'button',
              {
                type: 'button',
                class: 'furnace-table__comment-badge',
                title: 'Comment 확인',
                onClick: handleClick,
              },
              String(props.model.commentQty),
            )
          : h('span', { class: 'furnace-table__comment-empty' }, '0'),
      ]);
  },
});

export const FurnaceStatusCell = defineComponent({
  name: 'FurnaceStatusCell',
  props: {
    model: {
      type: Object as PropType<BatchLotItem>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const status = props.model.status || '-';
      const statusClass = status.toLowerCase();
      return h('div', { class: 'furnace-cell-status' }, [
        h(
          'span',
          {
            class: ['furnace-table__status-pill', `furnace-table__status-pill--${statusClass}`],
          },
          status,
        ),
      ]);
    };
  },
});

export const FurnaceTextCell = defineComponent({
  name: 'FurnaceTextCell',
  props: {
    model: {
      type: Object as PropType<BatchLotItem>,
      required: true,
    },
    prop: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    return () => {
      const val = props.model[props.prop as keyof BatchLotItem];
      const text = val !== undefined && val !== null && val !== '' ? String(val) : '-';
      return h('div', { class: 'furnace-cell-text' }, text);
    };
  },
});
