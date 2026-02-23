import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../utils/api';
import { salesApi } from './sales.api';

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe('salesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getQuoteTemplates', () => {
    it('builds query params for search, event_type, and is_active', async () => {
      mockApi.get.mockResolvedValue({ data: { results: [{ id: 1 }] } });

      const result = await salesApi.getQuoteTemplates({
        search: 'wedding',
        event_type: 2,
        is_active: true,
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain('/sales/templates/');
      expect(url).toContain('search=wedding');
      expect(url).toContain('event_type=2');
      expect(url).toContain('is_active=true');
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('getEventQuotes', () => {
    it('builds query params for filters', async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await salesApi.getEventQuotes({
        event_id: 10,
        status: 'sent',
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain('/sales/quotes/');
      expect(url).toContain('event_id=10');
      expect(url).toContain('status=sent');
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('sendQuote', () => {
    it('calls POST to send endpoint', async () => {
      mockApi.post.mockResolvedValue({ data: { id: 5, status: 'sent' } });

      const result = await salesApi.sendQuote(5);

      expect(mockApi.post).toHaveBeenCalledWith('/sales/quotes/5/send/');
      expect(result).toEqual({ id: 5, status: 'sent' });
    });
  });

  describe('acceptQuote', () => {
    it('calls POST with optional notes', async () => {
      mockApi.post.mockResolvedValue({ data: { id: 5, status: 'accepted' } });

      const result = await salesApi.acceptQuote(5, 'Looks good');

      expect(mockApi.post).toHaveBeenCalledWith('/sales/quotes/5/accept/', {
        notes: 'Looks good',
      });
      expect(result).toEqual({ id: 5, status: 'accepted' });
    });
  });

  describe('calculateLineItemPricing', () => {
    it('calls POST with pricing data', async () => {
      const data = { product_id: 1, quantity: 2 };
      mockApi.post.mockResolvedValue({ data: { total: '200.00' } });

      const result = await salesApi.calculateLineItemPricing(data);

      expect(mockApi.post).toHaveBeenCalledWith('/sales/line-items/calculate_pricing/', data);
      expect(result).toEqual({ total: '200.00' });
    });
  });

  describe('getProductVenues', () => {
    it('builds params with product_id and optional event_type_id', async () => {
      mockApi.get.mockResolvedValue({ data: [{ venue_id: 1 }] });

      const result = await salesApi.getProductVenues(5, 3);

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain('/sales/line-items/product_venues/');
      expect(url).toContain('product_id=5');
      expect(url).toContain('event_type_id=3');
      expect(result).toEqual([{ venue_id: 1 }]);
    });
  });

  describe('getQuotesForClient', () => {
    it('calls GET with client_id param and returns results', async () => {
      mockApi.get.mockResolvedValue({ data: { results: [{ id: 1 }] } });

      const result = await salesApi.getQuotesForClient(10);

      expect(mockApi.get).toHaveBeenCalledWith('/sales/quotes/?client_id=10');
      expect(result).toEqual([{ id: 1 }]);
    });
  });
});
