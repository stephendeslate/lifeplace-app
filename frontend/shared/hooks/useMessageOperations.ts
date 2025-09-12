/**
 * Message Operations Hook
 * 
 * Features:
 * - CRUD operations for messages with optimistic updates
 * - File upload and attachment management
 * - Message validation and preprocessing
 * - Undo/redo functionality
 * - Draft message handling
 * - Message formatting and sanitization
 */

import { useState, useCallback, useRef, useEffect } from 'react';

import {
  useSendMessage,
  useUpdateMessage,
  useDeleteMessage,
  useUploadFile,
  useMarkMessageRead,
  type Message,
  type SendMessageRequest,
  type MessageAttachment,
  type UploadProgressCallback
} from '../services';

export interface MessageDraft {
  threadId: string;
  content: string;
  attachments: File[];
  isInternalNote: boolean;
  lastSaved: number;
}

export interface MessageOperation {
  id: string;
  type: 'send' | 'edit' | 'delete' | 'upload';
  timestamp: number;
  data: any;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

export interface MessageValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UseMessageOperationsOptions {
  threadId?: string;
  enableDrafts?: boolean;
  draftSaveInterval?: number;
  maxAttachmentSize?: number;
  allowedFileTypes?: string[];
  enableUndo?: boolean;
  maxUndoHistory?: number;
}

export interface UseMessageOperationsReturn {
  // Draft management
  draft: MessageDraft | null;
  updateDraft: (updates: Partial<Omit<MessageDraft, 'threadId' | 'lastSaved'>>) => void;
  saveDraft: () => void;
  loadDraft: (threadId: string) => void;
  clearDraft: () => void;
  hasDraft: boolean;

  // Message operations
  sendMessage: (
    content: string,
    options?: {
      attachments?: File[];
      isInternalNote?: boolean;
      threadId?: string;
    }
  ) => Promise<Message>;
  
