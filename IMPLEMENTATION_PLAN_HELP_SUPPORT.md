# Help & Support Implementation Plan

## Executive Summary

This document outlines the implementation plan for the Help & Support feature across the LifePlace platform. The feature enables clients to access self-service help content and submit support inquiries, while providing admins with tools to manage and respond to these inquiries.

---

## Architecture Decisions (Verified)

| Decision | Choice | Verification |
|----------|--------|--------------|
| Backend domain | Extend `messaging` domain | MessageThread model at `backend/core/domains/messaging/models.py` |
| Contact info | Use existing `CompanySettings` fields + add `support_hours` | `support_email` already exists at line ~478 |
| Categories | Hardcoded frontend constants | - |
| FAQ content | Hardcoded in HelpCenter component | Existing mock data at `frontend/client-portal/src/components/help/HelpCenter.tsx` |
| Admin location | Replace Messages → Support in navigation | `navigation.ts` lines 148-154 |
| Client route | `/help-support` | New route |

---

## Phase 1: Backend Changes

### 1.1 Extend MessageThread Model

**File:** `backend/core/domains/messaging/models.py`

**Current State (verified):**
- `MessageThread` has: `client`, `event` (FK, already exists!), `assigned_admin`, `subject`, `priority`, `status`
- Priority choices: `urgent`, `high`, `normal`, `low`
- Status choices: `active`, `waiting`, `resolved`, `archived`

**Changes Required:**

```python
# Add after line ~15 (after existing imports)
class ThreadType(models.TextChoices):
    CONVERSATION = 'conversation', 'Conversation'
    SUPPORT = 'support', 'Support Inquiry'

class SupportCategory(models.TextChoices):
    BILLING = 'billing', 'Billing & Payments'
    EVENT = 'event', 'Event Changes/Questions'
    TECHNICAL = 'technical', 'Technical Issues'
    GENERAL = 'general', 'General Inquiry'

# Add to MessageThread model (after status field, ~line 45)
thread_type = models.CharField(
    max_length=20,
    choices=ThreadType.choices,
    default=ThreadType.CONVERSATION,
    help_text="Type of thread - conversation or support inquiry"
)
category = models.CharField(
    max_length=20,
    choices=SupportCategory.choices,
    null=True,
    blank=True,
    help_text="Category for support inquiries"
)
```

**Migration required:** Yes

---

### 1.2 Extend CompanySettings Model

**File:** `backend/core/domains/settings/models.py`

**Current State (verified at lines 460-689):**
- `support_email` already exists (line ~478)
- `phone` exists for primary contact
- No `support_hours` field

**Changes Required:**

```python
# Add after support_email field (~line 480)
support_phone = models.CharField(
    max_length=20,
    blank=True,
    default='',
    help_text="Support phone number (if different from main phone)"
)
support_hours = models.JSONField(
    default=dict,
    blank=True,
    help_text="Support availability hours, e.g., {'weekdays': '9AM-6PM', 'weekends': 'Closed'}"
)
```

**Migration required:** Yes

---

### 1.3 Update PublicCompanySettingsSerializer

**File:** `backend/core/domains/settings/serializers.py`

**Current State (verified at lines 347-374):**
- Exposes: `company_name`, `email`, `phone`, `full_address`, `website`, social URLs
- Does NOT expose: `support_email`, `support_phone`, `support_hours`

**Changes Required:**

```python
# Update PublicCompanySettingsSerializer fields list (~line 360)
# Add to fields:
'support_email',
'support_phone',
'support_hours',
```

---

### 1.4 Create Support-Specific Serializers

**File:** `backend/core/domains/messaging/serializers.py`

**Add new serializers:**

```python
class SupportInquiryCreateSerializer(serializers.ModelSerializer):
    """Serializer for clients creating support inquiries."""
    initial_message = serializers.CharField(write_only=True)

    class Meta:
        model = MessageThread
        fields = ['subject', 'category', 'event', 'initial_message']

    def validate(self, attrs):
        # Set thread_type to support
        attrs['thread_type'] = 'support'
        return attrs

    def create(self, validated_data):
        initial_message = validated_data.pop('initial_message')
        user = self.context['request'].user
        validated_data['client'] = user
        validated_data['status'] = 'active'

        thread = MessageThread.objects.create(**validated_data)

        # Create initial message
        Message.objects.create(
            thread=thread,
            sender=user,
            content=initial_message,
            message_type='text'
        )

        return thread


class SupportInquiryListSerializer(serializers.ModelSerializer):
    """Serializer for listing support inquiries (client view)."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True, allow_null=True)

    class Meta:
        model = MessageThread
        fields = [
            'id', 'subject', 'category', 'category_display',
            'status', 'status_display', 'event', 'event_name',
            'created_at', 'updated_at', 'last_message_at'
        ]
        read_only_fields = fields


class SupportInquiryDetailSerializer(SupportInquiryListSerializer):
    """Serializer for support inquiry detail with messages."""
    messages = serializers.SerializerMethodField()

    class Meta(SupportInquiryListSerializer.Meta):
        fields = SupportInquiryListSerializer.Meta.fields + ['messages']

    def get_messages(self, obj):
        # Exclude internal notes for clients
        messages = obj.messages.filter(is_internal_note=False).order_by('created_at')
        return MessageSerializer(messages, many=True, context=self.context).data


class AdminSupportInquiryListSerializer(serializers.ModelSerializer):
    """Serializer for admin support inquiry list."""
    client_name = serializers.CharField(source='client.get_display_name', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)
    assigned_admin_name = serializers.CharField(
        source='assigned_admin.get_display_name',
        read_only=True,
        allow_null=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True, allow_null=True)
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = MessageThread
        fields = [
            'id', 'subject', 'category', 'category_display',
            'status', 'status_display', 'priority',
            'client', 'client_name', 'client_email',
            'assigned_admin', 'assigned_admin_name',
            'event', 'event_name', 'message_count',
            'created_at', 'updated_at', 'last_message_at'
        ]

    def get_message_count(self, obj):
        return obj.messages.count()


class AdminSupportInquiryUpdateSerializer(serializers.ModelSerializer):
    """Serializer for admin updating support inquiry."""
    internal_note = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = MessageThread
        fields = ['status', 'priority', 'assigned_admin', 'internal_note']

    def update(self, instance, validated_data):
        internal_note = validated_data.pop('internal_note', None)

        instance = super().update(instance, validated_data)

        # Create internal note if provided
        if internal_note:
            Message.objects.create(
                thread=instance,
                sender=self.context['request'].user,
                content=internal_note,
                message_type='text',
                is_internal_note=True
            )

        return instance
```

