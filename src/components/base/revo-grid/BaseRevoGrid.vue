<template>
  <div
    ref="gridRoot"
    :class="['base-revo-grid', { 'base-revo-grid--empty': !props.rows.length }]"
    aria-label="Data grid, scrollable"
  >
    <div v-if="!props.rows.length" class="base-revo-grid__empty">
      <slot name="empty">
        <BaseEmptyState icon-variant="filled" />
      </slot>
    </div>
    <div
      v-else
      ref="gridViewport"
      class="base-revo-grid__viewport"
      @pointerdown.capture="handleCellPointerDown"
      @pointerup="handleCellPointerUp"
      @pointercancel="handleCellPointerCancel"
    >
      <RevoGrid
        data-testid="base-revo-grid"
        :source="gridRows"
        :columns="gridColumns"
        row-class="rowClass"
        :row-size="props.rowSize"
        :resize="props.resize"
        :range="false"
        :readonly="props.readonly"
        :stretch="props.stretch"
        :auto-size-column="props.autoSizeColumn"
        :filter="props.filter"
        :aria-label="props.accessibleLabel || undefined"
        hide-attribution
        accessible
        @beforecellfocus="handleCellFocus"
        @afteredit="handleAfterEdit"
      />
    </div>
    <span
      v-if="props.rows.length"
      ref="verticalIndicator"
      class="base-revo-grid__scroll-indicator base-revo-grid__scroll-indicator--vertical"
      role="scrollbar"
      tabindex="0"
      aria-label="Vertical table scrollbar"
      aria-orientation="vertical"
      aria-valuemin="0"
      :aria-valuemax="verticalScrollMax"
      :aria-valuenow="verticalScrollPosition"
      @pointerdown="startScrollDrag($event, 'y')"
      @keydown="handleScrollKeydown($event, 'y')"
    />
    <span
      v-if="props.rows.length"
      ref="horizontalIndicator"
      class="base-revo-grid__scroll-indicator base-revo-grid__scroll-indicator--horizontal"
      role="scrollbar"
      tabindex="0"
      aria-label="Horizontal table scrollbar"
      aria-orientation="horizontal"
      aria-valuemin="0"
      :aria-valuemax="horizontalScrollMax"
      :aria-valuenow="horizontalScrollPosition"
      @pointerdown="startScrollDrag($event, 'x')"
      @keydown="handleScrollKeydown($event, 'x')"
    />
  </div>
</template>

<script setup lang="ts">
import type { CellProps, ColumnRegular } from '@revolist/revogrid';
import RevoGrid from '@revolist/vue3-datagrid';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { BaseEmptyState } from '../empty-state';
import type {
  BaseRevoGridAfterEditDetail,
  BaseRevoGridCellFocusDetail,
  BaseRevoGridColumn,
  BaseRevoGridKey,
  BaseRevoGridProps,
  BaseRevoGridScrollDetail,
} from './base-revo-grid.types';

defineOptions({ name: 'BaseRevoGrid' });

type BaseRow = Record<string, unknown>;

type BaseGridProps = Omit<BaseRevoGridProps<object>, 'rowKey'> & {
  rowKey?: string | ((row: object) => BaseRevoGridKey);
};

const props = withDefaults(defineProps<BaseGridProps>(), {
  rowKey: 'id',
  rowSize: 40,
  resize: true,
  // The legacy grids have no column filter; RevoGrid's filter also reorders the visible rows,
  // which the tap handler below does not support yet.
  filter: false,
  readonly: true,
  stretch: false,
  autoSizeColumn: false,
  selectedRowClass: 'base-revo-grid__row--selected',
  accessibleLabel: '',
});

defineSlots<{
  /** Replaces the default EMPTY state shown when `rows` is empty. */
  empty?(): unknown;
}>();

const emit = defineEmits<{
  rowSelect: [rowKey: BaseRevoGridKey, row: BaseRow];
  cellActivate: [detail: { rowKey: BaseRevoGridKey; row: BaseRow; prop?: string }];
  cellClick: [
    detail: { rowKey: BaseRevoGridKey; row: BaseRow; prop?: string; wasSelected: boolean },
  ];
  cellDoubleClick: [detail: { rowKey: BaseRevoGridKey; row: BaseRow; prop?: string }];
  cellEdit: [detail: { rowKey: BaseRevoGridKey; row: BaseRow; prop: string; value: unknown }];
  scroll: [detail: BaseRevoGridScrollDetail];
}>();

