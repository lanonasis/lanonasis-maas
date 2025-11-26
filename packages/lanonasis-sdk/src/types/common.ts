/**
 * Common types and interfaces for LanOnasis SDK
 */

export interface ClientConfig {
  apiUrl?: string;
  apiKey?: string;
  token?: string;
  organizationId?: string;
  timeout?: number;
  headers?: Record<string, string>;
  debug?: boolean;
}

export interface AuthToken {
  userId?: string;
  organizationId?: string;
  exp: number;
  iat: number;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type SortOrder = 'asc' | 'desc';

export interface FilterOptions {
  [key: string]: any;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: Record<string, any>;
}

export interface SuccessResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

