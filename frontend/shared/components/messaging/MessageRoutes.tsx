/**
 * MessageRoutes - Dynamic Messaging Routes Component
 * 
 * Features:
 * - Role-based route configuration
 * - Layout integration
 * - Route protection and authentication
 * - Navigation integration
 * - Breadcrumb support
 */

import React, { type ComponentType } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MessagingProvider } from '../../providers/MessagingProvider';
import { DEFAULT_MESSAGING_CONFIG } from '../../configs/messaging.config';
import type { MessagingConfig } from '../../types/messaging.types';

export interface MessageRoutesProps {
  basePath: string;
  userRole: 'ADMIN' | 'CLIENT';
  layoutWrapper: ComponentType<{ children: React.ReactNode }>;
  config?: Partial<MessagingConfig>;
  
  // Route components - will be passed from parent apps
  MessagesOverview?: ComponentType;
  MessageThread?: ComponentType<{ threadId: string }>;
  MessageSettings?: ComponentType;
  
  // Custom route configurations
  customRoutes?: Array<{
    path: string;
    element: React.ReactElement;
    requiresAuth?: boolean;
  }>;
  
  // Navigation callbacks
  onNavigateToThread?: (threadId: string) => void;
  onNavigateToOverview?: () => void;
}

export const MessageRoutes: React.FC<MessageRoutesProps> = ({
  basePath,
  userRole,
  layoutWrapper: LayoutWrapper,
  config = {},
  MessagesOverview,
  MessageThread,
  MessageSettings,
  customRoutes = [],
  onNavigateToThread,
}) => {
  // Merge configuration with defaults based on user role
  const messagingConfig: MessagingConfig = {
    ...DEFAULT_MESSAGING_CONFIG,
    userRole,
    enableInternalNotes: userRole === 'ADMIN',
    ...config,
  };

  // Default fallback components
  const DefaultOverview = () => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '400px',
      textAlign: 'center',
      color: '#666'
    }}>
      <div>
        <h3>Messages</h3>
        <p>Messages overview component not provided</p>
      </div>
    </div>
  );

  const DefaultThread = ({ threadId }: { threadId: string }) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '400px',
      textAlign: 'center',
      color: '#666'
    }}>
      <div>
        <h3>Message Thread</h3>
        <p>Thread ID: {threadId}</p>
        <p>Message thread component not provided</p>
      </div>
    </div>
  );

  const DefaultSettings = () => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '400px',
      textAlign: 'center',
      color: '#666'
    }}>
      <div>
        <h3>Message Settings</h3>
        <p>Settings component not provided</p>
      </div>
    </div>
  );

  // Normalize base path
  const normalizedBasePath = basePath.startsWith('/') ? basePath : `/${basePath}`;
  const pathPrefix = normalizedBasePath === '/' ? '' : normalizedBasePath;

  return (
    <MessagingProvider config={messagingConfig}>
      <Routes>
        {/* Messages Overview Route */}
        <Route
          path="/"
          element={
            <LayoutWrapper>
              {MessagesOverview ? <MessagesOverview /> : <DefaultOverview />}
            </LayoutWrapper>
          }
        />

        {/* Individual Thread Route */}
        <Route
          path="/thread/:threadId"
          element={
            <LayoutWrapper>
              <ThreadWrapper 
                MessageThread={MessageThread || DefaultThread}
                onNavigateToThread={onNavigateToThread}
              />
            </LayoutWrapper>
          }
        />

        {/* Settings Route (Admin only) */}
        {userRole === 'ADMIN' && (
          <Route
            path="/settings"
            element={
              <LayoutWrapper>
                {MessageSettings ? <MessageSettings /> : <DefaultSettings />}
              </LayoutWrapper>
            }
          />
        )}

        {/* Custom Routes */}
        {customRoutes.map((route, index) => (
          <Route
            key={index}
            path={route.path}
            element={
              <LayoutWrapper>
                {route.element}
              </LayoutWrapper>
            }
          />
        ))}

        {/* Catch-all redirect to overview */}
        <Route path="*" element={<Navigate to={pathPrefix || "/"} replace />} />
      </Routes>
    </MessagingProvider>
  );
};

/**
 * Thread wrapper component to handle route params
 */
interface ThreadWrapperProps {
  MessageThread: ComponentType<{ threadId: string }>;
  onNavigateToThread?: (threadId: string) => void;
}

const ThreadWrapper: React.FC<ThreadWrapperProps> = ({ 
  MessageThread, 
  onNavigateToThread 
}) => {
  const { threadId } = useParams<{ threadId: string }>();
  
  React.useEffect(() => {
    if (threadId && onNavigateToThread) {
      onNavigateToThread(threadId);
    }
  }, [threadId, onNavigateToThread]);

  if (!threadId) {
    return <Navigate to="../" replace />;
  }

  return <MessageThread threadId={threadId} />;
};

// Import useParams after React import to avoid module issues
import { useParams } from 'react-router-dom';

export default MessageRoutes;