const gridRoot = ref<HTMLElement>();
const gridViewport = ref<HTMLElement>();
const viewportWidth = ref(0);
let viewportResizeObserver: ResizeObserver | undefined;

function withClass(cellProps: CellProps | void | undefined, className: string): CellProps {
  const current: unknown = cellProps?.class;
  const merged: CellProps['class'] =
    current && typeof current === 'object'
      ? { ...(current as Record<string, boolean>), [className]: true }
      : [current, className].filter(Boolean).join(' ');
  return { ...cellProps, class: merged } as CellProps;
}

// `align` is a BaseRevoGrid option; it becomes a class on the header and data cells.
function toRevoColumn({ align, ...column }: BaseRevoGridColumn): ColumnRegular {
  if (!align) return column;

  const className = `base-revo-grid__cell--${align}`;
  const { cellProperties, columnProperties } = column;
  return {
    ...column,
    cellProperties: (cell) => withClass(cellProperties?.(cell), className),
    columnProperties: (header) => withClass(columnProperties?.(header), className),
  };
}

const gridColumns = computed(() => {
  const columns = props.columns.map(toRevoColumn);
  if (!props.stretch || !viewportWidth.value) return columns;

  const last = columns
    .slice()
    .reverse()
    .find((column) => !column.pin);
  if (!last || last.autoSize) return columns;

  const totalWidth = columns.reduce((width, column) => width + (column.size ?? 100), 0);
  if (totalWidth < viewportWidth.value) {
    last.size = Math.min(
      last.maxSize ?? Infinity,
      (last.size ?? 100) + viewportWidth.value - totalWidth,
    );
  }
  return columns;
});

const verticalIndicator = ref<HTMLElement>();
const horizontalIndicator = ref<HTMLElement>();
const verticalScrollPosition = ref(0);
const verticalScrollMax = ref(0);
const horizontalScrollPosition = ref(0);
const horizontalScrollMax = ref(0);
let pointerTapStart:
  | {
      pointerId: number;
      clientX: number;
      clientY: number;
      rowIndex: number;
      columnIndex: number;
      selectedRowKey: BaseRevoGridKey | undefined;
    }
  | undefined;
let lastPointerTap: { rowKey: BaseRevoGridKey; prop: string; at: number } | undefined;
let verticalScroller: HTMLElement | undefined;
let horizontalScroller: HTMLElement | undefined;
let bindingFrame: number | undefined;
let indicatorSyncFrame: number | undefined;
let scrollerResizeObserver: ResizeObserver | undefined;

interface ScrollDragState {
  axis: 'x' | 'y';
  pointerStart: number;
  scrollStart: number;
}

let scrollDragState: ScrollDragState | undefined;

function getRowKey(row: BaseRow, index = 0): BaseRevoGridKey {
  const rowKey = props.rowKey;
  const value = typeof rowKey === 'function' ? rowKey(row) : rowKey ? row[rowKey] : undefined;
  return typeof value === 'string' || typeof value === 'number' ? value : index;
}

const gridRows = computed<BaseRow[]>(() =>
  props.rows.map((sourceRow, index) => {
    const row = sourceRow as BaseRow;
    const isSelected =
      props.selectedRowKey !== undefined && getRowKey(row, index) === props.selectedRowKey;
    const existingRowClass = typeof row.rowClass === 'string' ? row.rowClass : '';

    return {
      ...row,
      rowClass: [
        existingRowClass,
        index % 2 === 0 ? 'base-revo-grid__row--alternate' : '',
        isSelected ? props.selectedRowClass : '',
      ]
        .filter(Boolean)
        .join(' '),
    };
  }),
);

function getRenderedColumns(): BaseRevoGridColumn[] {
  const columns = gridColumns.value;
  return [
    ...columns.filter((column) => column.pin === 'colPinStart'),
    ...columns.filter((column) => !column.pin),
    ...columns.filter((column) => column.pin === 'colPinEnd'),
  ];
}