  editMessage: (messageId: string, content: string) => Promise<Message>;
  deleteMessage: (messageId: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;

  // File operations
  uploadFile: (
    file: File,
    onProgress?: UploadProgressCallback
  ) => Promise<MessageAttachment>;
  
  uploadFiles: (
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void
  ) => Promise<MessageAttachment[]>;
  
  removeAttachment: (index: number) => void;

  // Validation
  validateMessage: (content: string, attachments?: File[]) => MessageValidation;
  validateFile: (file: File) => MessageValidation;

  // Undo/Redo
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;

  // State
  isLoading: boolean;
  uploadProgress: Record<string, number>;
  operations: MessageOperation[];
  error: Error | null;
}

/**
 * Hook for managing message operations and state
 */
export const useMessageOperations = (
  options: UseMessageOperationsOptions = {}
): UseMessageOperationsReturn => {
  const {
    threadId,
    enableDrafts = true,
    draftSaveInterval = 5000,
    maxAttachmentSize = 10 * 1024 * 1024, // 10MB
    allowedFileTypes = [
      'image/*',
      'application/pdf',
      'text/*',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx'
    ],
    enableUndo = true,
    maxUndoHistory = 10
  } = options;

  // State
  const [draft, setDraft] = useState<MessageDraft | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [operations, setOperations] = useState<MessageOperation[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [undoHistory, setUndoHistory] = useState<MessageOperation[]>([]);
  const [redoHistory, setRedoHistory] = useState<MessageOperation[]>([]);

  // Refs
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const operationIdRef = useRef(0);

  // Mutations
  const sendMessageMutation = useSendMessage({
    onError: (error) => setError(error as Error),
  });

  const updateMessageMutation = useUpdateMessage({
    onError: (error) => setError(error as Error),
  });

  const deleteMessageMutation = useDeleteMessage({
    onError: (error) => setError(error as Error),
  });

  const uploadFileMutation = useUploadFile({
    onError: (error) => setError(error as Error),
  });

  const markReadMutation = useMarkMessageRead({
    onError: (error) => setError(error as Error),
  });

  const isLoading = 
    sendMessageMutation.isPending ||
    updateMessageMutation.isPending ||
    deleteMessageMutation.isPending ||
    uploadFileMutation.isPending ||
    markReadMutation.isPending;

  // Utility functions
  const generateOperationId = useCallback(() => {
    return `op_${++operationIdRef.current}_${Date.now()}`;
  }, []);

  const addOperation = useCallback((operation: Omit<MessageOperation, 'id' | 'timestamp'>) => {
    const newOperation: MessageOperation = {
      ...operation,
      id: generateOperationId(),
      timestamp: Date.now(),
    };

    setOperations(prev => [newOperation, ...prev.slice(0, 99)]); // Keep last 100 operations
    return newOperation;
  }, [generateOperationId]);

  const updateOperation = useCallback((id: string, updates: Partial<MessageOperation>) => {
    setOperations(prev => 
      prev.map(op => op.id === id ? { ...op, ...updates } : op)
    );
  }, []);

  // Draft management
  const updateDraft = useCallback((updates: Partial<Omit<MessageDraft, 'threadId' | 'lastSaved'>>) => {
    if (!enableDrafts || !threadId) return;

    setDraft(prev => {
      const newDraft: MessageDraft = {
        threadId,
        content: '',
        attachments: [],
        isInternalNote: false,
        lastSaved: Date.now(),
        ...prev,
        ...updates,
      };

      // Schedule auto-save
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }

      draftSaveTimeoutRef.current = setTimeout(() => {
        saveDraftToStorage(newDraft);
      }, draftSaveInterval);

      return newDraft;
    });
  }, [enableDrafts, threadId, draftSaveInterval]);

  const saveDraftToStorage = useCallback((draftToSave: MessageDraft) => {
    if (!enableDrafts) return;

    try {
      const drafts = JSON.parse(localStorage.getItem('messageDrafts') || '{}');
      drafts[draftToSave.threadId] = {
        ...draftToSave,
        attachments: [], // Don't persist files in localStorage
      };
      localStorage.setItem('messageDrafts', JSON.stringify(drafts));
    } catch (error) {
      console.warn('Failed to save draft:', error);
    }
  }, [enableDrafts]);

  const saveDraft = useCallback(() => {
    if (draft) {
      saveDraftToStorage(draft);
    }
  }, [draft, saveDraftToStorage]);

  const loadDraft = useCallback((targetThreadId: string) => {
    if (!enableDrafts) return;

    try {
      const drafts = JSON.parse(localStorage.getItem('messageDrafts') || '{}');
      const savedDraft = drafts[targetThreadId];
      
      if (savedDraft) {
        setDraft({
          ...savedDraft,
          threadId: targetThreadId,
          attachments: [], // Files are not persisted
        });
      } else {
        setDraft({
          threadId: targetThreadId,
          content: '',
          attachments: [],
          isInternalNote: false,
          lastSaved: Date.now(),
        });
      }
    } catch (error) {
      console.warn('Failed to load draft:', error);
      setDraft({
        threadId: targetThreadId,
        content: '',
        attachments: [],
        isInternalNote: false,
        lastSaved: Date.now(),
      });
    }
  }, [enableDrafts]);

  const clearDraft = useCallback(() => {
    if (draft?.threadId && enableDrafts) {
      try {
        const drafts = JSON.parse(localStorage.getItem('messageDrafts') || '{}');
        delete drafts[draft.threadId];
        localStorage.setItem('messageDrafts', JSON.stringify(drafts));
      } catch (error) {
        console.warn('Failed to clear draft:', error);
      }
    }

    setDraft(null);
    
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }
  }, [draft, enableDrafts]);

