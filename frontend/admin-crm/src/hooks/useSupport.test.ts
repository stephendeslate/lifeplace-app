// frontend/admin-crm/src/hooks/useSupport.test.ts

import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSupport } from './useSupport';
import { createTestWrapper } from '../test/utils/render';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

const BASE_URL = 'http://localhost:8000/api';

describe('useSupport', () => {
  it('returns sub-hooks and utility functions', () => {
    const { result } = renderHook(() => useSupport(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.useSupportStats).toBeDefined();
    expect(result.current.useSupportInquiries).toBeDefined();
    expect(result.current.useSupportInquiry).toBeDefined();
    expect(result.current.useUpdateInquiry).toBeDefined();
    expect(result.current.useAddReply).toBeDefined();
    expect(result.current.invalidateSupportQueries).toBeDefined();
  });

  it('fetches support stats via sub-hook', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(
      () => {
        const support = useSupport();
        const stats = support.useSupportStats();
        return { support, stats };
      },
      { wrapper },
    );

    await waitFor(
      () => {
        expect(result.current.stats.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.stats.data).toBeDefined();
    expect(result.current.stats.error).toBeFalsy();
  });

  it('fetches support inquiries via sub-hook', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(
      () => {
        const support = useSupport();
        const inquiries = support.useSupportInquiries();
        return { support, inquiries };
      },
      { wrapper },
    );

    await waitFor(
      () => {
        expect(result.current.inquiries.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.inquiries.data).toBeDefined();
    expect(Array.isArray(result.current.inquiries.data)).toBe(true);
  });

  it('fetches inquiries filtered by status', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(
      () => {
        const support = useSupport();
        const inquiries = support.useSupportInquiries({ status: 'active' });
        return { support, inquiries };
      },
      { wrapper },
    );

    await waitFor(
      () => {
        expect(result.current.inquiries.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(Array.isArray(result.current.inquiries.data)).toBe(true);
  });

  it('handles support stats API error', async () => {
    server.use(
      http.get(`${BASE_URL}/messaging/admin/support/stats/`, () => {
        return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
      }),
    );

    const wrapper = createTestWrapper();
    const { result } = renderHook(
      () => {
        const support = useSupport();
        const stats = support.useSupportStats();
        return { support, stats };
      },
      { wrapper },
    );

    await waitFor(
      () => {
        expect(result.current.stats.error).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it('updates an inquiry via sub-hook', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(
      () => {
        const support = useSupport();
        const inquiries = support.useSupportInquiries();
        const updateMutation = support.useUpdateInquiry();
        return { support, inquiries, updateMutation };
      },
      { wrapper },
    );

    await waitFor(
      () => {
        expect(result.current.inquiries.isLoading).toBe(false);
        expect(result.current.inquiries.data).toBeDefined();
      },
      { timeout: 5000 },
    );

    if (result.current.inquiries.data && result.current.inquiries.data.length > 0) {
      const inquiry = result.current.inquiries.data[0];

      act(() => {
        result.current.updateMutation.mutate({
          id: String(inquiry.id),
          data: { status: 'resolved' },
        });
      });

      await waitFor(
        () => {
          expect(result.current.updateMutation.isPending).toBe(false);
        },
        { timeout: 5000 },
      );
    }
  });

  it('adds a reply via sub-hook', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(
      () => {
        const support = useSupport();
        const inquiries = support.useSupportInquiries();
        const replyMutation = support.useAddReply();
        return { support, inquiries, replyMutation };
      },
      { wrapper },
    );

    await waitFor(
      () => {
        expect(result.current.inquiries.isLoading).toBe(false);
        expect(result.current.inquiries.data).toBeDefined();
      },
      { timeout: 5000 },
    );

    if (result.current.inquiries.data && result.current.inquiries.data.length > 0) {
      const inquiry = result.current.inquiries.data[0];

      act(() => {
        result.current.replyMutation.mutate({
          inquiryId: String(inquiry.id),
          data: {
            content: 'Test reply message',
            is_internal_note: false,
          },
        });
      });

      await waitFor(
        () => {
          expect(result.current.replyMutation.isPending).toBe(false);
        },
        { timeout: 5000 },
      );
    }
  });

  it('fetches a single inquiry detail via sub-hook', async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(
      () => {
        const support = useSupport();
        const inquiries = support.useSupportInquiries();
        return { support, inquiries };
      },
      { wrapper },
    );

    await waitFor(
      () => {
        expect(result.current.inquiries.isLoading).toBe(false);
        expect(result.current.inquiries.data).toBeDefined();
      },
      { timeout: 5000 },
    );

    if (result.current.inquiries.data && result.current.inquiries.data.length > 0) {
      const inquiryId = String(result.current.inquiries.data[0].id);

      const { result: detailResult } = renderHook(
        () => {
          const support = useSupport();
          return support.useSupportInquiry(inquiryId);
        },
        { wrapper },
      );

      await waitFor(
        () => {
          expect(detailResult.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(detailResult.current.data).toBeDefined();
    }
  });
});