function handleAfterEdit(event: Event): void {
  const detail = (event as CustomEvent<BaseRevoGridAfterEditDetail<BaseRow>>).detail;
  if (!detail || !('model' in detail) || !detail.prop) return;

  const rowKey = getRowKey(detail.model);
  emit('cellEdit', { rowKey, row: detail.model, prop: detail.prop, value: detail.val });
}

function handleCellFocus(event: Event): void {
  const { model, type, prop } = (event as CustomEvent<BaseRevoGridCellFocusDetail<BaseRow>>).detail;
  if (type !== 'rgRow' || !model) return;

  const rowIndex = props.rows.indexOf(model);
  const rowKey = getRowKey(model, rowIndex < 0 ? 0 : rowIndex);
  emit('rowSelect', rowKey, model);
  emit('cellActivate', { rowKey, row: model, prop });
}

function handleCellPointerDown(event: PointerEvent): void {
  const cell = event
    .composedPath()
    .find((target) => target instanceof HTMLElement && target.classList.contains('rgCell'));
  if (!(cell instanceof HTMLElement)) {
    pointerTapStart = undefined;
    return;
  }

  const rowIndex = Number(cell.dataset.rgrow);
  const columnIndex = Number(cell.getAttribute('aria-colindex')) - 1;
  if (!Number.isInteger(rowIndex) || !Number.isInteger(columnIndex)) {
    pointerTapStart = undefined;
    return;
  }

  pointerTapStart = {
    pointerId: event.pointerId,
    clientX: event.clientX,
    clientY: event.clientY,
    rowIndex,
    columnIndex,
    selectedRowKey: props.selectedRowKey,
  };
}

function handleCellPointerUp(event: PointerEvent): void {
  const tapStart = pointerTapStart;
  pointerTapStart = undefined;
  const cell = event
    .composedPath()
    .find((target) => target instanceof HTMLElement && target.classList.contains('rgCell'));
  const rowIndex = cell instanceof HTMLElement ? Number(cell.dataset.rgrow) : Number.NaN;
  const columnIndex =
    cell instanceof HTMLElement ? Number(cell.getAttribute('aria-colindex')) - 1 : Number.NaN;
  const movedX = tapStart ? event.clientX - tapStart.clientX : Number.POSITIVE_INFINITY;
  const movedY = tapStart ? event.clientY - tapStart.clientY : Number.POSITIVE_INFINITY;
  const isTap =
    tapStart !== undefined &&
    event.pointerId === tapStart.pointerId &&
    Math.hypot(movedX, movedY) <= 8 &&
    rowIndex === tapStart.rowIndex &&
    columnIndex === tapStart.columnIndex;

  if (!(cell instanceof HTMLElement) || !isTap) {
    lastPointerTap = undefined;
    return;
  }

  // TODO(revo-grid): data-rgrow is the visible row index. It matches props.rows only while
  // rows are not filtered, sorted or trimmed; resolve through RevoGrid's row model before
  // enabling those features for a consumer.
  const row = props.rows[rowIndex] as BaseRow | undefined;
  const columnProp = getRenderedColumns()[columnIndex]?.prop;
  if (
    !row ||
    columnProp === undefined ||
    !Number.isInteger(rowIndex) ||
    !Number.isInteger(columnIndex)
  ) {
    lastPointerTap = undefined;
    return;
  }
  const prop = String(columnProp);

  const cellInteraction = {
    rowKey: getRowKey(row, rowIndex),
    row,
    prop,
  };
  const wasSelected = tapStart.selectedRowKey === cellInteraction.rowKey;
  emit('cellClick', { ...cellInteraction, wasSelected });

  const now = Date.now();
  if (
    lastPointerTap?.rowKey === cellInteraction.rowKey &&
    lastPointerTap.prop === cellInteraction.prop &&
    now - lastPointerTap.at <= 300
  ) {
    emit('cellDoubleClick', cellInteraction);
    lastPointerTap = undefined;
    return;
  }

  lastPointerTap = { rowKey: cellInteraction.rowKey, prop: cellInteraction.prop, at: now };
}

