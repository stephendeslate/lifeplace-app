// Notification Types Management Page
// Allows admins to manage notification type configurations: templates, priorities, channels

import React, { useState } from "react";
import {
  Notifications as NotificationTypeIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import {
  Box,
  Chip,
  Switch,
  FormControlLabel,
  TextField,
  MenuItem,
  Typography,
} from "@mui/material";
import {
  PermissionAwareSettingsPage,
  type SettingsPageConfig,
  type SettingsTableColumn,
} from "../../../components/common/settings";
import { ModernDialog } from "../../../components/common";
import { useNotificationTypes } from "../../../hooks/useNotifications";
import { useSettingsPagination } from "../../../hooks/useSettingsPagination";
import type {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  CreateNotificationTypeData,
  UpdateNotificationTypeData,
} from "../../../types/notifications.types";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
} from "../../../types/notifications.types";

const priorityColorMap: Record<
  NotificationPriority,
  "default" | "info" | "warning" | "error"
> = {
  LOW: "default",
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "error",
};

const categoryColorMap: Record<NotificationCategory, string> = {
  SYSTEM: "#9e9e9e",
  EVENT: "#2196f3",
  TASK: "#ff9800",
  PAYMENT: "#4caf50",
  CLIENT: "#9c27b0",
  CONTRACT: "#795548",
  WORKFLOW: "#00bcd4",
  COMMUNICATION: "#3f51b5",
  MARKETING: "#e91e63",
};

// Table columns
const columns: SettingsTableColumn<NotificationType>[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    searchable: true,
  },
  {
    key: "code",
    label: "Code",
    sortable: true,
    searchable: true,
    render: (value) => (
      <Typography
        variant="body2"
        sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
      >
        {String(value)}
      </Typography>
    ),
  },
  {
    key: "category",
    label: "Category",
    align: "center",
    render: (value) => {
      const cat = String(value) as NotificationCategory;
      const label =
        NOTIFICATION_CATEGORIES.find((c) => c.value === cat)?.label || cat;
      return (
        <Chip
          label={label}
          size="small"
          sx={{
            bgcolor: `${categoryColorMap[cat]}20`,
            color: categoryColorMap[cat],
            fontWeight: 500,
          }}
        />
      );
    },
  },
  {
    key: "priority",
    label: "Priority",
    align: "center",
    render: (value) => {
      const p = String(value) as NotificationPriority;
      return <Chip label={p} size="small" color={priorityColorMap[p]} />;
    },
  },
  {
    key: "is_active",
    label: "Active",
    align: "center",
    render: (value) => (
      <Chip
        label={value ? "Active" : "Inactive"}
        size="small"
        color={value ? "success" : "default"}
        variant={value ? "filled" : "outlined"}
      />
    ),
  },
  {
    key: "is_system",
    label: "System",
    align: "center",
    render: (value) =>
      value ? (
        <Chip label="System" size="small" variant="outlined" color="warning" />
      ) : (
        <Typography variant="body2" color="text.secondary">
          Custom
        </Typography>
      ),
  },
];

// Default values for new notification type
const defaultNotificationType: NotificationType = {
  id: 0,
  code: "",
  name: "",
  description: "",
  category: "SYSTEM",
  icon: "notifications",
  color: "#2196f3",
  priority: "NORMAL",
  default_title_template: "",
  default_content_template: "",
  default_email_template: "",
  default_sms_template: "",
  is_active: true,
  is_system: false,
  supports_email: true,
  supports_sms: false,
  supports_push: true,
  auto_read_after_days: null,
  created_at: "",
  updated_at: "",
};

// Config
const config: SettingsPageConfig<NotificationType> = {
  page: {
    title: "Notification Types",
    subtitle:
      "Manage notification types, templates, and delivery channel settings",
    icon: React.createElement(NotificationTypeIcon),
    breadcrumbs: [
      { label: "Settings", href: "/settings" },
      { label: "Templates", href: "/settings/templates" },
      { label: "Notification Types" },
    ],
  },
  table: {
    columns,
    searchFields: ["name", "code"],
    filters: [
      {
        key: "category",
        label: "Category",
        options: NOTIFICATION_CATEGORIES.map((c) => ({
          value: c.value,
          label: c.label,
        })),
      },
    ],
    defaultSort: { key: "name", order: "asc" },
    emptyState: {
      icon: React.createElement(NotificationTypeIcon),
      title: "No Notification Types Found",
      description:
        "Notification types are auto-seeded on first deployment. If none appear, check backend setup.",
    },
  },
  form: {
    title: "Notification Type",
    subtitle: "Configure notification type properties and message templates.",
    sections: [],
    maxWidth: "md",
  },
  features: {
    create: true,
    edit: true,
    delete: true,
    duplicate: false,
    search: true,
    refresh: true,
  },
};