---

### 1.5 Create Support Views

**File:** `backend/core/domains/messaging/views.py`

**Add new viewsets:**

```python
class SupportInquiryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for clients to manage their support inquiries.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def get_serializer_class(self):
        if self.action == 'create':
            return SupportInquiryCreateSerializer
        elif self.action == 'retrieve':
            return SupportInquiryDetailSerializer
        return SupportInquiryListSerializer

    def get_queryset(self):
        """Return only support threads for the current user."""
        return MessageThread.objects.filter(
            client=self.request.user,
            thread_type='support'
        ).select_related('event', 'assigned_admin').order_by('-created_at')

    def perform_create(self, serializer):
        instance = serializer.save()
        # TODO: Send notification to admins
        # notify_admins_new_support_inquiry(instance)


class AdminSupportInquiryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for admins to manage all support inquiries.
    """
    permission_classes = [IsAuthenticated, CanManageMessageThread]
    throttle_classes = [UserRateThrottle]

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return AdminSupportInquiryUpdateSerializer
        elif self.action == 'retrieve':
            return SupportInquiryDetailSerializer  # Reuse, but admin sees internal notes
        return AdminSupportInquiryListSerializer

    def get_queryset(self):
        """Return all support threads with filtering."""
        queryset = MessageThread.objects.filter(
            thread_type='support'
        ).select_related('client', 'event', 'assigned_admin')

        # Filters
        status = self.request.query_params.get('status')
        category = self.request.query_params.get('category')
        assigned_admin = self.request.query_params.get('assigned_admin')
        priority = self.request.query_params.get('priority')
        search = self.request.query_params.get('search')

        if status:
            queryset = queryset.filter(status=status)
        if category:
            queryset = queryset.filter(category=category)
        if assigned_admin:
            if assigned_admin == 'unassigned':
                queryset = queryset.filter(assigned_admin__isnull=True)
            else:
                queryset = queryset.filter(assigned_admin_id=assigned_admin)
        if priority:
            queryset = queryset.filter(priority=priority)
        if search:
            queryset = queryset.filter(
                Q(subject__icontains=search) |
                Q(client__email__icontains=search) |
                Q(client__first_name__icontains=search) |
                Q(client__last_name__icontains=search)
            )

        return queryset.order_by('-created_at')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get support inquiry statistics."""
        from django.db.models import Count
        from django.utils import timezone

        today = timezone.now().date()

        queryset = self.get_queryset()

        stats = {
            'total': queryset.count(),
            'open': queryset.filter(status='active').count(),
            'in_progress': queryset.filter(status='waiting').count(),
            'resolved_today': queryset.filter(
                status='resolved',
                updated_at__date=today
            ).count(),
            'unassigned': queryset.filter(assigned_admin__isnull=True, status='active').count(),
            'by_category': dict(
                queryset.values('category').annotate(count=Count('id')).values_list('category', 'count')
            ),
            'by_priority': dict(
                queryset.filter(status='active').values('priority').annotate(count=Count('id')).values_list('priority', 'count')
            ),
        }

        return Response(stats)

    @action(detail=True, methods=['post'])
    def add_reply(self, request, pk=None):
        """Add an admin reply to a support inquiry."""
        thread = self.get_object()
        content = request.data.get('content')
        is_internal = request.data.get('is_internal_note', False)

        if not content:
            return Response(
                {'error': 'Content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        message = Message.objects.create(
            thread=thread,
            sender=request.user,
            content=content,
            message_type='text',
            is_internal_note=is_internal
        )

        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


class PublicSupportSettingsView(APIView):
    """
    Public endpoint to get support contact information.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from core.domains.settings.models import CompanySettings

        settings = CompanySettings.get_settings()

        return Response({
            'support_email': settings.support_email or settings.email,
            'support_phone': settings.support_phone or settings.phone,
            'support_hours': settings.support_hours,
            'company_name': settings.company_name,
        })
```

---

### 1.6 Update URL Patterns

