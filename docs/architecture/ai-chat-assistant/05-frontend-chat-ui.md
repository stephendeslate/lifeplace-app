# AI Chat Assistant — Frontend Chat UI Architecture

**Document:** 05-frontend-chat-ui.md
**Part of:** [AI Chat Assistant Architecture](./00-master-overview.md)
**Status:** Design Proposal
**Date:** 2026-02-19

---

## 1. Overview

This document defines the frontend architecture for the AI chat assistant within the client-portal React application. The design follows every existing convention: MUI components (no Grid), React Query for data fetching, Axios via the centralized API layer, TypeScript strict mode, ToastContext for notifications, and the established hook/component/API separation.

---

## 2. Component Tree

```
<AppProviders>                           (existing)
  └── <ChatProvider>                     (NEW — context for chat state)
        └── <Routes>
              ├── <PublicLayout>
              │     ├── <Home />
              │     │     └── <ChatWidget />       (NEW — floating widget on public pages)
              │     ├── <Gallery />
              │     └── <Rates />
              │
              ├── <BookingLayout>
              │     └── <BookingFlow />            (existing — chat hands off here)
              │
              └── <ClientLayout>
                    ├── <Dashboard />
                    │     └── <ChatWidget />       (NEW — available in client area too)
                    └── <ChatPage />               (NEW — full-page chat view, optional)
```

---

## 3. New Files

```
frontend/client-portal/src/
├── apis/
│   └── chat.api.ts                      # API layer for chat endpoints
├── components/
│   └── chat/
│       ├── ChatWidget.tsx               # Floating chat bubble + expandable panel
│       ├── ChatPanel.tsx                # The chat panel (message list + input)
│       ├── ChatMessageList.tsx          # Scrollable message list
│       ├── ChatMessageBubble.tsx        # Single message bubble (user or assistant)
│       ├── ChatInput.tsx                # Text input + send button
│       ├── ChatTypingIndicator.tsx      # "Assistant is typing..." animation
│       ├── ChatWelcomeScreen.tsx        # Initial state before first message
│       ├── ChatPackageCard.tsx          # Rich card for package recommendations
│       ├── ChatPricingBreakdown.tsx     # Inline pricing breakdown display
│       ├── ChatBookingPrompt.tsx        # "Ready to book?" call-to-action
│       └── ChatAuthPrompt.tsx           # Login/register prompt for anonymous users
├── contexts/
│   └── ChatContext.tsx                  # Chat state management
├── hooks/
│   └── useChat.ts                       # Chat hook (API calls + WebSocket)
├── types/
│   └── chat.types.ts                    # TypeScript interfaces
├── utils/
│   ├── chatHelpers.ts                   # Message formatting, metadata parsing
│   └── wsUrl.ts                         # WebSocket URL construction helper
└── (one new npm dependency: react-markdown — install with: npm install react-markdown)
```

---

## 4. TypeScript Types

