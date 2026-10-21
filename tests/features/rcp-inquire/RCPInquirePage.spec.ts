import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';

const { checkinspection, metRecipeSearch, okDialogShow } = vi.hoisted(() => ({
  checkinspection: vi.fn(),
  metRecipeSearch: vi.fn(),
  okDialogShow: vi.fn(),
}));

const routerBack = vi.fn();
const routerPush = vi.fn();
const routerReplace = vi.fn();
let routeQuery: Record<string, string> = {};

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({
    back: routerBack,
    push: routerPush,
    replace: routerReplace,
  }),
}));

vi.mock('src/features/rcp-inquire/services/rcp-inquire.service', () => ({
  checkinspection,
  metRecipeSearch,
}));

vi.mock('src/services/ok-dialog.service', () => ({
  okDialog: {
    show: okDialogShow,
  },
}));

const { default: RCPInquirePage } =
  await import('src/features/rcp-inquire/pages/RCPInquirePage.vue');

const pageCss = readFileSync(
  join(process.cwd(), 'src/features/rcp-inquire/pages/rcp-inquire.css'),
  'utf8',
);

const BaseRevoGridStub = defineComponent({
  name: 'BaseRevoGrid',
  props: {
    rows: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    stretch: { type: [Boolean, String], default: false },
  },
  template: `
    <div data-testid="base-revo-grid-stub">
      <div v-for="column in columns" :key="column.prop" data-testid="grid-column">{{ column.name }}</div>
      <div v-for="row in rows" :key="row.id" data-testid="grid-row">
        <span v-for="column in columns" :key="column.prop">{{ row[column.prop] }}</span>
      </div>
    </div>
  `,
});

function mountPage() {
  return mount(RCPInquirePage, {
    attachTo: document.body,
    global: { stubs: { BaseRevoGrid: BaseRevoGridStub } },
  });
}

function successData(overrides = {}) {
  return {
    ok: true,
    data: {
      productSpecName: 'PRODUCT-A',
      processOperationName: '100-200',
      operationDescription: 'DESC-A',
      category: 'THIK',
      rcpCdItems: [],
      rcpOvItems: [],
      rcpViItems: [],
      maskItems: [],
      rcpItems: [{ MACHINERECIPENAME: 'RCP-A', MACHINENAME: 'EQ-A' }],
      ...overrides,
    },
  };
}

