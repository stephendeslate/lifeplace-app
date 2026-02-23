import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../utils/api';
import { galleryApi } from './gallery.api';

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

describe('galleryApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGalleryPhotos', () => {
    it('builds query params for search, category, page, page_size, ordering', async () => {
      mockApi.get.mockResolvedValue({ data: { count: 0, results: [] } });

      await galleryApi.getGalleryPhotos({
        search: 'wedding',
        category: 'venue',
        page: 2,
        page_size: 20,
        ordering: '-created_at',
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain('/venues/gallery-photos/');
      expect(url).toContain('search=wedding');
      expect(url).toContain('category=venue');
      expect(url).toContain('page=2');
      expect(url).toContain('page_size=20');
      expect(url).toContain('ordering=-created_at');
    });
  });

  describe('createGalleryPhoto', () => {
    it('calls POST with FormData and multipart header', async () => {
      const formData = new FormData();
      formData.append('image', new File([''], 'photo.jpg'));
      mockApi.post.mockResolvedValue({ data: { id: 1 } });

      const result = await galleryApi.createGalleryPhoto(formData);

      expect(mockApi.post).toHaveBeenCalledWith('/venues/gallery-photos/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('updateGalleryPhoto', () => {
    it('calls PATCH with FormData and multipart header', async () => {
      const formData = new FormData();
      formData.append('title', 'Updated');
      mockApi.patch.mockResolvedValue({ data: { id: 5, title: 'Updated' } });

      const result = await galleryApi.updateGalleryPhoto(5, formData);

      expect(mockApi.patch).toHaveBeenCalledWith('/venues/gallery-photos/5/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(result).toEqual({ id: 5, title: 'Updated' });
    });
  });

  describe('bulkCreateGalleryPhotos', () => {
    it('calls POST to bulk-create endpoint with FormData', async () => {
      const formData = new FormData();
      formData.append('images', new File([''], 'photo1.jpg'));
      formData.append('images', new File([''], 'photo2.jpg'));
      mockApi.post.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }] });

      const result = await galleryApi.bulkCreateGalleryPhotos(formData);

      expect(mockApi.post).toHaveBeenCalledWith('/venues/gallery-photos/bulk-create/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('deleteGalleryPhoto', () => {
    it('calls DELETE with photo id', async () => {
      mockApi.delete.mockResolvedValue({});

      await galleryApi.deleteGalleryPhoto(5);

      expect(mockApi.delete).toHaveBeenCalledWith('/venues/gallery-photos/5/');
    });
  });
});