**File:** `backend/core/domains/messaging/urls.py`

**Current State (verified):**
```python
router.register(r'threads', MessageThreadViewSet, basename='messagethread')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'admin/threads', MessageThreadAdminViewSet, basename='admin-messagethread')
```

**Add:**
```python
router.register(r'support', SupportInquiryViewSet, basename='support-inquiry')
router.register(r'admin/support', AdminSupportInquiryViewSet, basename='admin-support-inquiry')

# Add to urlpatterns
path('public/support-settings/', PublicSupportSettingsView.as_view(), name='public-support-settings'),
```

---

### 1.7 Add Admin Notification Signal

**File:** `backend/core/domains/messaging/signals.py` (create if not exists)

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings

from .models import MessageThread


@receiver(post_save, sender=MessageThread)
def notify_admins_on_support_inquiry(sender, instance, created, **kwargs):
    """Send notification when a new support inquiry is created."""
    if created and instance.thread_type == 'support':
        # Email notification
        from core.domains.settings.models import CompanySettings
        company = CompanySettings.get_settings()

        subject = f"New Support Inquiry: {instance.subject}"
        message = f"""
A new support inquiry has been submitted.

Client: {instance.client.get_display_name()} ({instance.client.email})
Subject: {instance.subject}
Category: {instance.get_category_display()}
Priority: {instance.get_priority_display()}

View in admin: {settings.ADMIN_URL}/support/{instance.id}
        """

        # Send to support email
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[company.support_email or company.email],
                fail_silently=True,
            )
        except Exception:
            pass  # Log error but don't fail

        # TODO: Create in-app notification for admins
```

---

## Phase 2: Client Portal Frontend

### 2.1 Create Type Definitions

**File:** `frontend/client-portal/src/types/support.types.ts`

```typescript
export interface SupportInquiry {
  id: string;
  subject: string;
  category: SupportCategory;
  category_display: string;
  status: SupportStatus;
  status_display: string;
  event?: string;
  event_name?: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  sender: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    display_name: string;
  };
  content: string;
  message_type: 'text' | 'system' | 'file';
  created_at: string;
}

export type SupportCategory = 'billing' | 'event' | 'technical' | 'general';
export type SupportStatus = 'active' | 'waiting' | 'resolved' | 'archived';

export interface CreateSupportInquiryData {
  subject: string;
  category: SupportCategory;
  event?: string;
  initial_message: string;
}

export interface SupportSettings {
  support_email: string;
  support_phone: string;
  support_hours: Record<string, string>;
  company_name: string;
}
```

---

### 2.2 Create Constants

**File:** `frontend/client-portal/src/constants/support.constants.ts`

```typescript
export const SUPPORT_CATEGORIES = [
  { value: 'billing', label: 'Billing & Payments', icon: 'Payment' },
  { value: 'event', label: 'Event Changes/Questions', icon: 'Event' },
  { value: 'technical', label: 'Technical Issues', icon: 'Build' },
  { value: 'general', label: 'General Inquiry', icon: 'Help' },
] as const;

export const SUPPORT_STATUS_CONFIG = {
  active: { label: 'Open', color: 'info' },
  waiting: { label: 'In Progress', color: 'warning' },
  resolved: { label: 'Resolved', color: 'success' },
  archived: { label: 'Closed', color: 'default' },
} as const;

export type SupportCategoryValue = typeof SUPPORT_CATEGORIES[number]['value'];
```

---

### 2.3 Create API Layer

**File:** `frontend/client-portal/src/apis/support.api.ts`

```typescript
import api from '../utils/api';
import type {
  SupportInquiry,
  CreateSupportInquiryData,
  SupportSettings
} from '../types/support.types';

export class SupportApi {
  /**
   * Get list of user's support inquiries
   */
  static async getInquiries(): Promise<SupportInquiry[]> {
    const response = await api.get<SupportInquiry[]>('/messaging/support/');
    return response.data;
  }

  /**
   * Get a specific support inquiry with messages
   */
  static async getInquiry(id: string): Promise<SupportInquiry> {
    const response = await api.get<SupportInquiry>(`/messaging/support/${id}/`);
    return response.data;
  }

  /**
   * Create a new support inquiry
   */
  static async createInquiry(data: CreateSupportInquiryData): Promise<SupportInquiry> {
    const response = await api.post<SupportInquiry>('/messaging/support/', data);
    return response.data;
  }

  /**
   * Get public support settings (contact info)
   */
  static async getSupportSettings(): Promise<SupportSettings> {
    const response = await api.get<SupportSettings>('/messaging/public/support-settings/');
    return response.data;
  }

  /**
   * Handle API errors
   */
  static handleError(error: unknown): string {
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as { response?: { data?: { detail?: string } } };
      return apiError.response?.data?.detail || 'An error occurred';
    }
    return 'An unexpected error occurred';
  }
}
```

---

### 2.4 Create React Query Hooks

**File:** `frontend/client-portal/src/hooks/useSupport.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupportApi } from '../apis/support.api';
import { useToast } from '../contexts/ToastContext';
import type { CreateSupportInquiryData } from '../types/support.types';

export const supportKeys = {
  all: ['support'] as const,
  inquiries: () => [...supportKeys.all, 'inquiries'] as const,
  inquiry: (id: string) => [...supportKeys.inquiries(), id] as const,
  settings: () => [...supportKeys.all, 'settings'] as const,
};

