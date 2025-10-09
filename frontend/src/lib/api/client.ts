// Import the queryClient from api-hooks
import { queryClient } from './api-hooks';

// Re-export from api-client
export { apiClient, type ApiResponse, type ApiError, type QueryKey, type ApiHookOptions } from './api-client';

// Re-export from api-hooks
export { 
  useApiQuery,
  useApiMutation,
  useApiUpload,
  useApiDelete,
  usePost,
  usePut,
  usePatch,
  useDelete
} from './api-hooks';

// Export the queryClient
export { queryClient };

// For backward compatibility
export { default } from './api-client';
