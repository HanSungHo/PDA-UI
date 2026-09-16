import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mount } from '@vue/test-utils';
import { baseRangePickerDefaults } from 'components/base/range-picker';
import BaseRangePicker from 'components/base/range-picker/BaseRangePicker.vue';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

type PickerFooterVNode = {
  props: {
    class: string;
  };
  children: Array<{
    props: {
      class: string;
      onClick: (event: { stopPropagation: () => void }) => void;
    };
    children: string;
  }>;
};

describe('BaseRangePicker', () => {
  it('exports documented defaults from the range-picker module', () => {
    expect(baseRangePickerDefaults).toMatchObject({
      disabled: false,
      errorMessage: '',
      format: 'MM/DD/YYYY',
      hint: '',
      inputReadOnly: true,
      layout: 'vertical',
      modelValue: null,
      placeholder: ['Select Date', 'Select Date'],
      required: false,
      size: 'medium',
      valueFormat: 'YYYY-MM-DD',
      showTime: false,
    });
  });

  it('renders two inputs and the horizontal layout when requested', () => {
    const wrapper = mount(BaseRangePicker, {
      props: {
        label: 'Date range',
        layout: 'horizontal',
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-range-picker--horizontal');
      expect(wrapper.classes()).toContain('base-picker');
      expect(wrapper.classes()).toContain('base-range-picker--range');
      expect(wrapper.classes()).toContain('ds-field--horizontal');
      expect(wrapper.get('.base-range-picker__control').classes()).toContain(
        'base-picker__control',
      );
      expect(wrapper.findAll('input')).toHaveLength(2);
      expect(wrapper.findAll('input')[0]?.attributes('placeholder')).toBe('Select Date');
      expect(wrapper.findAll('input')[1]?.attributes('placeholder')).toBe('Select Date');
      expect(wrapper.get('.base-range-picker__range-arrow').classes()).toContain(
        'anticon-arrow-right',
      );
    } finally {
      wrapper.unmount();
    }
  });

  it('passes field accessibility to the range picker boundary instead of mutating child inputs', () => {
    const wrapper = mount(BaseRangePicker, {
      props: {
        hint: 'Helper Text',
        id: 'delivery-range',
        label: 'Date range',
        required: true,
      },
    });
    const picker = wrapper.get('.base-range-picker__accessibility');

    try {
      expect(picker.attributes('id')).toBe('delivery-range-group');
      expect(picker.attributes('role')).toBe('group');
      expect(picker.attributes('aria-labelledby')).toBe('delivery-range-label');
      expect(picker.attributes('aria-describedby')).toBe('delivery-range-message');
      expect(picker.attributes('aria-required')).toBeUndefined();
      expect(wrapper.findAll('input')[0]?.attributes('id')).toBe('delivery-range');
      expect(wrapper.findAll('input')[1]?.attributes('id')).toBeUndefined();
    } finally {
      wrapper.unmount();
    }
  });

  it('tracks the focused range input so the active indicator can follow start and end fields', async () => {
    const wrapper = mount(BaseRangePicker);
    const inputs = wrapper.findAll('input');

    try {
      await inputs[0]?.trigger('focus');

      expect(wrapper.classes()).toContain('base-range-picker--range-start-active');
      expect(wrapper.classes()).not.toContain('base-range-picker--range-end-active');

      await inputs[1]?.trigger('focus');

      expect(wrapper.classes()).toContain('base-range-picker--range-end-active');
      expect(wrapper.classes()).not.toContain('base-range-picker--range-start-active');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses filled state when both range values exist', () => {
    const wrapper = mount(BaseRangePicker, {
      props: {
        modelValue: ['2026-08-01', '2026-08-27'],
      },
    });

    try {
      expect(wrapper.classes()).toContain('base-range-picker--filled');
      expect(wrapper.attributes('data-state')).toBe('filled');
    } finally {
      wrapper.unmount();
    }
  });

  it('passes showTime through to the Ant range picker when enabled', () => {
    const showTimeOptions = {
      format: 'HH:mm:ss',
      showSecond: true,
    };
    const defaultWrapper = mount(BaseRangePicker);
    const showTimeWrapper = mount(BaseRangePicker, {
      props: {
        showTime: showTimeOptions,
      },
    });

    try {
      expect(defaultWrapper.findComponent({ name: 'ARangePicker' }).props('showTime')).toBe(false);
      expect(showTimeWrapper.findComponent({ name: 'ARangePicker' }).props('showTime')).toEqual(
        showTimeOptions,
      );
    } finally {
      defaultWrapper.unmount();
      showTimeWrapper.unmount();
    }
  });

  it('passes input read-only behavior through as an overridable picker prop', () => {
    const defaultWrapper = mount(BaseRangePicker);
    const editableWrapper = mount(BaseRangePicker, {
      props: {
        inputReadOnly: false,
      },
    });

    try {
      expect(defaultWrapper.findComponent({ name: 'ARangePicker' }).props('inputReadOnly')).toBe(
        true,
      );
      expect(editableWrapper.findComponent({ name: 'ARangePicker' }).props('inputReadOnly')).toBe(
        false,
      );
    } finally {
      defaultWrapper.unmount();
      editableWrapper.unmount();
    }
  });

  it('commits clear immediately so reopening does not restore the previous range', async () => {
    const wrapper = mount(BaseRangePicker, {
      props: {
        modelValue: ['2026-08-01', '2026-08-27'],
      },
    });
    const picker = wrapper.findComponent({ name: 'ARangePicker' });

    try {
      await picker.vm.$emit('update:value', null);
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toEqual([[null]]);

      await wrapper.setProps({ modelValue: null });
      picker.props('onOpenChange')(true);
      await nextTick();

      expect(wrapper.findComponent({ name: 'ARangePicker' }).props('value')).toBeUndefined();
    } finally {
      wrapper.unmount();
    }
  });

  it('lets Ant handle showTime confirmation and commits its confirmed value', async () => {
    const wrapper = mount(BaseRangePicker, {
      props: {
        modelValue: null,
        showTime: {
          format: 'HH:mm:ss',
          showSecond: true,
        },
      },
    });
    const picker = wrapper.findComponent({ name: 'ARangePicker' });
    const nextRange = ['2026-09-01 08:00:15', '2026-09-10 17:30:45'];

    try {
      expect(picker.props('open')).toBeUndefined();
      expect(picker.props('renderExtraFooter')).toBeUndefined();

      await picker.vm.$emit('update:value', nextRange);
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toEqual([[nextRange]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('commits selected range only after OK and rolls back when closed without OK', async () => {
    const wrapper = mount(BaseRangePicker, {
      props: {
        modelValue: ['2026-08-01', '2026-08-27'],
      },
    });
    const picker = wrapper.findComponent({ name: 'ARangePicker' });

    try {
      expect(picker.props('value')).toEqual(['2026-08-01', '2026-08-27']);

      picker.props('onOpenChange')(true);
      await nextTick();
      picker.props('onCalendarChange')(['2026-09-01', '2026-09-10']);
      await nextTick();

      let currentPicker = wrapper.findComponent({ name: 'ARangePicker' });

      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(currentPicker.props('value')).toEqual(['2026-09-01', '2026-09-10']);

      currentPicker.props('onOpenChange')(false);
      await nextTick();
      currentPicker = wrapper.findComponent({ name: 'ARangePicker' });

      expect(currentPicker.props('value')).toEqual(['2026-08-01', '2026-08-27']);
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();

      currentPicker.props('onOpenChange')(true);
      await nextTick();
      currentPicker.props('onCalendarChange')(['2026-10-01', '2026-10-10']);
      await nextTick();
      currentPicker = wrapper.findComponent({ name: 'ARangePicker' });

      const footer = currentPicker.props('renderExtraFooter')('date') as PickerFooterVNode;
      const okButton = footer.children[0];

      expect(currentPicker.props('renderExtraFooter')('month')).toBeNull();
      expect(currentPicker.props('renderExtraFooter')('year')).toBeNull();
      okButton.props.onClick({ stopPropagation: () => undefined });
      await nextTick();
      currentPicker = wrapper.findComponent({ name: 'ARangePicker' });

      expect(wrapper.emitted('update:modelValue')).toEqual([[['2026-10-01', '2026-10-10']]]);
      expect(currentPicker.props('open')).toBe(false);

      await currentPicker.vm.$emit('update:value', ['2026-11-01', '2026-11-10']);
      await nextTick();

      expect(wrapper.emitted('update:modelValue')).toEqual([[['2026-10-01', '2026-10-10']]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps the Ant range popup positioning contract at its default while rendering an OK action', async () => {
    const wrapper = mount(BaseRangePicker);

    try {
      let picker = wrapper.findComponent({ name: 'ARangePicker' });

      expect(picker.props('popupClassName')).toBe('base-range-picker__dropdown');
      expect(picker.props('placement')).toBeUndefined();
      expect(picker.props('getPopupContainer')).toBeUndefined();
      expect(picker.props('open')).toBe(false);
      expect(picker.props('renderExtraFooter')).toBeTypeOf('function');

      picker.props('onOpenChange')(true);
      await nextTick();
      picker = wrapper.findComponent({ name: 'ARangePicker' });

      expect(picker.props('open')).toBe(true);
      expect(picker.props('renderExtraFooter')).toBeTypeOf('function');

      const renderExtraFooter = picker.props('renderExtraFooter');
      const footer = renderExtraFooter('date') as PickerFooterVNode;
      const okButton = footer.children[0];

      expect(footer.props.class).toBe('base-range-picker__footer');
      expect(okButton.props.class).toBe('base-range-picker__ok');
      expect(okButton.children).toBe('OK');
      expect(renderExtraFooter('month')).toBeNull();
      expect(renderExtraFooter('year')).toBeNull();
      okButton.props.onClick({ stopPropagation: () => undefined });
      await nextTick();
      picker = wrapper.findComponent({ name: 'ARangePicker' });

      expect(picker.props('open')).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps range picker css scoped to range input and range calendar pieces', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/base/range-picker/base-range-picker.css'),
      'utf8',
    );

    expect(css).toContain('.base-range-picker .base-range-picker__control.ant-picker');
    expect(css).toContain('.base-range-picker .ant-picker-range .ant-picker-input');
    expect(css).toContain(
      '.base-range-picker__dropdown .ant-picker-cell-in-view.ant-picker-cell-in-range',
    );
    expect(css).toContain(
      '.base-range-picker__dropdown .ant-picker-footer:has(.base-range-picker__footer)',
    );
    expect(css).toContain('.base-range-picker__dropdown .base-range-picker__ok');
    expect(css).toContain('.base-range-picker__dropdown .ant-picker-ok .ant-btn-primary');
    expect(css).toContain('.base-range-picker__dropdown .ant-picker-time-panel-column');
    expect(css).toContain('li.ant-picker-time-panel-cell-selected');
    expect(css).toContain('li.ant-picker-time-panel-cell-selected:hover');
    expect(css).toContain('.ant-picker-time-panel-cell-inner:hover');
    expect(css).toMatch(
      /\.base-range-picker__dropdown\s+\.ant-picker-month-panel\s+\.ant-picker-cell-selected/,
    );
    expect(css).toMatch(
      /\.base-range-picker__dropdown\s+\.ant-picker-year-panel\s+\.ant-picker-cell-selected/,
    );
    expect(css).not.toContain('.base-range-picker__dropdown .base-range-picker__today');
    expect(css).not.toContain('ant-picker-ranges');
    expect(css).not.toContain('ds-date-picker');
    expect(css).not.toContain('font-family');
    expect(css).not.toContain('text-transform');
    expect(css).not.toContain('calc(var(--ds-spacing-2) + 2px)');
    expect(css).not.toContain('!important');
  });

  it('does not synchronize accessibility by mutating Ant private input DOM after render', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/base/range-picker/BaseRangePicker.vue'),
      'utf8',
    );

    expect(source).not.toContain('syncInputAccessibility');
    expect(source).not.toContain('setOptionalAttribute');
    expect(source).not.toContain('classList.add');
    expect(source).not.toContain('focusRangePicker');
  });
});
