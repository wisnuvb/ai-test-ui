/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';

export interface UseAPIState {
  isLoading: boolean;
  error: string | null;
  data: any;
}

export interface UseAPIReturn extends UseAPIState {
  execute: (fn: () => Promise<any>) => Promise<any>;
  reset: () => void;
  setData: (data: any) => void;
}

export const useAPI = (): UseAPIReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const execute = useCallback(async (fn: () => Promise<any>) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fn();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    isLoading,
    error,
    data,
    execute,
    reset,
    setData,
  };
};