```typescript
// types/chat.types.ts

export interface ChatSession {
  id: string;                    // UUID
  status: 'active' | 'completed' | 'expired' | 'abandoned';
  title: string;
  message_count: number;
  extracted_preferences: ChatPreferences;
  booking_session: string | null;  // BookingSession UUID if converted
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;                    // UUID
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: ChatMessageMetadata;
  created_at: string;
}

export interface ChatMessageMetadata {
  // Package recommendation cards
  packages?: PackageRecommendation[];
  // Pricing breakdown
  pricing?: PricingBreakdown;
  // Venue cards
  venues?: VenueRecommendation[];
  // Booking prompt (ready to book?)
  booking_prompt?: boolean;
  // Event types list
  event_types?: EventTypeInfo[];
}

export interface PackageRecommendation {
  id: number;
  name: string;
  description: string;
  category: string;
  base_price: string;
  price_with_tax: string;
  pricing_unit: string;
  includes: string[];
  is_featured: boolean;
  badge_text: string;
}

export interface VenueRecommendation {
  id: number;
  name: string;
  description: string;
  max_capacity: number | null;
  standalone_base_price: string | null;
  featured_image: string | null;
}

export interface PricingBreakdown {
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  currency: string;
  line_items: PricingLineItem[];
}

export interface PricingLineItem {
  name: string;
  type: 'PACKAGE' | 'ADDON';
  base_price: string;
  quantity: number;
  excess_hours: number;
  excess_cost: string;
  line_total: string;
}

export interface ChatPreferences {
  event_type?: string;
  event_type_id?: number;
  guest_count?: number;
  preferred_date?: string;
  preferred_time?: string;
  venue_ids?: number[];
  recommended_packages?: { id: number; name: string; price: string }[];
  recommended_addons?: { id: number; name: string; price: string }[];
  special_requests?: string;
  confidence?: Record<string, 'confirmed' | 'inferred' | 'unknown'>;
}

export interface EventTypeInfo {
  id: number;
  name: string;
  description: string;
}

// WebSocket message types
export type WsIncomingMessage =
  | { type: 'typing_start' }
  | { type: 'token'; content: string }
  | { type: 'message_complete'; metadata: ChatMessageMetadata }
  | { type: 'connection_established'; session_id: string }
  | { type: 'error'; message: string };

export type WsOutgoingMessage =
  | { type: 'message'; content: string };

// API request/response types
export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  messages: ChatMessage[];        // New messages (user echo + assistant response)
  session: ChatSession;           // Updated session with new preferences
}

export interface StartBookingResponse {
  booking_session_id: string;
}
```

---

## 5. API Layer

Following the existing pattern in `src/apis/`:

```typescript
// apis/chat.api.ts
import api from '../utils/api';
import type {
  ChatSession,
  ChatMessage,
  SendMessageRequest,
  SendMessageResponse,
  StartBookingResponse,
} from '../types/chat.types';

const BASE = '/api/ai-chat';

export const chatApi = {
  // --- Session Management ---

  createSession: async (initialMessage?: string): Promise<ChatSession> => {
    const response = await api.post(`${BASE}/public/sessions/`, {
      initial_message: initialMessage,
    });
    return response.data;
  },

  createAuthenticatedSession: async (initialMessage?: string): Promise<ChatSession> => {
    const response = await api.post(`${BASE}/sessions/`, {
      initial_message: initialMessage,
    });
    return response.data;
  },

  getSession: async (sessionId: string): Promise<ChatSession> => {
    const response = await api.get(`${BASE}/sessions/${sessionId}/`);
    return response.data;
  },

  listSessions: async (): Promise<ChatSession[]> => {
    const response = await api.get(`${BASE}/sessions/`);
    return response.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await api.delete(`${BASE}/sessions/${sessionId}/`);
  },

  // --- Messages ---

  sendMessage: async (
    sessionId: string,
    data: SendMessageRequest,
    isPublic: boolean = false,
  ): Promise<SendMessageResponse> => {
    const path = isPublic
      ? `${BASE}/public/sessions/${sessionId}/messages/`
      : `${BASE}/sessions/${sessionId}/messages/`;
    const response = await api.post(path, data);
    return response.data;
  },

  getMessages: async (
    sessionId: string,
    isPublic: boolean = false,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ChatMessage[]> => {
    const path = isPublic
      ? `${BASE}/public/sessions/${sessionId}/messages/`
      : `${BASE}/sessions/${sessionId}/messages/`;
    const response = await api.get(path, { params: { limit, offset } });
    return response.data;
  },

  // --- Session Migration (Gap 1: anonymous → authenticated) ---

  migrateSession: async (sessionId: string): Promise<void> => {
    // Called post-login when localStorage contains an anonymous session ID.
    // Backend silently ignores sessions that are already owned or don't exist.
    await api.post(`${BASE}/sessions/${sessionId}/migrate/`);
  },

  // --- Booking Bridge ---

  startBooking: async (sessionId: string): Promise<StartBookingResponse> => {
    const response = await api.post(`${BASE}/sessions/${sessionId}/start-booking/`);
    return response.data;
  },
};
```

---

## 6. WebSocket URL Utility

