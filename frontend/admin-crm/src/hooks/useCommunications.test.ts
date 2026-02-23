import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCommunications } from './useCommunications';
import { createTestWrapper } from '../test/utils/render';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('useCommunications', () => {
  describe('Templates', () => {
    it('fetches templates', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCommunications(), { wrapper });

      const { result: templatesResult } = renderHook(() => result.current.useTemplates(), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(templatesResult.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(templatesResult.current.data).toBeDefined();
      expect(templatesResult.current.data!.length).toBeGreaterThan(0);
    });

    it('fetches single template by ID', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCommunications(), { wrapper });

      const { result: templateResult } = renderHook(() => result.current.useTemplate(1), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(templateResult.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(templateResult.current.data).toBeDefined();
      expect(templateResult.current.data?.id).toBe(1);
    });

    it('creates a template', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCommunications(), { wrapper });

      const { result: createResult } = renderHook(() => result.current.useCreateTemplate(), {
        wrapper,
      });

      act(() => {
        createResult.current.mutate({
          name: 'New Template',
          channel: 'EMAIL',
          category: 'MANUAL',
          context_type: 'GENERAL' as never,
          body_template: '<p>Hello</p>',
        });
      });

      await waitFor(
        () => {
          expect(createResult.current.isPending).toBe(false);
          expect(createResult.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );
    });

    it('updates a template', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCommunications(), { wrapper });

      const { result: updateResult } = renderHook(() => result.current.useUpdateTemplate(), {
        wrapper,
      });

      act(() => {
        updateResult.current.mutate({
          id: 1,
          data: { name: 'Updated Template' },
        });
      });

      await waitFor(
        () => {
          expect(updateResult.current.isPending).toBe(false);
          expect(updateResult.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );
    });

    it('deletes a template', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCommunications(), { wrapper });

      const { result: deleteResult } = renderHook(() => result.current.useDeleteTemplate(), {
        wrapper,
      });

      act(() => {
        deleteResult.current.mutate(1);
      });

      await waitFor(
        () => {
          expect(deleteResult.current.isPending).toBe(false);
          expect(deleteResult.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );
    });

    it('previews a template', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCommunications(), { wrapper });

      const { result: previewResult } = renderHook(() => result.current.usePreviewTemplate(), {
        wrapper,
      });

      act(() => {
        previewResult.current.mutate({ id: 1, data: {} });
      });

      await waitFor(
        () => {
          expect(previewResult.current.isPending).toBe(false);
          expect(previewResult.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );
    });

    it('duplicates a template', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCommunications(), { wrapper });

      const { result: duplicateResult } = renderHook(() => result.current.useDuplicateTemplate(), {
        wrapper,
      });

      act(() => {
        duplicateResult.current.mutate({ templateId: 1 });
      });

      await waitFor(
        () => {
          expect(duplicateResult.current.isPending).toBe(false);
          expect(duplicateResult.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );
    });

    it('handles create error', async () => {
      server.use(
        http.post('http://localhost:8000/api/communications/templates/', () => {
          return HttpResponse.json({ detail: 'Template name already exists' }, { status: 400 });
        }),
      );

      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCommunications(), { wrapper });

      const { result: createResult } = renderHook(() => result.current.useCreateTemplate(), {
        wrapper,
      });

      act(() => {
        createResult.current.mutate({
          name: 'Duplicate',
          channel: 'EMAIL',
          category: 'MANUAL',
          context_type: 'GENERAL' as never,
          body_template: '<p>Test</p>',
        });
      });

      await waitFor(
        () => {
          expect(createResult.current.isError).toBe(true);
        },
        { timeout: 5000 },
      );
    });
  });

  describe('Records', () => {
    it('fetches communication records', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCommunications(), { wrapper });

      const { result: recordsResult } = renderHook(() => result.current.useRecords(), { wrapper });

      await waitFor(
        () => {
          expect(recordsResult.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(recordsResult.current.data).toBeDefined();
    });

    it('sends a manual communication', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCommunications(), { wrapper });

      const { result: sendResult } = renderHook(() => result.current.useSendManual(), { wrapper });

      act(() => {
        sendResult.current.mutate({
          recipient: 'client@example.com',
          subject: 'Test Subject',
          body: 'Test body',
          channel: 'EMAIL',
        } as never);
      });

      await waitFor(
        () => {
          expect(sendResult.current.isPending).toBe(false);
          expect(sendResult.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );
    });

    it('sends bulk communication', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCommunications(), { wrapper });

      const { result: bulkResult } = renderHook(() => result.current.useSendBulk(), { wrapper });

      act(() => {
        bulkResult.current.mutate({
          template_id: 1,
          recipient_ids: [1, 2, 3],
        } as never);
      });

      await waitFor(
        () => {
          expect(bulkResult.current.isPending).toBe(false);
          expect(bulkResult.current.isSuccess).toBe(true);
        },
        { timeout: 5000 },
      );
    });
  });

  describe('Analytics', () => {
    it('fetches communication analytics', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCommunications(), { wrapper });

      const { result: analyticsResult } = renderHook(() => result.current.useAnalytics(), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(analyticsResult.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(analyticsResult.current.data).toBeDefined();
    });
  });
});
