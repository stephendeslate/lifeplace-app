import type {
  Questionnaire,
  QuestionnaireField,
  QuestionnaireResponse,
  QuestionnaireFieldType,
} from '../../../types/questionnaires.types';

export function createMockQuestionnaire(overrides: Partial<Questionnaire> = {}): Questionnaire {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    name: `Questionnaire ${id}`,
    event_type: 1,
    event_type_name: 'Wedding',
    is_active: true,
    order: 1,
    fields_count: 5,
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockQuestionnaires(count: number): Questionnaire[] {
  const names = [
    'Wedding Details Form',
    'Event Preferences',
    'Dietary Requirements',
    'Venue Setup Preferences',
    'Post-Event Feedback',
  ];
  return Array.from({ length: count }, (_, i) =>
    createMockQuestionnaire({
      id: i + 1,
      name: names[i % names.length],
      order: i + 1,
      fields_count: 3 + (i % 5),
      is_active: i % 4 !== 0,
    }),
  );
}

export const mockQuestionnaires = createMockQuestionnaires(5);

export function createMockQuestionnaireField(
  overrides: Partial<QuestionnaireField> = {},
): QuestionnaireField {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  const fieldType: QuestionnaireFieldType = overrides.type || 'text';
  const typeDisplayMap: Record<QuestionnaireFieldType, string> = {
    text: 'Text',
    number: 'Number',
    date: 'Date',
    time: 'Time',
    boolean: 'Yes/No',
    select: 'Select',
    'multi-select': 'Multi-Select',
    email: 'Email',
    phone: 'Phone',
    file: 'File Upload',
    guests: 'Guest Count',
  };
  return {
    id,
    questionnaire: 1,
    name: `Field ${id}`,
    type: fieldType,
    type_display: typeDisplayMap[fieldType] || 'Text',
    required: true,
    order: overrides.order || 1,
    options:
      fieldType === 'select' || fieldType === 'multi-select'
        ? ['Option A', 'Option B', 'Option C']
        : null,
    description: '',
    placeholder: '',
    is_guest_count: fieldType === 'guests',
    show_conditions: {},
    max_file_size_mb: fieldType === 'file' ? 10 : 0,
    allowed_file_types: fieldType === 'file' ? ['image/png', 'image/jpeg', 'application/pdf'] : [],
    max_files: fieldType === 'file' ? 5 : 0,
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockQuestionnaireFields(count: number): QuestionnaireField[] {
  const fieldConfigs: Array<{
    name: string;
    type: QuestionnaireFieldType;
    required: boolean;
  }> = [
    { name: 'Full Name', type: 'text', required: true },
    { name: 'Email Address', type: 'email', required: true },
    { name: 'Phone Number', type: 'phone', required: false },
    { name: 'Event Date', type: 'date', required: true },
    { name: 'Number of Guests', type: 'guests', required: true },
    { name: 'Preferred Theme', type: 'select', required: false },
    { name: 'Dietary Restrictions', type: 'multi-select', required: false },
    { name: 'Special Requests', type: 'text', required: false },
    { name: 'Upload Inspiration Photos', type: 'file', required: false },
    { name: 'Need Setup Assistance?', type: 'boolean', required: false },
  ];
  return Array.from({ length: count }, (_, i) => {
    const config = fieldConfigs[i % fieldConfigs.length];
    return createMockQuestionnaireField({
      id: i + 1,
      name: config.name,
      type: config.type,
      required: config.required,
      order: i + 1,
    });
  });
}

export const mockQuestionnaireFields = createMockQuestionnaireFields(5);

export function createMockQuestionnaireResponse(
  overrides: Partial<QuestionnaireResponse> = {},
): QuestionnaireResponse {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    event: 1,
    field: 1,
    field_name: 'Full Name',
    field_type: 'text',
    value: 'John Doe',
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockQuestionnaireResponses(count: number): QuestionnaireResponse[] {
  const responseData = [
    { field_name: 'Full Name', field_type: 'text', value: 'John Doe' },
    {
      field_name: 'Email Address',
      field_type: 'email',
      value: 'john@example.com',
    },
    { field_name: 'Phone Number', field_type: 'phone', value: '+639171234567' },
    { field_name: 'Event Date', field_type: 'date', value: '2024-12-15' },
    { field_name: 'Number of Guests', field_type: 'guests', value: '150' },
  ];
  return Array.from({ length: count }, (_, i) => {
    const data = responseData[i % responseData.length];
    return createMockQuestionnaireResponse({
      id: i + 1,
      field: i + 1,
      field_name: data.field_name,
      field_type: data.field_type,
      value: data.value,
    });
  });
}

export const mockQuestionnaireResponses = createMockQuestionnaireResponses(5);