export const useSupportInquiries = () => {
  return useQuery({
    queryKey: supportKeys.inquiries(),
    queryFn: () => SupportApi.getInquiries(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useSupportInquiry = (id: string) => {
  return useQuery({
    queryKey: supportKeys.inquiry(id),
    queryFn: () => SupportApi.getInquiry(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useSupportSettings = () => {
  return useQuery({
    queryKey: supportKeys.settings(),
    queryFn: () => SupportApi.getSupportSettings(),
    staleTime: 15 * 60 * 1000, // 15 minutes (rarely changes)
  });
};

export const useCreateSupportInquiry = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateSupportInquiryData) => SupportApi.createInquiry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.inquiries() });
      showToast({
        type: 'success',
        title: 'Support inquiry submitted',
        message: 'We\'ll get back to you as soon as possible.',
      });
    },
    onError: (error) => {
      const message = SupportApi.handleError(error);
      showToast({
        type: 'error',
        title: 'Failed to submit inquiry',
        message,
      });
    },
  });
};
```

---

### 2.5 Create Support Page Components

**File:** `frontend/client-portal/src/pages/support/SupportPage.tsx`

```typescript
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Tabs, Tab, Typography, useTheme, alpha } from '@mui/material';
import {
  Help as HelpIcon,
  Email as ContactIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { SEO } from '../../components/common/SEO';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { HelpTab } from './components/HelpTab';
import { ContactSupportTab } from './components/ContactSupportTab';
import { MyInquiriesTab } from './components/MyInquiriesTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
    {value === index && children}
  </Box>
);

export const SupportPage: React.FC = () => {
  const theme = useTheme();
  const [searchParams] = useSearchParams();

  // Determine initial tab from URL params
  const getInitialTab = () => {
    const tab = searchParams.get('tab');
    if (tab === 'contact') return 1;
    if (tab === 'inquiries') return 2;
    return 0;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <>
      <SEO title="Help & Support" description="Get help and contact support" />

      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            Help & Support
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Find answers to common questions or get in touch with our support team
          </Typography>
        </Box>
      </AnimatedElement>

      {/* Tabs */}
      <AnimatedElement animation="slideUp" delay={200}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{ overflow: 'visible' }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  py: 2,
                  color: alpha(theme.palette.text.primary, 0.7),
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                  },
                },
              }}
            >
              <Tab
                icon={<HelpIcon />}
                label="Help Center"
                iconPosition="start"
              />
              <Tab
                icon={<ContactIcon />}
                label="Contact Support"
                iconPosition="start"
              />
              <Tab
                icon={<HistoryIcon />}
                label="My Inquiries"
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            <TabPanel value={activeTab} index={0}>
              <HelpTab />
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
              <ContactSupportTab onSuccess={() => setActiveTab(2)} />
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
              <MyInquiriesTab />
            </TabPanel>
          </Box>
        </GlassCard>
      </AnimatedElement>
    </>
  );
};

export default SupportPage;
```

---

**File:** `frontend/client-portal/src/pages/support/components/HelpTab.tsx`

```typescript
import React from 'react';
import { HelpCenter } from '../../../components/help/HelpCenter';

export const HelpTab: React.FC = () => {
  return <HelpCenter />;
};
```

---

**File:** `frontend/client-portal/src/pages/support/components/ContactSupportTab.tsx`

```typescript
import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Paper,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Send as SendIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useCreateSupportInquiry, useSupportSettings } from '../../../hooks/useSupport';
import { useEvents } from '../../../hooks/useEvents';
import { SUPPORT_CATEGORIES } from '../../../constants/support.constants';
import type { CreateSupportInquiryData, SupportCategory } from '../../../types/support.types';

interface ContactSupportTabProps {
  onSuccess?: () => void;
}

