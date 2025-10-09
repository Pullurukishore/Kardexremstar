import { QueryClient, useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from './api-client';

// Define types locally to avoid circular dependencies
export type QueryKey = string | readonly unknown[];

type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
};

type ApiError = {
  message: string;
  status?: number;
  code?: string;
  details?: any;
};

type ApiHookOptions = {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  retry?: number | boolean;
  staleTime?: number;
  cacheTime?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export function useApiQuery<TData = any, TError = ApiError>(
  key: string | any[], 
  url: string, 
  config?: Omit<UseQueryOptions<ApiResponse<TData>, TError>, 'queryKey' | 'queryFn'> & {
    params?: Record<string, any>;
  }
) {
  return useQuery<ApiResponse<TData>, TError>({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: async () => {
      const response = await apiClient.get<TData>(url, { 
        params: config?.params 
      });
      return response;
    },
    ...config,
  });
}

type MutationMethod = 'post' | 'put' | 'patch' | 'delete';

export function useApiMutation<TData = any, TVariables = any, TContext = unknown>(
  method: MutationMethod,
  url: string,
  options?: Omit<UseMutationOptions<ApiResponse<TData>, ApiError, TVariables, TContext>, 'mutationFn'> & {
    invalidateQueries?: string[] | ((data: ApiResponse<TData>, variables: TVariables) => string[]);
  }
) {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<TData>, ApiError, TVariables, TContext>({
    mutationFn: async (data: TVariables) => {
      switch (method) {
        case 'post':
          return apiClient.post<TData>(url, data);
        case 'put':
          return apiClient.put<TData>(url, data);
        case 'patch':
          return apiClient.patch<TData>(url, data);
        case 'delete':
          return apiClient.delete<TData>(url, { data });
        default:
          throw new Error(`Unsupported mutation method: ${method}`);
      }
    },
    onSuccess: (data, variables, context) => {
      if (options?.invalidateQueries) {
        const queries = typeof options.invalidateQueries === 'function'
          ? options.invalidateQueries(data, variables)
          : options.invalidateQueries;
        
        queries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
        });
      }
      
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    ...options,
  });
}

export function useApiUpload<TData = any>() {
  return useMutation<ApiResponse<TData>, ApiError, { url: string; file: File; fieldName?: string }>(
    async ({ url, file, fieldName = 'file' }) => {
      return apiClient.upload<TData>(url, file, fieldName);
    }
  );
}

export function useApiDelete<TData = any>() {
  return useMutation<ApiResponse<TData>, ApiError, { url: string; data?: any }>(
    async ({ url, data }) => {
      return apiClient.delete<TData>(url, { data });
    }
  );
}

// Pre-configured hooks for common operations
export const usePost = <TData = any, TVariables = any>(
  url: string,
  options?: Parameters<typeof useApiMutation<TData, TVariables>>[2]
) => useApiMutation<TData, TVariables>('post', url, options);

export const usePut = <TData = any, TVariables = any>(
  url: string,
  options?: Parameters<typeof useApiMutation<TData, TVariables>>[2]
) => useApiMutation<TData, TVariables>('put', url, options);

export const usePatch = <TData = any, TVariables = any>(
  url: string,
  options?: Parameters<typeof useApiMutation<TData, TVariables>>[2]
) => useApiMutation<TData, TVariables>('patch', url, options);

export const useDelete = <TData = any, TVariables = any>(
  url: string,
  options?: Parameters<typeof useApiMutation<TData, TVariables>>[2]
) => useApiMutation<TData, TVariables>('delete', url, options);
