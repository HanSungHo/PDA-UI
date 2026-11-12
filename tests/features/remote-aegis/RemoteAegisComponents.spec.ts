import { mount } from '@vue/test-utils';
import { BaseDropdownList, BaseInput } from 'src/components/base';
import RemoteAegisActionCard from 'src/features/remote-aegis/components/RemoteAegisActionCard.vue';
import RemoteAegisCommentCard from 'src/features/remote-aegis/components/RemoteAegisCommentCard.vue';
import RemoteAegisProductCard from 'src/features/remote-aegis/components/RemoteAegisProductCard.vue';
import * as indexExports from 'src/features/remote-aegis/index';
import { describe, expect, it } from 'vitest';

describe('RemoteAegisComponents', () => {
  it('exports all expected items from index.ts', () => {
    expect(indexExports.RemoteAegisPage).toBeDefined();
    expect(indexExports.RemoteAegisProductCard).toBeDefined();
    expect(indexExports.RemoteAegisCommentCard).toBeDefined();
    expect(indexExports.RemoteAegisActionCard).toBeDefined();
    expect(indexExports.useRemoteAegisStore).toBeDefined();
    expect(indexExports.remoteAegisService).toBeDefined();
  });

  describe('RemoteAegisProductCard', () => {
    it('emits input events for machine, lot, recipe, prodMachine, and port', async () => {
      const wrapper = mount(RemoteAegisProductCard, {
        props: {
          machineInput: 'AEGIS01',
          lotIdInput: 'LOT01',
          selectedPort: 'P1',
          portOptions: ['P1', 'P2'],
          portState: 'READY',
          portStatusKind: 'ready',
          recipeInput: 'RCP01',
          prodMachineInput: 'EQP01',
          waferCount: '5',
          selectedWaferList: '01,02',
          isClearPortEnabled: true,
          isLoading: false,
        },
      });

      // Test input events
      const inputs = wrapper.findAllComponents(BaseInput);
      // inputs: machine (0), lot (1), recipe (2), prodMachine (3), waferCount (4), waferList (5)
      await inputs[0].vm.$emit('update:modelValue', 'AEGIS02');
      expect(wrapper.emitted('update:machineInput')?.[0]).toEqual(['AEGIS02']);

      await inputs[1].vm.$emit('update:modelValue', 'LOT02');
      expect(wrapper.emitted('update:lotIdInput')?.[0]).toEqual(['LOT02']);

      await inputs[2].vm.$emit('update:modelValue', 'RCP02');
      expect(wrapper.emitted('update:recipeInput')?.[0]).toEqual(['RCP02']);

      await inputs[3].vm.$emit('update:modelValue', 'EQP02');
      expect(wrapper.emitted('update:prodMachineInput')?.[0]).toEqual(['EQP02']);

      const dropdown = wrapper.findComponent(BaseDropdownList);
      await dropdown.vm.$emit('update:modelValue', 'P2');
      expect(wrapper.emitted('update:selectedPort')?.[0]).toEqual(['P2']);

      // Test focus methods on defineExpose
      wrapper.vm.focusMachine();
      wrapper.vm.focusLot();
      expect(typeof wrapper.vm.isLotFocused).toBe('function');
      expect(typeof wrapper.vm.isMachineFocused).toBe('function');
      expect(wrapper.vm.isLotFocused()).toBe(false);
      expect(wrapper.vm.isMachineFocused()).toBe(false);

      // Test button events
      await wrapper
        .find('button[aria-label="WF선택"], button:has-text("WF선택"), .ds-btn--secondary')
        .trigger('click');
      wrapper.unmount();
    });
  });

  describe('RemoteAegisActionCard', () => {
    it('emits start and cancel events when buttons clicked', async () => {
      const wrapper = mount(RemoteAegisActionCard, {
        props: {
          isStartEnabled: true,
          isLoading: false,
        },
      });

      const buttons = wrapper.findAll('button');
      await buttons[0].trigger('click');
      expect(wrapper.emitted('start')).toHaveLength(1);

      await buttons[1].trigger('click');
      expect(wrapper.emitted('cancel')).toHaveLength(1);
      wrapper.unmount();
    });
  });

  describe('RemoteAegisCommentCard', () => {
    it('renders comment textarea', () => {
      const wrapper = mount(RemoteAegisCommentCard, {
        props: {
          noticeText: 'Sample notice line 1\nline 2',
        },
      });
      expect(wrapper.text()).toContain('LOT');
      wrapper.unmount();
    });
  });
});
