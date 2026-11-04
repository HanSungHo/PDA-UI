import { mount } from '@vue/test-utils';
import BaseButton from 'src/components/base/button/BaseButton.vue';
import BaseDropdownList from 'src/components/base/dropdown-list/BaseDropdownList.vue';
import BaseInput from 'src/components/base/input/BaseInput.vue';
import ReTransferDetailCard from 'src/features/re-transfer/components/ReTransferDetailCard.vue';
import ReTransferSearchCard from 'src/features/re-transfer/components/ReTransferSearchCard.vue';
import { describe, expect, it } from 'vitest';

describe('ReTransfer Components', () => {
  describe('ReTransferSearchCard', () => {
    it('renders ds-screen__card with horizontal BaseInput and handles uppercase input and events', async () => {
      const wrapper = mount(ReTransferSearchCard, {
        props: {
          lotId: 'LOT123',
          isLoading: false,
        },
      });

      expect(wrapper.find('section.ds-screen__card').exists()).toBe(true);
      const baseInput = wrapper.findComponent(BaseInput);
      expect(baseInput.exists()).toBe(true);
      expect(baseInput.props('layout')).toBe('horizontal');
      expect(baseInput.props('label')).toBe('LOT No');
      expect(wrapper.text()).toContain('LOT No');
      expect(wrapper.text()).toContain('조회');

      const input = wrapper.find('input');
      await input.setValue('lotabc');
      expect(wrapper.emitted('update:lotId')?.[0]).toEqual(['LOTABC']);

      const btn = wrapper.findComponent(BaseButton);
      expect(btn.props()).toMatchObject({
        size: 'small',
        variant: 'secondary',
      });
      await btn.trigger('click');
      expect(wrapper.emitted('search-lot')).toBeTruthy();

      await input.trigger('keydown.enter');
      expect(wrapper.emitted('lot-enter')).toBeTruthy();
    });

    it('exposes focusLot method', () => {
      const wrapper = mount(ReTransferSearchCard, {
        props: {
          lotId: '',
          isLoading: false,
        },
      });

      expect(typeof wrapper.vm.focusLot).toBe('function');
      expect(() => wrapper.vm.focusLot()).not.toThrow();
    });
  });

  describe('ReTransferDetailCard', () => {
    it('renders ds-screen__card, disabled BaseInput for current STK, and 5 horizontal BaseDropdownLists', () => {
      const wrapper = mount(ReTransferDetailCard, {
        props: {
          currentStk: 'STK_CURRENT',
          fabs: ['FAB4', 'FAB5'],
          selectedFab: 'FAB4',
          bays: ['BAY01'],
          selectedBay: 'BAY01',
          stockers: ['STK01'],
          selectedStocker: 'STK01',
          ports: ['OUT  출고 1'],
          selectedPort: 'OUT  출고 1',
          pdas: ['지정안함', 'PDA01  홍길동(12345)'],
          selectedPda: '지정안함',
          isLoading: false,
        },
      });

      expect(wrapper.find('section.ds-screen__card').exists()).toBe(true);

      const stkInput = wrapper.findComponent(BaseInput);
      expect(stkInput.exists()).toBe(true);
      expect(stkInput.props('label')).toBe('현재 STK');
      expect(stkInput.props('layout')).toBe('horizontal');
      expect(stkInput.props('disabled')).toBe(true);
      expect(stkInput.props('modelValue')).toBe('STK_CURRENT');

      const dropdowns = wrapper.findAllComponents(BaseDropdownList);
      expect(dropdowns.length).toBe(5);
      expect(dropdowns[0]?.props('label')).toBe('다음 FAB');
      expect(dropdowns[1]?.props('label')).toBe('다음 BAY');
      expect(dropdowns[2]?.props('label')).toBe('다음 STK');
      expect(dropdowns[3]?.props('label')).toBe('출고 PORT');
      expect(dropdowns[4]?.props('label')).toBe('알려줄 PDA');

      dropdowns[0]?.vm.$emit('update:modelValue', 'FAB5');
      expect(wrapper.emitted('select-fab')?.[0]).toEqual(['FAB5']);

      dropdowns[1]?.vm.$emit('update:modelValue', 'BAY02');
      expect(wrapper.emitted('select-bay')?.[0]).toEqual(['BAY02']);

      dropdowns[2]?.vm.$emit('update:modelValue', 'STK02');
      expect(wrapper.emitted('update:selectedStocker')?.[0]).toEqual(['STK02']);

      dropdowns[3]?.vm.$emit('update:modelValue', 'IN');
      expect(wrapper.emitted('update:selectedPort')?.[0]).toEqual(['IN']);

      dropdowns[4]?.vm.$emit('update:modelValue', '지정안함');
      expect(wrapper.emitted('update:selectedPda')?.[0]).toEqual(['지정안함']);
    });
  });
});
