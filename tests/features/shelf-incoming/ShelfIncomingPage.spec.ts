import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { BaseEmptyState } from 'src/components/base/empty-state';
import { ShelfIncomingGridCell } from 'src/features/shelf-incoming/components/ShelfIncomingGridCell';
import ShelfIncomingPage from 'src/features/shelf-incoming/pages/ShelfIncomingPage.vue';
import { sendShelfMessage } from 'src/features/shelf-incoming/services/shelf-incoming.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

vi.mock('src/features/shelf-incoming/services/shelf-incoming.service', () => ({
  sendShelfMessage: vi.fn(),
}));
const send = vi.mocked(sendShelfMessage);
const pass = (body: Record<string, string> = {}) => ({
  statusCode: 200,
  result: JSON.stringify({ STATUS: 'PASS', MSGBODY: body }),
});
let wrapper: ReturnType<typeof mount>;
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/shelf-incoming', component: ShelfIncomingPage },
      { path: '/esheet', component: { template: '<div>ESHEET</div>' } },
    ],
  });
  await router.push('/shelf-incoming');
  await router.isReady();
  wrapper = mount(ShelfIncomingPage, {
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
beforeEach(() => {
  send.mockReset();
  send.mockImplementation(async (name) =>
    name === 'SHELFCALL'
      ? pass({ CATEGORY: 'S' })
      : pass({
          PRODUCTSPECNAME: 'PRODUCT',
          PROCESSOPERATIONNAME: '1200',
          OPERATIONDESCRIPTION: 'PHOTO',
        }),
  );
});
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = '';
});
describe('Shelf Incoming rendered controls', () => {
  it('looks up SHELF and LOT and renders the 24-slot RevoGrid', async () => {
    await render();
    expect(wrapper.text()).toContain('EMPTY');
    expect(wrapper.getComponent(BaseEmptyState).props('iconVariant')).toBe('filled');
    expect(button('SHELF IN').attributes('disabled')).toBeDefined();
    const inputs = wrapper.findAll('input');
    await inputs[0]!.setValue('shelf-01');
    await wrapper
      .findAll('button')
      .filter((item) => item.text() === '조회')[0]!
      .trigger('click');
    await flushPromises();
    expect(inputs[0]!.element.value).toBe('SHELF-01');
    expect(button('SHELF IN').attributes('disabled')).toBeUndefined();
    expect(button('CART IN').attributes('disabled')).toBeDefined();
    await inputs[1]!.setValue('lot-01');
    await wrapper
      .findAll('button')
      .filter((item) => item.text() === '조회')[1]!
      .trigger('click');
    await flushPromises();
    expect(wrapper.get('[aria-label="LOT 정보"]').text()).toContain('PRODUCT');
    const grid = wrapper.findComponent({ name: 'BaseRevoGrid' });
    expect(grid.exists()).toBe(true);
    expect(grid.props('rows')).toHaveLength(8);
    expect(grid.props('columns')).toHaveLength(3);
    expect(
      grid
        .props('rows')
        .map((row: { c0: string; c1: string; c2: string }) => [row.c0, row.c1, row.c2])
        .flat(),
    ).toHaveLength(24);
    await inputs[1]!.setValue('LOT-02');
    await wrapper
      .findAll('button')
      .filter((item) => item.text() === '조회')[1]!
      .trigger('click');
    await flushPromises();
    await button('SHELF OUT').trigger('click');
    await flushPromises();
    expect(send).toHaveBeenLastCalledWith(
      'LOTOUTSHELF',
      expect.arrayContaining([['DELETESHELFLOT', 'LOT-01|LOT-02']]),
      expect.anything(),
    );
    expect(wrapper.text()).toContain('EMPTY');
  });
  it('renders a LOT cell button and delegates its zero-based slot selection', async () => {
    const selected = ref<number[]>([]);
    const loading = ref(false);
    const onToggle = vi.fn();
    const parent = document.createElement('div');
    const onParentKeydown = vi.fn();
    parent.addEventListener('keydown', onParentKeydown);
    const cell = mount(ShelfIncomingGridCell, {
      attachTo: parent,
      props: {
        model: { id: 0, c0: 'LOT-01', c1: '', c2: '' },
        prop: 'c0',
        selected,
        loading,
        onToggle,
      },
    });

    const cellButton = cell.get('button');
    expect(cellButton.attributes('aria-label')).toBe('LOT 위치 1: LOT-01');
    expect(cellButton.attributes('aria-pressed')).toBe('false');
    await cellButton.trigger('click');
    expect(onToggle).toHaveBeenCalledWith(0);
    await cellButton.trigger('keydown', { key: 'Enter' });
    expect(onParentKeydown).not.toHaveBeenCalled();

    selected.value = [0];
    await cell.vm.$nextTick();
    expect(cell.get('button').attributes('aria-pressed')).toBe('true');
    expect(cell.get('button').classes()).toContain('shelf-incoming__cell--selected');

    loading.value = true;
    await cell.vm.$nextTick();
    expect(cell.get('button').attributes('disabled')).toBeDefined();

    cell.unmount();
    parent.remove();
  });
  it('maps the second grid column to its empty LOT slot label', () => {
    const cell = mount(ShelfIncomingGridCell, {
      props: {
        model: { id: 1, c0: '', c1: '', c2: '' },
        prop: 'c1',
        selected: ref([9]),
        loading: ref(false),
        onToggle: vi.fn(),
      },
    });

    expect(cell.get('button').attributes('aria-label')).toBe('LOT 위치 10: 비어 있음');
    expect(cell.get('button').attributes('aria-pressed')).toBe('true');
    cell.unmount();
  });
  it('shows the actual dialog, acknowledges it and closes to the fallback eSheet route', async () => {
    const router = await render();
    await wrapper
      .findAll('button')
      .filter((item) => item.text() === '조회')[1]!
      .trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('LOT NO를 입력하세요');
    const confirm = Array.from(document.body.querySelectorAll('button')).find(
      (item) => item.textContent?.trim() === '확인',
    );
    expect(confirm).toBeDefined();
    confirm?.click();
    await flushPromises();
    expect(document.body.textContent).not.toContain('LOT NO를 입력하세요');
    await button('닫기').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/esheet');
  });
  it('runs barcode lookup on Enter rather than on input change', async () => {
    await render();
    const input = wrapper.findAll('input')[0]!;
    await input.setValue('EQP-$SHELF-01#');
    expect(send).not.toHaveBeenCalled();
    await input.trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(send).toHaveBeenCalledWith('SHELFCALL', [['SHELFNO', '$SHELF-01']], expect.anything());
  });
});
