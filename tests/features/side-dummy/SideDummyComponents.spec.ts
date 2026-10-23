import { mount } from '@vue/test-utils';
import SideDummyFooter from 'src/features/side-dummy/components/SideDummyFooter.vue';
import SideDummyInfoCard from 'src/features/side-dummy/components/SideDummyInfoCard.vue';
import SideDummyProductCard from 'src/features/side-dummy/components/SideDummyProductCard.vue';
import { describe, expect, it } from 'vitest';

describe('SideDummy Components', () => {
  describe('SideDummyProductCard', () => {
    it('renders eqp and lot labels and values', () => {
      const wrapper = mount(SideDummyProductCard, {
        props: {
          eqpId: 'EQP-01',
          lotId: 'LOT-01',
          isLotDisabled: false,
          isLotSearchEnabled: true,
          isLoading: false,
        },
      });

      expect(wrapper.text()).toContain('장비');
      expect(wrapper.text()).toContain('LOT');
      expect(wrapper.text()).toContain('조회');
    });

    it('emits search-eqp and search-lot when 조회 buttons are clicked', async () => {
      const wrapper = mount(SideDummyProductCard, {
        props: {
          eqpId: 'EQP-01',
          lotId: 'LOT-01',
          isLotDisabled: false,
          isLotSearchEnabled: true,
          isLoading: false,
        },
      });

      const buttons = wrapper.findAllComponents({ name: 'BaseButton' });
      expect(buttons.length).toBe(2);

      await buttons[0].trigger('click');
      expect(wrapper.emitted('search-eqp')).toBeTruthy();

      await buttons[1].trigger('click');
      expect(wrapper.emitted('search-lot')).toBeTruthy();
    });

    it('disables lot search button when isLotSearchEnabled is false', () => {
      const wrapper = mount(SideDummyProductCard, {
        props: {
          eqpId: '',
          lotId: '',
          isLotDisabled: true,
          isLotSearchEnabled: false,
          isLoading: false,
        },
      });

      const buttons = wrapper.findAllComponents({ name: 'BaseButton' });
      expect(buttons[1].props('disabled')).toBe(true);
    });

    it('emits uppercase value on input updates', async () => {
      const wrapper = mount(SideDummyProductCard, {
        props: {
          eqpId: '',
          lotId: '',
          isLotDisabled: false,
          isLotSearchEnabled: true,
          isLoading: false,
        },
      });

      const inputs = wrapper.findAllComponents({ name: 'BaseInput' });
      await inputs[0].vm.$emit('update:model-value', 'eqp-lowercase');
      expect(wrapper.emitted('update:eqpId')?.[0]).toEqual(['EQP-LOWERCASE']);

      await inputs[1].vm.$emit('update:model-value', 'lot-lowercase');
      expect(wrapper.emitted('update:lotId')?.[0]).toEqual(['LOT-LOWERCASE']);
    });
  });

  describe('SideDummyInfoCard', () => {
    it('renders 4 info fields with labels and values', () => {
      const wrapper = mount(SideDummyInfoCard, {
        props: {
          operId: '1000',
          operDesc: 'TEST OPER DESC',
          inDate: '2026-10-22 10:00:00',
          inUser: 'OPERATOR_1',
        },
      });

      expect(wrapper.text()).toContain('공정번호');
      expect(wrapper.text()).toContain('공정명');
      expect(wrapper.text()).toContain('IN DATE');
      expect(wrapper.text()).toContain('IN USER');

      const inputs = wrapper.findAllComponents({ name: 'BaseInput' });
      expect(inputs.length).toBe(4);
      expect(inputs[0].props('modelValue')).toBe('1000');
      expect(inputs[1].props('modelValue')).toBe('TEST OPER DESC');
      expect(inputs[2].props('modelValue')).toBe('2026-10-22 10:00:00');
      expect(inputs[3].props('modelValue')).toBe('OPERATOR_1');

      inputs.forEach((input) => {
        expect(input.props('disabled')).toBe(true);
      });
    });
  });

  describe('SideDummyFooter', () => {
    it('renders IN, OUT, 닫기 buttons with correct props and emits actions', async () => {
      const wrapper = mount(SideDummyFooter, {
        props: {
          isBtnInEnabled: true,
          isBtnOutEnabled: true,
          isLoading: false,
        },
      });

      const buttons = wrapper.findAllComponents({ name: 'BaseButton' });
      expect(buttons.length).toBe(3);
      expect(buttons[0].props('label')).toBe('IN');
      expect(buttons[0].props('disabled')).toBe(false);

      expect(buttons[1].props('label')).toBe('OUT');
      expect(buttons[1].props('disabled')).toBe(false);

      expect(buttons[2].props('label')).toBe('닫기');
      expect(buttons[2].props('disabled')).toBe(false);

      await buttons[0].trigger('click');
      expect(wrapper.emitted('in')).toBeTruthy();

      await buttons[1].trigger('click');
      expect(wrapper.emitted('out')).toBeTruthy();

      await buttons[2].trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });
});
