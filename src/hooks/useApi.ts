// src/hooks/useApi.ts
import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiResponse, getErrorMessage } from '@/lib/api';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}


export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T> | null>,   // allow null here
  dependencies: any[] = []
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall();

      // ←——— NULL GUARD
      if (response == null) {
        setError('No response from server');
        setData(null);
        return;
      }

      // ←——— OPTIONAL CHAINING
      if (response?.success && response.data != null) {
        setData(response.data);
      } else {
        setError(response.error ?? response.message ?? 'Failed to fetch data');
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('API Error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}


// Comments:
// This custom hook provides functionality for making API mutations (POST, PUT, DELETE, etc.).
// It manages the loading and error states for a single mutation.
// The `mutate` function is a key part, designed to be called from a component to perform an API operation.
// It now returns a Promise that resolves with the response data (T), or `true` for success
// without data, and rejects with an error if the API call fails.
export function useApiMutation<T, P = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comments:
  // `mutate` is the core function of this hook.
  // It takes an `apiCall` function (which performs the actual API request) and its `params`.
  // It returns a promise that resolves to either the data from a successful response (type T)
  // or a boolean `true` if the operation was successful but returned no data.
  // In case of an error, it throws an exception that can be caught by the calling component.
  const mutate = useCallback(async (
    apiCall: (params: P) => Promise<ApiResponse<T>>,
    params: P
  ): Promise<T | boolean> => { // Updated return type to include 'boolean'
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall(params);

      // Comments:
      // The condition is updated to check for `response.success`.
      // This is a more robust way to handle successful API calls, regardless of whether
      // they return a data payload. For example, a DELETE operation might succeed but return no data.
      if (response.success) {
        // If data is present, return the data.
        if (response.data) {
          return response.data;
        }
        // If no data, but success is true, return a boolean true to signify success.
        return true;
      } else {
        const errorMessage = response.error || response.message || 'Operation failed';
        console.error('API Mutation Error:', errorMessage);
        // Throw an error to be caught by the calling component's try...catch block.
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      console.error('API Mutation Error:', errorMessage);
      setError(errorMessage);
      // Re-throw the error to be caught by the calling component.
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    mutate,
    loading,
    error,
    clearError: () => setError(null),
  };
}