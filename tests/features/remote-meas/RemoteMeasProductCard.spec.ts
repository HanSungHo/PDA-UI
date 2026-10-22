import { mount } from '@vue/test-utils';
import RemoteMeasProductCard from 'src/features/remote-meas/components/RemoteMeasProductCard.vue';
import { describe, expect, it } from 'vitest';

describe('RemoteMeasProductCard.vue', () => {
  const defaultProps = {
    lotId: 'LOT-TEST-01',
    portState: 'IDLE',
    portStatusKind: 'IDLE',
    procEqpId: 'MEQP-01',
    isMachineDisabled: false,
    selectedPort: 'PORT1',
    portOptions: [
      { label: 'PORT1', value: 'PORT1' },
      { label: 'PORT2', value: 'PORT2' },
    ],
    isPortDisabled: false,
    isClearPortEnabled: true,
    selectedFlag: 'T',
    flagOptions: [
      { label: 'T', value: 'T' },
      { label: 'P', value: 'P' },
    ],
    recipeName: 'RCP-01',
    prodMachine: 'PROD-01',
    waferCount: 3,
    selectedWaferList: '1,2,3',
    isLoading: false,
  };

  it('renders props correctly', () => {
    const wrapper = mount(RemoteMeasProductCard, {
      props: defaultProps,
      global: {
        stubs: {
          BaseInput: {
            props: ['label', 'modelValue'],
            template: '<div class="base-input-stub">{{ label }}: {{ modelValue }}</div>',
          },
          BaseDropdownList: {
            props: ['label', 'modelValue'],
            template: '<div class="base-dropdown-stub">{{ label }}: {{ modelValue }}</div>',
          },
          BaseButton: {
            props: ['label'],
            template: '<button>{{ label }}</button>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('LOT No.: LOT-TEST-01');
    expect(wrapper.text()).toContain('PORT 상태: IDLE');
  });

  it('emits input events for machine and prodMachine', () => {
    const wrapper = mount(RemoteMeasProductCard, {
      props: defaultProps,
      global: {
        stubs: {
          BaseInput: true,
          BaseDropdownList: true,
          BaseButton: true,
        },
      },
    });

    // Trigger methods directly or via vm
    const vm = wrapper.vm as unknown as Record<string, (val?: unknown) => void>;
    vm.onMachineInput('MEQP-NEW');
    expect(wrapper.emitted('update:procEqpId')?.[0]).toEqual(['MEQP-NEW']);

    vm.onProdMachineInput('PROD-NEW');
    expect(wrapper.emitted('update:prodMachine')?.[0]).toEqual(['PROD-NEW']);

    vm.onMachineEnter();
    expect(wrapper.emitted('machine-enter')).toBeTruthy();

    vm.onProdMachineEnter();
    expect(wrapper.emitted('prod-machine-enter')).toBeTruthy();

    vm.onPortChange('PORT2');
    expect(wrapper.emitted('update:selectedPort')?.[0]).toEqual(['PORT2']);

    vm.onFlagChange('P');
    expect(wrapper.emitted('update:selectedFlag')?.[0]).toEqual(['P']);
  });
});