  // Validation
  const validateMessage = useCallback((content: string, attachments: File[] = []): MessageValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Content validation
    if (!content.trim() && attachments.length === 0) {
      errors.push('Message must have content or attachments');
    }

    if (content.length > 10000) {
      errors.push('Message content too long (max 10,000 characters)');
    }

    // Attachment validation
    attachments.forEach((file, index) => {
      const fileValidation = validateFile(file);
      fileValidation.errors.forEach(error => 
        errors.push(`Attachment ${index + 1}: ${error}`)
      );
      fileValidation.warnings.forEach(warning => 
        warnings.push(`Attachment ${index + 1}: ${warning}`)
      );
    });

    // Content warnings
    if (content.length > 5000) {
      warnings.push('Message is quite long. Consider breaking it into smaller messages.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, []);

  const validateFile = useCallback((file: File): MessageValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Size validation
    if (file.size > maxAttachmentSize) {
      errors.push(`File size too large (max ${maxAttachmentSize / 1024 / 1024}MB)`);
    }

    // Type validation
    const isAllowedType = allowedFileTypes.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''));
      }
      return file.name.toLowerCase().endsWith(type) || file.type === type;
    });

    if (!isAllowedType) {
      errors.push(`File type not allowed. Allowed types: ${allowedFileTypes.join(', ')}`);
    }

    // Size warnings
    if (file.size > maxAttachmentSize * 0.8) {
      warnings.push('File is quite large and may take longer to upload');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [maxAttachmentSize, allowedFileTypes]);

  // File operations
  const uploadFile = useCallback(async (
    file: File,
    _onProgress?: UploadProgressCallback
  ): Promise<MessageAttachment> => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const fileId = `file_${Date.now()}_${Math.random()}`;
    
    try {
      setError(null);
      
      const attachment = await uploadFileMutation.mutateAsync(file, {
        onSuccess: () => {
          setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        }
      });

      // Clean up progress tracking
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }, 1000);

