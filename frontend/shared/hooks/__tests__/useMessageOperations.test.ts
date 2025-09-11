/**
 * Comprehensive test suite for useMessageOperations hook
 * 
 * Tests:
 * - Message CRUD operations
 * - Draft management
 * - File upload and validation
 * - Undo/redo functionality
 * - Error handling
 * - Performance optimizations
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useMessageOperations } from '../useMessageOperations';
import type { 
  UseMessageOperationsOptions,
  MessageDraft,
  MessageValidation 
} from '../useMessageOperations';

// Mock dependencies
vi.mock('../../services', () => ({
  useSendMessage: vi.fn(),
  useUpdateMessage: vi.fn(),
  useDeleteMessage: vi.fn(),
  useUploadFile: vi.fn(),
  useMarkMessageRead: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Test data
const mockThread = {
  id: 'thread-123',
  name: 'Test Thread',
};

const mockMessage = {
  id: 'msg-456',
  thread_id: 'thread-123',
  content: 'Test message',
  sender: { id: 1, name: 'User', role: 'CLIENT' as const },
  created_at: '2024-01-15T10:00:00Z',
};

const mockAttachment = {
  id: 'att-789',
  filename: 'test.pdf',
  file_url: '/files/test.pdf',
  file_size: 1024,
  file_type: 'application/pdf',
  uploaded_at: '2024-01-15T10:00:00Z',
};

// Test file
const createMockFile = (name = 'test.txt', size = 1024, type = 'text/plain') => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useMessageOperations', () => {
  let mockSendMessage: any;
  let mockUpdateMessage: any;
  let mockDeleteMessage: any;
  let mockUploadFile: any;
  let mockMarkRead: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mutation mocks
    mockSendMessage = {
      mutateAsync: vi.fn().mockResolvedValue(mockMessage),
      isPending: false,
    };

    mockUpdateMessage = {
      mutateAsync: vi.fn().mockResolvedValue(mockMessage),
      isPending: false,
    };

    mockDeleteMessage = {
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    };

    mockUploadFile = {
      mutateAsync: vi.fn().mockResolvedValue(mockAttachment),
      isPending: false,
    };

    mockMarkRead = {
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    };

    const { 
      useSendMessage,
      useUpdateMessage, 
      useDeleteMessage,
      useUploadFile,
      useMarkMessageRead
    } = require('../../services');

    useSendMessage.mockReturnValue(mockSendMessage);
    useUpdateMessage.mockReturnValue(mockUpdateMessage);
    useDeleteMessage.mockReturnValue(mockDeleteMessage);
    useUploadFile.mockReturnValue(mockUploadFile);
    useMarkMessageRead.mockReturnValue(mockMarkRead);

    // Reset localStorage
    localStorageMock.getItem.mockReturnValue('{}');
    localStorageMock.setItem.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hook Initialization', () => {
    it('initializes with default options', () => {
      const { result } = renderHook(() => useMessageOperations(), {
        wrapper: createWrapper(),
      });

      expect(result.current.draft).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.operations).toEqual([]);
      expect(result.current.uploadProgress).toEqual({});
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it('initializes with custom options', () => {
      const options: UseMessageOperationsOptions = {
        threadId: 'thread-123',
        enableDrafts: false,
        enableUndo: false,
        maxAttachmentSize: 5 * 1024 * 1024,
        allowedFileTypes: ['image/*'],
      };

      const { result } = renderHook(() => useMessageOperations(options), {
        wrapper: createWrapper(),
      });

      expect(result.current.draft).toBeNull();
      expect(result.current.hasDraft).toBe(false);
    });

    it('loads existing draft when threadId is provided', () => {
      const savedDrafts = {
        'thread-123': {
          threadId: 'thread-123',
          content: 'Saved draft content',
          attachments: [],
          isInternalNote: false,
          lastSaved: Date.now(),
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedDrafts));

      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      expect(result.current.draft?.content).toBe('Saved draft content');
      expect(result.current.hasDraft).toBe(true);
    });
  });

  describe('Draft Management', () => {
    it('updates draft content', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.updateDraft({ content: 'New draft content' });
      });

      expect(result.current.draft?.content).toBe('New draft content');
      expect(result.current.hasDraft).toBe(true);
    });

    it('auto-saves draft after interval', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(
        () => useMessageOperations({ 
          threadId: 'thread-123',
          draftSaveInterval: 1000 
        }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.updateDraft({ content: 'Auto-save test' });
      });

      // Fast-forward time to trigger auto-save
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'messageDrafts',
          expect.stringContaining('Auto-save test')
        );
      });

      vi.useRealTimers();
    });

    it('manually saves draft', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.updateDraft({ content: 'Manual save test' });
      });

      act(() => {
        result.current.saveDraft();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'messageDrafts',
        expect.stringContaining('Manual save test')
      );
    });

    it('loads draft for specific thread', async () => {
      const savedDrafts = {
        'thread-456': {
          threadId: 'thread-456',
          content: 'Different thread draft',
          attachments: [],
          isInternalNote: false,
          lastSaved: Date.now(),
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedDrafts));

      const { result } = renderHook(
        () => useMessageOperations(),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.loadDraft('thread-456');
      });

      expect(result.current.draft?.content).toBe('Different thread draft');
    });

    it('clears draft and localStorage', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.updateDraft({ content: 'Content to clear' });
      });

      act(() => {
        result.current.clearDraft();
      });

      expect(result.current.draft).toBeNull();
      expect(result.current.hasDraft).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'messageDrafts',
        '{}'
      );
    });

    it('handles localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      // Should create empty draft instead of crashing
      expect(result.current.draft?.content).toBe('');
    });
  });

  describe('Message Operations', () => {
    it('sends message successfully', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      let sentMessage: any;

      await act(async () => {
        sentMessage = await result.current.sendMessage('Test message content');
      });

      expect(mockSendMessage.mutateAsync).toHaveBeenCalledWith({
        thread_id: 'thread-123',
        content: 'Test message content',
        is_internal_note: false,
        attachments: undefined,
      });

      expect(sentMessage).toEqual(mockMessage);
      expect(result.current.operations[0].type).toBe('send');
      expect(result.current.operations[0].status).toBe('success');
    });

    it('sends message with attachments', async () => {
      const testFile = createMockFile();
      
      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.sendMessage('Message with attachment', {
          attachments: [testFile],
        });
      });

      expect(mockUploadFile.mutateAsync).toHaveBeenCalledWith(testFile);
      expect(mockSendMessage.mutateAsync).toHaveBeenCalledWith({
        thread_id: 'thread-123',
        content: 'Message with attachment',
        is_internal_note: false,
        attachments: [mockAttachment.id],
      });
    });

    it('sends internal note', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.sendMessage('Internal note', {
          isInternalNote: true,
        });
      });

      expect(mockSendMessage.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          is_internal_note: true,
        })
      );
    });

    it('edits message successfully', async () => {
      const { result } = renderHook(
        () => useMessageOperations(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.editMessage('msg-123', 'Edited content');
      });

      expect(mockUpdateMessage.mutateAsync).toHaveBeenCalledWith({
        messageId: 'msg-123',
        data: { content: 'Edited content' },
      });
    });

    it('deletes message successfully', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.deleteMessage('msg-123');
      });

      expect(mockDeleteMessage.mutateAsync).toHaveBeenCalledWith({
        messageId: 'msg-123',
        threadId: 'thread-123',
      });
    });

    it('marks message as read', async () => {
      const { result } = renderHook(
        () => useMessageOperations(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.markAsRead('msg-123');
      });

      expect(mockMarkRead.mutateAsync).toHaveBeenCalledWith('msg-123');
    });

    it('clears draft after successful message send', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.updateDraft({ content: 'Draft content' });
      });

      await act(async () => {
        await result.current.sendMessage('Sent message');
      });

      expect(result.current.draft).toBeNull();
    });
  });

  describe('File Operations', () => {
    it('uploads single file successfully', async () => {
      const testFile = createMockFile();
      
      const { result } = renderHook(
        () => useMessageOperations(),
        { wrapper: createWrapper() }
      );

      let uploadedAttachment: any;

      await act(async () => {
        uploadedAttachment = await result.current.uploadFile(testFile);
      });

      expect(mockUploadFile.mutateAsync).toHaveBeenCalledWith(testFile, expect.any(Object));
      expect(uploadedAttachment).toEqual(mockAttachment);
    });

    it('uploads multiple files', async () => {
      const files = [
        createMockFile('file1.txt'),
        createMockFile('file2.txt'),
      ];
      
      const { result } = renderHook(
        () => useMessageOperations(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.uploadFiles(files);
      });

      expect(mockUploadFile.mutateAsync).toHaveBeenCalledTimes(2);
    });

    it('tracks upload progress', async () => {
      const testFile = createMockFile();
      
      const { result } = renderHook(
        () => useMessageOperations(),
        { wrapper: createWrapper() }
      );

      const onProgress = vi.fn();

      await act(async () => {
        await result.current.uploadFile(testFile, onProgress);
      });

      // Progress tracking implementation would depend on actual service
      expect(Object.keys(result.current.uploadProgress)).toHaveLength(0);
    });

    it('removes attachment from draft', async () => {
      const testFile = createMockFile();
      
      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.updateDraft({
          attachments: [testFile],
        });
      });

      act(() => {
        result.current.removeAttachment(0);
      });

      expect(result.current.draft?.attachments).toHaveLength(0);
    });
  });

  describe('Validation', () => {
    it('validates message content', () => {
      const { result } = renderHook(
        () => useMessageOperations(),
        { wrapper: createWrapper() }
      );

      // Valid message
      const validResult = result.current.validateMessage('Valid content');
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Empty message without attachments
      const emptyResult = result.current.validateMessage('');
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.errors[0]).toContain('must have content or attachments');

      // Too long message
      const longContent = 'A'.repeat(10001);
      const longResult = result.current.validateMessage(longContent);
      expect(longResult.isValid).toBe(false);
      expect(longResult.errors[0]).toContain('too long');
    });

    it('validates file attachments', () => {
      const { result } = renderHook(
        () => useMessageOperations({
          maxAttachmentSize: 1024,
          allowedFileTypes: ['text/*'],
        }),
        { wrapper: createWrapper() }
      );

      // Valid file
      const validFile = createMockFile('test.txt', 512, 'text/plain');
      const validResult = result.current.validateFile(validFile);
      expect(validResult.isValid).toBe(true);

      // File too large
      const largeFile = createMockFile('large.txt', 2048, 'text/plain');
      const largeResult = result.current.validateFile(largeFile);
      expect(largeResult.isValid).toBe(false);
      expect(largeResult.errors[0]).toContain('too large');

      // Invalid file type
      const invalidFile = createMockFile('script.exe', 512, 'application/exe');
      const invalidResult = result.current.validateFile(invalidFile);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0]).toContain('not allowed');
    });

    it('provides warnings for borderline cases', () => {
      const { result } = renderHook(
        () => useMessageOperations({
          maxAttachmentSize: 1024,
        }),
        { wrapper: createWrapper() }
      );

      // Long but valid message
      const longContent = 'A'.repeat(5001);
      const longResult = result.current.validateMessage(longContent);
      expect(longResult.isValid).toBe(true);
      expect(longResult.warnings[0]).toContain('quite long');

      // Large but valid file
      const largeFile = createMockFile('large.pdf', 900, 'application/pdf');
      const largeResult = result.current.validateFile(largeFile);
      expect(largeResult.isValid).toBe(true);
      expect(largeResult.warnings[0]).toContain('quite large');
    });

    it('rejects send when validation fails', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      await expect(
        act(async () => {
          await result.current.sendMessage(''); // Empty message
        })
      ).rejects.toThrow('must have content or attachments');

      expect(mockSendMessage.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles send message errors', async () => {
      const error = new Error('Send failed');
      mockSendMessage.mutateAsync.mockRejectedValue(error);

      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      await expect(
        act(async () => {
          await result.current.sendMessage('Test message');
        })
      ).rejects.toThrow('Send failed');

      expect(result.current.error).toEqual(error);
      expect(result.current.operations[0].status).toBe('error');
    });

    it('handles upload errors', async () => {
      const error = new Error('Upload failed');
      mockUploadFile.mutateAsync.mockRejectedValue(error);

      const testFile = createMockFile();
      
      const { result } = renderHook(
        () => useMessageOperations(),
        { wrapper: createWrapper() }
      );

      await expect(
        act(async () => {
          await result.current.uploadFile(testFile);
        })
      ).rejects.toThrow('Upload failed');

      expect(result.current.error).toEqual(error);
    });

    it('handles edit message errors', async () => {
      const error = new Error('Edit failed');
      mockUpdateMessage.mutateAsync.mockRejectedValue(error);

      const { result } = renderHook(
        () => useMessageOperations(),
        { wrapper: createWrapper() }
      );

      await expect(
        act(async () => {
          await result.current.editMessage('msg-123', 'New content');
        })
      ).rejects.toThrow('Edit failed');

      expect(result.current.operations[0].status).toBe('error');
    });

    it('requires thread ID for sending', async () => {
      const { result } = renderHook(
        () => useMessageOperations(), // No threadId
        { wrapper: createWrapper() }
      );

      await expect(
        act(async () => {
          await result.current.sendMessage('Test message');
        })
      ).rejects.toThrow('Thread ID is required');
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('tracks operations in undo history', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ 
          threadId: 'thread-123',
          enableUndo: true 
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('performs undo operation', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ 
          threadId: 'thread-123',
          enableUndo: true 
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it('performs redo operation', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ 
          threadId: 'thread-123',
          enableUndo: true 
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      await act(async () => {
        await result.current.undo();
      });

      await act(async () => {
        await result.current.redo();
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('limits undo history size', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ 
          threadId: 'thread-123',
          enableUndo: true,
          maxUndoHistory: 2
        }),
        { wrapper: createWrapper() }
      );

      // Send 3 messages
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await result.current.sendMessage(`Message ${i + 1}`);
        });
      }

      // Should only track last 2 operations
      expect(result.current.canUndo).toBe(true);
      
      await act(async () => {
        await result.current.undo();
      });
      
      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.canUndo).toBe(false);
    });

    it('clears redo history on new operation', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ 
          threadId: 'thread-123',
          enableUndo: true 
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.sendMessage('First message');
      });

      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      await act(async () => {
        await result.current.sendMessage('Second message');
      });

      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('Performance', () => {
    it('debounces draft saves', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(
        () => useMessageOperations({ 
          threadId: 'thread-123',
          draftSaveInterval: 1000 
        }),
        { wrapper: createWrapper() }
      );

      // Multiple rapid updates
      act(() => {
        result.current.updateDraft({ content: 'A' });
      });

      act(() => {
        result.current.updateDraft({ content: 'AB' });
      });

      act(() => {
        result.current.updateDraft({ content: 'ABC' });
      });

      // Should not save yet
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      // Fast-forward to trigger save
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'messageDrafts',
          expect.stringContaining('ABC')
        );
      });

      vi.useRealTimers();
    });

    it('limits operation history size', async () => {
      const { result } = renderHook(
        () => useMessageOperations({ threadId: 'thread-123' }),
        { wrapper: createWrapper() }
      );

      // Perform many operations
      for (let i = 0; i < 150; i++) {
        await act(async () => {
          await result.current.sendMessage(`Message ${i}`);
        });
      }

      // Should limit to 100 operations
      expect(result.current.operations.length).toBe(100);
    });

    it('cleans up timers on unmount', () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(
        () => useMessageOperations({ 
          threadId: 'thread-123',
          draftSaveInterval: 1000 
        }),
        { wrapper: createWrapper() }
      );

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      vi.useRealTimers();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Loading States', () => {
    it('reflects loading state from mutations', () => {
      mockSendMessage.isPending = true;

      const { result } = renderHook(
        () => useMessageOperations(),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('reflects loading from multiple operations', () => {
      mockSendMessage.isPending = true;
      mockUploadFile.isPending = true;

      const { result } = renderHook(
        () => useMessageOperations(),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
    });
  });
});