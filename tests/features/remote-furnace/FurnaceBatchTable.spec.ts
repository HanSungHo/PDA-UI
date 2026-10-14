import { mount } from '@vue/test-utils';
import { BaseRevoGrid } from 'src/components/base';
import FurnaceBatchTable from 'src/features/remote-furnace/components/FurnaceBatchTable.vue';
import {
  FurnaceCommentCell,
  FurnaceStatusCell,
  FurnaceTextCell,
} from 'src/features/remote-furnace/components/FurnaceTableCells';
import type { BatchLotItem } from 'src/features/remote-furnace/types/remote-furnace.types';
import { describe, expect, it, vi } from 'vitest';

describe('FurnaceBatchTable.vue', () => {
  const mockLots: BatchLotItem[] = [
    {
      lotId: 'WIP00001',
      commentQty: 2,
      status: 'WAIT',
      processStep: 'THERMAL_OX',
      product: 'ATOP26-W01',
      quantity: 25,
      errorMessage: '',
      operation: '3100',
      subOperation: '010',
      lotState: 'WIP',
      unreadCommentQty: 2,
      operSequence: '0010',
    },
    {
      lotId: 'WIP00002',
      commentQty: 0,
      status: 'FAIL',
      processStep: 'THERMAL_OX',
      product: 'ATOP26-W02',
      quantity: 24,
      errorMessage: 'Interlock Error',
      operation: '3100',
      subOperation: '010',
      lotState: 'WIP',
      unreadCommentQty: 0,
      operSequence: '0020',
    },
    {
      lotId: '',
      commentQty: 0,
      status: 'RUN',
      processStep: '',
      product: '',
      quantity: 10,
      errorMessage: '',
      operation: '3100',
      subOperation: '010',
      lotState: 'WIP',
      unreadCommentQty: 0,
      operSequence: '0030',
    },
  ];

  it('renders empty state when items is empty', () => {
    const wrapper = mount(FurnaceBatchTable, {
      props: { items: [] },
    });

    expect(wrapper.find('.furnace-empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('EMPTY');
    expect(wrapper.text()).toContain('해당 결과가 없습니다');
  });

  it('renders BaseRevoGrid with correct columns and items when items is populated', () => {
    const wrapper = mount(FurnaceBatchTable, {
      props: { items: mockLots },
    });

    expect(wrapper.findComponent(BaseRevoGrid).exists()).toBe(true);
    const grid = wrapper.getComponent(BaseRevoGrid);
    expect(grid.props('rows')).toHaveLength(3);

    const columns = grid.props('columns') as { prop: string; name: string }[];
    const columnNames = columns.map((col) => col.name);
    expect(columnNames).toEqual(['LOTNO', 'C', '상태', '공정명', '제품명', '수량', '에러메시지']);
  });

  it('emits select-lot and read-comment on grid row select', async () => {
    const wrapper = mount(FurnaceBatchTable, {
      props: { items: mockLots },
    });

    const grid = wrapper.getComponent(BaseRevoGrid);
    await grid.vm.$emit('row-select', 'WIP00001');

    expect(wrapper.emitted('select-lot')?.[0]).toEqual([mockLots[0]]);
    expect(wrapper.emitted('read-comment')?.[0]).toEqual([mockLots[0]]);
  });

  it('emits select-lot without read-comment when commentQty is 0', async () => {
    const wrapper = mount(FurnaceBatchTable, {
      props: { items: mockLots },
    });

    const grid = wrapper.getComponent(BaseRevoGrid);
    await grid.vm.$emit('row-select', 'WIP00002');

    expect(wrapper.emitted('select-lot')?.[0]).toEqual([mockLots[1]]);
    expect(wrapper.emitted('read-comment')).toBeUndefined();
  });

  it('passes selectedLotId as selectedRowKey to BaseRevoGrid', () => {
    const wrapper = mount(FurnaceBatchTable, {
      props: {
        items: mockLots,
        selectedLotId: 'WIP00001',
      },
    });

    const grid = wrapper.getComponent(BaseRevoGrid);
    expect(grid.props('selectedRowKey')).toBe('WIP00001');
  });

  describe('FurnaceTableCells', () => {
    it('renders FurnaceCommentCell with button when commentQty > 0', async () => {
      const onReadComment = vi.fn();
      const wrapper = mount(FurnaceCommentCell, {
        props: {
          model: mockLots[0],
          onReadComment,
        },
      });

      const badge = wrapper.find('.furnace-table__comment-badge');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBe('2');

      await badge.trigger('click');
      expect(onReadComment).toHaveBeenCalledWith(mockLots[0]);
    });

    it('renders FurnaceCommentCell with 0 when commentQty is 0', () => {
      const wrapper = mount(FurnaceCommentCell, {
        props: {
          model: mockLots[1],
        },
      });

      expect(wrapper.find('.furnace-table__comment-empty').text()).toBe('0');
    });

    it('renders FurnaceStatusCell with status pill class', () => {
      const wrapper = mount(FurnaceStatusCell, {
        props: {
          model: mockLots[0],
        },
      });

      expect(wrapper.find('.furnace-table__status-pill--wait').text()).toBe('WAIT');
    });

    it('renders FurnaceTextCell with value or fallback', () => {
      const wrapper1 = mount(FurnaceTextCell, {
        props: {
          model: mockLots[0],
          prop: 'lotId',
        },
      });
      expect(wrapper1.text()).toBe('WIP00001');

      const wrapper2 = mount(FurnaceTextCell, {
        props: {
          model: mockLots[2],
          prop: 'lotId',
        },
      });
      expect(wrapper2.text()).toBe('-');
    });
  });
});
