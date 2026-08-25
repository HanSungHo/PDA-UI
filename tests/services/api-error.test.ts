import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

import { ApiError, normalizeApiError } from '../../src/services/api-error';

describe('normalizeApiError', () => {
  it('preserves API status and error contract in an Error instance', () => {
    const response = {
      data: {
        code: 'VALIDATION_FAILED',
        message: 'The request is invalid.',
        details: { field: 'name' },
      },
      status: 422,
    } as AxiosResponse;
    const axiosError = new AxiosError(
      'Request failed with status code 422',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      response,
    );

    const result = normalizeApiError(axiosError);

    expect(result).toBeInstanceOf(ApiError);
    expect(result).toMatchObject({
      code: 'VALIDATION_FAILED',
      details: { field: 'name' },
      message: 'The request is invalid.',
      status: 422,
    });
    expect(result.cause).toBe(axiosError);
  });

  it('normalizes non-Axios failures without throwing away the cause', () => {
    const cause = new Error('Connection closed');

    const result = normalizeApiError(cause);

    expect(result).toMatchObject({
      code: 'UNKNOWN_ERROR',
      message: 'Connection closed',
      status: null,
    });
    expect(result.cause).toBe(cause);
  });
});
