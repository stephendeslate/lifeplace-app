import type { EmailLayout } from '../../../types/layouts.types';

export function createMockEmailLayout(overrides: Partial<EmailLayout> = {}): EmailLayout {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    name: `Email Layout ${id}`,
    description: `Description for layout ${id}`,
    header_template:
      '<div class="header"><img src="{{logo_url}}" alt="Logo" /><h1>{{title}}</h1></div>',
    footer_template:
      '<div class="footer"><p>&copy; 2024 LifePlace Events. All rights reserved.</p></div>',
    wrapper_template:
      '<html><body><div class="wrapper">{{header}}{{content}}{{footer}}</div></body></html>',
    base_styles:
      'body { font-family: Arial, sans-serif; color: #333; } .wrapper { max-width: 600px; margin: 0 auto; }',
    primary_color: '#1976d2',
    secondary_color: '#dc004e',
    logo_url: 'https://lifeplace.dev/logo.png',
    is_default: false,
    is_active: true,
    template_count: 5,
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockEmailLayouts(count: number): EmailLayout[] {
  const layoutConfigs = [
    {
      name: 'Default Layout',
      is_default: true,
      primary_color: '#1976d2',
      template_count: 12,
    },
    {
      name: 'Minimal Layout',
      is_default: false,
      primary_color: '#333333',
      template_count: 5,
    },
    {
      name: 'Corporate Layout',
      is_default: false,
      primary_color: '#0D47A1',
      template_count: 8,
    },
    {
      name: 'Festive Layout',
      is_default: false,
      primary_color: '#E91E63',
      template_count: 3,
    },
    {
      name: 'Newsletter Layout',
      is_default: false,
      primary_color: '#4CAF50',
      template_count: 2,
    },
  ];
  return Array.from({ length: count }, (_, i) => {
    const config = layoutConfigs[i % layoutConfigs.length];
    return createMockEmailLayout({
      id: i + 1,
      name: config.name,
      is_default: config.is_default,
      primary_color: config.primary_color,
      template_count: config.template_count,
      is_active: i % 4 !== 0,
    });
  });
}

export const mockEmailLayouts = createMockEmailLayouts(5);