The frontend has only one environment variable related to the backend: `VITE_API_URL`
(e.g. `https://lifeplace-api.fly.dev`). There is no separate `VITE_WS_URL`. This utility
derives the correct `wss://` base from `VITE_API_URL` at runtime, avoiding the need for an
additional env var and keeping the derivation logic in one place.

> **Note:** This follows the same pattern as the existing `useAvailabilityWebSocket.ts` hook,
> which already derives WebSocket URLs from `VITE_API_URL` using `new URL()`.

```typescript
// utils/wsUrl.ts

/**
 * Derives the WebSocket URL from VITE_API_URL.
 * Follows the same pattern as useAvailabilityWebSocket.ts.
 *
 * Examples:
 *   VITE_API_URL = "https://lifeplace-api.fly.dev"
 *   → buildWsUrl("/ws/ai-chat/abc/") = "wss://lifeplace-api.fly.dev/ws/ai-chat/abc/"
 *   → buildWsUrl("/ws/ai-chat/abc/", token) = "wss://lifeplace-api.fly.dev/ws/ai-chat/abc/?token=..."
 *
 *   VITE_API_URL = "http://localhost:8000"
 *   → buildWsUrl("/ws/ai-chat/abc/") = "ws://localhost:8000/ws/ai-chat/abc/"
 */
export function buildWsUrl(path: string, token?: string): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const url = new URL(apiUrl);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  let wsUrl = `${protocol}//${url.host}${path}`;
  if (token) {
    wsUrl += `?token=${encodeURIComponent(token)}`;
  }
  return wsUrl;
}
```

The WebSocket origin is validated server-side by `AllowedHostsOriginValidator` in
`core/asgi.py` — no additional origin check is needed in this utility.

---

## 7. Chat Hook

```typescript
// hooks/useChat.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../apis/chat.api';
import { buildWsUrl } from '../utils/wsUrl';
import { useAuth } from './useAuth';
import { useToastActions } from '../contexts/ToastContext';
import { ErrorHandler } from '../utils/errorHandler';
import { storage } from '../utils/storage';
import type {
  ChatSession,
  ChatMessage,
  ChatMessageMetadata,
  WsIncomingMessage,
} from '../types/chat.types';

const CHAT_SESSION_KEY = 'lifeplace_chat_session_id';
const WS_RECONNECT_DELAY = 5000;

