import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { BaseDropdownList } from 'src/components/base';
import { BaseEmptyState } from 'src/components/base/empty-state';
import MultiMaskLocationPage from 'src/features/multi-mask-location/pages/MultiMaskLocationPage.vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

const service = vi.hoisted(() => ({
  changeMaskLocation: vi.fn(),
  fetchMaskDetailLocations: vi.fn(),
  fetchMaskInfo: vi.fn(),
  fetchMaskLocationGroups: vi.fn(),
  fetchMaskStatuses: vi.fn(),
}));

vi.mock('src/features/multi-mask-location/services/multi-mask-location.service', () => service);

let wrapper: ReturnType<typeof mount>;

async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/main', component: { template: '<div>MAIN</div>' } },
      { path: '/mask-bulk-change', component: MultiMaskLocationPage },
    ],
  });
  await router.push('/main');
  await router.push('/mask-bulk-change');
  await router.isReady();
  wrapper = mount(MultiMaskLocationPage, {
    attachTo: document.body,
    global: { plugins: [createPinia(), router] },
  });
  await flushPromises();
  return router;
}

function button(name: string) {
  const result = wrapper.findAll('button').find((item) => item.text() === name);
  if (!result) throw new Error(`Missing button ${name}`);
  return result;
}

function dropdown(label: string) {
  const result = wrapper
    .findAllComponents(BaseDropdownList)
    .find((item) => item.props('label') === label || item.props('ariaLabel') === label);
  if (!result) throw new Error(`Missing dropdown ${label}`);
  return result;
}

beforeEach(() => {
  vi.resetAllMocks();
  service.fetchMaskStatuses.mockResolvedValue(['STOCK', 'INUSE']);
  service.fetchMaskInfo.mockResolvedValue({
    MASKTAG: 'MASK-0001',
    ISUSE: 'Y',
    STATUS: 'STOCK',
    CURRLOC: 'STOCKER-A',
    PRODUCT: 'P-1',
  });
});

afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = '';
});

describe('MultiMaskLocationPage', () => {
  it('renders the Android title, labels, empty grid, List Clear and 확인/취소 actions', async () => {
    await render();

    expect(wrapper.get('h1').text()).toBe('복수 MASK 위치 지정');
    expect(wrapper.text()).toContain('MASK TAG');
    expect(wrapper.getComponent(BaseEmptyState).props('iconVariant')).toBe('filled');
    expect(button('List Clear').exists()).toBe(true);
    expect(button('확인').exists()).toBe(true);
    expect(button('취소').exists()).toBe(true);
    expect(dropdown('층').props('options')).toEqual([
      { label: '2F', value: '2F' },
      { label: '4F', value: '4F' },
      { label: '6F', value: '6F' },
    ]);
    expect(dropdown('사용여부').props('options')).toEqual([
      { label: '사용가능', value: '사용가능' },
      { label: '사용불가', value: '사용불가' },
    ]);
    expect(dropdown('상세위치').props('label')).toBeUndefined();
  });

  it('has no placeholder on any field, like the Android layout', async () => {
    await render();

    expect(
      wrapper.findAll('input[placeholder]').filter((input) => input.attributes('placeholder')),
    ).toEqual([]);
    for (const component of [
      ...wrapper.findAllComponents({ name: 'BaseInput' }),
      ...wrapper.findAllComponents({ name: 'BaseDropdownList' }),
    ]) {
      expect(component.props('placeholder')).toBeUndefined();
    }
  });

  it('loads statuses on entry and focuses the MASK TAG field', async () => {
    await render();

    expect(service.fetchMaskStatuses).toHaveBeenCalledOnce();
    expect(dropdown('상태').props('options')).toEqual([
      { label: 'STOCK', value: 'STOCK' },
      { label: 'INUSE', value: 'INUSE' },
    ]);
    expect(document.activeElement).toBe(wrapper.get('input').element);
  });

  it('scans with Enter in uppercase and renders the mask grid', async () => {
    await render();
    const input = wrapper.get('input');

    await input.setValue('rt-0001x');
    await input.trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(service.fetchMaskInfo).toHaveBeenCalledWith('RT-0001', '');
    expect(wrapper.findComponent(BaseEmptyState).exists()).toBe(false);
    expect(wrapper.find('[data-testid="base-revo-grid"]').exists()).toBe(true);

    await button('List Clear').trigger('click');
    expect(wrapper.findComponent(BaseEmptyState).exists()).toBe(true);
  });

  it('shows validation feedback in a dialog and closes it with 확인', async () => {
    await render();

    await button('확인').trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('위치 변경할 Mask를 읽어주세요.');
  });

  it('returns to the previous screen on 취소', async () => {
    const router = await render();

    await button('취소').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/main');
  });
});
