import { useState, useCallback, useEffect } from 'react';
import type { HistoryEntry } from '../types';

const STORAGE_KEY = 'ai-test-history';
const MAX_HISTORY_SIZE = 100;

export interface UseHistoryReturn {
  history: HistoryEntry[];
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  deleteEntry: (id: string) => void;
  exportHistory: () => string;
  importHistory: (data: string) => void;
}

export const useHistory = (): UseHistoryReturn => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);

  // Save to localStorage whenever history changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (err) {
      console.error('Failed to save history:', err);
    }
  }, [history]);

  const addEntry = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };

    setHistory(prev => {
      const updated = [newEntry, ...prev];
      // Keep only the most recent entries
      return updated.slice(0, MAX_HISTORY_SIZE);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== id));
  }, []);

  const exportHistory = useCallback(() => {
    return JSON.stringify(history, null, 2);
  }, [history]);

  const importHistory = useCallback((data: string) => {
    try {
      const imported = JSON.parse(data);
      if (Array.isArray(imported)) {
        setHistory(imported);
      }
    } catch (err) {
      console.error('Failed to import history:', err);
    }
  }, []);

  return {
    history,
    addEntry,
    clearHistory,
    deleteEntry,
    exportHistory,
    importHistory,
  };
};