function handleCellPointerCancel(): void {
  pointerTapStart = undefined;
  lastPointerTap = undefined;
}

function updateIndicator(scroller: HTMLElement, indicator: HTMLElement, axis: 'x' | 'y'): void {
  const scrollPosition = axis === 'x' ? scroller.scrollLeft : scroller.scrollTop;
  const scrollRange =
    axis === 'x'
      ? scroller.scrollWidth - scroller.clientWidth
      : scroller.scrollHeight - scroller.clientHeight;

  const position = Math.max(0, scrollPosition);
  const max = Math.max(0, scrollRange);
  if (axis === 'x') {
    horizontalScrollPosition.value = position;
    horizontalScrollMax.value = max;
  } else {
    verticalScrollPosition.value = position;
    verticalScrollMax.value = max;
  }

  emit('scroll', { axis, position, max });

  const rootSize = axis === 'x' ? gridRoot.value?.clientWidth : gridRoot.value?.clientHeight;
  const indicatorSize = axis === 'x' ? indicator.offsetWidth : indicator.offsetHeight;
  const indicatorRange = Math.max(0, (rootSize ?? 0) - indicatorSize - 2);
  const offset = max > 0 ? (position / max) * indicatorRange : 0;

  indicator.style.transform = axis === 'x' ? `translateX(${offset}px)` : `translateY(${offset}px)`;
}

function handleScrollKeydown(event: KeyboardEvent, axis: 'x' | 'y'): void {
  const scroller = axis === 'x' ? horizontalScroller : verticalScroller;
  if (!scroller) return;

  const pageStep = axis === 'x' ? scroller.clientWidth : scroller.clientHeight;
  let nextPosition: number | undefined;

  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      nextPosition = (axis === 'x' ? scroller.scrollLeft : scroller.scrollTop) - 40;
      break;
    case 'ArrowRight':
    case 'ArrowDown':
      nextPosition = (axis === 'x' ? scroller.scrollLeft : scroller.scrollTop) + 40;
      break;
    case 'PageUp':
      nextPosition = (axis === 'x' ? scroller.scrollLeft : scroller.scrollTop) - pageStep;
      break;
    case 'PageDown':
      nextPosition = (axis === 'x' ? scroller.scrollLeft : scroller.scrollTop) + pageStep;
      break;
    case 'Home':
      nextPosition = 0;
      break;
    case 'End':
      nextPosition = axis === 'x' ? scroller.scrollWidth : scroller.scrollHeight;
      break;
    default:
      return;
  }

  event.preventDefault();
  if (axis === 'x') scroller.scrollLeft = nextPosition;
  else scroller.scrollTop = nextPosition;
}

function detachScrollListeners(): void {
  verticalScroller?.removeEventListener('scroll', syncVerticalIndicator);
  horizontalScroller?.removeEventListener('scroll', syncHorizontalIndicator);
}

function syncVerticalIndicator(): void {
  if (verticalScroller && verticalIndicator.value) {
    updateIndicator(verticalScroller, verticalIndicator.value, 'y');
  }
}

function syncHorizontalIndicator(): void {
  if (horizontalScroller && horizontalIndicator.value) {
    updateIndicator(horizontalScroller, horizontalIndicator.value, 'x');
  }
}

function syncIndicatorsAfterLayout(attempt = 0): void {
  syncVerticalIndicator();
  syncHorizontalIndicator();

  const hasPendingMetrics =
    (verticalScroller && verticalScroller.scrollHeight <= verticalScroller.clientHeight) ||
    (horizontalScroller && horizontalScroller.scrollWidth <= horizontalScroller.clientWidth);

  if (hasPendingMetrics && attempt < 60) {
    indicatorSyncFrame = requestAnimationFrame(() => syncIndicatorsAfterLayout(attempt + 1));
  }
}

