import { createHttpCommentService } from 'src/features/comment-view/services/comment.service.http';
import type {
  CommentRequest,
  CommentSetRequest,
} from 'src/features/comment-view/types/comment.types';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeResponse(
  body: unknown,
  init: { ok?: boolean; status?: number; statusText?: string } = {},
): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: vi.fn(() => Promise.resolve(body)),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
  } as unknown as Response;
}

function stubFetch(impl: typeof fetch) {
  vi.stubGlobal('fetch', impl);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createHttpCommentService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  // =========================================================================
  // Factory & option defaults
  // =========================================================================

  it('creates a service with default options when none are passed', () => {
    const svc = createHttpCommentService();
    expect(svc).toBeDefined();
    expect(svc.comment).toBeInstanceOf(Function);
    expect(svc.commentSet).toBeInstanceOf(Function);
  });

  it('uses VITE_API_BASE env when no baseUrl is provided', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.com');

    const req: CommentRequest = {
      LOTID: 'L1',
      FACILITY: 'F1',
      OPERATION: 'OP',
      SUBOPERATION: '',
      COMMENTNO: 'C1',
      OPERSEQUENCE: '',
      OPERATORID: 'O1',
    };

    const responseBody = {
      DESCRIPTION: 'desc',
      PROCESSSTEP: 'ps',
      PW: 'pw',
      ISCURRENT: 'Y',
      WORKCODE: 'W',
      ISCHECK: 'N',
    };

    stubFetch(
      vi.fn((_url: string, _init?: RequestInit) =>
        Promise.resolve(fakeResponse(responseBody)),
      ) as unknown as typeof fetch,
    );

    const svc = createHttpCommentService();
    await svc.comment(req);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/api/comment',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(req),
        credentials: 'include',
      }),
    );
  });

  it('falls back to empty base when VITE_API_BASE is unset', async () => {
    const req: CommentRequest = {
      LOTID: 'L',
      FACILITY: '',
      OPERATION: '',
      SUBOPERATION: '',
      COMMENTNO: '',
      OPERSEQUENCE: '',
      OPERATORID: '',
    };

    stubFetch(
      vi.fn(() =>
        Promise.resolve(
          fakeResponse({
            DESCRIPTION: '',
            PROCESSSTEP: '',
            PW: '',
            ISCURRENT: 'N',
            WORKCODE: 'W',
            ISCHECK: 'N',
          }),
        ),
      ) as unknown as typeof fetch,
    );

    const svc = createHttpCommentService();
    await svc.comment(req);

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(calls[0]).toBe('/api/comment');
  });

  it('uses custom baseUrl when provided', async () => {
    const svc = createHttpCommentService({ baseUrl: 'https://custom.example.com/v1' });

    const req: CommentRequest = {
      LOTID: 'L1',
      FACILITY: 'F',
      OPERATION: 'O',
      SUBOPERATION: '',
      COMMENTNO: '',
      OPERSEQUENCE: '',
      OPERATORID: '',
    };

    stubFetch(
      vi.fn(() =>
        Promise.resolve(
          fakeResponse({
            DESCRIPTION: '',
            PROCESSSTEP: '',
            PW: '',
            ISCURRENT: 'N',
            WORKCODE: 'X',
            ISCHECK: 'Y',
          }),
        ),
      ) as unknown as typeof fetch,
    );

    await svc.comment(req);
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(calls[0]).toBe('https://custom.example.com/v1/api/comment');
  });

  it('strips trailing slash from baseUrl when building URL', async () => {
    const svc = createHttpCommentService({ baseUrl: 'https://example.com/' });

    const req = {
      LOTID: '',
      FACILITY: '',
      OPERATION: '',
      SUBOPERATION: '',
      COMMENTNO: '',
      OPERSEQUENCE: '',
      OPERATORID: '',
    };

    stubFetch(
      vi.fn(() =>
        Promise.resolve(
          fakeResponse({
            DESCRIPTION: '',
            PROCESSSTEP: '',
            PW: '',
            ISCURRENT: 'N',
            WORKCODE: 'X',
            ISCHECK: 'Y',
          }),
        ),
      ) as unknown as typeof fetch,
    );

    await svc.comment(req);
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(calls[0]).toBe('https://example.com/api/comment');
  });

  it('strips leading slash from custom path', async () => {
    const svc = createHttpCommentService({
      baseUrl: 'https://example.com',
      commentPath: '//custom/comment',
    });

    const req = {
      LOTID: '',
      FACILITY: '',
      OPERATION: '',
      SUBOPERATION: '',
      COMMENTNO: '',
      OPERSEQUENCE: '',
      OPERATORID: '',
    };

    stubFetch(
      vi.fn(() =>
        Promise.resolve(
          fakeResponse({
            DESCRIPTION: '',
            PROCESSSTEP: '',
            PW: '',
            ISCURRENT: 'N',
            WORKCODE: 'X',
            ISCHECK: 'Y',
          }),
        ),
      ) as unknown as typeof fetch,
    );

    await svc.comment(req);
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(calls[0]).toBe('https://example.com/custom/comment');
  });

  it('uses custom timeoutMs', async () => {
    // Use a very small timeout so we can verify it's honoured.
    // We purposely don't resolve fetch so the timeout fires.
    vi.useFakeTimers();

    const svc = createHttpCommentService({ timeoutMs: 10 });

    const req = {
      LOTID: '',
      FACILITY: '',
      OPERATION: '',
      SUBOPERATION: '',
      COMMENTNO: '',
      OPERSEQUENCE: '',
      OPERATORID: '',
    };

    // fetch never resolves - the abort + timeout should reject
    const fetchPromise = new Promise<Response>(() => {
      /* never settles */
    });
    stubFetch(vi.fn(() => fetchPromise) as unknown as typeof fetch);

    const commentPromise = svc.comment(req);

    // Advance timers past the timeout
    vi.advanceTimersByTime(15);

    await expect(commentPromise).rejects.toThrow('Request timed out');

    vi.useRealTimers();
  });

  it('merges custom headers with Content-Type', async () => {
    const svc = createHttpCommentService({
      headers: { Authorization: 'Bearer token', 'X-Custom': 'val' },
    });

    const req = {
      LOTID: '',
      FACILITY: '',
      OPERATION: '',
      SUBOPERATION: '',
      COMMENTNO: '',
      OPERSEQUENCE: '',
      OPERATORID: '',
    };

    stubFetch(
      vi.fn(() =>
        Promise.resolve(
          fakeResponse({
            DESCRIPTION: '',
            PROCESSSTEP: '',
            PW: '',
            ISCURRENT: 'N',
            WORKCODE: 'X',
            ISCHECK: 'Y',
          }),
        ),
      ) as unknown as typeof fetch,
    );

    await svc.comment(req);

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
          'X-Custom': 'val',
        },
      }),
    );
  });

  // =========================================================================
  // comment() – success & response
  // =========================================================================

  it('comment() returns a CommentResponse on success', async () => {
    const responseBody = {
      DESCRIPTION: 'hello',
      PROCESSSTEP: 'step-1',
      PW: 'secret',
      ISCURRENT: 'Y',
      WORKCODE: 'W',
      ISCHECK: 'N',
    };

    stubFetch(vi.fn(() => Promise.resolve(fakeResponse(responseBody))) as unknown as typeof fetch);

    const svc = createHttpCommentService();
    const req: CommentRequest = {
      LOTID: 'L1',
      FACILITY: 'F1',
      OPERATION: 'OP',
      SUBOPERATION: 'SUB',
      COMMENTNO: 'C1',
      OPERSEQUENCE: 'SEQ',
      OPERATORID: 'O1',
    };

    const result = await svc.comment(req);
    expect(result).toEqual(responseBody);
  });

  it('comment() sends the correct request body', async () => {
    stubFetch(
      vi.fn(() =>
        Promise.resolve(
          fakeResponse({
            DESCRIPTION: '',
            PROCESSSTEP: '',
            PW: '',
            ISCURRENT: 'N',
            WORKCODE: 'X',
            ISCHECK: 'Y',
          }),
        ),
      ) as unknown as typeof fetch,
    );

    const svc = createHttpCommentService();
    const req: CommentRequest = {
      LOTID: 'L1',
      FACILITY: 'F',
      OPERATION: 'OP',
      SUBOPERATION: 'S',
      COMMENTNO: 'C1',
      OPERSEQUENCE: 'SEQ',
      OPERATORID: 'O',
    };

    await svc.comment(req);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify(req) }),
    );
  });

  // =========================================================================
  // commentSet() – success
  // =========================================================================

  it('commentSet() resolves void on success', async () => {
    stubFetch(
      vi.fn(() => Promise.resolve(fakeResponse({ status: 'ok' }))) as unknown as typeof fetch,
    );

    const svc = createHttpCommentService();
    const req: CommentSetRequest = {
      LOTID: 'L1',
      FACILITY: 'F1',
      OPERATION: 'OP',
      SUBOPERATION: 'SUB',
      COMMENTNO: 'C1',
      OPERATORID: 'O1',
      OPERNAME: 'Op',
      OPERSEQUENCE: 'SEQ',
      PASSWORD: 'pw',
    };

    const result = await svc.commentSet(req);
    expect(result).toBeUndefined();
  });

  it('commentSet() uses the custom commentSetPath', async () => {
    stubFetch(
      vi.fn(() => Promise.resolve(fakeResponse({ status: 'ok' }))) as unknown as typeof fetch,
    );

    const svc = createHttpCommentService({
      baseUrl: 'https://example.com',
      commentSetPath: '/custom/commentSet',
    });
    const req: CommentSetRequest = {
      LOTID: '',
      FACILITY: '',
      OPERATION: '',
      SUBOPERATION: '',
      COMMENTNO: '',
      OPERATORID: '',
      OPERNAME: '',
      OPERSEQUENCE: '',
      PASSWORD: '',
    };

    await svc.commentSet(req);
    expect(fetch).toHaveBeenCalledWith('https://example.com/custom/commentSet', expect.any(Object));
  });

  // =========================================================================
  // Error: non-ok responses
  // =========================================================================

  it('comment() throws with statusText when response is not ok and body is not json', async () => {
    stubFetch(
      vi.fn(() =>
        Promise.resolve(
          fakeResponse({}, { ok: false, status: 500, statusText: 'Internal Server Error' }),
        ),
      ) as unknown as typeof fetch,
    );

    const svc = createHttpCommentService();
    await expect(
      svc.comment({
        LOTID: '',
        FACILITY: '',
        OPERATION: '',
        SUBOPERATION: '',
        COMMENTNO: '',
        OPERSEQUENCE: '',
        OPERATORID: '',
      }),
    ).rejects.toThrow('Internal Server Error');
  });

  it('comment() throws with HTTP status code when statusText is empty', async () => {
    stubFetch(
      vi.fn(() =>
        Promise.resolve(fakeResponse({}, { ok: false, status: 503, statusText: '' })),
      ) as unknown as typeof fetch,
    );

    const svc = createHttpCommentService();
    await expect(
      svc.comment({
        LOTID: '',
        FACILITY: '',
        OPERATION: '',
        SUBOPERATION: '',
        COMMENTNO: '',
        OPERSEQUENCE: '',
        OPERATORID: '',
      }),
    ).rejects.toThrow('HTTP 503');
  });

  it('comment() extracts error message from JSON body when available', async () => {
    stubFetch(
      vi.fn(() =>
        Promise.resolve(
          fakeResponse(
            { message: 'Something went wrong' },
            { ok: false, status: 400, statusText: 'Bad Request' },
          ),
        ),
      ) as unknown as typeof fetch,
    );

    const svc = createHttpCommentService();
    await expect(
      svc.comment({
        LOTID: '',
        FACILITY: '',
        OPERATION: '',
        SUBOPERATION: '',
        COMMENTNO: '',
        OPERSEQUENCE: '',
        OPERATORID: '',
      }),
    ).rejects.toThrow('Something went wrong');
  });

  it('comment() falls back to error field when message is absent', async () => {
    stubFetch(
      vi.fn(() =>
        Promise.resolve(
          fakeResponse({ error: 'Server error' }, { ok: false, status: 500, statusText: '' }),
        ),
      ) as unknown as typeof fetch,
    );

    const svc = createHttpCommentService();
    await expect(
      svc.comment({
        LOTID: '',
        FACILITY: '',
        OPERATION: '',
        SUBOPERATION: '',
        COMMENTNO: '',
        OPERSEQUENCE: '',
        OPERATORID: '',
      }),
    ).rejects.toThrow('Server error');
  });

  it('comment() falls back to statusText when json parsing fails', async () => {
    stubFetch(
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: vi.fn(() => Promise.reject(new Error('parse error'))),
        } as unknown as Response),
      ) as unknown as typeof fetch,
    );

    const svc = createHttpCommentService();
    await expect(
      svc.comment({
        LOTID: '',
        FACILITY: '',
        OPERATION: '',
        SUBOPERATION: '',
        COMMENTNO: '',
        OPERSEQUENCE: '',
        OPERATORID: '',
      }),
    ).rejects.toThrow('Bad Request');
  });

  it('commentSet() throws on non-ok response', async () => {
    stubFetch(
      vi.fn(() =>
        Promise.resolve(fakeResponse({}, { ok: false, status: 500, statusText: 'Server Error' })),
      ) as unknown as typeof fetch,
    );

    const svc = createHttpCommentService();
    await expect(
      svc.commentSet({
        LOTID: '',
        FACILITY: '',
        OPERATION: '',
        SUBOPERATION: '',
        COMMENTNO: '',
        OPERATORID: '',
        OPERNAME: '',
        OPERSEQUENCE: '',
        PASSWORD: '',
      }),
    ).rejects.toThrow('Server Error');
  });

  // =========================================================================
  // Error: network / timeout
  // =========================================================================

  it('comment() throws on network failure (fetch rejects)', async () => {
    stubFetch(vi.fn(() => Promise.reject(new Error('Network error'))) as unknown as typeof fetch);

    const svc = createHttpCommentService();
    await expect(
      svc.comment({
        LOTID: '',
        FACILITY: '',
        OPERATION: '',
        SUBOPERATION: '',
        COMMENTNO: '',
        OPERSEQUENCE: '',
        OPERATORID: '',
      }),
    ).rejects.toThrow('Network error');
  });

  it('commentSet() throws on network failure', async () => {
    stubFetch(vi.fn(() => Promise.reject(new Error('Network down'))) as unknown as typeof fetch);

    const svc = createHttpCommentService();
    await expect(
      svc.commentSet({
        LOTID: '',
        FACILITY: '',
        OPERATION: '',
        SUBOPERATION: '',
        COMMENTNO: '',
        OPERATORID: '',
        OPERNAME: '',
        OPERSEQUENCE: '',
        PASSWORD: '',
      }),
    ).rejects.toThrow('Network down');
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  it('handles response that is null (timeout wins and throws "No response")', async () => {
    // Simulate Promise.race returning null
    stubFetch(vi.fn(() => Promise.resolve(null as unknown as Response)) as unknown as typeof fetch);

    const svc = createHttpCommentService();
    await expect(
      svc.comment({
        LOTID: '',
        FACILITY: '',
        OPERATION: '',
        SUBOPERATION: '',
        COMMENTNO: '',
        OPERSEQUENCE: '',
        OPERATORID: '',
      }),
    ).rejects.toThrow('No response');
  });

  it('comment() uses default paths when custom paths are not provided', async () => {
    stubFetch(
      vi.fn(() =>
        Promise.resolve(
          fakeResponse({
            DESCRIPTION: '',
            PROCESSSTEP: '',
            PW: '',
            ISCURRENT: 'N',
            WORKCODE: 'X',
            ISCHECK: 'Y',
          }),
        ),
      ) as unknown as typeof fetch,
    );

    const svc = createHttpCommentService();
    await svc.comment({
      LOTID: '',
      FACILITY: '',
      OPERATION: '',
      SUBOPERATION: '',
      COMMENTNO: '',
      OPERSEQUENCE: '',
      OPERATORID: '',
    });
    expect(fetch).toHaveBeenCalledWith('/api/comment', expect.any(Object));

    stubFetch(
      vi.fn(() => Promise.resolve(fakeResponse({ status: 'ok' }))) as unknown as typeof fetch,
    );

    await svc.commentSet({
      LOTID: '',
      FACILITY: '',
      OPERATION: '',
      SUBOPERATION: '',
      COMMENTNO: '',
      OPERATORID: '',
      OPERNAME: '',
      OPERSEQUENCE: '',
      PASSWORD: '',
    });
    expect(fetch).toHaveBeenCalledWith('/api/commentSet', expect.any(Object));
  });

  it('default export is the same as createHttpCommentService', async () => {
    const { default: defaultExport } =
      await import('src/features/comment-view/services/comment.service.http');
    expect(defaultExport).toBe(createHttpCommentService);
  });
});