describe('RCPInquirePage', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setActivePinia(createPinia());
    const mainStore = useMainStore();
    mainStore.facility = 'FAC-A';
    routeQuery = {};
    routerBack.mockReset();
    routerPush.mockReset();
    routerReplace.mockReset();
    metRecipeSearch.mockReset();
    checkinspection.mockReset();
    okDialogShow.mockReset();
  });

  it('loads lotId from query on mount and searches with uppercase LOT', async () => {
    routeQuery = { lotId: 'lot-a' };
    metRecipeSearch.mockResolvedValueOnce(successData());

    const wrapper = mountPage();
    await flushPromises();

    expect(metRecipeSearch).toHaveBeenCalledWith('LOT-A', 'FAC-A');
    expect(
      (wrapper.get('[data-testid="rcp-product"] input').element as HTMLInputElement).value,
    ).toBe('PRODUCT-A');
    expect(wrapper.text()).toContain('RCP-A');
    wrapper.unmount();
  });

  it('ignores uppercase LOTID query on mount', async () => {
    routeQuery = { LOTID: 'lot-a' };

    const wrapper = mountPage();
    await flushPromises();

    expect(metRecipeSearch).not.toHaveBeenCalled();
    expect(
      (wrapper.get('[data-testid="rcp-lot-input"] input').element as HTMLInputElement).value,
    ).toBe('');
    wrapper.unmount();
  });

  it('uses the compact PDA shell header layout', () => {
    const wrapper = mountPage();

    expect(wrapper.find('.rcp-inquire__shell').exists()).toBe(true);
    expect(wrapper.find('.rcp-inquire__header h1').text()).toBe('계측 RCP 조회');
    expect(pageCss).toMatch(/\.rcp-inquire__header\s*\{[^}]*justify-content: center;/);
    expect(pageCss).toMatch(/\.rcp-inquire__header h1\s*\{[^}]*text-align: center;/);
    expect(pageCss).not.toMatch(/\.rcp-inquire__header h1\s*\{[^}]*flex: 1 1 auto;/);
    expect(pageCss).not.toContain('.rcp-inquire__back');
    wrapper.unmount();
  });

  it('matches legacy input and summary labels', () => {
    const wrapper = mountPage();

    expect(wrapper.get('[data-testid="rcp-lot-input"] label').text()).toContain('LOT NO');
    expect(wrapper.get('[data-testid="rcp-description"] label').text()).toBe('DESC');
    expect(wrapper.text()).not.toContain('LOT NO.');
    expect(wrapper.text()).not.toContain('DESCRIPTION');
    wrapper.unmount();
  });

  it('keeps the search placeholder and summary fields readonly', () => {
    const wrapper = mountPage();

    expect(wrapper.get('[data-testid="rcp-lot-input"] input').attributes('placeholder')).toBe(
      'Search',
    );
    for (const field of ['rcp-product', 'rcp-operation', 'rcp-description']) {
      expect(
        (wrapper.get(`[data-testid="${field}"] input`).element as HTMLInputElement).readOnly,
      ).toBe(true);
    }

    wrapper.unmount();
  });

  it('uses plain descendant selectors for grid internals because the page stylesheet is global', () => {
    expect(pageCss).toContain('.rcp-inquire__grid revo-grid');
    expect(pageCss).toContain('.rcp-inquire__grid .rgHeaderCell');
    expect(pageCss).toContain('.rcp-inquire__grid .rgCell');
    expect(pageCss).not.toContain('.rcp-inquire__grid :deep(');
  });

  it('vertically centers recipe grid cell content without extra vertical padding', () => {
    expect(pageCss).toMatch(
      /\.rcp-inquire__grid \.rgCell\s*\{[^}]*display: flex;[^}]*align-items: center;[^}]*line-height: 20px;/,
    );
    expect(pageCss).not.toMatch(/\.rcp-inquire__grid \.rgCell\s*\{[^}]*padding: 10px 12px;/);
  });

  it('sizes recipe grids to their rendered rows and lets the card shrink around data', async () => {
    metRecipeSearch.mockResolvedValueOnce(
      successData({
        category: 'CDOVERAYVI',
        rcpOvItems: [{ OVRCP: 'OV-RCP-A01', OVMACHINE: 'OVL-E' }],
        rcpViItems: [{ MACHINERECIPENAME: 'VI-RCP-B01', MACHINENAME: 'VI-EQ' }],
        rcpCdItems: [],
        maskItems: [],
        rcpItems: [],
      }),
    );
    const wrapper = mountPage();

    await wrapper.get('[data-testid="rcp-lot-input"] input').setValue('LOT-A');
    await wrapper.get('[data-testid="rcp-search"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="rcp-recipes"]').classes()).toContain(
      'rcp-inquire__recipes--filled',
    );
    expect(wrapper.findAllComponents(BaseRevoGridStub)[0]!.vm.$attrs.style).toEqual({
      height: '82px',
    });
    expect(pageCss).toMatch(/\.rcp-inquire__recipes--filled\s*\{[^}]*flex: 0 0 auto;/);
    expect(pageCss).not.toMatch(/\.rcp-inquire__grid-section\s*\{[^}]*min-height: 124px;/);
    expect(pageCss).not.toMatch(/\.rcp-inquire__grid\s*\{[^}]*height: 124px;/);
    wrapper.unmount();
  });

  it('keeps the recipe card visible as an empty area before data is loaded', () => {
    const wrapper = mountPage();

    expect(wrapper.get('[data-testid="rcp-recipes"]').classes()).toContain(
      'rcp-inquire__recipes--empty',
    );
    expect(wrapper.find('[data-testid="rcp-empty-state"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="rcp-empty-state"] .ds-empty-state__icon').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="rcp-empty-state"]').text()).toContain('EMPTY');
    expect(wrapper.find('[data-testid="rcp-empty-state"]').text()).toContain(
      '해당 결과가 없습니다',
    );
    expect(wrapper.find('.rcp-inquire__table').exists()).toBe(false);
    expect(wrapper.find('[data-testid="base-revo-grid-stub"]').exists()).toBe(false);
    expect(pageCss).toContain('.rcp-inquire {\n  min-height: 100vh;');
    expect(pageCss).toContain('.rcp-inquire__shell');
    expect(pageCss).toContain('min-height: 100vh;');
    expect(pageCss).toContain('.rcp-inquire__content {\n  flex: 1;');
    expect(pageCss).toContain('.rcp-inquire__recipes {\n  flex: 1;');
    expect(pageCss).not.toContain('.rcp-inquire__recipes--empty {\n  min-height: 100vh;');
    wrapper.unmount();
  });

  it('uses BaseLoading instead of loading text while recipe search is running', async () => {
    let resolveSearch: (value: ReturnType<typeof successData>) => void = () => undefined;
    metRecipeSearch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );
    const wrapper = mountPage();

    await wrapper.get('[data-testid="rcp-lot-input"] input').setValue('LOT-A');
    await wrapper.get('[data-testid="rcp-search"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.rcp-inquire__loading .ds-loading').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Loading...');

    resolveSearch(successData());
    await flushPromises();
    wrapper.unmount();
  });

  it('updates route query lotId after a successful manual search', async () => {
    metRecipeSearch.mockResolvedValueOnce(
      successData({
        productSpecName: 'PRODUCT-B',
        processOperationName: '200-300',
        operationDescription: 'DESC-B',
        category: 'PQC',
        rcpItems: [{ REVIEW_EQUIP: 'PQC-EQ' }],
      }),
    );
    const wrapper = mountPage();

    await wrapper.get('[data-testid="rcp-lot-input"] input').setValue('lot-b');
    await wrapper.get('[data-testid="rcp-search"]').trigger('click');
    await flushPromises();

    expect(metRecipeSearch).toHaveBeenCalledWith('LOT-B', 'FAC-A');
    expect(routerReplace).toHaveBeenCalledWith({ query: { lotId: 'LOT-B' } });
    expect(wrapper.text()).toContain('PQC-EQ');
    wrapper.unmount();
  });

  it('parses legacy barcode style LOT input before searching on native enter', async () => {
    metRecipeSearch.mockResolvedValueOnce(successData());
    const wrapper = mountPage();
    const lotInput = wrapper.get('[data-testid="rcp-lot-input"] input');

    await lotInput.setValue(' LOT-RCP-001X');
    (lotInput.element as HTMLInputElement).focus();
    window.dispatchEvent(new CustomEvent('native-enter'));
    await flushPromises();

    expect(metRecipeSearch).toHaveBeenCalledWith('LOT-RCP-001', 'FAC-A');
    expect(
      (wrapper.get('[data-testid="rcp-lot-input"] input').element as HTMLInputElement).value,
    ).toBe('LOT-RCP-001');
    wrapper.unmount();
  });

  it('searches directly on manual keyboard enter without barcode parsing', async () => {
    metRecipeSearch.mockResolvedValueOnce(successData());
    const wrapper = mountPage();

    await wrapper.get('[data-testid="rcp-lot-input"] input').setValue('lot-manual');
    await wrapper.get('[data-testid="rcp-lot-input"] input').trigger('keyup.enter');
    await flushPromises();

    expect(metRecipeSearch).toHaveBeenCalledWith('LOT-MANUAL', 'FAC-A');
    expect(okDialogShow).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('clears summary data when barcode enter fails to return a LOT', async () => {
    metRecipeSearch.mockResolvedValueOnce(successData());
    const wrapper = mountPage();
    const lotInput = wrapper.get('[data-testid="rcp-lot-input"] input');

    await lotInput.setValue('LOT-A');
    await wrapper.get('[data-testid="rcp-search"]').trigger('click');
    await flushPromises();

    expect(
      (wrapper.get('[data-testid="rcp-product"] input').element as HTMLInputElement).value,
    ).toBe('PRODUCT-A');

    metRecipeSearch.mockClear();
    await lotInput.setValue('X');
    (lotInput.element as HTMLInputElement).focus();
    window.dispatchEvent(new CustomEvent('native-enter'));
    await flushPromises();

    expect(metRecipeSearch).not.toHaveBeenCalled();
    expect(okDialogShow).toHaveBeenCalledWith('READING ERROR', 'LOT#를 읽어주세요.', '확인');
    expect(
      (wrapper.get('[data-testid="rcp-product"] input').element as HTMLInputElement).value,
    ).toBe('');
    expect(
      (wrapper.get('[data-testid="rcp-operation"] input').element as HTMLInputElement).value,
    ).toBe('');
    expect(
      (wrapper.get('[data-testid="rcp-description"] input').element as HTMLInputElement).value,
    ).toBe('');
    expect(document.activeElement).toBe(wrapper.get('[data-testid="rcp-lot-input"] input').element);
    wrapper.unmount();
  });

  it('ignores native enter when LOT input is not focused', async () => {
    const wrapper = mountPage();

    await wrapper.get('[data-testid="rcp-lot-input"] input').setValue(' LOT-RCP-001X');
    (wrapper.get('[data-testid="rcp-search"]').element as HTMLButtonElement).focus();
    window.dispatchEvent(new CustomEvent('native-enter'));
    await flushPromises();

    expect(metRecipeSearch).not.toHaveBeenCalled();
    expect(okDialogShow).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('blocks search when LOT is empty after spaces are removed', async () => {
    const wrapper = mountPage();

    await wrapper.get('[data-testid="rcp-lot-input"] input').setValue('   ');
    await wrapper.get('[data-testid="rcp-search"]').trigger('click');
    await flushPromises();

    expect(metRecipeSearch).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('LOT NO가 확인되지 않습니다.');
    const lotInput = wrapper.get('[data-testid="rcp-lot-input"] input').element as HTMLInputElement;
    expect(document.activeElement).toBe(lotInput);
    expect(lotInput.selectionStart).toBe(0);
    expect(lotInput.selectionEnd).toBe(lotInput.value.length);
    wrapper.unmount();
  });

  it('renders CDOVERAYVI sections in OV, VI, CD, Mask order', async () => {
    metRecipeSearch.mockResolvedValueOnce(
      successData({
        category: 'CDOVERAYVI',
        rcpOvItems: [{ OVRCP: 'OV-RCP-A01', OVMACHINE: 'OVL-E' }],
        rcpViItems: [{ MACHINERECIPENAME: 'VI-RCP-B01', MACHINENAME: 'VI-EQ' }],
        rcpCdItems: [{ CDRCP: 'CD-RCP-C01', CDMACHINE: 'CD-EQ' }],
        maskItems: [{ RETICLENAME: 'MASK-D01', MACHINENAME: 'EXP-E' }],
        rcpItems: [],
      }),
    );
    const wrapper = mountPage();

    await wrapper.get('[data-testid="rcp-lot-input"] input').setValue('LOT-A');
    await wrapper.get('[data-testid="rcp-search"]').trigger('click');
    await flushPromises();

    const sectionTitles = wrapper
      .findAll('[data-testid="rcp-section-title"]')
      .map((node) => node.text());
    expect(sectionTitles).toEqual(['OVERLAY RECIPE', 'VI RECIPE', 'CD RECIPE', '진행 마스크']);
    const grids = wrapper.findAllComponents(BaseRevoGridStub);
    expect(grids).toHaveLength(4);
    expect(grids[0]!.props('columns')).toMatchObject([
      { prop: 'recipe', name: 'OVERLAY RECIPE', size: 176 },
      { prop: 'machine', name: 'MACHINE', size: 128 },
    ]);
    expect(grids[0]!.props('stretch')).toBe(true);
    expect(wrapper.text()).toContain('OV-RCP-A01');
    expect(wrapper.text()).toContain('OVL-E');
    wrapper.unmount();
  });

  it('blurs readonly summary inputs so touch focus does not leave a highlighted border', async () => {
    metRecipeSearch.mockResolvedValueOnce(successData());
    const wrapper = mountPage();

    await wrapper.get('[data-testid="rcp-lot-input"] input').setValue('LOT-A');
    await wrapper.get('[data-testid="rcp-search"]').trigger('click');
    await flushPromises();

    const productInput = wrapper.get('[data-testid="rcp-product"] input')
      .element as HTMLInputElement;
    productInput.focus();
    await productInput.dispatchEvent(new FocusEvent('focus'));

    expect(document.activeElement).not.toBe(productInput);
    wrapper.unmount();
  });

  it('shows inspection dialogs in legacy order for non-empty messages', async () => {
    metRecipeSearch.mockResolvedValueOnce(successData());
    checkinspection.mockResolvedValueOnce({
      ok: true,
      data: {
        macroMsg: 'MACRO-A',
        scopeMsg: 'SCOPE-A',
        cdMsg: 'CD-A',
        ovMsg: 'OV-A',
        sampleViMsg: 'VI-SAMPLE-A',
        sampleCdMsg: 'CD-SAMPLE-A',
        sampleOvMsg: 'OV-SAMPLE-A',
      },
    });
    const wrapper = mountPage();

    await wrapper.get('[data-testid="rcp-lot-input"] input').setValue('LOT-A');
    await wrapper.get('[data-testid="rcp-search"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="rcp-inspection"]').trigger('click');
    await flushPromises();

    expect(checkinspection).toHaveBeenCalledWith({
      lotId: 'LOT-A',
      facility: 'FAC-A',
      type: 'RCP',
      mOper: '100',
      sOper: '200',
    });
    expect(wrapper.text()).toContain('Macro 측정 정보');
    expect(wrapper.text()).toContain('▶ Macro 측정 [ MACRO-A ]');

    await wrapper.get('[data-testid="rcp-dialog-ok"]').trigger('click');
    expect(wrapper.text()).toContain('Scope 측정 정보');

    await wrapper.get('[data-testid="rcp-dialog-ok"]').trigger('click');
    expect(wrapper.text()).toContain('CD 측정 POINT');

    await wrapper.get('[data-testid="rcp-dialog-ok"]').trigger('click');
    expect(wrapper.text()).toContain('Overlay 측정 정보');
    wrapper.unmount();
  });
});
