export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export type QueryKey = string | readonly unknown[];

export interface ApiHookOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  retry?: number | boolean;
  staleTime?: number;
  cacheTime?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export interface QueryOptions<T> extends ApiHookOptions {
  queryKey: QueryKey;
  queryFn: (context: any) => Promise<T>;
}
