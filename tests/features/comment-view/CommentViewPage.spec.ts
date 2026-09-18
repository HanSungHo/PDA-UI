/* eslint-disable @typescript-eslint/no-explicit-any */
import { mount } from '@vue/test-utils';
import * as httpServiceModule from 'src/features/comment-view/services/comment.service.http';
import { afterEach, describe, expect, it, vi } from 'vitest';

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

vi.mock('src/features/comment-view/services/comment.service.http', () => ({
  createHttpCommentService: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
import {
  COMMENT_VIEW_DEFAULTS,
  COMMENT_VIEW_ERRORS,
  COMMENT_VIEW_FLAGS,
  COMMENT_VIEW_PERMISSIONS,
  COMMENT_VIEW_STRINGS,
} from 'src/features/comment-view/constants/comment-view.constants';
import CommentViewPage from 'src/features/comment-view/pages/CommentViewPage.vue';

function makeService(overrides: any = {}) {
  return {
    comment: vi.fn(() =>
      Promise.resolve({
        ISCURRENT: COMMENT_VIEW_FLAGS.IS_CURRENT.YES,
        WORKCODE: COMMENT_VIEW_FLAGS.WORK_CODE.WRITE,
        ISCHECK: COMMENT_VIEW_FLAGS.IS_CHECK.NO,
        DESCRIPTION: 'existing',
        PROCESSSTEP: 'PS1',
        PW: 'secret',
      }),
    ),
    commentSet: vi.fn(() => Promise.resolve({ status: 'ok' })),
    ...overrides,
  };
}

const baseProps = {
  lotId: 'L1',
  operation: 'OP',
  subOperation: 'S1',
  commentNo: 'C1',
};

function mountPage(props: any) {
  return mount(CommentViewPage, {
    props,
    global: {
      stubs: {
        BaseInputField: {
          template:
            '<input :type="type" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          props: ['modelValue', 'disabled', 'type'],
        },
        BaseTextAreaField: {
          template:
            '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          props: ['modelValue', 'disabled'],
        },
        BaseButton: {
          template:
            '<button :disabled="disabled || loading" @click="$emit(\'click\', $event)"><slot /></button>',
          props: ['variant', 'loading', 'disabled', 'block'],
        },
        BaseDropdownList: true,
      },
    },
  });
}

describe('CommentViewPage', () => {
  it('loads and shows OK when permissions allow', async () => {
    const svc = makeService();
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();

    expect(svc.comment).toHaveBeenCalled();
    expect((wrapper.vm as any).showOk).toBe(true);
    expect((wrapper.vm as any).commentText).toBe('existing');
  });

  it('calls commentSet with payload and emits finished', async () => {
    const svc = makeService();
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();
    (wrapper.vm as any).password = 'pw123';
    await (wrapper.vm as any).onOk();

    expect(svc.commentSet).toHaveBeenCalled();
    expect(wrapper.emitted('finished')).toBeTruthy();
  });

  it('handles commentSet rejection and emits error', async () => {
    const svc = makeService({ commentSet: vi.fn(() => Promise.reject(new Error('fail'))) });
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();
    (wrapper.vm as any).password = 'pw123';
    await (wrapper.vm as any).onOk();

    expect((wrapper.vm as any).errorMessage).toBe('fail');
    expect(wrapper.emitted('error')).toBeTruthy();
  });

  it('hides OK and uses CLOSE label when ISCURRENT is not Y', async () => {
    const svc = makeService({
      comment: vi.fn(() =>
        Promise.resolve({
          ISCURRENT: COMMENT_VIEW_FLAGS.IS_CURRENT.NO,
          WORKCODE: COMMENT_VIEW_FLAGS.WORK_CODE.WRITE,
          ISCHECK: COMMENT_VIEW_FLAGS.IS_CHECK.NO,
          DESCRIPTION: '',
          PROCESSSTEP: '',
          PW: '',
        }),
      ),
    });
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();

    expect((wrapper.vm as any).showOk).toBe(false);
    expect((wrapper.vm as any).cancelLabel).toBe(COMMENT_VIEW_STRINGS.CLOSE_LABEL);
  });

  it('hides OK and uses CLOSE label when WORKCODE is not W', async () => {
    const svc = makeService({
      comment: vi.fn(() =>
        Promise.resolve({
          ISCURRENT: COMMENT_VIEW_FLAGS.IS_CURRENT.YES,
          WORKCODE: 'X',
          ISCHECK: COMMENT_VIEW_FLAGS.IS_CHECK.NO,
          DESCRIPTION: '',
          PROCESSSTEP: '',
          PW: '',
        }),
      ),
    });
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();

    expect((wrapper.vm as any).showOk).toBe(false);
    expect((wrapper.vm as any).cancelLabel).toBe(COMMENT_VIEW_STRINGS.CLOSE_LABEL);
  });

  it('hides OK and uses CLOSE label when ISCHECK is Y', async () => {
    const svc = makeService({
      comment: vi.fn(() =>
        Promise.resolve({
          ISCURRENT: COMMENT_VIEW_FLAGS.IS_CURRENT.YES,
          WORKCODE: COMMENT_VIEW_FLAGS.WORK_CODE.WRITE,
          ISCHECK: COMMENT_VIEW_FLAGS.IS_CHECK.YES,
          DESCRIPTION: '',
          PROCESSSTEP: '',
          PW: '',
        }),
      ),
    });
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();

    expect((wrapper.vm as any).showOk).toBe(false);
    expect((wrapper.vm as any).cancelLabel).toBe(COMMENT_VIEW_STRINGS.CLOSE_LABEL);
  });

  it.each([['X'], [''], ['A']])(
    'hides OK and uses CLOSE label when permission is %s',
    async (permission) => {
      const svc = makeService();
      const wrapper = mountPage({
        ...baseProps,
        service: svc,
        operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission },
      });

      await flushPromises();

      expect((wrapper.vm as any).showOk).toBe(false);
      expect((wrapper.vm as any).cancelLabel).toBe(COMMENT_VIEW_STRINGS.CLOSE_LABEL);
    },
  );

  it.each(COMMENT_VIEW_PERMISSIONS.COMMENT_OK.map((p) => [p]))(
    'shows OK and uses CANCEL label when permission is %s',
    async (permission) => {
      const svc = makeService();
      const wrapper = mountPage({
        ...baseProps,
        service: svc,
        operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission },
      });

      await flushPromises();

      expect((wrapper.vm as any).showOk).toBe(true);
      expect((wrapper.vm as any).cancelLabel).toBe(COMMENT_VIEW_STRINGS.CANCEL_LABEL);
    },
  );

  it('emits finished when onCancel is called', async () => {
    const wrapper = mountPage({
      ...baseProps,
      service: makeService(),
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();
    (wrapper.vm as any).onCancel();

    expect(wrapper.emitted('finished')).toBeTruthy();
  });

  it('prevents double submit in onOk', async () => {
    const svc = makeService();
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();
    (wrapper.vm as any).password = 'pw123';
    (wrapper.vm as any).isSubmitting = true;
    await (wrapper.vm as any).onOk();

    expect(svc.commentSet).not.toHaveBeenCalled();
  });

  it('emits error when service is not available', async () => {
    const wrapper = mountPage({
      ...baseProps,
      service: undefined as any,
      autoCreateService: false,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();

    expect((wrapper.vm as any).errorMessage).toBe(COMMENT_VIEW_ERRORS.NO_SERVICE_AVAILABLE);
    expect(wrapper.emitted('error')).toBeTruthy();
  });

  it('exposes setupMockServiceIfNeeded helper', async () => {
    const wrapper = mountPage({
      ...baseProps,
      service: undefined as any,
      autoCreateService: false,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    expect(typeof (wrapper.vm as any).setupMockServiceIfNeeded).toBe('function');
  });

  it('prefills process number as operation + subOperation', async () => {
    const wrapper = mountPage({
      ...baseProps,
      service: makeService(),
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();

    expect((wrapper.vm as any).processNumberDisplay).toBe('OPS1');
  });

  it('loads fields from comment response', async () => {
    const svc = makeService({
      comment: vi.fn(() =>
        Promise.resolve({
          ISCURRENT: COMMENT_VIEW_FLAGS.IS_CURRENT.YES,
          WORKCODE: COMMENT_VIEW_FLAGS.WORK_CODE.WRITE,
          ISCHECK: COMMENT_VIEW_FLAGS.IS_CHECK.NO,
          DESCRIPTION: 'desc',
          PROCESSSTEP: 'ps',
          PW: 'pwd',
        }),
      ),
    });
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();

    expect((wrapper.vm as any).commentText).toBe('desc');
    expect((wrapper.vm as any).processStep).toBe('ps');
    expect((wrapper.vm as any).password).toBe('pwd');
  });

  it('loads fields even when the server omits PW', async () => {
    const svc = makeService({
      comment: vi.fn(() =>
        Promise.resolve({
          ISCURRENT: COMMENT_VIEW_FLAGS.IS_CURRENT.YES,
          WORKCODE: COMMENT_VIEW_FLAGS.WORK_CODE.WRITE,
          ISCHECK: COMMENT_VIEW_FLAGS.IS_CHECK.NO,
          DESCRIPTION: 'desc',
          PROCESSSTEP: 'ps',
        }),
      ),
    });
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();

    expect((wrapper.vm as any).commentText).toBe('desc');
    expect((wrapper.vm as any).processStep).toBe('ps');
    expect((wrapper.vm as any).password).toBe('');
  });

  it('does not prefill password when prefillPassword is false', async () => {
    const svc = makeService({
      comment: vi.fn(() =>
        Promise.resolve({
          ISCURRENT: COMMENT_VIEW_FLAGS.IS_CURRENT.YES,
          WORKCODE: COMMENT_VIEW_FLAGS.WORK_CODE.WRITE,
          ISCHECK: COMMENT_VIEW_FLAGS.IS_CHECK.NO,
          DESCRIPTION: 'desc',
          PROCESSSTEP: 'ps',
          PW: 'pwd',
        }),
      ),
    });
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      prefillPassword: false,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();

    expect((wrapper.vm as any).password).toBe('');
  });

  it('falls back to route query for operator context when operatorContext is omitted', async () => {
    const svc = makeService();
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
    });

    await flushPromises();

    expect(svc.comment).toHaveBeenCalledWith(
      expect.objectContaining({
        LOTID: 'L1',
        OPERATORID: '',
        FACILITY: '',
      }),
    );
    expect((wrapper.vm as any).operatorIdDisplay).toBe('');
  });

  it('creates HTTP service via setupProdServiceIfNeeded when no service is provided', async () => {
    const mockService = {
      comment: vi.fn(() => Promise.resolve(makeService().comment())),
      commentSet: vi.fn(() => Promise.resolve({ status: 'ok' })),
    };
    (httpServiceModule.createHttpCommentService as any).mockReturnValue(mockService);

    const wrapper = mountPage({
      ...baseProps,
      service: undefined as any,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();
    await (wrapper.vm as any).setupProdServiceIfNeeded();
    await flushPromises();

    expect(httpServiceModule.createHttpCommentService).toHaveBeenCalled();

    // The internally created service should now be used by onOk.
    (wrapper.vm as any).password = 'pw123';
    await (wrapper.vm as any).onOk();

    expect(mockService.commentSet).toHaveBeenCalled();
    expect(wrapper.emitted('finished')).toBeTruthy();
  });

  it('handles dynamic import failure in setupProdServiceIfNeeded gracefully', async () => {
    (httpServiceModule.createHttpCommentService as any).mockImplementation(() => {
      throw new Error('module not found');
    });

    const wrapper = mountPage({
      ...baseProps,
      service: undefined as any,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();
    await (wrapper.vm as any).setupProdServiceIfNeeded();
    await flushPromises();

    // onOk should still fail because no service could be created.
    (wrapper.vm as any).password = 'pw123';
    await (wrapper.vm as any).onOk();

    expect((wrapper.vm as any).errorMessage).toBe(COMMENT_VIEW_ERRORS.NO_SERVICE_AVAILABLE);
    expect(wrapper.emitted('error')).toBeTruthy();
  });

  it('emits error when onOk is called without a service', async () => {
    const wrapper = mountPage({
      ...baseProps,
      service: undefined as any,
      autoCreateService: false,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();
    (wrapper.vm as any).password = 'pw123';
    await (wrapper.vm as any).onOk();

    expect((wrapper.vm as any).errorMessage).toBe(COMMENT_VIEW_ERRORS.NO_SERVICE_AVAILABLE);
    expect(wrapper.emitted('error')).toBeTruthy();
  });

  it('setupMockServiceIfNeeded is a callable no-op', async () => {
    const wrapper = mountPage({
      ...baseProps,
      service: makeService(),
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    expect(() => (wrapper.vm as any).setupMockServiceIfNeeded()).not.toThrow();
  });

  it('emits finished when the back button is clicked', async () => {
    const wrapper = mountPage({
      ...baseProps,
      service: makeService(),
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await wrapper.find('.back-btn').trigger('click');

    expect(wrapper.emitted('finished')).toBeTruthy();
  });

  it('updates password when the password input emits update:modelValue', async () => {
    const wrapper = mountPage({
      ...baseProps,
      service: makeService(),
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();
    const input = wrapper.find('input[type="password"]');
    await input.setValue('typed-pw');

    expect((wrapper.vm as any).password).toBe('typed-pw');
  });

  it('updates commentText when the comment textarea emits update:modelValue', async () => {
    const wrapper = mountPage({
      ...baseProps,
      service: makeService(),
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();
    const textarea = wrapper.find('textarea');
    await textarea.setValue('new comment');

    expect((wrapper.vm as any).commentText).toBe('new comment');
  });

  it('emits UNKNOWN_ERROR when comment rejects a non-Error value', async () => {
    const svc = makeService({ comment: vi.fn(() => Promise.reject('network down')) });
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();

    expect((wrapper.vm as any).errorMessage).toBe(COMMENT_VIEW_ERRORS.UNKNOWN_ERROR);
    expect(wrapper.emitted('error')).toBeTruthy();
  });

  it('emits UNKNOWN_ERROR when commentSet rejects a non-Error value', async () => {
    const svc = makeService({ commentSet: vi.fn(() => Promise.reject('save failed')) });
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();
    (wrapper.vm as any).password = 'pw123';
    await (wrapper.vm as any).onOk();

    expect((wrapper.vm as any).errorMessage).toBe(COMMENT_VIEW_ERRORS.UNKNOWN_ERROR);
    expect(wrapper.emitted('error')).toBeTruthy();
  });

  it('falls back to route params when identification props are omitted', async () => {
    const svc = makeService();
    const wrapper = mountPage({
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();

    expect(svc.comment).toHaveBeenCalledWith(
      expect.objectContaining({
        LOTID: '',
        OPERATION: '',
        SUBOPERATION: '',
        COMMENTNO: '',
        OPERSEQUENCE: COMMENT_VIEW_DEFAULTS.OPERSEQUENCE,
      }),
    );
    expect((wrapper.vm as any).serviceLotId).toBe('');
    expect((wrapper.vm as any).serviceCommentNo).toBe('');
    expect((wrapper.vm as any).processNumberDisplay).toBe('');
  });

  it('uses provided operSequence prop in request', async () => {
    const svc = makeService();
    mountPage({
      ...baseProps,
      operSequence: 'SEQ1',
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();

    expect(svc.comment).toHaveBeenCalledWith(expect.objectContaining({ OPERSEQUENCE: 'SEQ1' }));
  });

  it('falls back to empty strings when server omits description, process step and password', async () => {
    const svc = makeService({
      comment: vi.fn(() =>
        Promise.resolve({
          ISCURRENT: COMMENT_VIEW_FLAGS.IS_CURRENT.YES,
          WORKCODE: COMMENT_VIEW_FLAGS.WORK_CODE.WRITE,
          ISCHECK: COMMENT_VIEW_FLAGS.IS_CHECK.NO,
        }),
      ),
    });
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      operatorContext: { facility: 'F', operatorId: 'O1', operatorName: 'Op', permission: 'C' },
    });

    await flushPromises();

    expect((wrapper.vm as any).commentText).toBe('');
    expect((wrapper.vm as any).processStep).toBe('');
    expect((wrapper.vm as any).password).toBe('');
  });

  it('treats undefined operator permission as empty permission', async () => {
    const svc = makeService();
    const wrapper = mountPage({
      ...baseProps,
      service: svc,
      operatorContext: {
        facility: 'F',
        operatorId: 'O1',
        operatorName: 'Op',
        permission: undefined as any,
      },
    });

    await flushPromises();

    expect((wrapper.vm as any).showOk).toBe(false);
    expect((wrapper.vm as any).cancelLabel).toBe(COMMENT_VIEW_STRINGS.CLOSE_LABEL);
  });
});
