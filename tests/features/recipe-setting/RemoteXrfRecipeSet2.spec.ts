import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import RemoteXrfRecipeSet2 from '~/features/recipe-setting/pages/RemoteXrfRecipeSet2.vue';

const BaseScreenStub = {
  template: '<div class="base-screen"><slot /><slot name="footer" /></div>',
};
const BaseInputStub = {
  props: ['modelValue', 'label', 'id'],
  emits: ['update:modelValue'],
  template:
    '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};
const BaseDropdownListStub = {
  props: ['modelValue', 'options', 'id'],
  emits: ['update:modelValue'],
  template: `
<select :id="id" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
<option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
</select>
  `,
};
const BaseButtonStub = {
  props: ['id', 'label'],
  emits: ['click'],
  template: '<button :id="id" @click="$emit(\'click\')">{{ label }}</button>',
};

describe('RemoteXrfRecipeSet2.vue', () => {
  const globalStubs = {
    BaseScreen: BaseScreenStub,
    BaseInput: BaseInputStub,
    BaseDropdownList: BaseDropdownListStub,
    BaseButton: BaseButtonStub,
  };

  const mountScreen = (props: Record<string, string> = {}) =>
    mount(RemoteXrfRecipeSet2, {
      global: { stubs: globalStubs },
      props,
    });

  const optionValues = (wrapper: ReturnType<typeof mountScreen>, id: string) =>
    wrapper.findAll(`#${id} option`).map((option) => (option.element as HTMLOptionElement).value);

  it('renders all required form controls', () => {
    const wrapper = mountScreen({ slot: 'TEST_SLOT' });

    expect(wrapper.find('#txt_slot').exists()).toBe(true);
    expect(wrapper.find('#spinner_item').exists()).toBe(true);
    expect(wrapper.find('#spinner_prodeqp').exists()).toBe(true);
    expect(wrapper.find('#spinner_mds').exists()).toBe(true);
    expect(wrapper.find('#spinner_para').exists()).toBe(true);
    expect(wrapper.find('#txt_Recipe').exists()).toBe(true);
    expect(wrapper.find('#btn_save').exists()).toBe(true);
    expect(wrapper.find('#btn_cancel').exists()).toBe(true);
  });

  it('prefills SLOT from the SLOT prop like legacy intent extra', async () => {
    const wrapper = mountScreen({ slot: 'SLOT_05' });
    await flushPromises();

    expect((wrapper.find('#txt_slot').element as HTMLInputElement).value).toBe('SLOT_05');
  });

  it('selects the full text on focus for SLOT and RECIPE like the legacy selectAllOnFocus', () => {
    const wrapper = mountScreen();

    expect(wrapper.find('#txt_slot').attributes()).toHaveProperty('select-on-focus');
    expect(wrapper.find('#txt_Recipe').attributes()).toHaveProperty('select-on-focus');
  });

  it('leaves SLOT empty when no SLOT prop is given', () => {
    const wrapper = mountScreen();

    expect((wrapper.find('#txt_slot').element as HTMLInputElement).value).toBe('');
  });

  it('renders dropdown options matching the legacy hardcoded lists', () => {
    const wrapper = mountScreen();

    expect(optionValues(wrapper, 'spinner_item')).toEqual(['2016 LINE-SPT', '2010_계측기']);
    expect(optionValues(wrapper, 'spinner_prodeqp')).toEqual(['4M12-03']);
    expect(optionValues(wrapper, 'spinner_mds')).toHaveLength(28);
    expect(optionValues(wrapper, 'spinner_mds')[0]).toBe('MDS SAMPLE');
    expect(optionValues(wrapper, 'spinner_para')).toEqual([
      'CH2',
      'CH3',
      'CH4',
      'NONE',
      'THICKNESS',
    ]);
  });

  it('sets TEST RECIPE when changing spinner_para', async () => {
    const wrapper = mountScreen();

    await wrapper.find('#spinner_para').setValue('NONE');

    expect((wrapper.find('#txt_Recipe').element as HTMLInputElement).value).toBe('TEST RECIPE');
  });

  it('emits the user-selected values in the legacy result shape on btn_save', async () => {
    const wrapper = mountScreen({ slot: 'SLOT_05' });

    await wrapper.find('#spinner_item').setValue('2010_계측기');
    await wrapper.find('#spinner_prodeqp').setValue('4M12-03');
    await wrapper.find('#spinner_mds').setValue('THK Al 40000');
    await wrapper.find('#spinner_para').setValue('CH3');
    await wrapper.find('#btn_save').trigger('click');

    expect(wrapper.emitted('result')![0][0]).toEqual({
      PRODEQP: '4M12-03',
      SAMPLE: 'THK Al 40000',
      PARA: 'CH3',
      RECIPE: 'TEST RECIPE',
      SLOT: 'SLOT_05',
    });
    expect(wrapper.emitted('finish')).toBeTruthy();
  });

  it('emits the typed RECIPE and edited SLOT on btn_save', async () => {
    const wrapper = mountScreen({ slot: 'SLOT_05' });

    await wrapper.find('#txt_slot').setValue('SLOT_09');
    await wrapper.find('#txt_Recipe').setValue('MY_RECIPE');
    await wrapper.find('#btn_save').trigger('click');

    expect(wrapper.emitted('result')![0][0]).toMatchObject({
      RECIPE: 'MY_RECIPE',
      SLOT: 'SLOT_09',
    });
  });

  it('emits empty selections and finish when btn_save is clicked before choosing', async () => {
    const wrapper = mountScreen({ slot: 'SLOT_05' });

    await wrapper.find('#btn_save').trigger('click');

    expect(wrapper.emitted('result')).toBeTruthy();
    expect(wrapper.emitted('result')![0][0]).toEqual({
      PRODEQP: '',
      SAMPLE: '',
      PARA: '',
      RECIPE: '',
      SLOT: 'SLOT_05',
    });
    expect(wrapper.emitted('finish')).toBeTruthy();
  });

  it('ignores a second btn_save click within 1000 ms', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountScreen({ slot: 'SLOT_05' });

      await wrapper.find('#btn_save').trigger('click');
      vi.advanceTimersByTime(500);
      await wrapper.find('#btn_save').trigger('click');

      expect(wrapper.emitted('result')).toHaveLength(1);
      expect(wrapper.emitted('finish')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shares the 1000 ms guard between btn_save and btn_cancel', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountScreen({ slot: 'SLOT_05' });

      await wrapper.find('#btn_save').trigger('click');
      await wrapper.find('#btn_cancel').trigger('click');

      expect(wrapper.emitted('result')).toHaveLength(1);
      expect(wrapper.emitted('finish')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('accepts a click again once 1000 ms have passed', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountScreen();

      await wrapper.find('#btn_cancel').trigger('click');
      vi.advanceTimersByTime(1001);
      await wrapper.find('#btn_cancel').trigger('click');

      expect(wrapper.emitted('finish')).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('emits finish event without result when btn_cancel is clicked', async () => {
    const wrapper = mountScreen();

    await wrapper.find('#btn_cancel').trigger('click');

    expect(wrapper.emitted('result')).toBeFalsy();
    expect(wrapper.emitted('finish')).toBeTruthy();
  });

  it('discards edits and emits no result when btn_cancel is clicked after changes', async () => {
    const wrapper = mountScreen({ slot: 'SLOT_05' });

    await wrapper.find('#spinner_para').setValue('CH4');
    await wrapper.find('#btn_cancel').trigger('click');

    expect(wrapper.emitted('result')).toBeFalsy();
    expect(wrapper.emitted('finish')).toBeTruthy();
  });
});