export const useChat = () => {
  const { user, isAuthenticated } = useAuth();
  const { showError } = useToastActions();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // --- State ---
  const [sessionId, setSessionId] = useState<string | null>(
    () => localStorage.getItem(CHAT_SESSION_KEY)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // --- Session Query ---
  const sessionQuery = useQuery({
    queryKey: ['chat', 'session', sessionId],
    queryFn: () => chatApi.getSession(sessionId!),
    enabled: !!sessionId && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // --- Messages Query ---
  const messagesQuery = useQuery({
    queryKey: ['chat', 'messages', sessionId],
    queryFn: () => chatApi.getMessages(sessionId!, !isAuthenticated),
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });

  // --- Create Session ---
  const createSessionMutation = useMutation({
    mutationFn: async (initialMessage?: string) => {
      if (isAuthenticated) {
        return chatApi.createAuthenticatedSession(initialMessage);
      }
      return chatApi.createSession(initialMessage);
    },
    onSuccess: (session) => {
      setSessionId(session.id);
      localStorage.setItem(CHAT_SESSION_KEY, session.id);
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
    onError: (error) => {
      showError('Chat Error', ErrorHandler.extractMessage(error));
    },
  });

  // --- Send Message (HTTP fallback, non-streaming) ---
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!sessionId) {
        // Create session with first message
        const session = await createSessionMutation.mutateAsync();
        return chatApi.sendMessage(session.id, { content }, !isAuthenticated);
      }
      return chatApi.sendMessage(sessionId, { content }, !isAuthenticated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'session', sessionId] });
    },
    onError: (error) => {
      showError('Failed to send', ErrorHandler.extractMessage(error));
    },
  });

  // --- WebSocket Connection ---
  const connectWebSocket = useCallback(() => {
    if (!sessionId) return;

    // Use the centralized URL builder (see utils/wsUrl.ts).
    // Derives wss:// from VITE_API_BASE_URL to avoid a separate env var.
    // WebSocket connections are validated against ALLOWED_HOSTS on the backend
    // via AllowedHostsOriginValidator in core/asgi.py.
    const tokens = storage.getTokens();
    const url = buildWsUrl(`/ws/ai-chat/${sessionId}/`, tokens?.access ?? undefined);

    const ws = new WebSocket(url);

    ws.onopen = () => {
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      const data: WsIncomingMessage = JSON.parse(event.data);

      switch (data.type) {
        case 'typing_start':
          setIsTyping(true);
          setIsStreaming(true);
          setStreamingContent('');
          break;

        case 'token':
          setIsTyping(false);
          setStreamingContent((prev) => prev + data.content);
          break;

        case 'message_complete':
          setIsStreaming(false);
          setStreamingContent('');
          // Refresh messages from server (includes metadata)
          queryClient.invalidateQueries({ queryKey: ['chat', 'messages', sessionId] });
          queryClient.invalidateQueries({ queryKey: ['chat', 'session', sessionId] });
          break;

        case 'error':
          setIsStreaming(false);
          setIsTyping(false);
          showError('Chat Error', data.message);
          break;
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      // Auto-reconnect
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, WS_RECONNECT_DELAY);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [sessionId, queryClient, showError]);

  // Connect WebSocket when session exists and chat is open
  useEffect(() => {
    if (isOpen && sessionId) {
      connectWebSocket();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen, sessionId, connectWebSocket]);

  // --- Post-login session migration (Gap 1: anonymous → authenticated) ---
  // Fires when isAuthenticated flips to true while a sessionId is already in
  // localStorage. The backend's migrate endpoint transfers ownership of the
  // anonymous session to the now-authenticated user. Failure is intentionally
  // silent — the session may already be owned, or it may have expired.
  useEffect(() => {
    if (isAuthenticated && sessionId) {
      chatApi.migrateSession(sessionId).catch(() => {
        // Silent failure: session already owned or expired
      });
    }
  }, [isAuthenticated, sessionId]);

  // --- Send via WebSocket (streaming) or HTTP (fallback) ---
  const sendMessage = useCallback(async (content: string) => {
    if (content.trim().length === 0) return;

    // Optimistically add user message to local query cache
    queryClient.setQueryData<ChatMessage[]>(
      ['chat', 'messages', sessionId],
      (old) => [
        ...(old || []),
        {
          id: `temp-${Date.now()}`,
          role: 'user' as const,
          content,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ]
    );

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Stream via WebSocket
      wsRef.current.send(JSON.stringify({ type: 'message', content }));
    } else {
      // HTTP fallback
      await sendMessageMutation.mutateAsync(content);
    }
  }, [sessionId, queryClient, sendMessageMutation]);

  // --- Start Booking ---
  const startBookingMutation = useMutation({
    mutationFn: () => chatApi.startBooking(sessionId!),
    onSuccess: (data) => {
      // Navigate to booking flow with the pre-populated session
      navigate(`/booking?session=${data.booking_session_id}`);
      // Close chat
      setIsOpen(false);
    },
    onError: (error) => {
      showError('Booking Error', ErrorHandler.extractMessage(error));
    },
  });

  // --- Clear Session ---
  const clearSession = useCallback(() => {
    if (sessionId) {
      chatApi.deleteSession(sessionId).catch(() => {});
    }
    setSessionId(null);
    localStorage.removeItem(CHAT_SESSION_KEY);
    queryClient.removeQueries({ queryKey: ['chat'] });
  }, [sessionId, queryClient]);

  return {
    // State
    isOpen,
    setIsOpen,
    sessionId,
    session: sessionQuery.data,
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    isSending: sendMessageMutation.isPending,
    isStreaming,
    isTyping,
    streamingContent,

    // Actions
    sendMessage,
    startBooking: startBookingMutation.mutate,
    isStartingBooking: startBookingMutation.isPending,
    clearSession,
    createSession: createSessionMutation.mutateAsync,
  };
};
```

---

## 8. Chat Context

Provides chat state to any component in the tree without prop drilling:

```typescript
// contexts/ChatContext.tsx
import React, { createContext, useContext } from 'react';
import { useChat } from '../hooks/useChat';

type ChatContextType = ReturnType<typeof useChat>;

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const chat = useChat();
  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
};

export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
```

Add to provider hierarchy in `AppProviders.tsx`, inside `AuthProvider`:
```typescript
<AuthProvider>
  <ChatProvider>       {/* NEW */}
    <ContractsProvider>
      {children}
    </ContractsProvider>
  </ChatProvider>
</AuthProvider>
```

---

## 9. Core Components

### 9.1 ChatWidget — Floating Entry Point

```typescript
// components/chat/ChatWidget.tsx
import React from 'react';
import { Box, Fab, Badge, Slide } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import { useChatContext } from '../../contexts/ChatContext';
import { ChatPanel } from './ChatPanel';

export const ChatWidget: React.FC = () => {
  const { isOpen, setIsOpen, messages } = useChatContext();

  return (
    <>
      {/* Floating Action Button */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1300,  // Above most MUI components
        }}
      >
        <Fab
          color="primary"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close chat' : 'Open chat assistant'}
        >
          {isOpen ? <CloseIcon /> : (
            <Badge
              badgeContent={messages.length > 0 ? '' : undefined}
              color="secondary"
              variant="dot"
              invisible={messages.length === 0}
            >
              <ChatBubbleOutlineIcon />
            </Badge>
          )}
        </Fab>
      </Box>

      {/* Chat Panel (slides in from bottom-right) */}
      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: 'fixed',
            bottom: 88,          // Above the FAB
            right: 24,
            width: { xs: 'calc(100vw - 48px)', sm: 400 },
            height: { xs: 'calc(100vh - 140px)', sm: 560 },
            maxHeight: 'calc(100vh - 140px)',
            zIndex: 1299,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: 8,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
          }}
        >
          <ChatPanel />
        </Box>
      </Slide>
    </>
  );
};
```

### 9.2 ChatPanel — Main Container

```typescript
// components/chat/ChatPanel.tsx
import React, { useState } from 'react';
import { Box, Typography, IconButton, Stack } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useChatContext } from '../../contexts/ChatContext';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { ChatWelcomeScreen } from './ChatWelcomeScreen';
import { ChatTypingIndicator } from './ChatTypingIndicator';

