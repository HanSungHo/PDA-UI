import axios from 'axios';
import type { ApiErrorResponse } from 'src/types/api';

export interface ApiErrorOptions {
  cause?: unknown;
  code?: string;
  details?: unknown;
  status?: number | null;
}

export class ApiError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly status: number | null;

  constructor(message: string, options: ApiErrorOptions = {}) {
    if (options.cause === undefined) {
      super(message);
    } else {
      super(message, { cause: options.cause });
    }

    this.name = 'ApiError';
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.details = options.details;
    this.status = options.status ?? null;
  }
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as Partial<ApiErrorResponse>;

  return typeof response.code === 'string' && typeof response.message === 'string';
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const responseData: unknown = error.response?.data;
    const apiResponse = isApiErrorResponse(responseData) ? responseData : undefined;

    return new ApiError(apiResponse?.message ?? (error.message || 'API request failed.'), {
      cause: error,
      code: apiResponse?.code ?? error.code ?? 'HTTP_ERROR',
      details: apiResponse?.details ?? responseData,
      status: error.response?.status ?? null,
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message, { cause: error });
  }

  return new ApiError('An unknown API error occurred.', {
    cause: error,
    details: error,
  });
}
