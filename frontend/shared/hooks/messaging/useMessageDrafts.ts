// Message draft persistence and recovery system
// Provides auto-save, recovery, and cross-device sync capabilities
import { useState, useCallback, useEffect, useRef } from 'react';

interface MessageDraft {
  threadId: string;
  content: string;
  timestamp: number;
  attachments?: File[];
  isInternalNote?: boolean;
  lastModified: number;
}

interface DraftConfig {
  autoSaveDelay?: number;
  maxDraftAge?: number; // in milliseconds
  maxDrafts?: number;
  storageKey?: string;
  enableCloudSync?: boolean;
}

const DEFAULT_CONFIG: Required<DraftConfig> = {
  autoSaveDelay: 1000, // 1 second
  maxDraftAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxDrafts: 50,
  storageKey: 'messaging-drafts',
  enableCloudSync: false,
};

export const useMessageDrafts = (config: DraftConfig = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { autoSaveDelay, maxDraftAge, maxDrafts, storageKey } = finalConfig;

  // State for drafts
  const [drafts, setDrafts] = useState<Record<string, MessageDraft>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Refs for debouncing and cleanup
  const autoSaveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const beforeUnloadHandler = useRef<(() => void) | null>(null);

  // Load drafts from localStorage
  const loadDrafts = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedDrafts = JSON.parse(stored) as Record<string, MessageDraft>;
        
        // Filter out expired drafts
        const now = Date.now();
        const validDrafts = Object.fromEntries(
          Object.entries(parsedDrafts).filter(([_, draft]) => 
            now - draft.lastModified < maxDraftAge
          )
        );

        setDrafts(validDrafts);
        
        // Clean up if we removed expired drafts
        if (Object.keys(validDrafts).length !== Object.keys(parsedDrafts).length) {
          localStorage.setItem(storageKey, JSON.stringify(validDrafts));
        }
      }
    } catch (error) {
      console.warn('Failed to load message drafts:', error);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey, maxDraftAge]);

  // Save drafts to localStorage
  const saveDrafts = useCallback((draftsToSave: Record<string, MessageDraft>) => {
    try {
      // Limit the number of drafts to prevent storage bloat
      const entries = Object.entries(draftsToSave)
        .sort(([, a], [, b]) => b.lastModified - a.lastModified)
        .slice(0, maxDrafts);
      
      const limitedDrafts = Object.fromEntries(entries);
      localStorage.setItem(storageKey, JSON.stringify(limitedDrafts));
      
      return true;
    } catch (error) {
      console.error('Failed to save drafts to localStorage:', error);
      return false;
    }
  }, [storageKey, maxDrafts]);

  // Auto-save a draft with debouncing
  const saveDraft = useCallback((
    threadId: string,
    content: string,
    isInternalNote = false,
    attachments?: File[]
  ) => {
    // Clear existing timeout for this thread
    if (autoSaveTimeouts.current[threadId]) {
      clearTimeout(autoSaveTimeouts.current[threadId]);
    }

    // Don't save empty drafts
    if (!content.trim() && (!attachments || attachments.length === 0)) {
      // Remove empty draft if it exists
      setDrafts(prev => {
        const updated = { ...prev };
        delete updated[threadId];
        saveDrafts(updated);
        return updated;
      });
      return;
    }

    // Debounced save
    autoSaveTimeouts.current[threadId] = setTimeout(() => {
      const draft: MessageDraft = {
        threadId,
        content: content.trim(),
        timestamp: Date.now(),
        attachments,
        isInternalNote,
        lastModified: Date.now(),
      };

      setDrafts(prev => {
        const updated = { ...prev, [threadId]: draft };
        saveDrafts(updated);
        return updated;
      });

      console.log('📝 Draft auto-saved for thread:', threadId);
      delete autoSaveTimeouts.current[threadId];
    }, autoSaveDelay);
  }, [autoSaveDelay, saveDrafts]);

  // Get a draft for a specific thread
  const getDraft = useCallback((threadId: string): MessageDraft | null => {
    return drafts[threadId] || null;
  }, [drafts]);

  // Clear a specific draft
  const clearDraft = useCallback((threadId: string) => {
    // Clear any pending auto-save
    if (autoSaveTimeouts.current[threadId]) {
      clearTimeout(autoSaveTimeouts.current[threadId]);
      delete autoSaveTimeouts.current[threadId];
    }

    setDrafts(prev => {
      const updated = { ...prev };
      delete updated[threadId];
      saveDrafts(updated);
      return updated;
    });

    console.log('🗑️ Draft cleared for thread:', threadId);
  }, [saveDrafts]);

  // Clear all drafts
  const clearAllDrafts = useCallback(() => {
    // Clear all timeouts
    Object.values(autoSaveTimeouts.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    autoSaveTimeouts.current = {};

    setDrafts({});
    
    try {
      localStorage.removeItem(storageKey);
      console.log('🗑️ All drafts cleared');
    } catch (error) {
      console.error('Failed to clear drafts from localStorage:', error);
    }
  }, [storageKey]);

  // Get draft statistics
  const getDraftStats = useCallback(() => {
    const draftEntries = Object.entries(drafts);
    const now = Date.now();
    
    return {
      totalDrafts: draftEntries.length,
      oldestDraft: draftEntries.length > 0 
        ? Math.min(...draftEntries.map(([, draft]) => draft.timestamp))
        : null,
      newestDraft: draftEntries.length > 0
        ? Math.max(...draftEntries.map(([, draft]) => draft.timestamp))
        : null,
      draftsWithAttachments: draftEntries.filter(([, draft]) => 
        draft.attachments && draft.attachments.length > 0
      ).length,
      internalNoteDrafts: draftEntries.filter(([, draft]) => 
        draft.isInternalNote
      ).length,
      recentDrafts: draftEntries.filter(([, draft]) => 
        now - draft.lastModified < 60 * 60 * 1000 // Last hour
      ).length,
    };
  }, [drafts]);

  // Check if there are unsaved changes for a thread
  const hasUnsavedChanges = useCallback((threadId: string, currentContent: string) => {
    const draft = getDraft(threadId);
    if (!draft) return currentContent.trim().length > 0;
    
    return draft.content !== currentContent.trim();
  }, [getDraft]);

  // Recovery helper for detecting potential data loss
  const getRecoveryInfo = useCallback((threadId: string) => {
    const draft = getDraft(threadId);
    if (!draft) return null;

    const age = Date.now() - draft.lastModified;
    const isRecent = age < 5 * 60 * 1000; // 5 minutes
    const hasContent = draft.content.length > 0;
    
    return {
      exists: true,
      age,
      isRecent,
      hasContent,
      hasAttachments: Boolean(draft.attachments?.length),
      contentPreview: draft.content.substring(0, 100) + (draft.content.length > 100 ? '...' : ''),
      lastModified: new Date(draft.lastModified).toLocaleString(),
    };
  }, [getDraft]);

  // Export drafts for backup/debugging
  const exportDrafts = useCallback(() => {
    const exportData = {
      version: '1.0',
      timestamp: Date.now(),
      drafts: Object.entries(drafts).map(([threadId, draft]) => ({
        threadId,
        content: draft.content,
        timestamp: draft.timestamp,
        lastModified: draft.lastModified,
        isInternalNote: draft.isInternalNote,
        attachmentCount: draft.attachments?.length || 0,
      })),
      stats: getDraftStats(),
    };

    return JSON.stringify(exportData, null, 2);
  }, [drafts, getDraftStats]);

  // Initialize drafts on mount
  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Set up beforeunload handler to save any pending changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Force save any pending drafts
      Object.entries(autoSaveTimeouts.current).forEach(([threadId, timeout]) => {
        clearTimeout(timeout);
        // Note: We can't async save here, but localStorage is synchronous
      });

      // Check for unsaved changes
      const hasUnsaved = Object.keys(autoSaveTimeouts.current).length > 0;
      if (hasUnsaved) {
        event.preventDefault();
        event.returnValue = 'You have unsaved message drafts. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    beforeUnloadHandler.current = () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };

    return () => {
      beforeUnloadHandler.current?.();
    };
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(autoSaveTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  // Storage event listener for cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) {
        try {
          const updatedDrafts = JSON.parse(event.newValue);
          setDrafts(updatedDrafts);
          console.log('📡 Drafts synchronized from another tab');
        } catch (error) {
          console.error('Failed to sync drafts from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey]);

  return {
    // State
    drafts,
    isLoaded,
    
    // Core operations
    saveDraft,
    getDraft,
    clearDraft,
    clearAllDrafts,
    
    // Utilities
    hasUnsavedChanges,
    getRecoveryInfo,
    getDraftStats,
    exportDrafts,
    
    // Status
    hasDrafts: Object.keys(drafts).length > 0,
    draftCount: Object.keys(drafts).length,
  };
};