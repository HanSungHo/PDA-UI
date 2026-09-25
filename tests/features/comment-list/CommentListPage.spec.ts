import { flushPromises, mount } from '@vue/test-utils';
import type { CommentListResponse } from 'src/features/comment-list/services/comment-list.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchCommentList } = vi.hoisted(() => ({
  fetchCommentList: vi.fn(),
}));

vi.mock('src/features/comment-list/services/comment-list.service', () => ({
  fetchCommentList,
}));

const { default: CommentListPage } =
  await import('src/features/comment-list/pages/CommentListPage.vue');

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
      expect(wrapper.text()).toContain('COMMENT LIST');
      expect(wrapper.text()).toContain('LOT No.');
      expect(wrapper.text()).toContain('공정번호');
      expect(wrapper.text()).toContain('LOT-UNIT-001');
      expect(wrapper.text()).toContain('PHOTOINSP');
      expect(wrapper.text()).toContain('Final Inspection');

      for (const heading of [
        'NO',
        'Sub',
        'W',
        'TYPE',
        'R',
        '작성자',
        '작성일시',
        '읽은사람',
        '읽은시간',
      ]) {
        expect(wrapper.text()).toContain(heading);
      }

      expect(wrapper.text()).toContain('0001');
      expect(wrapper.text()).toContain('KIM HS');
      expect(wrapper.text()).toContain('0002');
      expect(wrapper.text()).toContain('PARK DW');
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

      const rows = wrapper.findAll('tbody tr');
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
    } finally {
      wrapper.unmount();
    }
  });

  it('opens detail on row double click', async () => {
    const wrapper = mountCommentListPage();

    try {
      await flushPromises();

      await wrapper.findAll('tbody tr')[0].trigger('dblclick');
      await flushPromises();

      expect(wrapper.find('.comment-list-value--selected').text()).toBe('0001');
      expect(document.body.textContent).toContain('COMMENT VIEW');
      expect(document.body.textContent).toContain('Check wafer edge before move-out.');
    } finally {
      wrapper.unmount();
    }
  });

  it('selects a row with Enter and delegates Close to browser history', async () => {
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const wrapper = mountCommentListPage();

    try {
      await flushPromises();

      await wrapper.findAll('tbody tr')[0].trigger('keyup.enter');

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
