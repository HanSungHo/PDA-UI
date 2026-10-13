import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive, ref } from 'vue';

const mocks = vi.hoisted(() => ({
  useLotStatus: vi.fn(),
  useRoute: vi.fn(),
}));

vi.mock('src/features/lot-status/composables/useLotStatus', () => ({
  useLotStatus: mocks.useLotStatus,
}));
vi.mock('vue-router', () => ({ useRoute: mocks.useRoute }));

import LotStatusPage from 'src/features/lot-status/pages/LotStatusPage.vue';

const EMPTY_FIELDS = {
  txtJobResult: '',
  txtStatusResult: '',
  txtProductName: '',
  txtCurrentOperation: '',
  tOperation: '',
  txtRework: '',
  txtReworkCount: '',
  txtRwCd: '',
  txtHold: '',
  txtHoldCd: '',
  txtArea: '',
  txtQuantity: '',
  txtDueData: '',
  txtBay: '',
  txtOwner: '',
  txtStk: '',
  txtLotKinds: '',
  txtMachine: '',
  txtFacility: '',
};

describe('LotStatusPage', () => {
  const actions = {
    updateLotNo: vi.fn(),
    searchData: vi.fn(),
    handleLotEnter: vi.fn(),
    close: vi.fn(),
    onSingleClick: vi.fn(),
  };
  const hasResult = ref(false);
  const statusKind = ref('');

  beforeEach(() => {
    vi.clearAllMocks();
    hasResult.value = false;
    statusKind.value = '';
    mocks.useRoute.mockReturnValue({ query: { LOTID: 'LOT-INIT-01' } });
    mocks.useLotStatus.mockReturnValue({
      editLotNo: ref(''),
      fields: reactive({ ...EMPTY_FIELDS }),
      loading: ref(false),
      hasResult,
      statusKind,
      ...actions,
    });
  });

  it('renders legacy labels with design placeholders and search text', () => {
    const wrapper = mount(LotStatusPage);

    expect(mocks.useLotStatus).toHaveBeenCalledWith();
    expect(actions.updateLotNo).toHaveBeenCalledWith('LOT-INIT-01');
    expect(actions.searchData).toHaveBeenCalledWith('LOT-INIT-01');
    expect(wrapper.text()).toContain('LOT 상태');
    expect(wrapper.text()).toContain('LOT No.');
    expect(wrapper.text()).toContain('DUE DATA');
    expect(wrapper.text()).toContain('Hold CD');
    expect(wrapper.text()).toContain('조회');
    expect(wrapper.text()).toContain('WAFER');
    expect(wrapper.text()).toContain('닫기');
    expect(wrapper.get('#lot-status-lot').attributes('placeholder')).toBe('Search');
    expect(
      wrapper.findAll('input').filter((input) => input.element.id !== 'lot-status-lot'),
    ).toHaveLength(19);
    expect(
      wrapper
        .findAll('input')
        .filter((input) => input.element.id !== 'lot-status-lot')
        .every((input) => input.element.placeholder === ''),
    ).toBe(true);
    expect(wrapper.get('.lot-status-wafer').attributes('disabled')).toBeDefined();
  });

  it('starts with an empty LOT when the route query is not a single string', () => {
    mocks.useRoute.mockReturnValue({ query: { LOTID: ['LOT-A', 'LOT-B'] } });
    mount(LotStatusPage);
    expect(mocks.useLotStatus).toHaveBeenCalledWith();
    expect(actions.updateLotNo).not.toHaveBeenCalled();
    expect(actions.searchData).not.toHaveBeenCalled();
  });

  it('applies the WAIT status class to the status field', async () => {
    const wrapper = mount(LotStatusPage);
    statusKind.value = 'wait';
    await nextTick();

    expect(wrapper.find('.lot-status-field--wait').exists()).toBe(true);
  });

  it('wires LOT input, Enter, search, HOLD CD, WAFER, and close actions without a header back button', async () => {
    const wrapper = mount(LotStatusPage);
    const input = wrapper.get('#lot-status-lot');

    await input.setValue('lot-a');
    expect(actions.updateLotNo).toHaveBeenCalledWith('lot-a');
    await input.trigger('keydown.enter');
    expect(actions.handleLotEnter).toHaveBeenCalledOnce();

    await wrapper.get('.lot-status-search-button').trigger('click');
    expect(actions.onSingleClick).toHaveBeenCalledWith('search');
    await wrapper.get('.lot-status-hold-button').trigger('click');
    expect(actions.onSingleClick).toHaveBeenCalledWith('hold');

    hasResult.value = true;
    await nextTick();
    await wrapper.get('.lot-status-wafer').trigger('click');
    expect(actions.onSingleClick).toHaveBeenCalledWith('wafer');
    await wrapper.get('.lot-status-close').trigger('click');
    expect(actions.onSingleClick).toHaveBeenCalledWith('close');
    expect(wrapper.find('[aria-label="뒤로 가기"]').exists()).toBe(false);
    expect(actions.close).not.toHaveBeenCalled();
  });
});