// Edit dialog form component
const NotificationTypeForm: React.FC<{
  item: NotificationType;
  onChange: (data: Partial<NotificationType>) => void;
  isNew: boolean;
}> = ({ item, onChange, isNew }) => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, p: 1 }}>
      {/* Basic Info */}
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ fontWeight: 600 }}
      >
        Basic Information
      </Typography>
      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField
          label="Name"
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          required
          fullWidth
          placeholder="e.g., Event Booking Confirmed"
        />
        <TextField
          label="Code"
          value={item.code}
          onChange={(e) =>
            onChange({
              code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
            })
          }
          required
          fullWidth
          disabled={!isNew && item.is_system}
          placeholder="e.g., EVENT_BOOKING_CONFIRMED"
          helperText={
            !isNew && item.is_system
              ? "System type codes cannot be changed"
              : "Uppercase, underscores only"
          }
          slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
        />
      </Box>
      <TextField
        label="Description"
        value={item.description}
        onChange={(e) => onChange({ description: e.target.value })}
        fullWidth
        multiline
        rows={2}
        placeholder="Brief description of when this notification is triggered"
      />
      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField
          select
          label="Category"
          value={item.category}
          onChange={(e) =>
            onChange({ category: e.target.value as NotificationCategory })
          }
          required
          fullWidth
        >
          {NOTIFICATION_CATEGORIES.map((c) => (
            <MenuItem key={c.value} value={c.value}>
              {c.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Priority"
          value={item.priority}
          onChange={(e) =>
            onChange({ priority: e.target.value as NotificationPriority })
          }
          required
          fullWidth
        >
          {NOTIFICATION_PRIORITIES.map((p) => (
            <MenuItem key={p.value} value={p.value}>
              {p.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <Box sx={{ display: "flex", gap: 2 }}>
        <TextField
          label="Icon"
          value={item.icon}
          onChange={(e) => onChange({ icon: e.target.value })}
          fullWidth
          placeholder="e.g., event_note"
          helperText="MUI icon name"
        />
        <TextField
          label="Color"
          type="color"
          value={item.color}
          onChange={(e) => onChange({ color: e.target.value })}
          fullWidth
          slotProps={{ htmlInput: { style: { height: 40 } } }}
        />
      </Box>

      {/* Delivery Channels */}
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ fontWeight: 600, mt: 1 }}
      >
        Delivery Channels
      </Typography>
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <FormControlLabel
          control={
            <Switch
              checked={item.is_active}
              onChange={(e) => onChange({ is_active: e.target.checked })}
            />
          }
          label="Active"
        />
        <FormControlLabel
          control={
            <Switch
              checked={item.supports_email}
              onChange={(e) => onChange({ supports_email: e.target.checked })}
            />
          }
          label="Email"
        />
        <FormControlLabel
          control={
            <Switch
              checked={item.supports_sms}
              onChange={(e) => onChange({ supports_sms: e.target.checked })}
            />
          }
          label="SMS"
        />
        <FormControlLabel
          control={
            <Switch
              checked={item.supports_push ?? true}
              onChange={(e) => onChange({ supports_push: e.target.checked })}
            />
          }
          label="Push"
        />
      </Box>
      <TextField
        label="Auto-read after (days)"
        type="number"
        value={item.auto_read_after_days ?? ""}
        onChange={(e) =>
          onChange({
            auto_read_after_days: e.target.value
              ? Number(e.target.value)
              : null,
          })
        }
        fullWidth
        helperText="Leave empty for no auto-read"
        slotProps={{ htmlInput: { min: 1 } }}
      />

      {/* Message Templates */}
      <Typography
        variant="subtitle2"
        color="text.secondary"
        sx={{ fontWeight: 600, mt: 1 }}
      >
        Message Templates
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Use {"{{variable_name}}"} syntax for dynamic content. Common variables:
        user_name, event_name, client_name, action_url
      </Typography>
      <TextField
        label="Title Template"
        value={item.default_title_template}
        onChange={(e) => onChange({ default_title_template: e.target.value })}
        required
        fullWidth
        placeholder='e.g., Your event "{{event_name}}" has been confirmed'
      />
      <TextField
        label="Content Template"
        value={item.default_content_template}
        onChange={(e) => onChange({ default_content_template: e.target.value })}
        required
        fullWidth
        multiline
        rows={3}
        placeholder="The in-app notification message body"
      />
      <TextField
        label="Email Template (optional)"
        value={item.default_email_template}
        onChange={(e) => onChange({ default_email_template: e.target.value })}
        fullWidth
        multiline
        rows={3}
        placeholder="Email-specific template content (uses title template if empty)"
        helperText="Only used if email delivery is enabled"
      />
      <TextField
        label="SMS Template (optional)"
        value={item.default_sms_template}
        onChange={(e) => onChange({ default_sms_template: e.target.value })}
        fullWidth
        multiline
        rows={2}
        placeholder="SMS-specific template content (keep under 160 chars)"
        helperText="Only used if SMS delivery is enabled"
      />
    </Box>
  );
};

export const NotificationTypes: React.FC = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NotificationType | null>(null);
  const [formData, setFormData] = useState<NotificationType>(
    defaultNotificationType,
  );
  const paginationState = useSettingsPagination({ defaultPageSize: 25 });

  const {
    notificationTypes,
    totalCount,
    pageCount,
    isLoadingTypes,
    typesError,
    refetchTypes,
    createType,
    updateType,
    deleteType,
    isDeletingType,
  } = useNotificationTypes({
    page: paginationState.page,
    page_size: paginationState.pageSize,
    search: paginationState.search || undefined,
    category: (paginationState.filters.category as string) || undefined,
    ordering: paginationState.ordering || undefined,
  });

  const handleRefresh = () => refetchTypes();

  const handleDelete = async (id: string | number) => {
    return new Promise<void>((resolve, reject) => {
      deleteType(Number(id), {
        onSuccess: () => {
          refetchTypes();
          resolve();
        },
        onError: reject,
      });
    });
  };

  const handleFormChange = (partial: Partial<NotificationType>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const handleFormSave = () => {
    if (editingItem) {
      // Update existing
      const updateData: UpdateNotificationTypeData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        icon: formData.icon,
        color: formData.color,
        priority: formData.priority,
        default_title_template: formData.default_title_template,
        default_content_template: formData.default_content_template,
        default_email_template: formData.default_email_template,
        default_sms_template: formData.default_sms_template,
        is_active: formData.is_active,
        supports_email: formData.supports_email,
        supports_sms: formData.supports_sms,
        supports_push: formData.supports_push,
        auto_read_after_days: formData.auto_read_after_days,
      };
      // Don't allow code change on system types
      if (!editingItem.is_system) {
        updateData.code = formData.code;
      }
      updateType(
        { id: editingItem.id, data: updateData },
        {
          onSuccess: () => {
            setEditDialogOpen(false);
            setEditingItem(null);
            refetchTypes();
          },
        },
      );
    } else {
      // Create new
      const createData: CreateNotificationTypeData = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        icon: formData.icon,
        color: formData.color,
        priority: formData.priority,
        default_title_template: formData.default_title_template,
        default_content_template: formData.default_content_template,
        default_email_template: formData.default_email_template,
        default_sms_template: formData.default_sms_template,
        is_active: formData.is_active,
        supports_email: formData.supports_email,
        supports_sms: formData.supports_sms,
        supports_push: formData.supports_push,
        auto_read_after_days: formData.auto_read_after_days,
      };
      createType(createData, {
        onSuccess: () => {
          setEditDialogOpen(false);
          setEditingItem(null);
          refetchTypes();
        },
      });
    }
  };

  // Custom form renderer using our NotificationTypeForm
  const renderCustomForm = ({
    open,
    onClose,
    item,
    onSave,
  }: {
    open: boolean;
    onClose: () => void;
    item: NotificationType | null;
    onSave: () => void;
  }) => {
    // Sync state when dialog opens with a new item
    if (open && !editDialogOpen) {
      setEditDialogOpen(true);
      setEditingItem(item);
      setFormData(item || defaultNotificationType);
    }

    return (
      <ModernDialog
        open={open}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingItem(null);
          onClose();
        }}
        title={
          item
            ? `Edit Notification Type: ${item.name}`
            : "Create Notification Type"
        }
        maxWidth="md"
        fullWidth
        actions={[
          {
            label: "Cancel",
            onClick: () => {
              setEditDialogOpen(false);
              setEditingItem(null);
              onClose();
            },
            variant: "outlined" as const,
          },
          {
            label: item ? "Save Changes" : "Create Type",
            onClick: () => {
              handleFormSave();
              onSave();
            },
            variant: "contained" as const,
            disabled:
              !formData.name ||
              !formData.code ||
              !formData.default_title_template ||
              !formData.default_content_template,
          },
        ]}
      >
        <NotificationTypeForm
          item={formData}
          onChange={handleFormChange}
          isNew={!item}
        />
      </ModernDialog>
    );
  };

  // Custom edit action for table rows
  const customTableActions = [
    {
      label: "Edit",
      icon: React.createElement(EditIcon),
      onClick: (item: NotificationType) => {
        setEditingItem(item);
        setFormData(item);
        setEditDialogOpen(true);
      },
      color: "primary" as const,
    },
  ];

  return (
    <PermissionAwareSettingsPage
      config={config}
      requiredPermissions={["can_manage_templates"]}
      data={notificationTypes}
      defaultValues={defaultNotificationType}
      isLoading={isLoadingTypes}
      error={typesError?.message}
      onRefresh={handleRefresh}
      onDelete={handleDelete}
      isDeleting={isDeletingType}
      customTableActions={customTableActions}
      customFormRenderer={renderCustomForm}
      pagination={{
        totalCount,
        currentPage: paginationState.currentPage,
        pageSize: paginationState.pageSize,
        pageCount,
        onPageChange: paginationState.onPageChange,
        onPageSizeChange: paginationState.onPageSizeChange,
      }}
      onSearchChange={paginationState.setSearch}
      onFilterChange={paginationState.setFilters}
      onSortChange={paginationState.setOrdering}
    />
  );
};

export default NotificationTypes;