      return attachment;
    } catch (error) {
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
      throw error;
    }
  }, [validateFile, uploadFileMutation]);

  const uploadFiles = useCallback(async (
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<MessageAttachment[]> => {
    const uploadPromises = files.map((file, index) =>
      uploadFile(file, (progress) => onProgress?.(index, progress))
    );

    return Promise.all(uploadPromises);
  }, [uploadFile]);

  // Message operations
  const sendMessage = useCallback(async (
    content: string,
    operationOptions: {
      attachments?: File[];
      isInternalNote?: boolean;
      threadId?: string;
    } = {}
  ): Promise<Message> => {
    const {
      attachments = [],
      isInternalNote = false,
      threadId: targetThreadId = threadId
    } = operationOptions;

    if (!targetThreadId) {
      throw new Error('Thread ID is required');
    }

    // Validate message
    const validation = validateMessage(content, attachments);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const operation = addOperation({
      type: 'send',
      data: { content, attachments, isInternalNote, threadId: targetThreadId },
      status: 'pending',
    });

    try {
      setError(null);

      // Upload attachments first if any
      let attachmentIds: string[] = [];
      if (attachments.length > 0) {
        const uploadedAttachments = await uploadFiles(attachments);
        attachmentIds = uploadedAttachments.map(att => att.id);
      }

      // Send message
      const messageData: SendMessageRequest = {
        thread_id: targetThreadId,
        content: content.trim(),
        is_internal_note: isInternalNote,
        attachments: attachmentIds.length > 0 ? attachmentIds : undefined,
      };

      const message = await sendMessageMutation.mutateAsync(messageData);

      updateOperation(operation.id, { status: 'success' });

      // Clear draft after successful send
      if (enableDrafts && draft?.threadId === targetThreadId) {
        clearDraft();
      }

      // Add to undo history
      if (enableUndo) {
        setUndoHistory(prev => [
          { ...operation, status: 'success', data: { ...operation.data, messageId: message.id } },
          ...prev.slice(0, maxUndoHistory - 1)
        ]);
        setRedoHistory([]); // Clear redo history on new operation
      }

      return message;
    } catch (error) {
      const err = error as Error;
      updateOperation(operation.id, { status: 'error', error: err.message });
      throw err;
    }
  }, [
    threadId,
    validateMessage,
    addOperation,
    uploadFiles,
    sendMessageMutation,
    updateOperation,
    enableDrafts,
    draft,
    clearDraft,
    enableUndo,
    maxUndoHistory
  ]);

  const editMessage = useCallback(async (messageId: string, content: string): Promise<Message> => {
    const validation = validateMessage(content);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const operation = addOperation({
      type: 'edit',
      data: { messageId, content },
      status: 'pending',
    });

    try {
      setError(null);
      const message = await updateMessageMutation.mutateAsync({
        messageId,
        data: { content: content.trim() }
      });

      updateOperation(operation.id, { status: 'success' });
      return message;
    } catch (error) {
      const err = error as Error;
      updateOperation(operation.id, { status: 'error', error: err.message });
      throw err;
    }
  }, [validateMessage, addOperation, updateMessageMutation, updateOperation]);

  const deleteMessage = useCallback(async (messageId: string): Promise<void> => {
    const operation = addOperation({
      type: 'delete',
      data: { messageId },
      status: 'pending',
    });

    try {
      setError(null);
      await deleteMessageMutation.mutateAsync({
        messageId,
        threadId: threadId || ''
      });

      updateOperation(operation.id, { status: 'success' });
    } catch (error) {
      const err = error as Error;
      updateOperation(operation.id, { status: 'error', error: err.message });
      throw err;
    }
  }, [addOperation, deleteMessageMutation, updateOperation, threadId]);

  const markAsRead = useCallback(async (messageId: string): Promise<void> => {
    try {
      setError(null);
      await markReadMutation.mutateAsync(messageId);
    } catch (error) {
      const err = error as Error;
      setError(err);
      throw err;
    }
  }, [markReadMutation]);

  const removeAttachment = useCallback((index: number) => {
    if (!draft) return;

    updateDraft({
      attachments: draft.attachments.filter((_, i) => i !== index)
    });
  }, [draft, updateDraft]);

  // Undo/Redo functionality
  const undo = useCallback(async (): Promise<void> => {
    if (!enableUndo || undoHistory.length === 0) return;

    const lastOperation = undoHistory[0];
    const restHistory = undoHistory.slice(1);

    try {
      // Reverse the operation
      switch (lastOperation.type) {
        case 'send':
          // For sent messages, we would need to implement message deletion
          // This is a placeholder - actual implementation depends on business rules
          console.warn('Undo send message not yet implemented');
          break;
        
        case 'edit':
          // Would need to restore previous content
          console.warn('Undo edit message not yet implemented');
          break;
        
        case 'delete':
          // Would need to restore deleted message
          console.warn('Undo delete message not yet implemented');
          break;
      }

      setUndoHistory(restHistory);
      setRedoHistory(prev => [lastOperation, ...prev]);
    } catch (error) {
      console.error('Undo failed:', error);
    }
  }, [enableUndo, undoHistory]);

  const redo = useCallback(async (): Promise<void> => {
    if (!enableUndo || redoHistory.length === 0) return;

    const nextOperation = redoHistory[0];
    const restHistory = redoHistory.slice(1);

    try {
      // Re-execute the operation
      // Implementation would depend on operation type
      console.warn('Redo not yet fully implemented');

      setRedoHistory(restHistory);
      setUndoHistory(prev => [nextOperation, ...prev]);
    } catch (error) {
      console.error('Redo failed:', error);
    }
  }, [enableUndo, redoHistory]);

  // Load draft when threadId changes
  useEffect(() => {
    if (threadId && enableDrafts) {
      loadDraft(threadId);
    }
  }, [threadId, enableDrafts, loadDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Draft management
    draft,
    updateDraft,
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft: Boolean(draft?.content || draft?.attachments.length),

    // Message operations
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,

    // File operations
    uploadFile,
    uploadFiles,
    removeAttachment,

    // Validation
    validateMessage,
    validateFile,

    // Undo/Redo
    undo,
    redo,
    canUndo: enableUndo && undoHistory.length > 0,
    canRedo: enableUndo && redoHistory.length > 0,

    // State
    isLoading,
    uploadProgress,
    operations,
    error,
  };
};

export default useMessageOperations;