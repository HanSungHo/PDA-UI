import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import { BasePagination as ExportedBasePagination } from '../../src/components/base/pagination';
import BasePagination from '../../src/components/base/pagination/BasePagination.vue';

const APaginationStub = defineComponent({
  name: 'APagination',
  props: {
    current: { type: Number, required: true },
    total: { type: Number, required: true },
    pageSize: { type: Number, required: true },
    pageSizeOptions: { type: Array, required: true },
    showSizeChanger: { type: Boolean, required: true },
    showQuickJumper: { type: Boolean, required: true },
    showTotal: { type: Function, default: undefined },
    disabled: { type: Boolean, required: true },
    simple: { type: Boolean, required: true },
    size: { type: String, required: true },
  },
  emits: ['change', 'showSizeChange'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'pagination-stub' }, [
        h(
          'button',
          {
            disabled: props.disabled,
            onClick: () => emit('change', props.current + 1, props.pageSize),
          },
          String(props.current),
        ),
        h(
          'button',
          { onClick: () => emit('showSizeChange', props.current, props.pageSize * 2) },
          String(props.pageSize),
        ),
      ]);
  },
});

function factory(props: Record<string, unknown> = {}) {
  return mount(BasePagination, {
    props,
    attrs: { 'data-testid': 'pagination' },
    global: { stubs: { APagination: APaginationStub } },
  });
}

describe('BasePagination', () => {
  it('exports the component through the design-system barrel', () => {
    expect(ExportedBasePagination).toBe(BasePagination);
  });

  it('applies defaults and passes the controlled values to Ant Pagination', () => {
    const wrapper = factory({ modelValue: 3, total: 100 });
    const control = wrapper.getComponent(APaginationStub);

    expect(control.props()).toMatchObject({
      current: 3,
      total: 100,
      pageSize: 10,
      pageSizeOptions: [],
      showSizeChanger: false,
      showQuickJumper: false,
      disabled: false,
      simple: false,
      size: 'default',
    });
    expect(wrapper.attributes('data-testid')).toBe('pagination');
  });

  it('forwards pagination options and custom total renderer', () => {
    const showTotal = (total: number, range: [number, number]) => `${range.join('-')} / ${total}`;
    const wrapper = factory({
      pageSize: 20,
      pageSizeOptions: [10, 20, 50],
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal,
      simple: true,
      size: 'small',
    });
    const control = wrapper.getComponent(APaginationStub);

    expect(control.props('pageSize')).toBe(20);
    expect(control.props('pageSizeOptions')).toEqual([10, 20, 50]);
    expect(control.props('showSizeChanger')).toBe(true);
    expect(control.props('showQuickJumper')).toBe(true);
    expect(control.props('showTotal')).toBe(showTotal);
    expect(control.props('simple')).toBe(true);
    expect(control.props('size')).toBe('small');
  });

  it('clamps an invalid model value to the available page range', () => {
    const wrapper = factory({ modelValue: 99, total: 25, pageSize: 10 });
    const control = wrapper.getComponent(APaginationStub);

    expect(control.props('current')).toBe(3);
  });

  it('supports loading state and prevents pagination interaction', () => {
    const wrapper = factory({ loading: true });
    const control = wrapper.getComponent(APaginationStub);

    expect(control.props('disabled')).toBe(true);
    expect(wrapper.attributes('aria-busy')).toBe('true');
    expect(wrapper.classes()).toContain('ds-pagination--loading');
  });

  it('emits one page change with the Ant event payload', async () => {
    const wrapper = factory({ modelValue: 2, pageSize: 10, total: 100 });

    await wrapper.get('.pagination-stub button').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[3]]);
    expect(wrapper.emitted('change')).toEqual([[3, 10]]);
    expect(wrapper.emitted('pageSizeChange')).toBeUndefined();
  });

  it('emits page-size updates without a duplicate page change', async () => {
    const wrapper = factory({ modelValue: 2, pageSize: 10, total: 100 });

    await wrapper.findAll('.pagination-stub button')[1].trigger('click');

    expect(wrapper.emitted('update:pageSize')).toEqual([[20]]);
    expect(wrapper.emitted('pageSizeChange')).toEqual([[20, 2]]);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.emitted('change')).toBeUndefined();
  });

  it('reacts to parent updates and preserves disabled semantics', async () => {
    const wrapper = factory({ modelValue: 1, total: 1, disabled: true });
    const control = wrapper.getComponent(APaginationStub);

    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
    await wrapper.setProps({ modelValue: 4, total: 80, disabled: false });

    expect(control.props('current')).toBe(4);
    expect(control.props('total')).toBe(80);
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined();
  });
});
