// frontend/admin-crm/src/config/settings-navigation.ts

import {
  AccountCircle,
  AdminPanelSettings,
  EventNote,
  Assignment,
  Description,
  Notifications,
  Payment,
  Inventory,
  Message,
  AccountTree,
  TrendingUp,
  Psychology,
  CurrencyExchange,
  Star,
  Gavel,
  Business,
  DesignServices,
  School,
  PhotoLibrary,
} from "@mui/icons-material";
import type { SettingsNavigationGroup } from "../types/settings.types";

export const settingsNavigationConfig: SettingsNavigationGroup[] = [
  {
    id: "account",
    label: "Account Management",
    items: [
      {
        id: "account-settings",
        label: "Account Settings",
        path: "/settings/account/account-settings",
        icon: AccountCircle,
        description: "Update your profile and password",
      },
      {
        id: "admin-users",
        label: "Admin Users",
        path: "/settings/account/admin-users",
        icon: AdminPanelSettings,
        description: "Manage administrator accounts",
      },
      {
        id: "notifications",
        label: "Notifications",
        path: "/settings/account/notifications",
        icon: Notifications,
        description: "Configure notification preferences",
      },
      {
        id: "company-settings",
        label: "Company Settings",
        path: "/settings/account/company-settings",
        icon: Business,
        description: "Configure company branding and PDF settings",
      },
      {
        id: "guided-tours",
        label: "Guided Tours",
        path: "/settings/account/guided-tours",
        icon: School,
        description: "Manage tour preferences and restart tours",
      },
    ],
  },
  {
    id: "booking",
    label: "Booking Configuration",
    items: [
      {
        id: "booking-flow",
        label: "Booking Flow",
        path: "/settings/booking/booking-flow",
        icon: EventNote,
        description: "Configure client booking experience",
      },
      {
        id: "event-types",
        label: "Event Types",
        path: "/settings/booking/event-types",
        icon: Assignment,
        description: "Manage available event types",
      },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      {
        id: "gallery",
        label: "Gallery",
        path: "/settings/content/gallery",
        icon: PhotoLibrary,
        description: "Manage gallery photos for the public website",
      },
    ],
  },
  {
    id: "templates",
    label: "Template Management",
    items: [
      {
        id: "contract-templates",
        label: "Contract Templates",
        path: "/settings/templates/contract-templates",
        icon: Description,
        description: "Manage contract templates",
      },
      {
        id: "questionnaire-templates",
        label: "Questionnaire Templates",
        path: "/settings/templates/questionnaire-templates",
        icon: Psychology,
        description: "Manage questionnaire templates",
      },
      {
        id: "workflow-templates",
        label: "Workflow Templates",
        path: "/settings/templates/workflow-templates",
        icon: AccountTree,
        description: "Manage workflow templates",
      },
      {
        id: "communication-templates",
        label: "Communication Templates",
        path: "/settings/templates/communication-templates",
        icon: Message,
        description: "Manage email and SMS templates",
      },
      {
        id: "email-layouts",
        label: "Email Layouts",
        path: "/settings/templates/email-layouts",
        icon: DesignServices,
        description: "Manage email layout branding",
      },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      {
        id: "products-packages",
        label: "Products & Packages",
        path: "/settings/commerce/products-packages",
        icon: Inventory,
        description: "Manage products and packages",
      },
      {
        id: "currency-taxes",
        label: "Currency & Taxes",
        path: "/settings/commerce/currency-taxes",
        icon: CurrencyExchange,
        description: "Configure currency display and tax rates",
      },
      {
        id: "payments",
        label: "Payments",
        path: "/settings/commerce/payments",
        icon: Payment,
        description: "Configure payment gateways",
      },
      {
        id: "sales",
        label: "Sales",
        path: "/settings/commerce/sales",
        icon: TrendingUp,
        description: "Manage sales settings",
      },
      {
        id: "vip-loyalty",
        label: "VIP & Loyalty",
        path: "/settings/commerce/vip-loyalty",
        icon: Star,
        description: "Configure VIP program and rewards",
      },
    ],
  },
  {
    id: "legal",
    label: "Legal & Compliance",
    items: [
      {
        id: "legal-documents",
        label: "Legal Documents",
        path: "/settings/legal/legal-documents",
        icon: Gavel,
        description: "Manage Terms of Service and Privacy Policy",
      },
    ],
  },
];

// Helper function to get all settings items flattened
export const getAllSettingsItems = () => {
  return settingsNavigationConfig.flatMap((group) => group.items);
};

// Helper function to get settings item by path
export const getSettingsItemByPath = (path: string) => {
  return getAllSettingsItems().find((item) => item.path === path);
};
