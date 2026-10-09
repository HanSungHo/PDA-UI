import { flushPromises, mount } from '@vue/test-utils';
import type { CommentListResponse } from 'src/features/comment-list/services/comment-list.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { routeLocationKey } from 'vue-router';

const { fetchCommentList } = vi.hoisted(() => ({
  fetchCommentList: vi.fn(),
}));

vi.mock('src/features/comment-list/services/comment-list.service', () => ({
  fetchCommentList,
}));

const { default: CommentListPage } =
  await import('src/features/comment-list/pages/CommentListPage.vue');

const BaseRevoGridStub = defineComponent({
  name: 'BaseRevoGrid',
  inheritAttrs: false,
  props: {
    rows: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    selectedRowKey: { type: String, default: '' },
  },
  emits: ['rowSelect'],
  setup(props, { attrs, emit }) {
    return () =>
      h('div', { ...attrs, class: ['base-revo-grid', attrs.class] }, [
        h(
          'div',
          { class: 'grid-head' },
          (props.columns as { name: string }[]).map((column) => column.name).join(' '),
        ),
        ...(props.rows as { gridKey: string; no?: string; rowClass?: string }[]).map((row) =>
          h(
            'button',
            {
              key: row.gridKey,
              type: 'button',
              class: [
                'grid-row',
                { 'is-selected': row.gridKey === props.selectedRowKey },
                { 'grid-row--placeholder': row.rowClass === 'comment-list-grid-row--placeholder' },
              ],
              onClick: () => emit('rowSelect', row.gridKey),
              onDblclick: () => emit('rowSelect', row.gridKey),
              onKeyup: (event: KeyboardEvent) => {
                if (event.key === 'Enter') emit('rowSelect', row.gridKey);
              },
            },
            Object.values(row).join(' '),
          ),
        ),
      ]);
  },
});

const commentListResponse: CommentListResponse = {
  context: {
    lotId: 'LOT-UNIT-001',
    operation: 'PHOTO',
    subOperation: 'INSP',
    processStep: 'Final Inspection',
    operSequence: '0042',
    facility: 'KFAB',
  },
  items: [
    {
      no: '0001',
      subOperation: 'INSP',
      workCode: 'W',
      trackType: 'CURRENT',
      isCheck: false,
      writer: 'KIM HS',
      writeTime: '2026-09-15 08:12',
      reader: '',
      readTime: '',
      description: 'Check wafer edge before move-out.',
    },
    {
      no: '0002',
      subOperation: 'ETCH',
      workCode: 'N',
      trackType: 'LOT',
      isCheck: true,
      writer: 'LEE MJ',
      writeTime: '2026-09-15 08:28',
      reader: 'PARK DW',
      readTime: '2026-09-15 08:41',
      description: 'Recipe verified after chamber tuning.',
    },
  ],
};

function mountCommentListPage() {
  return mount(CommentListPage, {
    attachTo: document.body,
    global: { stubs: { BaseRevoGrid: BaseRevoGridStub } },
  });
}

