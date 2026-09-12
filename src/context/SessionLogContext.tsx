import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SessionLogEntry, SessionData } from '../types';

interface SessionLogContextType {
  entries: SessionLogEntry[];
  logAction: (
    category: SessionLogEntry['category'],
    action: string,
    details?: Record<string, any>
  ) => void;
  exportSessionLog: () => void;
  clearSessionLog: () => void;
  sessionId: string;
}

const SessionLogContext = createContext<SessionLogContextType | null>(null);

export const SessionLogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionId] = useState<string>(() => 'session_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now());
  const [sessionStartTime] = useState<string>(() => new Date().toISOString());
  const [entries, setEntries] = useState<SessionLogEntry[]>([]);

  const logAction = useCallback(
    (
      category: SessionLogEntry['category'],
      action: string,
      details?: Record<string, any>
    ) => {
      const newEntry: SessionLogEntry = {
        id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        category,
        action,
        details,
      };
      setEntries((prev) => [...prev, newEntry]);
    },
    []
  );

  // Log session initialization on mount
  useEffect(() => {
    logAction('system', 'Session Initialized', {
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      platform: navigator.platform,
      defaultTab: 'veo',
    });
  }, [logAction]);

  const exportSessionLog = useCallback(() => {
    const sessionData: SessionData = {
      sessionId,
      startedAt: sessionStartTime,
      exportedAt: new Date().toISOString(),
      appVersion: '1.2.0',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      environment: {
        region: 'asia-southeast1',
        acceleratorCluster: 'TPU v5p / NVIDIA H100 Mesh',
        port: 3000,
      },
      totalInteractions: entries.length,
      events: entries,
    };

    const jsonString = JSON.stringify(sessionData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.download = `cloudscale_session_log_${sessionId}_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also record this download action in the ongoing session!
    logAction('system', 'Exported Session Log JSON', {
      exportedEventCount: entries.length,
      fileSizeKb: (blob.size / 1024).toFixed(2),
    });
  }, [sessionId, sessionStartTime, entries, logAction]);

  const clearSessionLog = useCallback(() => {
    setEntries([]);
    logAction('system', 'Session Log Reset by User', {});
  }, [logAction]);

  return (
    <SessionLogContext.Provider
      value={{
        entries,
        logAction,
        exportSessionLog,
        clearSessionLog,
        sessionId,
      }}
    >
      {children}
    </SessionLogContext.Provider>
  );
};

export function useSessionLog(): SessionLogContextType {
  const context = useContext(SessionLogContext);
  if (!context) {
    throw new Error('useSessionLog must be used within a SessionLogProvider');
  }
  return context;
}
