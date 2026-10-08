<script lang="ts">
import { QTooltip } from 'quasar';
import {
  cloneVNode,
  Comment,
  type ComponentPublicInstance,
  defineComponent,
  Fragment,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  type PropType,
  ref,
  type VNode,
  watch,
} from 'vue';

import {
  baseTooltipDefaults,
  type BaseTooltipPlacement,
  type BaseTooltipTrigger,
} from './base-tooltip.types';

const placementMap: Record<
  BaseTooltipPlacement,
  { anchor: string; self: string; offset: [number, number] }
> = {
  top: { anchor: 'top middle', self: 'bottom middle', offset: [0, 4] },
  bottom: { anchor: 'bottom middle', self: 'top middle', offset: [0, 4] },
  left: { anchor: 'center left', self: 'center right', offset: [4, 0] },
  right: { anchor: 'center right', self: 'center left', offset: [4, 0] },
  topLeft: { anchor: 'top left', self: 'bottom left', offset: [0, 4] },
  topRight: { anchor: 'top right', self: 'bottom right', offset: [0, 4] },
  bottomLeft: { anchor: 'bottom left', self: 'top left', offset: [0, 4] },
  bottomRight: { anchor: 'bottom right', self: 'top right', offset: [0, 4] },
  leftTop: { anchor: 'top left', self: 'top right', offset: [4, 0] },
  leftBottom: { anchor: 'bottom left', self: 'bottom right', offset: [4, 0] },
  rightTop: { anchor: 'top right', self: 'top left', offset: [4, 0] },
  rightBottom: {
    anchor: 'bottom right',
    self: 'bottom left',
    offset: [4, 0],
  },
};

const triggerNames: BaseTooltipTrigger[] = ['hover', 'focus', 'click', 'contextmenu'];

