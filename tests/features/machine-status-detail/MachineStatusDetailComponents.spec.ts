import { mount } from '@vue/test-utils';
import MachineStatusDetailChamberCard from 'src/features/machine-status-detail/components/MachineStatusDetailChamberCard.vue';
import MachineStatusDetailChangeCard from 'src/features/machine-status-detail/components/MachineStatusDetailChangeCard.vue';
import MachineStatusDetailInfoCard from 'src/features/machine-status-detail/components/MachineStatusDetailInfoCard.vue';
import MachineStatusDetailSearchCard from 'src/features/machine-status-detail/components/MachineStatusDetailSearchCard.vue';
import { describe, expect, it } from 'vitest';

describe('MachineStatusDetail Components', () => {
  describe('MachineStatusDetailSearchCard', () => {
    it('uses ds-screen__card and renders 장비 label, search icon, and 조회 button', () => {
      const wrapper = mount(MachineStatusDetailSearchCard, {
        props: {
          eqpId: 'MC01',
          isLoading: false,
        },
      });

      expect(wrapper.classes()).toContain('ds-screen__card');
      expect(wrapper.classes()).not.toContain('machine-status-detail-card');
      expect(wrapper.text()).toContain('장비');
      expect(wrapper.text()).toContain('조회');
      const icon = wrapper.findComponent({ name: 'QIcon' });
      expect(icon.exists()).toBe(true);
      expect(icon.props('name')).toBe('sym_o_search');
    });

    it('emits uppercase eqpId and search-eqp event', async () => {
      const wrapper = mount(MachineStatusDetailSearchCard, {
        props: {
          eqpId: '',
          isLoading: false,
        },
      });

      const input = wrapper.findComponent({ name: 'BaseInput' });
      await input.vm.$emit('update:modelValue', 'eqp-mc01');
      expect(wrapper.emitted('update:eqpId')?.[0]).toEqual(['EQP-MC01']);

      const btn = wrapper.findComponent({ name: 'BaseButton' });
      await btn.trigger('click');
      expect(wrapper.emitted('search-eqp')).toBeTruthy();
    });
  });

  describe('MachineStatusDetailInfoCard', () => {
    it('uses ds-screen__card and renders 5 read-only inputs with legacy labels', () => {
      const wrapper = mount(MachineStatusDetailInfoCard, {
        props: {
          facility: 'FAB1',
          mainStatus: 'RUN',
          subStatus: 'NORMAL',
          fdcState: 'OK',
          finalWorkTime: '2026-10-26 09:30:00',
        },
      });

      expect(wrapper.classes()).toContain('ds-screen__card');
      expect(wrapper.classes()).not.toContain('machine-status-detail-card');
      expect(wrapper.text()).toContain('FACILITY');
      expect(wrapper.text()).toContain('MAIN STATUS');
      expect(wrapper.text()).toContain('SUB STATUS');
      expect(wrapper.text()).toContain('최종작업시간');

      const inputs = wrapper.findAllComponents({ name: 'BaseInput' });
      expect(inputs.length).toBe(5);
      expect(inputs[0]!.props('modelValue')).toBe('FAB1');
      expect(inputs[1]!.props('modelValue')).toBe('RUN');
      expect(inputs[2]!.props('modelValue')).toBe('NORMAL');
      expect(inputs[3]!.props('modelValue')).toBe('OK');
      expect(inputs[4]!.props('modelValue')).toBe('2026-10-26 09:30:00');
      inputs.forEach((input) => {
        expect(input.props('disabled')).toBe(true);
      });
    });
  });

  describe('MachineStatusDetailChangeCard', () => {
    it('uses ds-screen__card, renders COMMENT, 장비상태, DOWN CODE, 작업자 and emits changes', async () => {
      const wrapper = mount(MachineStatusDetailChangeCard, {
        props: {
          comment: '초기 코멘트',
          commentOptions: ['초기 코멘트', '점검 완료'],
          selectedEqpState: 'R',
          statusOptions: [{ value: 'R', label: 'R  가동중' }],
          selectedDownCode: 'RN001',
          downCodeOptions: [{ value: 'RN001', label: 'RN001  정상가동' }],
          operator: '홍길동(OP01)',
          isLoading: false,
        },
      });

      expect(wrapper.classes()).toContain('ds-screen__card');
      expect(wrapper.classes()).not.toContain('machine-status-detail-card');
      expect(wrapper.text()).toContain('COMMENT');
      expect(wrapper.text()).toContain('장비상태');
      expect(wrapper.text()).toContain('DOWN CODE');
      expect(wrapper.text()).toContain('작업자');

      const inputs = wrapper.findAllComponents({ name: 'BaseInput' });
      expect(inputs.length).toBe(2);
      await inputs[0]!.vm.$emit('update:modelValue', '변경 코멘트');
      expect(wrapper.emitted('update:comment')?.[0]).toEqual(['변경 코멘트']);

      const dropdowns = wrapper.findAllComponents({ name: 'BaseDropdownList' });
      expect(dropdowns.length).toBe(2);
      await dropdowns[0]!.vm.$emit('update:modelValue', 'C');
      expect(wrapper.emitted('update:selectedEqpState')?.[0]).toEqual(['C']);

      await dropdowns[1]!.vm.$emit('update:modelValue', 'CA001');
      expect(wrapper.emitted('update:selectedDownCode')?.[0]).toEqual(['CA001']);
    });
  });

  describe('MachineStatusDetailChamberCard', () => {
    it('uses ds-screen__card, renders Chamber checkbox and 장비 INFORM button', async () => {
      const wrapper = mount(MachineStatusDetailChamberCard, {
        props: {
          isChamberChecked: false,
          isLoading: false,
        },
      });

      expect(wrapper.classes()).toContain('ds-screen__card');
      expect(wrapper.classes()).not.toContain('machine-status-detail-card');
      expect(wrapper.text()).toContain('Chamber 장비까지 일괄변경');
      expect(wrapper.text()).toContain('장비 INFORM');

      const checkbox = wrapper.findComponent({ name: 'BaseCheckbox' });
      await checkbox.vm.$emit('update:modelValue', true);
      expect(wrapper.emitted('update:isChamberChecked')?.[0]).toEqual([true]);

      const btn = wrapper.findComponent({ name: 'BaseButton' });
      await btn.trigger('click');
      expect(wrapper.emitted('machine-inform')).toBeTruthy();
    });
  });
});