function startScrollDrag(event: PointerEvent, axis: 'x' | 'y'): void {
  const scroller = axis === 'x' ? horizontalScroller : verticalScroller;
  if (!scroller) return;

  event.preventDefault();
  scrollDragState = {
    axis,
    pointerStart: axis === 'x' ? event.clientX : event.clientY,
    scrollStart: axis === 'x' ? scroller.scrollLeft : scroller.scrollTop,
  };
  window.addEventListener('pointermove', handleScrollDrag);
  window.addEventListener('pointerup', stopScrollDrag, { once: true });
}

function handleScrollDrag(event: PointerEvent): void {
  if (!scrollDragState) return;
  const { axis, pointerStart, scrollStart } = scrollDragState;
  const scroller = axis === 'x' ? horizontalScroller : verticalScroller;
  const indicator = axis === 'x' ? horizontalIndicator.value : verticalIndicator.value;
  if (!scroller || !indicator) return;

  const pointerPosition = axis === 'x' ? event.clientX : event.clientY;
  const pointerDelta = pointerPosition - pointerStart;
  const scrollRange =
    axis === 'x'
      ? scroller.scrollWidth - scroller.clientWidth
      : scroller.scrollHeight - scroller.clientHeight;
  const indicatorRange =
    axis === 'x'
      ? Math.max(0, (gridRoot.value?.clientWidth ?? 0) - indicator.offsetWidth - 2)
      : Math.max(0, (gridRoot.value?.clientHeight ?? 0) - indicator.offsetHeight - 2);
  if (indicatorRange === 0) return;

  const nextScroll = scrollStart + (pointerDelta / indicatorRange) * scrollRange;
  if (axis === 'x') scroller.scrollLeft = nextScroll;
  else scroller.scrollTop = nextScroll;
}

function stopScrollDrag(): void {
  scrollDragState = undefined;
  window.removeEventListener('pointermove', handleScrollDrag);
}

function bindScrollIndicators(attempt = 0): void {
  if (bindingFrame !== undefined) cancelAnimationFrame(bindingFrame);
  detachScrollListeners();
  scrollerResizeObserver?.disconnect();
  if (!props.rows.length) return;
  verticalScroller =
    gridRoot.value?.querySelector<HTMLElement>('revogr-scroll-virtual.vertical') ?? undefined;
  horizontalScroller =
    gridRoot.value?.querySelector<HTMLElement>('revogr-scroll-virtual.horizontal') ?? undefined;

  if ((!verticalScroller || !horizontalScroller) && attempt < 60) {
    bindingFrame = requestAnimationFrame(() => bindScrollIndicators(attempt + 1));
    return;
  }

  verticalScroller?.addEventListener('scroll', syncVerticalIndicator, { passive: true });
  horizontalScroller?.addEventListener('scroll', syncHorizontalIndicator, { passive: true });

  if (typeof ResizeObserver !== 'undefined') {
    scrollerResizeObserver = new ResizeObserver(() => syncIndicatorsAfterLayout());
    if (verticalScroller) scrollerResizeObserver.observe(verticalScroller);
    if (horizontalScroller) scrollerResizeObserver.observe(horizontalScroller);
  }

  syncIndicatorsAfterLayout();
}

if (typeof ResizeObserver !== 'undefined') {
  viewportResizeObserver = new ResizeObserver(([entry]) => {
    if (entry) viewportWidth.value = entry.contentRect.width;
  });
}

function observeViewport(viewport: HTMLElement | undefined): void {
  viewportResizeObserver?.disconnect();
  if (viewport) viewportResizeObserver?.observe(viewport);
}

onMounted(() => {
  bindScrollIndicators();
  observeViewport(gridViewport.value);
});
// The viewport is only rendered while there are rows, so observe it again when it reappears.
watch(gridViewport, observeViewport, { flush: 'post' });
watch(
  () => props.rows,
  () => bindScrollIndicators(),
  { flush: 'post' },
);
onBeforeUnmount(() => {
  if (bindingFrame !== undefined) cancelAnimationFrame(bindingFrame);
  if (indicatorSyncFrame !== undefined) cancelAnimationFrame(indicatorSyncFrame);
  scrollerResizeObserver?.disconnect();
  viewportResizeObserver?.disconnect();
  stopScrollDrag();
  detachScrollListeners();
});
</script>

<style scoped src="./base-revo-grid.css"></style>
