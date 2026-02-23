import type {
  AdminUser,
  AdminInvitation,
  LegalDocument,
  CompanySettings,
} from '../../../types/settings.types';
import type { AdminPermissions } from '../../../types/permissions.types';

const defaultPermissions: AdminPermissions = {
  can_manage_company_settings: false,
  can_manage_admins: false,
  can_manage_financial_settings: false,
  can_manage_payment_gateways: false,
  can_manage_workflows: false,
  can_manage_booking_flows: false,
  can_manage_templates: false,
  can_export_data: false,
  can_delete_records: false,
};

export function createMockAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    email: `admin${id}@lifeplace.com`,
    first_name: 'Admin',
    last_name: `User ${id}`,
    role: 'admin',
    is_active: true,
    date_joined: '2024-01-15T10:00:00Z',
    profile: {
      phone: '555-0100',
      company: 'LifePlace',
    },
    admin_permissions: { ...defaultPermissions },
    is_full_admin: false,
    ...overrides,
  };
}

export function createMockAdminUsers(count: number): AdminUser[] {
  const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
  const lastNames = ['Admin', 'Manager', 'Coordinator', 'Director', 'Lead'];
  return Array.from({ length: count }, (_, i) =>
    createMockAdminUser({
      id: i + 1,
      email: `${firstNames[i % 5].toLowerCase()}@lifeplace.com`,
      first_name: firstNames[i % 5],
      last_name: lastNames[i % 5],
      is_active: i % 5 !== 0,
      is_full_admin: i === 0,
      admin_permissions:
        i === 0
          ? {
              can_manage_company_settings: true,
              can_manage_admins: true,
              can_manage_financial_settings: true,
              can_manage_payment_gateways: true,
              can_manage_workflows: true,
              can_manage_booking_flows: true,
              can_manage_templates: true,
              can_export_data: true,
              can_delete_records: true,
            }
          : { ...defaultPermissions },
    }),
  );
}

export const mockAdminUsers = createMockAdminUsers(5);

export function createMockAdminInvitation(
  overrides: Partial<AdminInvitation> = {},
): AdminInvitation {
  const id = overrides.id || `inv-${Math.floor(Math.random() * 10000)}`;
  return {
    id,
    email: 'newinvite@example.com',
    first_name: 'New',
    last_name: 'Admin',
    invited_by: 'alice@lifeplace.com',
    is_accepted: false,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: '2024-06-15T10:00:00Z',
    permissions: { ...defaultPermissions },
    ...overrides,
  };
}

export function createMockAdminInvitations(count: number): AdminInvitation[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAdminInvitation({
      id: `inv-${i + 1}`,
      email: `invite${i + 1}@example.com`,
      first_name: `Invite`,
      last_name: `${i + 1}`,
      is_accepted: i % 3 === 0,
    }),
  );
}

export const mockAdminInvitations = createMockAdminInvitations(5);

export function createMockLegalDocument(overrides: Partial<LegalDocument> = {}): LegalDocument {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  const docType = overrides.document_type || 'TERMS_OF_SERVICE';
  return {
    id,
    document_type: docType,
    document_type_display: docType === 'TERMS_OF_SERVICE' ? 'Terms of Service' : 'Privacy Policy',
    title: docType === 'TERMS_OF_SERVICE' ? 'Terms of Service' : 'Privacy Policy',
    content: `<h1>${docType === 'TERMS_OF_SERVICE' ? 'Terms of Service' : 'Privacy Policy'}</h1><p>Document content here.</p>`,
    version: '1.0',
    effective_date: '2024-01-01',
    is_published: true,
    last_updated_by: 1,
    last_updated_by_name: 'Alice Admin',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockLegalDocuments(): LegalDocument[] {
  return [
    createMockLegalDocument({
      id: 1,
      document_type: 'TERMS_OF_SERVICE',
    }),
    createMockLegalDocument({
      id: 2,
      document_type: 'PRIVACY_POLICY',
    }),
  ];
}

export const mockLegalDocuments = createMockLegalDocuments();

export function createMockCompanySettings(
  overrides: Partial<CompanySettings> = {},
): CompanySettings {
  return {
    id: 1,
    company_name: 'LifePlace Events',
    company_tagline: 'Creating memorable experiences',
    logo: null,
    logo_url: null,
    logo_dark: null,
    logo_dark_url: null,
    favicon: null,
    favicon_url: null,
    primary_color: '#1976d2',
    secondary_color: '#dc004e',
    accent_color: '#ff9800',
    email: 'info@lifeplace.dev',
    support_email: 'support@lifeplace.dev',
    phone: '+63 917 123 4567',
    phone_secondary: '',
    address_line1: '123 Main Street',
    address_line2: 'Suite 100',
    city: 'Makati City',
    province: 'Metro Manila',
    postal_code: '1200',
    country: 'Philippines',
    full_address: '123 Main Street, Suite 100, Makati City, Metro Manila 1200, Philippines',
    business_registration_number: 'REG-2024-00001',
    vat_number: 'VAT-123456789',
    website: 'https://lifeplace.dev',
    facebook_url: 'https://facebook.com/lifeplace',
    instagram_url: 'https://instagram.com/lifeplace',
    pdf_footer_text: 'Thank you for choosing LifePlace Events',
    invoice_terms: 'Payment due within 30 days of invoice date.',
    receipt_terms: 'This receipt confirms payment received.',
    bank_name: 'BDO Unibank',
    bank_account_name: 'LifePlace Events Inc.',
    bank_account_number: '1234567890',
    bank_branch: 'Makati Main Branch',
    bank_swift_code: 'BNORPHMM',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export const mockCompanySettings = createMockCompanySettings();
