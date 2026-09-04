import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, type PropType, ref } from 'vue';

import BaseSearch from '../../src/components/base/search/BaseSearch.vue';

const InputStub = defineComponent({
  name: 'AInput',
  inheritAttrs: false,
  props: {
    value: { type: String, default: '' },
    disabled: Boolean,
    readonly: Boolean,
    autofocus: Boolean,
    placeholder: { type: String, default: undefined },
    size: { type: String as PropType<'small' | 'middle' | 'large'>, default: undefined },
    status: { type: String as PropType<'warning' | 'error'>, default: undefined },
  },
  emits: ['update:value', 'change', 'pressEnter', 'focus', 'blur'],
  setup(props, { attrs, emit, expose, slots }) {
    const inputElement = ref<HTMLInputElement>();
    expose({ focus: () => inputElement.value?.focus() });
    return () =>
      h('div', { class: 'input-stub-root' }, [
        slots.prefix?.(),
        h('input', {
          ref: inputElement,
          ...attrs,
          class: 'input-stub',
          value: props.value,
          disabled: props.disabled,
          readonly: props.readonly,
          autofocus: props.autofocus,
          placeholder: props.placeholder,
          onInput: (event: Event) => emit('update:value', (event.target as HTMLInputElement).value),
          onChange: (event: Event) => emit('change', event),
          onKeydown: (event: KeyboardEvent) => {
            if (event.key === 'Enter') emit('pressEnter', event);
          },
          onFocus: (event: FocusEvent) => emit('focus', event),
          onBlur: (event: FocusEvent) => emit('blur', event),
        }),
        slots.suffix?.(),
      ]);
  },
});

function mountSearch(props: Record<string, unknown> = {}, attachToDocument = false) {
  return mount(BaseSearch, {
    props,
    ...(attachToDocument ? { attachTo: document.body } : {}),
    global: {
      stubs: {
        AInput: InputStub,
        CloseOutlined: true,
        LoadingOutlined: true,
        SearchOutlined: true,
      },
    },
  });
}

