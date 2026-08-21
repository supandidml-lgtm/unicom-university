/**
 * Standard API Response Structures
 * Strictly according to MASTER PRD §100 & Backend Rules
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ResponseMetadata;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ResponseMetadata {
  pagination?: PaginationMeta;
  timestamp?: string;
  version?: string;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