export default defineComponent({
  name: 'BaseTooltip',
  components: { QTooltip },
  props: {
    title: { type: String, default: undefined },
    placement: {
      type: String as PropType<BaseTooltipPlacement>,
      default: baseTooltipDefaults.placement,
    },
    trigger: {
      type: [String, Array] as PropType<BaseTooltipTrigger | BaseTooltipTrigger[]>,
      default: baseTooltipDefaults.trigger,
    },
    arrow: { type: Boolean, default: baseTooltipDefaults.arrow },
  },
  setup(props, { slots }) {
    const triggerElement = ref<Element | false>(false);
    const tooltipContentElement = ref<HTMLElement | null>(null);
    const arrowPlacement = ref<string | null>(null);
    const wrapComponentTrigger = ref(false);
    const isOpen = ref(false);
    const activeTriggers = ref<Record<BaseTooltipTrigger, boolean>>({
      hover: false,
      focus: false,
      click: false,
      contextmenu: false,
    });

    function configuredTriggers(): BaseTooltipTrigger[] {
      return Array.isArray(props.trigger) ? props.trigger : [props.trigger];
    }

    function syncOpenState(): void {
      isOpen.value = configuredTriggers().some((trigger) => activeTriggers.value[trigger]);
    }

    function setTriggerState(trigger: BaseTooltipTrigger, active: boolean): void {
      if (!configuredTriggers().includes(trigger)) return;
      if (active && !activeTriggers.value[trigger]) arrowPlacement.value = null;
      activeTriggers.value[trigger] = active;
      syncOpenState();
    }

    function handleClick(): void {
      if (configuredTriggers().includes('click')) {
        setTriggerState('click', !activeTriggers.value.click);
      }
    }

    function handlePointerEnter(): void {
      setTriggerState('hover', true);
    }

    function handlePointerLeave(): void {
      setTriggerState('hover', false);
    }

    function handleFocusIn(): void {
      setTriggerState('focus', true);
    }

    function handleFocusOut(event: FocusEvent): void {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && triggerElement.value instanceof Element) {
        if (triggerElement.value.contains(nextTarget)) return;
      }
      setTriggerState('focus', false);
    }

    function handleContextMenu(event: MouseEvent): void {
      if (!configuredTriggers().includes('contextmenu')) return;
      event.preventDefault();
      setTriggerState('contextmenu', true);
    }

    function handleTooltipModelUpdate(showing: boolean): void {
      if (showing) {
        isOpen.value = true;
        return;
      }

      for (const trigger of triggerNames) activeTriggers.value[trigger] = false;
      isOpen.value = false;
    }

    function setTriggerTarget(target: Element | ComponentPublicInstance | null): void {
      if (typeof Element === 'undefined') {
        triggerElement.value = false;
        return;
      }

      const element = target instanceof Element ? target : target?.$el;
      triggerElement.value = element instanceof Element ? element : false;
      if (target && !(target instanceof Element) && !(element instanceof Element)) {
        wrapComponentTrigger.value = true;
      }
    }

    function onPointerDownOutside(event: Event): void {
      if (!activeTriggers.value.contextmenu) return;
      const target = event.target;
      if (target instanceof Node && triggerElement.value instanceof Element) {
        if (triggerElement.value.contains(target)) return;
      }
      setTriggerState('contextmenu', false);
    }

    async function updateArrowPlacement(): Promise<void> {
      arrowPlacement.value = null;
      if (!props.arrow || typeof window === 'undefined') return;

      await nextTick();
      const target = triggerElement.value;
      const content = tooltipContentElement.value?.closest<HTMLElement>('.q-tooltip');
      if (!(target instanceof Element) || !content) return;

      const targetRect = target.getBoundingClientRect();
      const tooltipRect = content.getBoundingClientRect();
      const verticalGap = Math.max(
        targetRect.top - tooltipRect.bottom,
        tooltipRect.top - targetRect.bottom,
      );
      const horizontalGap = Math.max(
        targetRect.left - tooltipRect.right,
        tooltipRect.left - targetRect.right,
      );

      if (verticalGap >= 0 && verticalGap >= horizontalGap) {
        const side = tooltipRect.bottom <= targetRect.top ? 'top' : 'bottom';
        const targetCenter = targetRect.left + targetRect.width / 2;
        const edgeThreshold = Math.min(16, tooltipRect.width / 4);
        const alignment =
          targetCenter < tooltipRect.left + edgeThreshold
            ? 'left'
            : targetCenter > tooltipRect.right - edgeThreshold
              ? 'right'
              : '';
        arrowPlacement.value = alignment ? `${side}-${alignment}` : side;
        return;
      }

      if (horizontalGap >= 0) {
        const side = tooltipRect.right <= targetRect.left ? 'left' : 'right';
        const targetCenter = targetRect.top + targetRect.height / 2;
        const edgeThreshold = Math.min(16, tooltipRect.height / 4);
        const alignment =
          targetCenter < tooltipRect.top + edgeThreshold
            ? 'top'
            : targetCenter > tooltipRect.bottom - edgeThreshold
              ? 'bottom'
              : '';
        arrowPlacement.value = alignment ? `${side}-${alignment}` : side;
      }
    }

    let arrowUpdateFrame: number | undefined;

    function scheduleArrowPlacement(): void {
      if (!isOpen.value || !props.arrow || typeof window === 'undefined') return;
      if (arrowUpdateFrame !== undefined) window.cancelAnimationFrame(arrowUpdateFrame);
      arrowUpdateFrame = window.requestAnimationFrame(() => {
        arrowUpdateFrame = undefined;
        void updateArrowPlacement();
      });
    }

    watch([() => props.arrow, () => props.placement, triggerElement], scheduleArrowPlacement);

    watch(isOpen, (open) => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      if (open) {
        window.addEventListener('resize', scheduleArrowPlacement);
        document.addEventListener('scroll', scheduleArrowPlacement, true);
        return;
      }
      window.removeEventListener('resize', scheduleArrowPlacement);
      document.removeEventListener('scroll', scheduleArrowPlacement, true);
      arrowPlacement.value = null;
    });

    watch(
      () => activeTriggers.value.contextmenu,
      (active) => {
        if (typeof document === 'undefined') return;
        const method = active ? 'addEventListener' : 'removeEventListener';
        document[method]('pointerdown', onPointerDownOutside, true);
      },
    );

    onMounted(() => {
      if (activeTriggers.value.contextmenu) {
        document.addEventListener('pointerdown', onPointerDownOutside, true);
      }
    });
    onBeforeUnmount(() => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('pointerdown', onPointerDownOutside, true);
        document.removeEventListener('scroll', scheduleArrowPlacement, true);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', scheduleArrowPlacement);
        if (arrowUpdateFrame !== undefined) window.cancelAnimationFrame(arrowUpdateFrame);
      }
    });

    const placement = () => placementMap[props.placement];

    return () => {
      const slotNodes = (slots.default?.() ?? []).filter((node) => node.type !== Comment);
      const triggerListeners = {
        onClick: handleClick,
        onPointerenter: handlePointerEnter,
        onPointerleave: handlePointerLeave,
        onFocusin: handleFocusIn,
        onFocusout: handleFocusOut,
        onContextmenu: handleContextMenu,
      };
      let trigger: VNode;
      const singleNodeType = slotNodes[0]?.type;
      const isSingleComponent =
        singleNodeType !== undefined &&
        (typeof singleNodeType === 'object' || typeof singleNodeType === 'function');
      const canPreserveSingleTrigger =
        slotNodes.length === 1 &&
        (typeof singleNodeType === 'string' || (isSingleComponent && !wrapComponentTrigger.value));

      if (canPreserveSingleTrigger) {
        trigger = cloneVNode(slotNodes[0], { ...triggerListeners, ref: setTriggerTarget }, true);
      } else {
        trigger = h(
          'span',
          { class: 'ds-tooltip__trigger', ref: setTriggerTarget, ...triggerListeners },
          slotNodes,
        );
      }

      const currentPlacement = placement();
      const tooltip = h(
        QTooltip,
        {
          modelValue: isOpen.value,
          target: triggerElement.value,
          noParentEvent: true,
          anchor: currentPlacement.anchor,
          self: currentPlacement.self,
          offset: currentPlacement.offset,
          transitionShow: 'none',
          transitionHide: 'none',
          class: [
            'ds-tooltip',
            props.arrow && 'ds-tooltip--arrow',
            arrowPlacement.value && `ds-tooltip--${arrowPlacement.value}`,
          ],
          onShow: updateArrowPlacement,
          'onUpdate:modelValue': handleTooltipModelUpdate,
        },
        {
          default: () =>
            h(
              'div',
              { class: 'ds-tooltip__content', ref: tooltipContentElement },
              slots.title?.() ?? props.title,
            ),
        },
      );

      return h(Fragment, null, [trigger, tooltip]);
    };
  },
});
</script>

<style src="./base-tooltip.css"></style>