export const ContactSupportTab: React.FC<ContactSupportTabProps> = ({ onSuccess }) => {
  const theme = useTheme();
  const { data: supportSettings, isLoading: isLoadingSettings } = useSupportSettings();
  const { data: events } = useEvents(); // Get user's events for linking
  const createInquiry = useCreateSupportInquiry();

  const [formData, setFormData] = useState<CreateSupportInquiryData>({
    subject: '',
    category: 'general',
    event: undefined,
    initial_message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    if (!formData.initial_message.trim()) {
      newErrors.initial_message = 'Message is required';
    } else if (formData.initial_message.trim().length < 20) {
      newErrors.initial_message = 'Please provide more detail (at least 20 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    createInquiry.mutate(formData, {
      onSuccess: () => {
        // Reset form
        setFormData({
          subject: '',
          category: 'general',
          event: undefined,
          initial_message: '',
        });
        onSuccess?.();
      },
    });
  };

  const handleChange = (field: keyof CreateSupportInquiryData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Stack spacing={4}>
      {/* Contact Info Card */}
      <Paper
        sx={{
          p: 3,
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          Contact Information
        </Typography>

        {isLoadingSettings ? (
          <CircularProgress size={20} />
        ) : (
          <Stack spacing={2}>
            {supportSettings?.support_email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <EmailIcon color="primary" fontSize="small" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {supportSettings.support_email}
                  </Typography>
                </Box>
              </Box>
            )}

            {supportSettings?.support_phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PhoneIcon color="primary" fontSize="small" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">
                    {supportSettings.support_phone}
                  </Typography>
                </Box>
              </Box>
            )}

            {supportSettings?.support_hours && Object.keys(supportSettings.support_hours).length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <ScheduleIcon color="primary" fontSize="small" sx={{ mt: 0.5 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Support Hours
                  </Typography>
                  {Object.entries(supportSettings.support_hours).map(([day, hours]) => (
                    <Typography key={day} variant="body1">
                      {day}: {hours}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </Stack>
        )}
      </Paper>

      {/* Inquiry Form */}
      <Box>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          Submit a Support Request
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={3}>
            {/* Category */}
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => handleChange('category', e.target.value as SupportCategory)}
              >
                {SUPPORT_CATEGORIES.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Related Event (optional) */}
            {events && events.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Related Event (Optional)</InputLabel>
                <Select
                  value={formData.event || ''}
                  label="Related Event (Optional)"
                  onChange={(e) => handleChange('event', e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  {events.map(event => (
                    <MenuItem key={event.id} value={event.id}>
                      {event.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Subject */}
            <TextField
              label="Subject"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              error={!!errors.subject}
              helperText={errors.subject}
              fullWidth
              required
            />

            {/* Message */}
            <TextField
              label="Message"
              value={formData.initial_message}
              onChange={(e) => handleChange('initial_message', e.target.value)}
              error={!!errors.initial_message}
              helperText={errors.initial_message || 'Please describe your issue in detail'}
              multiline
              rows={5}
              fullWidth
              required
            />

            {/* Submit */}
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={createInquiry.isPending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              disabled={createInquiry.isPending}
              sx={{ alignSelf: 'flex-start' }}
            >
              {createInquiry.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
};
```

---

**File:** `frontend/client-portal/src/pages/support/components/MyInquiriesTab.tsx`

```typescript
import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Paper,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useSupportInquiries } from '../../../hooks/useSupport';
import { SUPPORT_STATUS_CONFIG, SUPPORT_CATEGORIES } from '../../../constants/support.constants';
import { formatDistanceToNow } from 'date-fns';

export const MyInquiriesTab: React.FC = () => {
  const theme = useTheme();
  const { data: inquiries, isLoading, error } = useSupportInquiries();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ textAlign: 'center', py: 4 }}>
        Failed to load inquiries. Please try again.
      </Typography>
    );
  }

  if (!inquiries || inquiries.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
          No support inquiries yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          When you submit a support request, it will appear here.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {inquiries.map(inquiry => {
        const statusConfig = SUPPORT_STATUS_CONFIG[inquiry.status];
        const category = SUPPORT_CATEGORIES.find(c => c.value === inquiry.category);

        return (
          <Paper
            key={inquiry.id}
            sx={{
              p: 2.5,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
                transform: 'translateX(4px)',
              },
            }}
          >
            <Stack spacing={1.5}>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {inquiry.subject}
                </Typography>
                <Chip
                  label={statusConfig.label}
                  color={statusConfig.color as 'info' | 'warning' | 'success' | 'default'}
                  size="small"
                />
              </Box>

              {/* Meta */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={category?.label || inquiry.category}
                  variant="outlined"
                  size="small"
                />
                {inquiry.event_name && (
                  <Chip
                    label={inquiry.event_name}
                    variant="outlined"
                    size="small"
                    color="primary"
                  />
                )}
              </Box>

              {/* Timestamp */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Submitted {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                </Typography>
                {inquiry.last_message_at && inquiry.last_message_at !== inquiry.created_at && (
                  <Typography variant="caption" color="text.secondary">
                    • Last activity {formatDistanceToNow(new Date(inquiry.last_message_at), { addSuffix: true })}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
};
```

---

### 2.6 Add Route to App.tsx

**File:** `frontend/client-portal/src/App.tsx`

**Add import:**
```typescript
const SupportPage = React.lazy(() =>
  import('./pages/support/SupportPage').then(m => ({ default: m.SupportPage }))
);
```

**Add route (inside ProtectedRoute):**
```typescript
<Route
  path="/help-support"
  element={
    <ProtectedRoute>
      <ClientLayoutWrapper>
        <SupportPage />
      </ClientLayoutWrapper>
    </ProtectedRoute>
  }
/>
```

---

### 2.7 Wire Profile Page Button

**File:** `frontend/client-portal/src/pages/profile/Profile.tsx`

**Add import:**
```typescript
import { useNavigate } from 'react-router-dom';
```

**Add hook (inside component):**
```typescript
const navigate = useNavigate();
```

**Update Contact Support button (lines 454-470):**
```typescript
<Button
  variant="outlined"
  startIcon={<EmailIcon />}
  fullWidth
  onClick={() => navigate('/help-support?tab=contact')}
  sx={{
    backgroundColor: alpha('#fff', 0.1),
    backdropFilter: 'blur(10px)',
    border: `1px solid ${alpha('#fff', 0.2)}`,
    '&:hover': {
      backgroundColor: alpha('#fff', 0.15),
      transform: 'translateY(-2px)',
    },
    transition: 'all 0.2s ease',
  }}
>
  Contact Support
</Button>
```

---

### 2.8 Update HelpCenter Component Buttons

**File:** `frontend/client-portal/src/components/help/HelpCenter.tsx`

**Add import:**
```typescript
import { useNavigate } from 'react-router-dom';
```

**Add hook:**
```typescript
const navigate = useNavigate();
```

**Update Contact Support button (~line 690):**
```typescript
onClick={() => navigate('/help-support?tab=contact')}
```

---

## Phase 3: Admin-CRM Frontend

### 3.1 Create Type Definitions

**File:** `frontend/admin-crm/src/types/support.types.ts`

```typescript
export interface AdminSupportInquiry {
  id: string;
  subject: string;
  category: SupportCategory;
  category_display: string;
  status: SupportStatus;
  status_display: string;
  priority: SupportPriority;
  client: string;
  client_name: string;
  client_email: string;
  assigned_admin?: string;
  assigned_admin_name?: string;
  event?: string;
  event_name?: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  sender: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    display_name: string;
    role: string;
  };
  content: string;
  message_type: 'text' | 'system' | 'file';
  is_internal_note: boolean;
  created_at: string;
}

export type SupportCategory = 'billing' | 'event' | 'technical' | 'general';
export type SupportStatus = 'active' | 'waiting' | 'resolved' | 'archived';
export type SupportPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface SupportInquiryFilters {
  status?: SupportStatus;
  category?: SupportCategory;
  priority?: SupportPriority;
  assigned_admin?: string;
  search?: string;
}

export interface UpdateSupportInquiryData {
  status?: SupportStatus;
  priority?: SupportPriority;
  assigned_admin?: string | null;
  internal_note?: string;
}

export interface SupportStats {
  total: number;
  open: number;
  in_progress: number;
  resolved_today: number;
  unassigned: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
}
```

---

### 3.2 Create API Layer

**File:** `frontend/admin-crm/src/apis/support.api.ts`

```typescript
import api from '../utils/api';
import type {
  AdminSupportInquiry,
  SupportInquiryFilters,
  UpdateSupportInquiryData,
  SupportStats,
  SupportMessage,
} from '../types/support.types';

export const supportApi = {
  getInquiries: async (filters?: SupportInquiryFilters): Promise<AdminSupportInquiry[]> => {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assigned_admin) params.append('assigned_admin', filters.assigned_admin);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get<AdminSupportInquiry[]>(
      `/messaging/admin/support/?${params.toString()}`
    );
    return response.data;
  },

  getInquiry: async (id: string): Promise<AdminSupportInquiry> => {
    const response = await api.get<AdminSupportInquiry>(`/messaging/admin/support/${id}/`);
    return response.data;
  },

  updateInquiry: async (id: string, data: UpdateSupportInquiryData): Promise<AdminSupportInquiry> => {
    const response = await api.patch<AdminSupportInquiry>(`/messaging/admin/support/${id}/`, data);
    return response.data;
  },

  addReply: async (id: string, content: string, isInternal: boolean = false): Promise<SupportMessage> => {
    const response = await api.post<SupportMessage>(`/messaging/admin/support/${id}/add_reply/`, {
      content,
      is_internal_note: isInternal,
    });
    return response.data;
  },

  getStats: async (): Promise<SupportStats> => {
    const response = await api.get<SupportStats>('/messaging/admin/support/stats/');
    return response.data;
  },
};
```

---

### 3.3 Create React Query Hooks

**File:** `frontend/admin-crm/src/hooks/useSupport.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../apis/support.api';
import { useToastActions } from '../contexts/ToastContext';
import type { SupportInquiryFilters, UpdateSupportInquiryData } from '../types/support.types';

export const useSupportInquiries = (filters?: SupportInquiryFilters) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    data: inquiries,
    isLoading: isLoadingInquiries,
    error: inquiriesError,
    refetch: refetchInquiries,
  } = useQuery({
    queryKey: ['support-inquiries', filters],
    queryFn: () => supportApi.getInquiries(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const useSupportInquiry = (id: string) => {
    return useQuery({
      queryKey: ['support-inquiry', id],
      queryFn: () => supportApi.getInquiry(id),
      enabled: !!id,
      staleTime: 30 * 1000, // 30 seconds
    });
  };

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['support-stats'],
    queryFn: () => supportApi.getStats(),
    staleTime: 1 * 60 * 1000,
  });

  const updateInquiryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupportInquiryData }) =>
      supportApi.updateInquiry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['support-stats'] });
      showSuccess('Inquiry Updated', 'The support inquiry has been updated.');
    },
    onError: () => {
      showError('Update Failed', 'Failed to update the support inquiry.');
    },
  });

  const addReplyMutation = useMutation({
    mutationFn: ({ id, content, isInternal }: { id: string; content: string; isInternal?: boolean }) =>
      supportApi.addReply(id, content, isInternal),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['support-inquiry', id] });
      queryClient.invalidateQueries({ queryKey: ['support-inquiries'] });
      showSuccess('Reply Sent', 'Your reply has been added.');
    },
    onError: () => {
      showError('Reply Failed', 'Failed to send your reply.');
    },
  });

  return {
    inquiries: inquiries || [],
    isLoadingInquiries,
    inquiriesError,
    refetchInquiries,

    stats,
    isLoadingStats,

    useSupportInquiry,

    updateInquiry: updateInquiryMutation.mutate,
    isUpdatingInquiry: updateInquiryMutation.isPending,

    addReply: addReplyMutation.mutate,
    isAddingReply: addReplyMutation.isPending,
  };
};
```

---

### 3.4 Create Support Page

**File:** `frontend/admin-crm/src/pages/support/SupportPage.tsx`

```typescript
import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  CircularProgress,
  TablePagination,
  Button,
} from '@mui/material';
import {
  SupportAgent as SupportIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ModernPageLayout } from '../../components/common/ModernPageLayout';
import { ModernPageHeader } from '../../components/common/ModernPageHeader';
import { ModernEmptyState } from '../../components/common/ModernEmptyState';
import { KPICard } from '../../components/analytics/KPICard';
import { useSupportInquiries } from '../../hooks/useSupport';
import { formatDistanceToNow } from 'date-fns';
import type { SupportInquiryFilters, AdminSupportInquiry } from '../../types/support.types';

const STATUS_CONFIG = {
  active: { label: 'Open', color: 'info' },
  waiting: { label: 'In Progress', color: 'warning' },
  resolved: { label: 'Resolved', color: 'success' },
  archived: { label: 'Closed', color: 'default' },
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'error' },
  high: { label: 'High', color: 'warning' },
  normal: { label: 'Normal', color: 'info' },
  low: { label: 'Low', color: 'default' },
};

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'event', label: 'Event Changes' },
  { value: 'technical', label: 'Technical Issues' },
  { value: 'general', label: 'General Inquiry' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Open' },
  { value: 'waiting', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Closed' },
];

export const SupportPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState<SupportInquiryFilters>({});
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<AdminSupportInquiry | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  React.useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchValue), 300);
    return () => clearTimeout(timeout);
  }, [searchValue]);

  const combinedFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch || undefined,
  }), [filters, debouncedSearch]);

  const {
    inquiries,
    isLoadingInquiries,
    refetchInquiries,
    stats,
    isLoadingStats,
  } = useSupportInquiries(combinedFilters);

  const handleRowClick = (inquiry: AdminSupportInquiry) => {
    navigate(`/support/${inquiry.id}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, inquiry: AdminSupportInquiry) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedInquiry(inquiry);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedInquiry(null);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean) || debouncedSearch;

  const clearFilters = () => {
    setFilters({});
    setSearchValue('');
  };

  // Pagination
  const paginatedInquiries = inquiries.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <ModernPageLayout backgroundPattern="default">
      <ModernPageHeader
        title="Support"
        subtitle={`${inquiries.length} inquir${inquiries.length !== 1 ? 'ies' : 'y'}`}
        icon={<SupportIcon />}
        size="medium"
        secondaryActions={[
          {
            label: 'Refresh',
            icon: <RefreshIcon />,
            onClick: () => refetchInquiries(),
            variant: 'outlined',
          },
        ]}
      />

      {/* Stats Cards */}
      <Box
        display="flex"
        gap={2}
        mb={4}
        sx={{
          flexWrap: 'wrap',
          '& > *': {
            flex: '1 1 180px',
            minWidth: 180,
            maxWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(20% - 10px)' },
          },
        }}
      >
        <KPICard
          title="Open"
          value={stats?.open ?? 0}
          color="info"
          isLoading={isLoadingStats}
        />
        <KPICard
          title="In Progress"
          value={stats?.in_progress ?? 0}
          color="warning"
          isLoading={isLoadingStats}
        />
        <KPICard
          title="Resolved Today"
          value={stats?.resolved_today ?? 0}
          color="success"
          isLoading={isLoadingStats}
        />
        <KPICard
          title="Unassigned"
          value={stats?.unassigned ?? 0}
          color="error"
          isLoading={isLoadingStats}
        />
        <KPICard
          title="Total"
          value={stats?.total ?? 0}
          color="primary"
          isLoading={isLoadingStats}
        />
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 3, p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search by subject, client..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status || ''}
              label="Status"
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
            >
              {STATUS_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={filters.category || ''}
              label="Category"
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as any }))}
            >
              {CATEGORY_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {hasActiveFilters && (
            <Button
              variant="text"
              size="small"
              onClick={clearFilters}
              startIcon={<FilterIcon />}
            >
              Clear Filters
            </Button>
          )}
        </Stack>
      </Box>

      {/* Table or Empty State */}
      {inquiries.length === 0 && !hasActiveFilters ? (
        <ModernEmptyState
          icon={SupportIcon}
          title="No Support Inquiries"
          description="When clients submit support requests, they will appear here."
          size="large"
          color="primary"
        />
      ) : (
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', overflow: 'hidden' }}>
          {isLoadingInquiries ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Subject</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Assigned To</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell width={50}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedInquiries.map((inquiry) => (
                      <TableRow
                        key={inquiry.id}
                        hover
                        onClick={() => handleRowClick(inquiry)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {inquiry.subject}
                          </Typography>
                          {inquiry.event_name && (
                            <Typography variant="caption" color="text.secondary">
                              Event: {inquiry.event_name}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{inquiry.client_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {inquiry.client_email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={inquiry.category_display}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_CONFIG[inquiry.status]?.label}
                            color={STATUS_CONFIG[inquiry.status]?.color as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={PRIORITY_CONFIG[inquiry.priority]?.label}
                            color={PRIORITY_CONFIG[inquiry.priority]?.color as any}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {inquiry.assigned_admin_name || (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              Unassigned
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, inquiry)}
                          >
                            <MoreVertIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  count={inquiries.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                />
              </Box>
            </>
          )}
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedInquiry) navigate(`/support/${selectedInquiry.id}`);
          handleMenuClose();
        }}>
          View Details
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedInquiry) navigate(`/clients/${selectedInquiry.client}`);
          handleMenuClose();
        }}>
          View Client
        </MenuItem>
      </Menu>
    </ModernPageLayout>
  );
};

export default SupportPage;
```

---

### 3.5 Update Navigation Config

**File:** `frontend/admin-crm/src/config/navigation.ts`

**Replace Messages with Support (lines 148-154):**
```typescript
{
  id: 'support',
  label: 'Support',
  path: '/support',
  icon: SupportAgent,  // Import from @mui/icons-material
  roles: ['ADMIN'],
},
```

**Add import:**
```typescript
import { SupportAgent } from '@mui/icons-material';
```

---

### 3.6 Add Route to App.tsx

**File:** `frontend/admin-crm/src/App.tsx`

**Add import:**
```typescript
const SupportPage = React.lazy(() =>
  import('./pages/support/SupportPage').then(m => ({ default: m.SupportPage }))
);
```

**Add route:**
```typescript
<Route
  path="/support"
  element={
    <ProtectedRoute>
      <SupportPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/support/:id"
  element={
    <ProtectedRoute>
      <SupportInquiryDetail />
    </ProtectedRoute>
  }
/>
```

---

## Phase 4: Testing & Verification

### 4.1 Backend Tests
- [ ] Test MessageThread model with new fields
- [ ] Test support inquiry creation endpoint
- [ ] Test client can only see own inquiries
- [ ] Test admin can see all inquiries
- [ ] Test stats endpoint
- [ ] Test admin notification signal

### 4.2 Frontend Tests (Client Portal)
- [ ] Test SupportPage renders with tabs
- [ ] Test inquiry form validation
- [ ] Test inquiry submission
- [ ] Test inquiry list loading
- [ ] Test Profile Contact Support button navigation

### 4.3 Frontend Tests (Admin CRM)
- [ ] Test SupportPage renders with stats
- [ ] Test filter functionality
- [ ] Test table row click navigation
- [ ] Test inquiry detail page

### 4.4 Integration Tests
- [ ] End-to-end: Client creates inquiry → Admin receives notification → Admin updates status → Client sees update

---

## Implementation Checklist

### Phase 1: Backend
- [ ] Add `thread_type` and `category` fields to MessageThread
- [ ] Add `support_phone` and `support_hours` to CompanySettings
- [ ] Update PublicCompanySettingsSerializer
- [ ] Create support serializers
- [ ] Create support views
- [ ] Update URL patterns
- [ ] Add admin notification signal
- [ ] Run migrations
- [ ] Test endpoints

### Phase 2: Client Portal
- [ ] Create support.types.ts
- [ ] Create support.constants.ts
- [ ] Create support.api.ts
- [ ] Create useSupport.ts hooks
- [ ] Create SupportPage and components
- [ ] Add route to App.tsx
- [ ] Wire Profile Contact Support button
- [ ] Update HelpCenter buttons
- [ ] Test functionality

### Phase 3: Admin CRM
- [ ] Create support.types.ts
- [ ] Create support.api.ts
- [ ] Create useSupport.ts hooks
- [ ] Create SupportPage
- [ ] Create SupportInquiryDetail (optional for v1)
- [ ] Update navigation.ts
- [ ] Add routes to App.tsx
- [ ] Test functionality

---

## File Summary

| Phase | File | Action |
|-------|------|--------|
| 1 | backend/core/domains/messaging/models.py | Modify |
| 1 | backend/core/domains/settings/models.py | Modify |
| 1 | backend/core/domains/settings/serializers.py | Modify |
| 1 | backend/core/domains/messaging/serializers.py | Modify |
| 1 | backend/core/domains/messaging/views.py | Modify |
| 1 | backend/core/domains/messaging/urls.py | Modify |
| 1 | backend/core/domains/messaging/signals.py | Create |
| 2 | frontend/client-portal/src/types/support.types.ts | Create |
| 2 | frontend/client-portal/src/constants/support.constants.ts | Create |
| 2 | frontend/client-portal/src/apis/support.api.ts | Create |
| 2 | frontend/client-portal/src/hooks/useSupport.ts | Create |
| 2 | frontend/client-portal/src/pages/support/SupportPage.tsx | Create |
| 2 | frontend/client-portal/src/pages/support/components/*.tsx | Create |
| 2 | frontend/client-portal/src/App.tsx | Modify |
| 2 | frontend/client-portal/src/pages/profile/Profile.tsx | Modify |
| 2 | frontend/client-portal/src/components/help/HelpCenter.tsx | Modify |
| 3 | frontend/admin-crm/src/types/support.types.ts | Create |
| 3 | frontend/admin-crm/src/apis/support.api.ts | Create |
| 3 | frontend/admin-crm/src/hooks/useSupport.ts | Create |
| 3 | frontend/admin-crm/src/pages/support/SupportPage.tsx | Create |
| 3 | frontend/admin-crm/src/config/navigation.ts | Modify |
| 3 | frontend/admin-crm/src/App.tsx | Modify |
