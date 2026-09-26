/** What the generic table sends to the API. Page numbers start at 1. */
export interface PageQuery {
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/** What the API returns. Change the field names here if your backend differs. */
export interface Page<T> {
  data: T[];
  total: number;
}
