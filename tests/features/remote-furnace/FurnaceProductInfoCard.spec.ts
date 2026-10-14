import { mount } from '@vue/test-utils';
import { BaseDropdownList } from 'src/components/base';
import FurnaceProductInfoCard from 'src/features/remote-furnace/components/FurnaceProductInfoCard.vue';
import { describe, expect, it } from 'vitest';

describe('FurnaceProductInfoCard.vue', () => {
  const defaultProps = {
    lotId: 'WIP00001',
    batchId: 'BAT-FN-202610',
    recipe: 'FURNACE_DIFF_1000',
    selectedRecipe: 'FURNACE_DIFF_1000',
    recipeOptions: ['FURNACE_DIFF_1000', 'FURNACE_DIFF_2000'],
    standardMachine: 'FN01,FN02',
    isStandardMachineChanged: false,
    processingMachine: 'FN01',
    exMachine: 'OX-STN-01',
    selectedPort: 'PORT1',
    portOptions: ['PORT1', 'PORT2'],
    portState: 'READY',
    portStatusKind: 'ready' as const,
    isMachineDisabled: false,
    isPortDisabled: false,
    isRecipeDisabled: false,
    isClearPortDisabled: false,
    isLoading: false,
  };

  it('renders lot, batch, recipe and standard machine values', () => {
    const wrapper = mount(FurnaceProductInfoCard, {
      props: defaultProps,
    });

    const text = wrapper.text();
    expect(text).toContain('LOT');
    expect(text).toContain('BATCH');
    expect(text).toContain('RECIPE');
    expect(text).toContain('기준장비');
    expect(text).toContain('진행장비');
    expect(text).toContain('PORT');
    expect(text).toContain('READY');
    expect(text).toContain('OX-STN-01');
  });

  it('emits clear-port when 초기화 button is clicked', async () => {
    const wrapper = mount(FurnaceProductInfoCard, {
      props: defaultProps,
    });

    const clearBtn = wrapper.find('.furnace-card__btn-clear-port');
    expect(clearBtn.exists()).toBe(true);
    await clearBtn.trigger('click');

    expect(wrapper.emitted('clear-port')).toHaveLength(1);
  });

  it('emits update:processing-machine in uppercase when input changes', async () => {
    const wrapper = mount(FurnaceProductInfoCard, {
      props: defaultProps,
    });

    const machineInput = wrapper.find('.furnace-card__field--machine input');
    expect(machineInput.exists()).toBe(true);

    await machineInput.setValue('fn02');
    expect(wrapper.emitted('update:processing-machine')?.[0]).toEqual(['FN02']);
  });

  it('emits machine-enter on keydown.enter', async () => {
    const wrapper = mount(FurnaceProductInfoCard, {
      props: defaultProps,
    });

    const machineInput = wrapper.find('.furnace-card__field--machine input');
    await machineInput.trigger('keydown.enter');

    expect(wrapper.emitted('machine-enter')).toHaveLength(1);
  });

  it('emits recipe-change and port-change when dropdowns update', async () => {
    const wrapper = mount(FurnaceProductInfoCard, {
      props: defaultProps,
    });

    const dropdowns = wrapper.findAllComponents(BaseDropdownList);
    expect(dropdowns.length).toBeGreaterThanOrEqual(2);

    // Recipe dropdown
    await dropdowns[0].vm.$emit('update:modelValue', 'FURNACE_DIFF_2000');
    expect(wrapper.emitted('recipe-change')?.[0]).toEqual(['FURNACE_DIFF_2000']);

    // Port dropdown
    await dropdowns[1].vm.$emit('update:modelValue', 'PORT2');
    expect(wrapper.emitted('port-change')?.[0]).toEqual(['PORT2']);

    // Non-string updates should not emit
    await dropdowns[0].vm.$emit('update:modelValue', null);
    expect(wrapper.emitted('recipe-change')).toHaveLength(1);
  });

  it('highlights standardMachine when isStandardMachineChanged is true', () => {
    const wrapper = mount(FurnaceProductInfoCard, {
      props: {
        ...defaultProps,
        isStandardMachineChanged: true,
      },
    });

    expect(wrapper.find('.furnace-card__field--changed').exists()).toBe(true);
  });

  it('highlights recipe when isRecipeChanged is true', () => {
    const wrapper = mount(FurnaceProductInfoCard, {
      props: {
        ...defaultProps,
        isRecipeChanged: true,
      },
    });

    expect(wrapper.find('.furnace-card__field--changed').exists()).toBe(true);
  });

  it('exposes focusMachineInput method and focuses the input', async () => {
    const wrapper = mount(FurnaceProductInfoCard, {
      props: defaultProps,
      attachTo: document.body,
    });

    expect(typeof wrapper.vm.focusMachineInput).toBe('function');
    wrapper.vm.focusMachineInput();
    await wrapper.vm.$nextTick();

    const input = wrapper.find('.furnace-card__field--machine input').element as HTMLInputElement;
    expect(document.activeElement).toBe(input);

    wrapper.unmount();
  });
});
