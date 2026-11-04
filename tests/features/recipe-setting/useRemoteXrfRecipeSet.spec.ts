import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useMainStore } from 'src/features/main/stores/main.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router';
import { useRoute, useRouter } from 'vue-router';

import { useRemoteXrfRecipe } from '../../../src/features/recipe-setting/composables/useRemoteXrfRecipeSet';
import {
  remoteXrfRecipeService,
  ResponseDataToJsonUtil,
} from '../../../src/features/recipe-setting/services/remote-xrf-recipe-set.service';
import type { RemoteXrfRecipeResult } from '../../../src/features/recipe-setting/types/remote-xrf-recipe-set.types';
vi.mock('vue-router', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('src/features/main/stores/main.store', () => ({
  useMainStore: vi.fn(),
}));

vi.mock('../../../src/features/recipe-setting/services/remote-xrf-recipe-set.service', () => ({
  remoteXrfRecipeService: {
    getXrfItem: vi.fn(),
    getXrfProdeqp: vi.fn(),
    getXrfCategory: vi.fn(),
    getXrfSample: vi.fn(),
    getXrfPara: vi.fn(),
    getXrfRecipe: vi.fn(),
  },
  ResponseDataToJsonUtil: {
    getMessageBodyList: vi.fn(),
    getErrorMessage: vi.fn(),
  },
}));

function mountComposable(
  onResult?: (result: RemoteXrfRecipeResult) => void,
  focusSlot?: () => void,
) {
  let composableInstance!: ReturnType<typeof useRemoteXrfRecipe>;
  const TestComponent = defineComponent({
    setup() {
      composableInstance = useRemoteXrfRecipe(onResult, focusSlot);
      return () => h('div');
    },
  });

  const wrapper = mount(TestComponent);
  return { composable: composableInstance, wrapper };
}

describe('useRemoteXrfRecipe Composable', () => {
  const mockBack = vi.fn();
  const mockPush = vi.fn();
  const mockInitMain = vi.fn();
  let mockRouteQuery: Record<string, string>;
  let mockStore: {
    facility: string;
    area: string;
    isSettingReady: boolean;
    mobileServerName: string;
    initMain: typeof mockInitMain;
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockRouteQuery = {};
    mockStore = {
      facility: 'MAIN_FAC',
      area: 'MAIN_AREA',
      isSettingReady: true,
      mobileServerName: 'MOBILE_SRV',
      initMain: mockInitMain,
    };

    // Simulate having navigated in-app (the common case) so finish() uses
    // router.back(); the opened-by-URL fallback is covered by its own test.
    window.history.replaceState({ back: '/prev' }, '');

    vi.mocked(useRouter).mockReturnValue({
      back: mockBack,
      push: mockPush,
    } as unknown as Router);

    vi.mocked(useRoute).mockReturnValue({
      query: mockRouteQuery,
    } as unknown as RouteLocationNormalizedLoaded);

    vi.mocked(useMainStore).mockReturnValue(
      mockStore as unknown as ReturnType<typeof useMainStore>,
    );

    vi.mocked(remoteXrfRecipeService.getXrfItem).mockResolvedValue({ isSuccessFul: false });
    vi.mocked(remoteXrfRecipeService.getXrfProdeqp).mockResolvedValue({ isSuccessFul: false });
    vi.mocked(remoteXrfRecipeService.getXrfCategory).mockResolvedValue({ isSuccessFul: false });
    vi.mocked(remoteXrfRecipeService.getXrfSample).mockResolvedValue({ isSuccessFul: false });
    vi.mocked(remoteXrfRecipeService.getXrfPara).mockResolvedValue({ isSuccessFul: false });
    vi.mocked(remoteXrfRecipeService.getXrfRecipe).mockResolvedValue({ isSuccessFul: false });

    vi.mocked(ResponseDataToJsonUtil.getMessageBodyList).mockReturnValue([]);
    vi.mocked(ResponseDataToJsonUtil.getErrorMessage).mockReturnValue('');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize slot from route query on mount and invoke focusSlot', () => {
    mockRouteQuery.SLOT = 'SLOT_001';
    const mockFocusSlot = vi.fn();
    const { composable } = mountComposable(undefined, mockFocusSlot);

    expect(composable.txtSlot.value).toBe('SLOT_001');
    expect(mockFocusSlot).toHaveBeenCalledTimes(1);
  });

  it('should not invoke focusSlot when previous screen did not pass SLOT', () => {
    const mockFocusSlot = vi.fn();
    const { composable } = mountComposable(undefined, mockFocusSlot);

    expect(composable.txtSlot.value).toBe('');
    expect(mockFocusSlot).not.toHaveBeenCalled();
  });

  it('should call mainStore.initMain() before fetching items when not ready yet (deep link / dev reload)', async () => {
    mockStore.isSettingReady = false;
    mockInitMain.mockImplementation(async () => {
      mockStore.facility = 'INIT_FAC';
      mockStore.area = 'INIT_AREA';
      mockStore.isSettingReady = true;
      mockStore.mobileServerName = 'MOBILE_SRV';
    });

    mountComposable();
    await flushPromises();

    expect(mockInitMain).toHaveBeenCalledTimes(1);
    expect(remoteXrfRecipeService.getXrfItem).toHaveBeenCalledWith('INIT_FAC', 'INIT_AREA');
  });

  it('should not call mainStore.initMain() when already ready', async () => {
    mockStore.isSettingReady = true;
    mockStore.mobileServerName = 'MOBILE_SRV';

    mountComposable();
    await flushPromises();

    expect(mockInitMain).not.toHaveBeenCalled();
  });

  it('should always use mainStore facility/area (no route query fallback)', async () => {
    mockStore.facility = 'MAIN_FAC';
    mockStore.area = 'MAIN_AREA';
    mockRouteQuery.FACILITY = 'QUERY_FAC';
    mockRouteQuery.AREA = 'QUERY_AREA';

    const { composable } = mountComposable();
    await composable.getXrfItem();

    expect(remoteXrfRecipeService.getXrfItem).toHaveBeenCalledWith('MAIN_FAC', 'MAIN_AREA');
  });

  it('should auto-select matched item and trigger next api on mount', async () => {
    mockRouteQuery.ITEM = 'ITEM_B';
    vi.mocked(remoteXrfRecipeService.getXrfItem).mockResolvedValue({
      isSuccessFul: true,
      result: {},
    });
    vi.mocked(ResponseDataToJsonUtil.getMessageBodyList).mockReturnValue([
      { BAY: 'ITEM_A' },
      { BAY: 'ITEM_B' },
    ]);

    const { composable } = mountComposable();
    await flushPromises();

    expect(composable.spinnerItemOptions.value).toEqual([
      { label: 'ITEM_A', value: 'ITEM_A' },
      { label: 'ITEM_B', value: 'ITEM_B' },
    ]);
    expect(composable.Item.value).toBe('ITEM_B');
    expect(remoteXrfRecipeService.getXrfProdeqp).toHaveBeenCalled();
  });

  it('should show error dialog when getXrfItem fails', async () => {
    vi.mocked(remoteXrfRecipeService.getXrfItem).mockResolvedValueOnce({ isSuccessFul: false });
    vi.mocked(ResponseDataToJsonUtil.getErrorMessage).mockReturnValueOnce('Item Error');

    const { composable } = mountComposable();
    await flushPromises();

    expect(composable.dialog.open).toBe(true);
    expect(composable.dialog.message).toBe('Item Error');
  });

  it('should handle cascading auto-restore across dropdowns', async () => {
    mockRouteQuery.PRODEQP = 'EQP_1';
    mockRouteQuery.CATEGORY = 'CAT_1';
    mockRouteQuery.SAMPLE = 'SMP_1';
    mockRouteQuery.PARA = 'PARA_1';

    const { composable } = mountComposable();

    // 1. Prodeqp
    vi.mocked(remoteXrfRecipeService.getXrfProdeqp).mockResolvedValueOnce({
      isSuccessFul: true,
      result: {},
    });
    vi.mocked(ResponseDataToJsonUtil.getMessageBodyList).mockReturnValueOnce([{ BAY: 'EQP_1' }]);
    await composable.getXrfProdeqp();
    expect(composable.eqpId.value).toBe('EQP_1');

    // 2. Category
    vi.mocked(remoteXrfRecipeService.getXrfCategory).mockResolvedValueOnce({
      isSuccessFul: true,
      result: {},
    });
    vi.mocked(ResponseDataToJsonUtil.getMessageBodyList).mockReturnValueOnce([{ BAY: 'CAT_1' }]);
    await composable.getXrfCategory();
    expect(composable.category.value).toBe('CAT_1');

    // 3. Sample
    vi.mocked(remoteXrfRecipeService.getXrfSample).mockResolvedValueOnce({
      isSuccessFul: true,
      result: {},
    });
    vi.mocked(ResponseDataToJsonUtil.getMessageBodyList).mockReturnValueOnce([{ BAY: 'SMP_1' }]);
    await composable.getXrfSample();
    expect(composable.sample.value).toBe('SMP_1');

    // 4. Para
    vi.mocked(remoteXrfRecipeService.getXrfPara).mockResolvedValueOnce({
      isSuccessFul: true,
      result: {},
    });
    vi.mocked(ResponseDataToJsonUtil.getMessageBodyList).mockReturnValueOnce([{ BAY: 'PARA_1' }]);
    await composable.getXrfPara();
    expect(composable.para.value).toBe('PARA_1');
  });

  it('should toggle linearThick based on CONTEXT01 in getXrfRecipe', async () => {
    const { composable } = mountComposable();

    // CONTEXT01 === 'Y'
    vi.mocked(remoteXrfRecipeService.getXrfRecipe).mockResolvedValueOnce({
      isSuccessFul: true,
      result: {},
    });
    vi.mocked(ResponseDataToJsonUtil.getMessageBodyList).mockReturnValueOnce([
      { BAY: 'REC_THICK', CONTEXT01: 'Y' },
    ]);
    await composable.getXrfRecipe();
    expect(composable.txtRecipe.value).toBe('REC_THICK');
    expect(composable.linearThick.value).toBe(true);

    // CONTEXT01 !== 'Y'
    vi.mocked(remoteXrfRecipeService.getXrfRecipe).mockResolvedValueOnce({
      isSuccessFul: true,
      result: {},
    });
    vi.mocked(ResponseDataToJsonUtil.getMessageBodyList).mockReturnValueOnce([
      { BAY: 'REC_NO_THICK', CONTEXT01: 'N' },
    ]);
    await composable.getXrfRecipe();
    expect(composable.txtRecipe.value).toBe('REC_NO_THICK');
    expect(composable.linearThick.value).toBe(false);
  });

  it('should handle itemSelectedListener branching correctly', () => {
    const { composable } = mountComposable();

    composable.itemSelectedListener('spinner_item', 'NEW_ITEM');
    expect(composable.Item.value).toBe('NEW_ITEM');
    expect(remoteXrfRecipeService.getXrfProdeqp).toHaveBeenCalled();

    composable.itemSelectedListener('spinner_prodeqp', 'NEW_EQP');
    expect(composable.eqpId.value).toBe('NEW_EQP');
    expect(remoteXrfRecipeService.getXrfCategory).toHaveBeenCalled();

    composable.itemSelectedListener('spinner_category', 'NEW_CAT');
    expect(composable.category.value).toBe('NEW_CAT');
    expect(remoteXrfRecipeService.getXrfSample).toHaveBeenCalled();

    composable.itemSelectedListener('spinner_mds', 'NEW_SMP');
    expect(composable.sample.value).toBe('NEW_SMP');
    expect(remoteXrfRecipeService.getXrfPara).toHaveBeenCalled();

    composable.itemSelectedListener('spinner_para', 'NEW_PARA');
    expect(composable.para.value).toBe('NEW_PARA');
    expect(remoteXrfRecipeService.getXrfRecipe).toHaveBeenCalled();
  });

  it('should validate Null_check properly across 7 fields', () => {
    const { composable } = mountComposable();

    expect(composable.Null_check()).toBe(false);
    composable.Item.value = 'Item';
    expect(composable.Null_check()).toBe(false);
    composable.eqpId.value = 'Eqp';
    expect(composable.Null_check()).toBe(false);
    composable.category.value = 'Cat';
    expect(composable.Null_check()).toBe(false);
    composable.sample.value = 'Smp';
    expect(composable.Null_check()).toBe(false);
    composable.para.value = 'Para';
    expect(composable.Null_check()).toBe(false);
    composable.txtRecipe.value = 'Rec';
    expect(composable.Null_check()).toBe(false);
    composable.txtSlot.value = 'Slot';
    expect(composable.Null_check()).toBe(true);
  });

  it('should execute save contract when valid, and do nothing when invalid', () => {
    const mockResult = vi.fn();
    const { composable } = mountComposable(mockResult);

    // Invalid - silent return
    composable.execute();
    expect(mockResult).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();

    // Valid
    composable.Item.value = 'I';
    composable.eqpId.value = 'E';
    composable.category.value = 'C';
    composable.sample.value = 'S';
    composable.para.value = 'P';
    composable.txtRecipe.value = 'R';
    composable.txtSlot.value = 'SL';
    composable.txtThick.value = 'TH';

    composable.execute();
    expect(mockResult).toHaveBeenCalledWith({
      ITEM: 'I',
      PRODEQP: 'E',
      CATEGORY: 'C',
      SAMPLE: 'S',
      PARA: 'P',
      RECIPE: 'R',
      SLOT: 'SL',
      THICK: 'TH',
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it('should dispatch onSingleClickListener buttons', () => {
    const { composable } = mountComposable();

    composable.onSingleClickListener('btn_save');

    composable.onSingleClickListener('btn_cancel');
    expect(mockBack).toHaveBeenCalled();
  });

  it('should close dialog when closeDialog is called', () => {
    const { composable } = mountComposable();
    composable.dialog.open = true;
    composable.closeDialog();
    expect(composable.dialog.open).toBe(false);
  });

  it('should fall back to router.push when opened directly by URL (no history to go back to)', () => {
    window.history.replaceState(null, '');
    const { composable } = mountComposable();

    composable.finish();

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/main');
  });
});
