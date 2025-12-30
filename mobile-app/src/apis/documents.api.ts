/**
 * Documents API
 *
 * API layer for document management. Aggregates documents from
 * multiple sources (events, contracts, uploads) into a unified interface.
 */

import api from '@/utils/api';
import type {
  DocumentItem,
  DocumentEventOption,
  DocumentUploadData,
  DocumentCategory,
} from '@/types/documents.types';
import type { EventFile } from '@/types/events.types';
import { CATEGORY_TO_TYPE } from '@/types/documents.types';

// =============================================================================
// API FUNCTIONS
// =============================================================================

export const documentsApi = {
  /**
   * Get all documents across all events for the current user
   * This aggregates documents from multiple event endpoints
   */
  getAllDocuments: async (): Promise<DocumentItem[]> => {
    // Fetch all events first
    const eventsResponse = await api.get<
      { results?: { id: number; name: string }[] } | { id: number; name: string }[]
    >('/client/events/');

    const events = Array.isArray(eventsResponse.data)
      ? eventsResponse.data
      : eventsResponse.data.results || [];

    // Fetch documents for each event in parallel
    const documentPromises = events.map(async (event) => {
      try {
        const response = await api.get<EventFile[]>(
          `/client/events/${event.id}/documents/`
        );
        return response.data.map((doc) =>
          mapEventFileToDocumentItem(doc, event.id, event.name)
        );
      } catch {
        // If documents endpoint fails for an event, return empty array
        return [];
      }
    });

    const documentArrays = await Promise.all(documentPromises);
    return documentArrays.flat();
  },

  /**
   * Get documents for a specific event
   */
  getEventDocuments: async (eventId: number): Promise<DocumentItem[]> => {
    const eventResponse = await api.get<{ id: number; name: string }>(
      `/client/events/${eventId}/`
    );
    const response = await api.get<EventFile[]>(
      `/client/events/${eventId}/documents/`
    );
    return response.data.map((doc) =>
      mapEventFileToDocumentItem(doc, eventId, eventResponse.data.name)
    );
  },

  /**
   * Get list of events with document counts for filtering
   */
  getDocumentEvents: async (): Promise<DocumentEventOption[]> => {
    const eventsResponse = await api.get<
      { results?: { id: number; name: string }[] } | { id: number; name: string }[]
    >('/client/events/');

    const events = Array.isArray(eventsResponse.data)
      ? eventsResponse.data
      : eventsResponse.data.results || [];

    // Get document counts for each event
    const eventOptions = await Promise.all(
      events.map(async (event) => {
        try {
          const response = await api.get<EventFile[]>(
            `/client/events/${event.id}/documents/`
          );
          return {
            id: event.id,
            name: event.name,
            documentCount: response.data.length,
          };
        } catch {
          return {
            id: event.id,
            name: event.name,
            documentCount: 0,
          };
        }
      })
    );

    // Only return events that have documents
    return eventOptions.filter((e) => e.documentCount > 0);
  },

  /**
   * Upload a document to an event
   */
  uploadDocument: async (data: DocumentUploadData): Promise<DocumentItem> => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('category', data.category);
    if (data.description) {
      formData.append('description', data.description);
    }
    formData.append('file', {
      uri: data.file.uri,
      name: data.file.name,
      type: data.file.type,
    } as unknown as Blob);

    const response = await api.post<EventFile>(
      `/client/events/${data.eventId}/upload_file/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    // Get event name for the response
    const eventResponse = await api.get<{ name: string }>(
      `/client/events/${data.eventId}/`
    );

    return mapEventFileToDocumentItem(
      response.data,
      data.eventId,
      eventResponse.data.name
    );
  },

  /**
   * Get document download URL
   * Returns a pre-signed URL or blob endpoint for secure download
   */
  getDocumentDownloadUrl: (eventId: number, fileId: number): string => {
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}/client/events/${eventId}/documents/${fileId}/download/`;
  },

  /**
   * Download document as blob (for sharing)
   */
  downloadDocumentBlob: async (eventId: number, fileId: number): Promise<Blob> => {
    const response = await api.get<Blob>(
      `/client/events/${eventId}/documents/${fileId}/download/`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Map EventFile from backend to DocumentItem
 */
function mapEventFileToDocumentItem(
  file: EventFile,
  eventId: number,
  eventName: string
): DocumentItem {
  const category = (file.category || 'OTHER') as DocumentCategory;
  const type = CATEGORY_TO_TYPE[category] || 'OTHER';

  return {
    id: file.id.toString(),
    type,
    name: file.name,
    description: file.description,
    eventId,
    eventName,
    category,
    fileType: file.file_type || getExtensionFromName(file.name),
    fileSize: file.size || 0,
    downloadUrl: file.download_url,
    previewUrl: undefined, // Can be added if backend supports preview URLs
    createdAt: file.created_at,
    uploadedBy: undefined, // Can be added if backend provides this
  };
}

/**
 * Extract extension from filename
 */
function getExtensionFromName(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export default documentsApi;
