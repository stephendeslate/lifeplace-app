// frontend/admin-crm/src/components/vendors/VendorsTable.tsx

import React from "react";
import { Box, Typography, Chip, Tooltip, Stack } from "@mui/material";
import {
  Store as VendorIcon,
  Settings as RulesIcon,
  Restaurant as CateringIcon,
  CameraAlt as PhotographyIcon,
  Videocam as VideographyIcon,
  Headphones as DJIcon,
  LocalFlorist as FloristIcon,
  Palette as DecoratorIcon,
  TheaterComedy as EntertainmentIcon,
  DirectionsCar as TransportationIcon,
  Face as MakeupIcon,
  Construction as RentalsIcon,
  Church as OfficiantIcon,
  EventNote as CoordinationIcon,
  MoreHoriz as OtherIcon,
} from "@mui/icons-material";
import type {
  VendorListItem,
  VendorServiceCategory,
} from "../../types/vendors.types";
import {
  ModernTable,
  ModernLoadingStates,
  ModernEmptyState,
  createStandardActions,
} from "../common";
import type { ModernTableColumn, ModernTableAction } from "../common";

interface VendorsTableProps {
  vendors: VendorListItem[];
  isLoading: boolean;
  onEdit: (vendor: VendorListItem) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

const getCategoryIcon = (category: VendorServiceCategory) => {
  const icons: Record<VendorServiceCategory, React.ReactElement> = {
    CATERING: <CateringIcon fontSize="small" />,
    PHOTOGRAPHY: <PhotographyIcon fontSize="small" />,
    VIDEOGRAPHY: <VideographyIcon fontSize="small" />,
    DJ: <DJIcon fontSize="small" />,
    FLORIST: <FloristIcon fontSize="small" />,
    DECORATOR: <DecoratorIcon fontSize="small" />,
    ENTERTAINMENT: <EntertainmentIcon fontSize="small" />,
    TRANSPORTATION: <TransportationIcon fontSize="small" />,
    MAKEUP: <MakeupIcon fontSize="small" />,
    RENTALS: <RentalsIcon fontSize="small" />,
    OFFICIANT: <OfficiantIcon fontSize="small" />,
    COORDINATION: <CoordinationIcon fontSize="small" />,
    OTHER: <OtherIcon fontSize="small" />,
  };
  return icons[category] || <OtherIcon fontSize="small" />;
};

const getCategoryLabel = (category: VendorServiceCategory): string => {
  const labels: Record<VendorServiceCategory, string> = {
    CATERING: "Catering",
    PHOTOGRAPHY: "Photography",
    VIDEOGRAPHY: "Videography",
    DJ: "DJ / Music",
    FLORIST: "Florist",
    DECORATOR: "Decorator",
    ENTERTAINMENT: "Entertainment",
    TRANSPORTATION: "Transportation",
    MAKEUP: "Makeup & Styling",
    RENTALS: "Equipment Rentals",
    OFFICIANT: "Officiant",
    COORDINATION: "Event Coordination",
    OTHER: "Other",
  };
  return labels[category] || "Other";
};

const getCategoryColor = (
  category: VendorServiceCategory,
):
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning" => {
  const colors: Record<
    VendorServiceCategory,
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning"
  > = {
    CATERING: "warning",
    PHOTOGRAPHY: "info",
    VIDEOGRAPHY: "info",
    DJ: "secondary",
    FLORIST: "success",
    DECORATOR: "primary",
    ENTERTAINMENT: "secondary",
    TRANSPORTATION: "default",
    MAKEUP: "error",
    RENTALS: "default",
    OFFICIANT: "primary",
    COORDINATION: "warning",
    OTHER: "default",
  };
  return colors[category] || "default";
};

export const VendorsTable: React.FC<VendorsTableProps> = ({
  vendors,
  isLoading,
  onEdit,
  onDelete,
}) => {
  const getStatusChip = (isActive: boolean, isBookable: boolean) => (
    <Stack direction="row" spacing={0.5}>
      <Chip
        label={isActive ? "Active" : "Inactive"}
        size="small"
        color={isActive ? "success" : "default"}
        variant={isActive ? "filled" : "outlined"}
      />
      {isActive && (
        <Chip
          label={isBookable ? "Bookable" : "Not Bookable"}
          size="small"
          color={isBookable ? "info" : "warning"}
          variant="outlined"
        />
      )}
    </Stack>
  );

  const columns: ModernTableColumn[] = [
    {
      key: "name",
      label: "Vendor",
      sortable: true,
      render: (_, row) => {
        const vendor = row as unknown as VendorListItem;
        return (
          <Box display="flex" alignItems="center" gap={1}>
            <VendorIcon color="primary" fontSize="small" />
            <Box>
              <Typography variant="subtitle2" fontWeight="medium">
                {vendor.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Code: {vendor.code}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      key: "service_category",
      label: "Category",
      render: (_, row) => {
        const vendor = row as unknown as VendorListItem;
        return (
          <Chip
            icon={getCategoryIcon(vendor.service_category)}
            label={getCategoryLabel(vendor.service_category)}
            size="small"
            color={getCategoryColor(vendor.service_category)}
            variant="outlined"
          />
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (_, row) => {
        const vendor = row as unknown as VendorListItem;
        return getStatusChip(vendor.is_active, vendor.is_bookable);
      },
    },
    {
      key: "has_operating_rules",
      label: "Rules",
      hideBelow: "md",
      align: "center",
      render: (_, row) => {
        const vendor = row as unknown as VendorListItem;
        return vendor.has_operating_rules ? (
          <Tooltip title="Has operating rules configured">
            <RulesIcon color="success" />
          </Tooltip>
        ) : (
          <Tooltip title="No operating rules configured">
            <RulesIcon color="disabled" />
          </Tooltip>
        );
      },
    },
    {
      key: "packages_count",
      label: "Packages",
      hideBelow: "lg",
      align: "center",
      render: (_, row) => {
        const vendor = row as unknown as VendorListItem;
        return (
          <Chip
            label={vendor.packages_count}
            size="small"
            variant="outlined"
            color={vendor.packages_count > 0 ? "primary" : "default"}
          />
        );
      },
    },
  ];

  const actions = createStandardActions(
    (vendor: VendorListItem) => onEdit(vendor),
    (vendor: VendorListItem) => onDelete(vendor.id),
    {
      editLabel: "Edit Vendor",
      deleteLabel: "Delete Vendor",
    },
  );

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton />;
  }

  if (vendors.length === 0) {
    return (
      <ModernEmptyState
        icon={VendorIcon}
        title="No vendors found"
        description="Create your first vendor to get started with managing service providers"
        tip={{
          text: "Vendors are service providers like caterers, photographers, DJs, etc.",
          type: "info",
        }}
      />
    );
  }

  return (
    <ModernTable
      columns={
        columns as unknown as ModernTableColumn<Record<string, unknown>>[]
      }
      data={vendors as unknown as Record<string, unknown>[]}
      actions={
        actions as unknown as ModernTableAction<Record<string, unknown>>[]
      }
      onRowClick={(row) => onEdit(row as unknown as VendorListItem)}
      sortBy="name"
      sortOrder="asc"
    />
  );
};