export const ChatPanel: React.FC = () => {
  const {
    messages,
    isLoading,
    isSending,
    isStreaming,
    isTyping,
    streamingContent,
    sendMessage,
    clearSession,
  } = useChatContext();

  const hasMessages = messages.length > 0;

  return (
    <Stack sx={{ height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          LifePlace Assistant
        </Typography>
        {hasMessages && (
          <IconButton
            size="small"
            onClick={clearSession}
            sx={{ color: 'inherit' }}
            aria-label="Clear conversation"
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Messages Area */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {!hasMessages && !isLoading ? (
          <ChatWelcomeScreen onSuggestionClick={sendMessage} />
        ) : (
          <ChatMessageList
            messages={messages}
            isLoading={isLoading}
            streamingContent={isStreaming ? streamingContent : undefined}
          />
        )}
      </Box>

      {/* Typing Indicator */}
      {isTyping && <ChatTypingIndicator />}

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={isSending || isStreaming}
      />
    </Stack>
  );
};
```

### 9.3 ChatMessageBubble — Rich Message Rendering

```typescript
// components/chat/ChatMessageBubble.tsx
// Requires: npm install react-markdown   (see "New Files" section for dependency note)
import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../../types/chat.types';
import { ChatPackageCard } from './ChatPackageCard';
import { ChatPricingBreakdown } from './ChatPricingBreakdown';
import { ChatBookingPrompt } from './ChatBookingPrompt';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 1.5,
        px: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: '85%',
          px: 2,
          py: 1.5,
          borderRadius: 2,
          bgcolor: isUser
            ? 'primary.main'
            : isSystem
              ? 'grey.100'
              : 'grey.50',
          color: isUser ? 'primary.contrastText' : 'text.primary',
          border: isUser ? 'none' : 1,
          borderColor: 'divider',
        }}
      >
        {/* Text content — markdown for assistant, plain text for user */}
        {isUser ? (
          <Typography variant="body2">
            {message.content}
          </Typography>
        ) : (
          // Gap 10: LLM responses frequently contain markdown (bold, lists,
          // code spans). react-markdown renders them properly without dangerouslySetInnerHTML.
          // Styles mirror MUI Typography body2 sizing (0.875rem / 1.57 lh).
          <Box
            sx={{
              fontSize: '0.875rem',
              lineHeight: 1.57,
              '& p': { margin: '0 0 8px 0' },
              '& p:last-child': { marginBottom: 0 },
              '& ul, & ol': { pl: '1.5em', my: '4px' },
              '& li': { mb: '2px' },
              '& code': {
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                bgcolor: 'grey.200',
                px: 0.5,
                borderRadius: 0.5,
              },
              '& strong': { fontWeight: 600 },
            }}
          >
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </Box>
        )}

        {/* Rich metadata cards */}
        {message.metadata?.packages && (
          <Stack spacing={1} sx={{ mt: 1.5 }}>
            {message.metadata.packages.map((pkg) => (
              <ChatPackageCard key={pkg.id} package={pkg} />
            ))}
          </Stack>
        )}

        {message.metadata?.pricing && (
          <Box sx={{ mt: 1.5 }}>
            <ChatPricingBreakdown pricing={message.metadata.pricing} />
          </Box>
        )}

        {message.metadata?.booking_prompt && (
          <Box sx={{ mt: 1.5 }}>
            <ChatBookingPrompt />
          </Box>
        )}

        {/* Timestamp */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            opacity: 0.6,
            textAlign: isUser ? 'right' : 'left',
          }}
        >
          {new Date(message.created_at).toLocaleTimeString('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
      </Box>
    </Box>
  );
};
```

### 9.4 ChatBookingPrompt — Call to Action

```typescript
// components/chat/ChatBookingPrompt.tsx
import React from 'react';
import { Box, Button, Typography, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useChatContext } from '../../contexts/ChatContext';
import { useAuth } from '../../hooks/useAuth';
import { ChatAuthPrompt } from './ChatAuthPrompt';

export const ChatBookingPrompt: React.FC = () => {
  const { startBooking, isStartingBooking } = useChatContext();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <ChatAuthPrompt />;
  }

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'primary.50',
        border: 1,
        borderColor: 'primary.200',
      }}
    >
      <Typography variant="body2" fontWeight={600} gutterBottom>
        Ready to book your event?
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Your preferences will be pre-filled in the booking form. You can review
        and adjust everything before confirming.
      </Typography>
      <Button
        variant="contained"
        size="small"
        endIcon={<ArrowForwardIcon />}
        onClick={() => startBooking()}
        disabled={isStartingBooking}
        fullWidth
      >
        {isStartingBooking ? 'Setting up...' : 'Start Booking'}
      </Button>
    </Box>
  );
};
```

### 9.5 ChatWelcomeScreen — First Interaction

```typescript
// components/chat/ChatWelcomeScreen.tsx
import React from 'react';
import { Box, Typography, Stack, Chip } from '@mui/material';