describe('CommentListPage', () => {
  beforeEach(() => {
    fetchCommentList.mockResolvedValue(commentListResponse);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    fetchCommentList.mockReset();
  });

  it('renders the loaded lot context and comment grid', async () => {
    const wrapper = mountCommentListPage();

    try {
      expect(wrapper.text()).toContain('COMMENT LIST 조회 중...');

      await flushPromises();

      expect(fetchCommentList).toHaveBeenCalledTimes(1);
      expect(wrapper.find('.q-toolbar').exists()).toBe(true);
      expect(wrapper.get('.comment-list-back').attributes('aria-label')).toBe('Back');
      expect(wrapper.get('.comment-list-back .q-icon').text()).toBe('arrow_back');
      expect(wrapper.findAll('.q-card')).toHaveLength(2);
      expect(wrapper.findAll('.ds-btn')).toHaveLength(3);
      expect(wrapper.find('.base-revo-grid').exists()).toBe(true);
      expect(wrapper.text()).toContain('COMMENT LIST');
      expect(wrapper.text()).toContain('LOT No.');
      expect(wrapper.text()).toContain('공정번호');
      expect(wrapper.text()).toContain('LOT-UNIT-001');
      expect(wrapper.text()).toContain('PHOTOINSP');
      expect(wrapper.text()).toContain('Final Inspection');

      expect(wrapper.get('.grid-head').text()).toBe(
        'NO SUB W TYPE R 작성자 작성일시 읽은사람 읽은시간',
      );

      expect(wrapper.text()).toContain('0001');
      expect(wrapper.text()).toContain('KIM HS');
      expect(wrapper.text()).toContain('0002');
      expect(wrapper.text()).toContain('PARK DW');
    } finally {
      wrapper.unmount();
    }
  });

  it('shows the two empty grid rows in the design when there are no comments', async () => {
    fetchCommentList.mockResolvedValue({ ...commentListResponse, items: [] });
    const wrapper = mountCommentListPage();

    try {
      await flushPromises();
      expect(wrapper.findAll('.grid-row')).toHaveLength(2);
      expect(wrapper.findAll('.grid-row--placeholder')).toHaveLength(2);
    } finally {
      wrapper.unmount();
    }
  });

  it('uses the back button to close the page', async () => {
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const wrapper = mountCommentListPage();

    try {
      await flushPromises();
      await wrapper.get('.comment-list-back').trigger('click');

      expect(historyBack).toHaveBeenCalledTimes(1);
      expect(document.body.querySelector('.q-menu')).toBeNull();
    } finally {
      historyBack.mockRestore();
      wrapper.unmount();
    }
  });

  it('loads the fixture rows with mock=1 in development without calling the API', async () => {
    const wrapper = mount(CommentListPage, {
      attachTo: document.body,
      global: {
        stubs: { BaseRevoGrid: BaseRevoGridStub },
        provide: {
          [routeLocationKey]: { query: { mock: '1' } },
        },
      },
    });

    try {
      await flushPromises();
      expect(fetchCommentList).not.toHaveBeenCalled();
      expect(wrapper.findAll('.grid-row')).toHaveLength(3);
      expect(wrapper.text()).toContain('LOT-A260915-018');
      expect(wrapper.text()).toContain('KIM HS');
    } finally {
      wrapper.unmount();
    }
  });

  it('shows a warning when Read is clicked without a selected comment', async () => {
    const wrapper = mountCommentListPage();

    try {
      await flushPromises();

      await wrapper.get('.comment-list-read').trigger('click');

      expect(wrapper.text()).toContain('Comment를 선택 해 주세요');
      expect(document.body.textContent).not.toContain('COMMENT VIEW');
    } finally {
      wrapper.unmount();
    }
  });

  it('selects a row and opens detail with the Read button', async () => {
    const wrapper = mountCommentListPage();

    try {
      await flushPromises();

      const rows = wrapper.findAll('.grid-row');
      await rows[1].trigger('click');

      expect(rows[1].classes()).toContain('is-selected');
      expect(wrapper.find('.comment-list-value--selected').text()).toBe('0002');

      await wrapper.get('.comment-list-read').trigger('click');
      await flushPromises();

      expect(document.body.textContent).toContain('COMMENT VIEW');
      expect(document.body.textContent).toContain('LOT-UNIT-001');
      expect(document.body.textContent).toContain('0002');
      expect(document.body.textContent).toContain('PHOTOINSP');
      expect(document.body.textContent).toContain('Recipe verified after chamber tuning.');
      const detail = document.body.querySelector('.q-dialog');
      expect(detail?.querySelector('.ds-modal')).not.toBeNull();
      const readChip = detail?.querySelector('.comment-list-status-chip--read.ds-chip.disabled');
      expect(readChip?.textContent).toContain('Read');
      expect(readChip?.getAttribute('role')).toBe('status');
      expect(detail?.textContent).toContain('Read status');
      expect(detail?.textContent).toContain('LEE MJ');
      expect(detail?.textContent).toContain('2026-09-15 08:41');

      const closeDetail = document.body.querySelector<HTMLButtonElement>('.ds-modal__close-btn');
      expect(closeDetail).not.toBeNull();
      closeDetail?.click();
      await flushPromises();
      expect(document.body.querySelector('.q-dialog')).toBeNull();
    } finally {
      wrapper.unmount();
    }
  });

  it('opens detail on row double click', async () => {
    const wrapper = mountCommentListPage();

    try {
      await flushPromises();

      await wrapper.findAll('.grid-row')[0].trigger('dblclick');
      await flushPromises();

      expect(wrapper.find('.comment-list-value--selected').text()).toBe('0001');
      expect(document.body.textContent).toContain('COMMENT VIEW');
      expect(document.body.textContent).toContain('Check wafer edge before move-out.');
      expect(document.body.querySelector('.q-dialog')?.textContent).toContain('Unread');
      expect(
        document.body.querySelector('.q-dialog .comment-list-status-chip--unread.ds-chip.disabled'),
      ).not.toBeNull();
    } finally {
      wrapper.unmount();
    }
  });

  it('selects a row with Enter and delegates Close to browser history', async () => {
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const wrapper = mountCommentListPage();

    try {
      await flushPromises();

      await wrapper.findAll('.grid-row')[0].trigger('keyup', { key: 'Enter' });

      expect(wrapper.find('.comment-list-value--selected').text()).toBe('0001');

      await wrapper.get('.comment-list-close').trigger('click');

      expect(historyBack).toHaveBeenCalledTimes(1);
    } finally {
      historyBack.mockRestore();
      wrapper.unmount();
    }
  });

  it('uses the Android bridge when closing inside WebView', async () => {
    const finish = vi.fn();
    Object.defineProperty(window, 'Android', {
      configurable: true,
      value: { finish },
    });
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const wrapper = mountCommentListPage();

    try {
      await flushPromises();

      await wrapper.get('.comment-list-close').trigger('click');

      expect(finish).toHaveBeenCalledTimes(1);
      expect(historyBack).not.toHaveBeenCalled();
    } finally {
      historyBack.mockRestore();
      Reflect.deleteProperty(window, 'Android');
      wrapper.unmount();
    }
  });
});