describe('BaseSearch', () => {
  it('locks the public prop contract and defaults', () => {
    const wrapper = mountSearch();

    expect(Object.keys(wrapper.props()).sort()).toEqual(
      [
        'ariaLabel',
        'autofocus',
        'block',
        'clearable',
        'debounce',
        'disabled',
        'error',
        'errorMessage',
        'hint',
        'id',
        'label',
        'loading',
        'modelValue',
        'placeholder',
        'readonly',
        'required',
        'size',
        'status',
      ].sort(),
    );
    expect(wrapper.props()).toMatchObject({
      modelValue: '',
      clearable: true,
      debounce: 300,
      disabled: false,
      readonly: false,
      loading: false,
      autofocus: false,
      required: false,
      size: 'medium',
      status: 'default',
      block: false,
    });
  });

  it.each([
    ['small', 'small'],
    ['medium', 'middle'],
    ['large', 'large'],
  ] as const)('maps %s to Ant size %s', (size, expected) => {
    expect(mountSearch({ size }).getComponent(InputStub).props('size')).toBe(expected);
  });

  it.each([
    ['default', undefined],
    ['success', undefined],
    ['warning', 'warning'],
    ['error', 'error'],
  ] as const)('maps status %s without leaking unsupported Ant statuses', (status, expected) => {
    expect(mountSearch({ status }).getComponent(InputStub).props('status')).toBe(expected);
  });

  it('error takes precedence and renders its message instead of hint', () => {
    const wrapper = mountSearch({ status: 'success', hint: 'Hint', errorMessage: 'Invalid' });
    expect(wrapper.classes()).toContain('ds-field--error');
    expect(wrapper.text()).toContain('Invalid');
    expect(wrapper.text()).not.toContain('Hint');
  });

  it('renders an associated required label and accessible metadata', () => {
    const wrapper = mountSearch({ id: 'part-search', label: 'Part', required: true, hint: 'Code' });
    expect(wrapper.get('label').attributes('for')).toBe('part-search');
    expect(wrapper.get('label').text()).toContain('*');
    expect(wrapper.get('input').attributes('aria-required')).toBe('true');
    expect(wrapper.get('input').attributes('aria-describedby')).toBe('part-search-message');
  });

  it('emits model, change, search, focus and blur through the base API', async () => {
    const wrapper = mountSearch({ modelValue: 'old' });
    const input = wrapper.get<HTMLInputElement>('input');
    input.element.value = 'new';
    await input.trigger('input');
    await input.trigger('change');
    await input.trigger('keydown', { key: 'Enter' });
    await input.trigger('focus');
    await input.trigger('blur');

    expect(wrapper.emitted('update:modelValue')).toEqual([['new']]);
    expect(wrapper.emitted('change')?.[0]?.[0]).toBe('new');
    expect(wrapper.emitted('search')).toHaveLength(1);
    expect(wrapper.emitted('focus')).toHaveLength(1);
    expect(wrapper.emitted('blur')).toHaveLength(1);
  });

  it('shows clear only for an editable value and emits clear with an empty model', async () => {
    const wrapper = mountSearch({ modelValue: 'query' }, true);
    await wrapper.get('.ds-search__clear').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([['']]);
    expect(wrapper.emitted('clear')).toEqual([[]]);
    expect(document.activeElement).toBe(wrapper.get('input').element);
    expect(mountSearch({ modelValue: '' }).find('.ds-search__clear').exists()).toBe(false);
    expect(mountSearch({ modelValue: '   ' }).find('.ds-search__clear').exists()).toBe(false);
    wrapper.unmount();
  });

  it('searches immediately when the search icon is clicked', async () => {
    const wrapper = mountSearch({ modelValue: 'part number' });
    await wrapper.get('.ds-search__action').trigger('click');

    expect(wrapper.emitted('search')).toHaveLength(1);
    expect(wrapper.emitted('search')?.[0]?.[0]).toBe('part number');
    expect(wrapper.emitted('search')?.[0]?.[1]).toBeInstanceOf(MouseEvent);
  });

  it('debounces search while typing and emits only the latest value', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountSearch({ debounce: 300 });
      const input = wrapper.get<HTMLInputElement>('input');

      input.element.value = 'par';
      await input.trigger('input');
      input.element.value = 'part';
      await input.trigger('input');

      expect(wrapper.emitted('search')).toBeUndefined();
      vi.advanceTimersByTime(299);
      expect(wrapper.emitted('search')).toBeUndefined();
      vi.advanceTimersByTime(1);
      expect(wrapper.emitted('search')).toEqual([['part']]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels a pending debounced search when Enter triggers an immediate search', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountSearch({ modelValue: 'part', debounce: 300 });
      const input = wrapper.get<HTMLInputElement>('input');
      input.element.value = 'part';
      await input.trigger('input');
      await input.trigger('keydown', { key: 'Enter' });
      vi.runAllTimers();

      expect(wrapper.emitted('search')).toHaveLength(1);
      expect(wrapper.emitted('search')?.[0]?.[0]).toBe('part');
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['disabled', 'readonly', 'loading'] as const)(
    '%s blocks value/search/clear interaction',
    async (state) => {
      const wrapper = mountSearch({ modelValue: 'query', [state]: true });
      const input = wrapper.get<HTMLInputElement>('input');
      input.element.value = 'changed';
      await input.trigger('input');
      await input.trigger('keydown', { key: 'Enter' });
      await nextTick();
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.emitted('search')).toBeUndefined();
      expect(wrapper.find('.ds-search__clear').exists()).toBe(false);
      expect(input.element.disabled).toBe(state !== 'readonly');
      expect(input.element.readOnly).toBe(state === 'readonly');
    },
  );
});
