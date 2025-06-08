"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

type ViewMode = 'grid' | 'list';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>('grid');
  const { user } = useAuth();
  useEffect(() => {
    // Load view mode from user preferences or localStorage
    const savedViewMode = (user?.viewMode as ViewMode) || (localStorage.getItem('viewMode') as ViewMode) || 'grid';
    setViewModeState(savedViewMode);
  }, [user]);

  const setViewMode = async (newViewMode: ViewMode) => {
    setViewModeState(newViewMode);
    localStorage.setItem('viewMode', newViewMode);

    // Update user preference in database if logged in
    if (user) {
      try {
        await fetch('/api/auth/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ viewMode: newViewMode }),
        });
      } catch (error) {
        console.error('Failed to save view mode preference:', error);
      }
    }
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