interface ChatWelcomeScreenProps {
  onSuggestionClick: (message: string) => void;
}

const SUGGESTIONS = [
  'What kinds of events can I host?',
  'Show me wedding packages',
  'What venues do you have?',
  "What's the booking process?",
];

export const ChatWelcomeScreen: React.FC<ChatWelcomeScreenProps> = ({
  onSuggestionClick,
}) => {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        textAlign: 'center',
      }}
    >
      <Typography variant="h6" gutterBottom>
        Hi! I'm the LifePlace Assistant
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        I can help you explore our venues, find the perfect package,
        and answer questions about your event.
      </Typography>
      <Stack spacing={1} sx={{ width: '100%' }}>
        {SUGGESTIONS.map((suggestion) => (
          <Chip
            key={suggestion}
            label={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            variant="outlined"
            sx={{
              height: 'auto',
              py: 1,
              '& .MuiChip-label': { whiteSpace: 'normal' },
            }}
          />
        ))}
      </Stack>
    </Box>
  );
};
```

### 9.6 ChatInput — Message Input

```typescript
// components/chat/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Box
      sx={{
        p: 1.5,
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
      }}
    >
      <TextField
        inputRef={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about events, packages, or venues..."
        multiline
        maxRows={3}
        size="small"
        fullWidth
        disabled={disabled}
        slotProps={{
          input: {
            sx: { borderRadius: 2 },
          },
        }}
        aria-label="Chat message input"
      />
      <IconButton
        color="primary"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <SendIcon />
      </IconButton>
    </Box>
  );
};
```

---

## 10. Routing Integration

The ChatWidget is globally available on public pages and client area. No dedicated route needed for the widget. An optional full-page chat route:

```typescript
// In App.tsx, add to existing routes:

// Public pages — ChatWidget rendered inside layouts
<Route path="/" element={<PublicLayout><Home /><ChatWidget /></PublicLayout>} />
<Route path="/gallery" element={<PublicLayout><Gallery /><ChatWidget /></PublicLayout>} />
<Route path="/rates" element={<PublicLayout><Rates /><ChatWidget /></PublicLayout>} />

// Client area — ChatWidget rendered inside client layout
// (already available via ChatProvider in the component tree)
```

The `ChatWidget` is positioned with `position: fixed` so it floats above all page content regardless of which route is active. It can be placed once in the layout components rather than on each page.

---

## 11. Booking Flow Handoff

When the user clicks "Start Booking" in the ChatBookingPrompt:

1. `startBooking()` calls `POST /api/ai-chat/sessions/{id}/start-booking/`
2. Backend creates `BookingSession` with pre-populated data (see [04-chat-to-booking-bridge.md](./04-chat-to-booking-bridge.md))
3. Response contains `{ booking_session_id: "uuid" }`
4. Frontend navigates to `/booking?session=<uuid>`
5. The existing `BookingContext` loads the session and renders the appropriate step
6. Chat widget closes automatically

If the user is anonymous, `ChatAuthPrompt` is shown instead, prompting login/register. After authentication, the user can retry.

---

## 12. Accessibility

Following the existing `AccessibilityProvider` patterns:

- All interactive elements have `aria-label` attributes
- Chat messages use semantic structure (`role="log"` on message list)
- Keyboard navigation: `Enter` to send, `Escape` to close panel
- Focus management: input auto-focuses when panel opens
- Screen reader announcements for new messages (`aria-live="polite"` on message list)
- Color contrast meets WCAG AA (MUI theme handles this)

---

## 13. Mobile Responsiveness

The `ChatWidget` adapts to mobile viewports:

- **Mobile (xs):** Panel expands to near-full-screen (`calc(100vw - 48px)` width, `calc(100vh - 140px)` height)
- **Desktop (sm+):** Fixed 400px width, 560px height
- FAB remains at bottom-right on all viewports
- Input is always visible (no virtual keyboard overlap issues because panel uses flex layout)

---

## 14. Performance Considerations

1. **Lazy loading:** The ChatWidget components are not in the critical rendering path. Import the ChatProvider and ChatWidget with `React.lazy()` if needed.
2. **WebSocket lifecycle:** WebSocket only connects when the chat panel is open (`isOpen === true`). Disconnects on close.
3. **Query caching:** Messages are cached for 30 seconds via React Query staleTime. Session data cached for 5 minutes.
4. **Optimistic updates:** User messages appear immediately in the UI (added to query cache optimistically). Server confirmation replaces the temp ID.
5. **Streaming:** WebSocket streaming avoids loading spinners for AI responses. Users see tokens as they arrive.

---

## References

- [01-backend-architecture.md](./01-backend-architecture.md) — API endpoints and WebSocket spec
- [04-chat-to-booking-bridge.md](./04-chat-to-booking-bridge.md) — How start-booking works
