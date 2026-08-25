export interface ApiListResponse<TItem> {
  data: TItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiErrorResponse {
  code: string;
  details?: unknown;
  message: string;
}
